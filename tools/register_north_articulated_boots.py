"""Register the original North boot panels to the moving calves of the three male rigs."""
import gzip
import hashlib
import io
import json
import zipfile
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BANK = ROOT / 'tools/rework-combat-wardrobe'
ATLAS = BANK / 'north-articulated-boots.zip'
POOLS = [ROOT/'tools'/k for k in ('rework-base-hd','rework-modular-outfits-hd','rework-weapon-layers-hd')]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def index(pool):
    p = pool/'index.json'
    return json.loads(p.read_bytes() if p.exists() else gzip.decompress(Path(str(p)+'.gz').read_bytes()))


def recover():
    import numpy as np
    from PIL import Image
    pools = [(p,json.loads((p/'archives/archive-index.json').read_bytes())['sources']) for p in POOLS]

    @lru_cache(maxsize=36)
    def original(key):
        for directory,location in pools:
            if key in location:
                r = location[key]
                with zipfile.ZipFile(directory/'archives'/r['archive']) as archive:
                    data = archive.read(r['path'])
                if sha(data) != key:
                    raise ValueError('Changed source ' + key)
                return Image.open(io.BytesIO(data)).convert('RGBA')
        raise KeyError(key)

    rigs = {r['id']:r for r in index(POOLS[0])['records']}
    outfits = {r['id']:r for r in index(POOLS[1])['records']}
    owners = json.loads((BANK/'north-boot-donors.json').read_bytes())
    receiver = json.loads((BANK/'north-rifle-trousers.json').read_bytes())
    donor = rigs[receiver['baseId']]
    if donor['sourcePackSHA256'] != receiver['donor']:
        raise ValueError('Changed stationary shoe model')
    stock = np.asarray(original(receiver['receiver']))[:,:,3]
    stock_knee = donor['pack']['directions']['north']['poses'][0]['LEFT KNEE']['y']*4
    assets, groups, manifest = {}, {}, {'sources':{},'rigs':{}}
    box = [230,373,415,536]
    x0,y0,x1,y1 = box
    x,y = np.meshgrid(np.arange(x0,x1),np.arange(y0,y1))
    for item,parts in owners.items():
        groups[item] = []
        for depth in ('rear','front'):
            combined = Image.new('RGBA',(640,640))
            for part in sorted(parts,key=lambda r:r['depth']):
                row = outfits[part['record']]
                layer = next(l for l in row['pack']['directions']['north']['layers'] if l['id']==part['layer'])
                key = layer['frames'][part['frame']] if layer.get('frames') else layer['source']
                if (row['equipment']['boots']!=int(item) or key!=part['original'] or
                        not layer['id'].startswith('boot'+item+'-') or layer['binding']!={'kind':'fixed'}):
                    raise ValueError('Unexpected boot ownership')
                if (part['depth']<0)==(depth=='rear'):
                    fitted = original(part['fit'])
                    if fitted.size!=(640,640):
                        raise ValueError('Wrong fitted shoe dimensions')
                    bbox=fitted.getbbox()
                    if bbox and not (bbox[0]>=max(235,x0) and bbox[1]>=max(380,y0) and
                                     bbox[2]<=min(409,x1) and bbox[3]<=min(540,y1)):
                        raise ValueError('Boot exceeds registered lower silhouette')
                    combined.alpha_composite(fitted)
            groups[item].append(np.asarray(combined))
        manifest['sources'][item] = list(dict.fromkeys(p['record'] for p in parts))

    def edges(alpha,row):
        # Always follow screen side. The stored punch and armed rigs name
        # the anatomical left leg differently in this rear-facing view.
        runs=np.where(np.diff(np.r_[False,alpha[row]>20,False]))[0].reshape(-1,2)
        wide=runs[(runs[:,1]-runs[:,0])>5]
        if wide.shape!=(2,2) or wide[0,1]>=wide[1,0]:
            raise ValueError('North lower limbs cannot be separated at row '+str(row))
        return wide

    def emit(pixels):
        stream=io.BytesIO()
        Image.fromarray(pixels).save(stream,format='PNG',compress_level=9)
        content=stream.getvalue()
        key=sha(content)
        assets[key+'.png']=content
        return key

    # The sole plane is fixed in these three attacks. Knee height changes
    # slightly. Interpolate between that joint and the actual sole, then
    # register each scanline to its own visible calf without mixing sides.
    for family in ('sword','daggers','focus'):
        record=rigs['v7-'+family+'-north-modular8-north']
        pack=record['pack'];d=pack['directions']['north']
        anatomy=[l for l in d['layers'] if l['id'] in ('underbody','legs')]
        if ([l['id'] for l in anatomy]!=['underbody','legs'] or pack['density']!=4 or
                pack['pivot']!={'x':80,'y':128} or d['clip']!={'frames':8,'fps':12,'loop':False,'contactFrame':4} or
                any(l['binding']!={'kind':'fixed'} or len(l['frames'])!=8 for l in anatomy)):
            raise ValueError('Changed North limb registration')
        tracks={item:[] for item in owners}
        for phase,pose in enumerate(d['poses']):
            legs=Image.new('RGBA',(640,640))
            for l in anatomy:
                legs.alpha_composite(original(l['frames'][phase]))
            alpha=np.asarray(legs)[:,:,3]
            floor=int(np.max(np.where(alpha>20)[0]))
            if floor!=511 or np.max(np.where(stock>20)[0])!=floor:
                raise ValueError('Different ground contact')
            dst_knee=pose['LEFT KNEE']['y']*4
            if abs(dst_knee-pose['RIGHT KNEE']['y']*4)>2 or abs(dst_knee-stock_knee)>9:
                raise ValueError('Moved knee anchors outside registration')
            donor_y=np.rint(np.interp(y[:,0],[y0,dst_knee,floor,y1],[y0+stock_knee-dst_knee,stock_knee,floor,y1])).astype(int)
            sx=np.zeros_like(x)
            for j,sy in enumerate(donor_y):
                # Above the split and below the rounded tip, carry forward
                # the nearest registered cross section. Never mirror the art.
                se=edges(stock,int(np.clip(sy,395,506))); de=edges(alpha,int(np.clip(j+y0,395,506)))
                mid=(de[0,1]+de[1,0])/2
                for side in (0,1):
                    begin,end=de[side];a,b=se[side];scale=(b-a)/(end-begin)
                    if not .65<=scale<=1.55 or max(abs(a-begin),abs(b-end))>22:
                        raise ValueError(f'Calf divergence {family}/{phase}/{j}/{side}')
                    xx=x[j];rows=xx<mid if side==0 else xx>=mid
                    # Preserve the thickness of the welt outside the skin.
                    mapped=xx+.5+np.interp(xx+.5,[begin,end],[a-begin,b-end])
                    sx[j,rows]=np.floor(mapped[rows]).astype(int)
            for item,parts in groups.items():
                rear,front=(image[donor_y[:,None],sx] for image in parts)
                label=dict(x=x0,y=y0,width=x1-x0,height=y1-y0,art=emit(front))
                if np.any(rear[:,:,3]):label['rear']=emit(rear)
                if np.count_nonzero(front[:,:,3])<100:
                    raise ValueError('No front boot pixels')
                tracks[item].append(label)
        key=anatomy[1]['frames'][0]
        joints=['LEFT KNEE','RIGHT KNEE','LEFT LEG','RIGHT LEG']
        manifest['rigs'][key]=dict(source=record['id'],anatomy=anatomy,
            poses=[{k:p[k] for k in joints} for p in d['poses']],tracks=tracks)
    assets['registration.json']=json.dumps(manifest,separators=(',',':')).encode()
    return assets


def materialize(bank):
    with zipfile.ZipFile(ATLAS) as archive:
        data=json.loads(archive.read('registration.json'))
        for rig in data['rigs'].values():
            for track in rig['tracks'].values():
                if len(track)!=8:raise ValueError('Incomplete gait')
                for row in track:
                    for key in (row['art'],row.get('rear')):
                        if key:
                            value=archive.read(key+'.png')
                            if sha(value)!=key:raise ValueError('Changed north shoe')
                            (bank/(key+'.png')).write_bytes(value)
    return data


if __name__=='__main__':
    import sys
    assets=recover()
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(ATLAS) as archive:
            actual=json.loads(archive.read('registration.json'));new=json.loads(assets['registration.json'])
            if actual['sources']!=new['sources'] or actual['rigs'].keys()!=new['rigs'].keys():raise ValueError('Changed sources')
            for key,rig in new['rigs'].items():
                previous=actual['rigs'][key]
                if any(previous[k]!=rig[k] for k in ('source','poses','anatomy')) or previous['tracks'].keys()!=rig['tracks'].keys():raise ValueError('Changed rig')
                for item,track in rig['tracks'].items():
                    for a,b in zip(track,previous['tracks'][item],strict=True):
                        if {k:v for k,v in a.items() if k not in ('art','rear')}!={k:v for k,v in b.items() if k not in ('art','rear')} or a.keys()!=b.keys():raise ValueError('Changed fit')
                        for part in ('art','rear'):
                            if part in a:
                                lhs=Image.open(io.BytesIO(assets[a[part]+'.png']));rhs=Image.open(io.BytesIO(archive.read(b[part]+'.png')))
                                if lhs.tobytes()!=rhs.tobytes():raise ValueError('Changed registered pixels')
    else:
        with zipfile.ZipFile(ATLAS,'w') as archive:
            for name,value in sorted(assets.items()):
                archive.writestr(zipfile.ZipInfo(name),value,compress_type=zipfile.ZIP_DEFLATED)
