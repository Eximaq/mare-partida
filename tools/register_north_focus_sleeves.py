"""Fit owned panels from six North garments to the original eight-state focus body."""
import hashlib
import io
import json
import struct
import sys
import zipfile
from functools import lru_cache

from north_focus_anatomy import hand_contacts, native_alphas
from register_south_focus_trousers import ROOT, OUTFITS, index

OUTPUT = ROOT / 'tools/rework-combat-wardrobe/north-focus-sleeves.zip'
ITEMS = (6, 7, 130, 137, 144, 172)


def generate():
    import numpy as np
    from PIL import Image

    rig, pins, hands = hand_contacts()
    alpha=native_alphas()
    native={l['id']:l for l in rig['layers']}
    yy,xx=np.indices((640,640))
    records = {r['id']: r for r in index(OUTFITS)['records']}
    archive = json.loads((OUTFITS/'archives/archive-index.json').read_bytes())['sources']
    assets, items = {}, {}
    size = (640, 640)
    waist=json.loads((ROOT/'tools/rework-combat-wardrobe/north-focus-trousers.json').read_bytes())['phases']

    @lru_cache(maxsize=60)
    def owned(key, offset):
        row = archive[key]
        with zipfile.ZipFile(OUTFITS/'archives'/row['archive']) as z:
            raw = z.read(row['path'])
        if hashlib.sha256(raw).hexdigest() != key:
            raise ValueError('Changed outfit material '+key)
        im = Image.open(io.BytesIO(raw)).convert('RGBA')
        if im.size != (512,512) or offset != 64:
            raise ValueError('Unregistered outfit origin')
        padded = Image.new('RGBA',size)
        padded.paste(im,(offset,offset))
        return padded

    def save(im):
        buf = io.BytesIO()
        im.save(buf,format='PNG',compress_level=9)
        raw = buf.getvalue()
        key = hashlib.sha256(raw).hexdigest()
        assets[key+'.png'] = raw
        return key

    def point(p,k):
        return np.array([p[k]['x'],p[k]['y']])*4

    def retarget(im,a,b,c,d,width):
        # Project across and along the bone. Preserve its native transverse
        # scale while allowing the elbow/wrist projection to foreshorten it.
        u,v = b-a,d-c
        if min(np.linalg.norm(u),np.linalg.norm(v)) < 5:
            raise ValueError('Degenerate garment bone')
        def pair(axis,w):
            return np.stack((axis,np.array([-axis[1],axis[0]])/np.linalg.norm(axis)*w),axis=1)
        inv = pair(u,1)@np.linalg.inv(pair(v,width))
        offset=a-inv@c
        matrix=np.column_stack((inv,offset))
        return im.transform(size,Image.Transform.AFFINE,tuple(matrix.ravel()),Image.Resampling.NEAREST)

    def subtract(im,alpha):
        out=np.array(im)
        out[:,:,3]=((out[:,:,3].astype('uint32')*(255-alpha)+127)//255).astype('uint8')
        out[out[:,:,3]==0]=0
        return Image.fromarray(out)

    def save_group(groups,tag,im):
        if im.getbbox():
            groups.setdefault(tag,Image.new('RGBA',size)).alpha_composite(im)

    def split_front(item,panels):
        # Trace the inside edge of each sleeve in the 512px source, expressed
        # in its padded 640px coordinates. The original authoring panels cut
        # straight through the shirt and skirt. Those cuts are only invisible
        # when both arms hang down. Keep the continuous waist/back on the body.
        guides={
            6:([227,239,252,261,268],[282,282,285,286,288],[357,356,354,353,351],271),
            7:([225,238,250,263,271,277],[278,279,282,285,286,290],[363,361,359,355,353,350],278),
            130:([233,243,256,271,278,294,308,318,324],[280,282,284,287,287,285,282,278,275],[359,357,355,352,352,355,358,362,365],325),
            137:([229,240,255,271,280,295,306,315,322,331],[277,280,283,287,287,286,282,279,277,274],[365,361,357,353,354,355,359,362,365,368],333),
        }
        ys,ls,rs,end=guides[item]
        whole=Image.new('RGBA',size);back=[]
        for part in panels:
            name,a,b,im=part
            if 'rear' in name:back.append(part)
            else:whole.alpha_composite(im)
        rgba=np.asarray(whole);y,x=np.indices((640,640));taken=np.zeros((640,640),dtype=bool)
        result=[]
        for side,edge in (('LEFT',ls),('RIGHT',rs)):
            seam=np.interp(y,ys,edge)
            outer=x<seam if side=='LEFT' else x>seam
            sleeve=outer&(y>=ys[0])&(y<end);taken|=sleeve
            for band,a,b in ((y<296,'SHOULDER','ELBOW'),(y>=296,'ELBOW','ARM')):
                out=rgba.copy();out[~(sleeve&band)]=0
                if np.any(out[:,:,3]):result.append(('sleeve',side+' '+a,side+' '+b,Image.fromarray(out)))
        body=rgba.copy();body[taken]=0
        rebuilt=Image.fromarray(body.copy())
        for _,_,_,panel in result:rebuilt.alpha_composite(panel)
        if rebuilt.tobytes()!=whole.tobytes():raise ValueError('Lost front seam pixels')
        # At the sewn shoulder, the cloth sits over the joint under the mobile
        # outer sleeve. Keep the existing material there during arm rotation.
        joint=(y>=ys[0])&(y<254)&(x>273)&(x<367)
        body[joint]=rgba[joint]
        return back+[('core','NECK','HIP',Image.fromarray(body))]+result

    def cape_panels(panels):
        # The frozen idle drawing cut both elbows across a horizontal row.
        # With a raised hand those cuts uncover a triangular hole and leave
        # the bottom of the gold cuff floating on the hem. Repartition the
        # same RGBA pixels along the black seam in the original North coat.
        whole=Image.new('RGBA',size)
        for _,_,_,im in panels: whole.alpha_composite(im)
        rgba=np.asarray(whole);y,x=np.indices((640,640))
        axis=[258,265,270,280,290,300,310,320,330,337,341]
        borders={'LEFT':[281,281,280,278,275,271,267,263,257,251,245],
                 'RIGHT':[359,359,359,362,365,368,373,377,382,389,394]}
        groups=[];taken=np.zeros((640,640),dtype=bool)
        for side,edge in borders.items():
            boundary=np.interp(y,axis,edge)
            sleeve=(x<boundary if side=='LEFT' else x>boundary)&(y>=261)&(y<342)
            # Keep the white shoulder fur on the cloak. The colored arm
            # panel starts at its actual edge, independently on each side.
            warm=rgba[:,:,0].astype(int);light=rgba[:,:,1].astype(int)
            mantle=(y<273)&(light>65)&(warm-light<56)
            sleeve &= ~mantle
            taken |= sleeve
            for band,a,b in ((y<296,'SHOULDER','ELBOW'),(y>=296,'ELBOW','ARM')):
                out=rgba.copy();out[~(sleeve&band)]=0
                groups.append(('sleeve',side+' '+a,side+' '+b,Image.fromarray(out)))
        out=rgba.copy();out[taken]=0;groups.insert(0,('cape','NECK','HIP',Image.fromarray(out)))
        check=Image.new('RGBA',size)
        for _,_,_,im in groups: check.alpha_composite(im)
        if check.tobytes()!=whole.tobytes(): raise ValueError('Lost original cape pixels')
        return groups

    for item in ITEMS:
        src='male-torso'+str(item)+'-north-frozen-attack-native-candidate'
        original=records['male-torso'+str(item)+'-north-frozen-idle-native']
        control={layer.get('source') for layer in original['pack']['directions']['north']['layers']}
        row=records[src]
        p=row['pack']
        if row['equipment'].get('torso')!=item or row['body']!='male' or p['density']!=4 or p['frame']['width']!=160 or p['pivot']!={'x':80,'y':128}:
            raise ValueError('Wrong original garment '+src)
        d=p['directions']['north']
        pieces=[]
        for layer in d['layers']:
            name=layer['id']
            if name.startswith('base:') or name.startswith('cuff-emergence-'):
                continue
            bind=layer['binding']
            if bind['kind']!='rigid' or not name.startswith(('coat','original-neck-coverage','sleeve-aperture-')):
                continue
            a,b=bind['a'],bind['b']
            if not a.startswith('cloth:') or not b.startswith('cloth:'):
                raise ValueError('Unknown garment bone '+name)
            key=layer['source']
            if key not in row['sourceRefs'] or key not in control:
                raise ValueError('Unknown garment material')
            pieces.append((name,a[6:],b[6:],key))
        if not any(n.endswith('core') for n,*_ in pieces) or not any(n.endswith('hem') for n,*_ in pieces):
            raise ValueError('Missing core or hem '+src)
        result=items[item]=dict(source=src,panels=[dict(id=n,anchors=[a,b],sha256=k) for n,a,b,k in pieces],frames=[],waistCut=[])
        rest=d['rest']
        panels=[(n,a,b,owned(k,row.get('sourceRasterPadding',{}).get(k,{}).get('offset'))) for n,a,b,k in pieces]
        if item in (6,7,130,137): panels=split_front(item,panels)
        elif item==172: panels=cape_panels(panels)
        for f,pose in enumerate(rig['poses']):
            groups={}
            for name,a,b,im in panels:
                if a=='NECK' and b=='HIP':
                    # BODY NECK is the torso, whereas NECK anchors the separate head.
                    width=abs(point(pose,'LEFT SHOULDER')[0]-point(pose,'RIGHT SHOULDER')[0])/abs(point(rest,'LEFT SHOULDER')[0]-point(rest,'RIGHT SHOULDER')[0])
                    panel=retarget(im,point(rest,a),point(rest,b),point(pose,'BODY NECK'),point(pose,'HIP'),width)
                    save_group(groups,'back' if 'rear' in name else 'core',panel)
                    continue
                # In the North punch/idle registration LEFT is screen left.
                # In this North weapon rig the same shoulder is named RIGHT.
                donor,first=a.split(' ',1)
                side,receiver=('near','RIGHT') if donor=='LEFT' else ('far','LEFT')
                last=b.split(' ',1)[1]
                if (first,last) not in (('SHOULDER','ELBOW'),('ELBOW','ARM')):
                    raise ValueError('Unrecognized sleeve '+name)
                c,e=point(pose,receiver+' '+first),point(pose,receiver+' '+last)
                panel=retarget(im,point(rest,a),point(rest,b),c,e,1.0)
                if 'aperture-rear' in name:
                    save_group(groups,'back',panel)
                else:
                    save_group(groups,side+'Upper' if first=='SHOULDER' else side+'Lower',panel)
            # The collar crosses the shoulder cap, while the forearm can
            # still pass in front of it. Use this frame's upper-arm material
            # and anchor, leaving the garment's own colored border intact.
            out={}
            for side,joint in (('far','LEFT'),('near','RIGHT')):
                a=point(pose,joint+' SHOULDER');b=point(pose,joint+' ELBOW')
                dx=xx-a[0];dy=yy-a[1];axis=b-a
                proximal=(dx*dx+dy*dy<=31**2)&(dx*axis[0]+dy*axis[1]<=21*np.linalg.norm(axis))
                cut=np.where(proximal,alpha(native['upper-arm-'+side]['frames'][f]),0)
                panel=np.array(groups['core'])
                panel[:,:,3]=((panel[:,:,3].astype('uint32')*cut+127)//255).astype('uint8')
                panel[panel[:,:,3]==0]=0
                if np.any(panel[:,:,3]):out[side+'Shoulder']=save(Image.fromarray(panel))
            if item==144:
                # The approved static four-view cloak covers the resting arm.
                # The active far hand and attachment stay at their native depth.
                core=np.array(groups['core'])
                for side in ('near','far'):
                    fore=alpha(native['forearm-hand-'+side]['frames'][f])
                    upper=alpha(native['upper-arm-'+side]['frames'][f])
                    if side=='near':
                        opacity=np.maximum(upper,fore)
                        panel=core.copy()
                        panel[:,:,3]=((core[:,:,3].astype('uint32')*opacity+127)//255).astype('uint8')
                        panel[panel[:,:,3]==0]=0;out['nearDrape']=save(Image.fromarray(panel))
                    else:
                        for tag,opacity in (('farUpper',upper),('farLower',fore)):
                            panel=core.copy()
                            panel[:,:,3]=((core[:,:,3].astype('uint32')*opacity+127)//255).astype('uint8')
                            panel[panel[:,:,3]==0]=0
                            groups[tag]=Image.fromarray(panel)
            for tag,im in groups.items():
                if tag in ('back','core'):
                    out[tag]=save(im)
                    continue
                side='far' if tag.startswith('far') else 'near'
                # No garment material may paint over the original hand. The
                # open palm and the staff grip have distinct source ownership.
                for form in ('normal','open','staff') if side=='far' else ('normal',):
                    if (side,f,form) not in hands: continue
                    masks=hands[side,f,form][1]
                    mask=np.maximum.reduce(list(masks.values()))
                    panel=subtract(im,mask)
                    if panel.getbbox(): out.setdefault(tag,{})[form]=save(panel)
            stock=np.zeros(640*640,dtype=bool)
            for start,length in waist[f]['cut']:stock[start:start+length]=True
            overlap=stock&(np.asarray(groups['core'])[:,:,3].ravel()>0)
            spans=np.flatnonzero(np.diff(np.r_[False,overlap,False])).reshape(-1,2)
            result['waistCut'].append([[int(a),int(b-a)] for a,b in spans])
            result['frames'].append(out)
    assets['register.json']=json.dumps(dict(pins=pins,items=items),separators=(',',':')).encode()
    return assets


def materialize(bank):
    with zipfile.ZipFile(OUTPUT) as z:
        reg=json.loads(z.read('register.json'))
        if set(map(int,reg['items']))!=set(ITEMS) or len(reg['pins'])!=8:
            raise ValueError('Incomplete focus coat registration')
        keys=set()
        for row in reg['items'].values():
            if len(row['frames'])!=8: raise ValueError('Incomplete focus sleeves')
            for frame in row['frames']:
                if 'core' not in frame: raise ValueError('Missing coat body')
                for part in frame.values():
                    keys.update([part] if isinstance(part,str) else part.values())
        for k in keys:
            raw=z.read(k+'.png')
            if hashlib.sha256(raw).hexdigest()!=k or struct.unpack('>II',raw[16:24])!=(640,640):
                raise ValueError('Invalid registered sleeve')
            (bank/(k+'.png')).write_bytes(raw)
    return reg


if __name__=='__main__':
    data=generate()
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(OUTPUT) as z:
            stored=json.loads(z.read('register.json'))
            expected=json.loads(data['register.json'])
            if stored['pins']!=expected['pins'] or stored['items'].keys()!=expected['items'].keys(): raise ValueError('Changed coat receiver')
            for k,row in expected['items'].items():
                old=stored['items'][k]
                if old['waistCut']!=row['waistCut'] or old['panels']!=row['panels'] or old['source']!=row['source'] or len(old['frames'])!=8: raise ValueError('Changed original panels')
                for before,after in zip(old['frames'],row['frames']):
                    if before.keys()!=after.keys(): raise ValueError('Changed coat group')
                    for group in after:
                        old_keys,new_keys=before[group],after[group]
                        if isinstance(new_keys,str): old_keys,new_keys={'all':old_keys},{'all':new_keys}
                        if old_keys.keys()!=new_keys.keys(): raise ValueError('Changed wrist coverage')
                        for form,key in new_keys.items():
                            src=Image.open(io.BytesIO(data[key+'.png']))
                            actual=Image.open(io.BytesIO(z.read(old_keys[form]+'.png')))
                            if actual.size!=src.size or actual.tobytes()!=src.tobytes(): raise ValueError('Changed sleeve pixels')
    else:
        with zipfile.ZipFile(OUTPUT,'w') as z:
            for key,raw in sorted(data.items()): z.writestr(zipfile.ZipInfo(key),raw,compress_type=zipfile.ZIP_DEFLATED)
