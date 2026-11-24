"""Bind each approved South textile and boot to the two actual blade leg cycles."""
import hashlib
import io
import json
import sys
import zipfile
from functools import lru_cache

from register_south_focus_trousers import ROOT, BASE, OUTFITS, index
from export_staff_coats import BANK, weapons

DIR = ROOT / 'tools/rework-combat-wardrobe'
OUTPUT = DIR / 'south-blade-legs.zip'
PHASES = [0, 0, 1, 2, 3, 4, 5, 6, 7]


def generate():
    import numpy as np
    from PIL import Image, ImageDraw

    sources = {b: json.loads((b/'archives/archive-index.json').read_bytes())['sources'] for b in (BASE, OUTFITS, BANK)}
    runtime = (ROOT/'player-rework-weapon-native-hd.js').read_text(encoding='utf8')

    def authority(name):
        return json.JSONDecoder().raw_decode(runtime.split('const '+name+'=', 1)[1])[0]

    @lru_cache(maxsize=180)
    def image(key):
        key = key.split('/')[-1].removesuffix('.png')
        for bank, rows in sources.items():
            if key in rows:
                row = rows[key]
                with zipfile.ZipFile(bank/'archives'/row['archive']) as archive:
                    raw = archive.read(row['path'])
                if hashlib.sha256(raw).hexdigest() != key:
                    raise ValueError('Changed South source '+key)
                return Image.open(io.BytesIO(raw)).convert('RGBA')
        raise KeyError(key)

    def runs(mask):
        edges = np.flatnonzero(np.diff(np.r_[False, mask.ravel(), False])).reshape(-1, 2)
        return [[int(a), int(b-a)] for a,b in edges]

    files = {}
    def emit(bitmap):
        box = bitmap.getbbox()
        if not box:
            return None
        stream = io.BytesIO()
        bitmap.crop(box).save(stream, format='PNG')
        raw = stream.getvalue()
        key = hashlib.sha256(raw).hexdigest()
        files[key+'.png'] = raw
        return [key, *box[:2]]

    records = {r['id']: r for r in index(BASE)['records']}
    pants = json.loads((DIR/'south-focus-trousers.json').read_bytes())
    boots = json.loads((DIR/'south-focus-boots.json').read_bytes())
    donor = records[pants['receiver']]
    if donor['sourcePackSHA256'] != pants['sha'] or donor['sourcePackSHA256'] != boots['sha']:
        raise ValueError('Changed standing garment references')
    def anatomy(r, f):
        d = r['pack']['directions']['south']
        body, stock = d['layers'][:2]
        if [body['id'], stock['id']] != ['skin-arms-phase','shorts-phase'] or d['clip']['frames'] != 8:
            raise ValueError('Unexpected waist or clock')
        skin, indigo = [np.asarray(image(l['frames'][f])) for l in (body, stock)]
        component = Image.fromarray((indigo[:,:,3]>0).astype('uint8')).copy()
        seed = np.flatnonzero(indigo[355,295:345,3])
        ImageDraw.floodfill(component,(int(seed[len(seed)//2])+295,355),255)
        garment = np.asarray(component)==255
        yy, xx = np.where(garment)
        if not (5600 < len(yy) < 7700 and 310 <= yy.min() <= 325 and 395 < yy.max() < 415):
            raise ValueError('Unregistered stock silhouette')
        return skin, garment, int(yy.min())

    def coords(source, target):
        # Follow each independently planted foot, including the wide sword lunge.
        # Overhanging cuffs keep their native width beyond the anatomical contour.
        sy, sx = source[2], target[2]
        def landmarks(row):
            skin,stock,waist=row
            levels=[waist+21,waist+44,385,411,425,452,478,491,500,504]
            data=[]
            for i,y in enumerate(levels):
                mask=stock if i<3 else skin[:,:,3]>63
                half=[]
                for left in (0,320):
                    rows=[]
                    for j in (y-1,y,y+1):
                        xs=np.flatnonzero(mask[j,left:left+320])+left
                        if len(xs)<4:
                            raise ValueError('Missing measured hip, knee or sole at '+str((y,left)))
                        rows.append([xs[0],xs[-1]])
                    half.extend(np.median(rows,axis=0))
                data.append(half)
            return levels,np.array(data)
        old, a=landmarks(source)
        new, b=landmarks(target)
        ys=np.arange(640)
        iy=np.rint(np.interp(ys,[0,sx,*new,512,639],[0,sy,*old,512,639])).astype(int)
        origin=np.array([np.interp(iy,old,a[:,j]) for j in range(4)]).T
        dest=np.array([np.interp(ys,new,b[:,j]) for j in range(4)]).T
        midpoint=np.mean(dest[:,1:3],axis=1)
        x=np.arange(640)[None,:]
        def leg(side):
            li,ri=side*2,side*2+1
            l,r=dest[:,li,None],dest[:,ri,None]
            u,v=origin[:,li,None],origin[:,ri,None]
            return np.where(x<l,x+u-l,np.where(x>r,x+v-r,u+(x-l)*(v-u)/(r-l)))
        ix=np.rint(np.where(x<midpoint[:,None],leg(0),leg(1))).astype(int).clip(0,639)
        return iy,ix

    bank={}
    y,x=np.indices((640,640))
    for fam in ('sword','daggers'):
        r=records['v7-'+fam+'-drawn8-south']
        d=r['pack']['directions']['south']
        items={}
        track=[]
        for f in range(8):
            src=anatomy(donor,f)
            target=anatomy(r,f)
            skin,stock,waist=target
            iy,ix=coords(src,target)
            def fit(pic):
                return Image.fromarray(np.asarray(pic)[iy[:,None],ix])
            # Skin outboard of the center at the belt is the original distal arm.
            # Below the top edge, sections inside the stock belong to the clothing.
            # Source forearms overlaid separately by the blade are handled per weapon.
            xs=np.where(stock[waist+18])[0]
            arm=(skin[:,:,3]>0)&(y>=waist-15)&(y<382)&((x<xs[0]-2)|(x>xs[-1]+2))
            for item,p in pants['items'].items():
                fitted=fit(image(p['sha']))
                alpha=np.asarray(fitted)[:,:,3]
                row=items.setdefault('pants'+item,dict(sources=[p['sha']],origin=p['source'],phases=[]))
                row['phases'].append(dict(front=emit(fitted),cut=runs(stock&(alpha>0)&p['replace'])))
            for item,b in boots['items'].items():
                rear,front=[Image.new('RGBA',(640,640)) for _ in range(2)]
                for layer in b['layers']:
                    plate=rear if layer['depth']<0 else front
                    plate.alpha_composite(image(layer['plate']),tuple(layer['offsets'][f]))
                rear,front=fit(rear),fit(front)
                ink=(np.asarray(rear)[:,:,3]>0)|(np.asarray(front)[:,:,3]>0)
                if np.any(ink[:375]):
                    raise ValueError('Boot crossed into the waist')
                trim=np.zeros_like(ink)
                for left in (0,320):
                    for yy in range(478,518):
                        span=np.where(ink[yy,left:left+320])[0]
                        if span.size:
                            foot=skin[yy,left:left+320,3]>0
                            foot[span[0]:span[-1]+1]=False
                            trim[yy,left:left+320]=foot
                row=items.setdefault('boots'+item,dict(sources=[l['plate'] for l in b['layers']],origin='+'.join(l['record']+'/'+l['id'] for l in b['layers']),phases=[]))
                row['phases'].append(dict(front=emit(front),rear=emit(rear),cut=runs(trim)))
            track.append(dict(stock=stock,arm=arm))
        bank[fam]=dict(items=items,pins=[l['frames'] for l in d['layers'][:2]],frames=track)

    raw=weapons()['records']
    daggers=authority('ownDaggersSouthProof')
    for block in runtime.split('Object.assign(ownDaggersSouthProof.frames,')[1:]:
        daggers['frames'].update(json.JSONDecoder().raw_decode(block)[0])
    zero=authority('case42W0Material')
    guards={}
    def crop(key):
        pic=image(key)
        if pic.size not in ((640,640),(896,896)):
            raise ValueError('Changed native blade density')
        p=(pic.width-640)//2
        return np.array(pic.crop((p,p,p+640,p+640)))
    for row in raw:
        if row.get('body')!='male' or row.get('direction')!='south':
            continue
        name=row['id']
        if name=='sword0-south-historical-layers':
            fam='sword';parts=[s['layers'][1:] for s in zero]
        elif row.get('item') in (1,67,68,69,70) and name.endswith('-south-native-layers'):
            fam='sword';parts=[[l['sha256'] for l in s['layers'][1:]] for s in row['states']]
        elif str(row.get('item')) in daggers['frames'] and name.endswith('-south-native-original-source') and name.startswith('daggers'):
            fam='daggers';parts=[s[2:] for s in daggers['frames'][str(row['item'])]['states']]
        else:
            continue
        if len(parts)!=9 or len(row['states'])!=9:
            raise ValueError('Wrong native contact count')
        phases=[]
        for i,(blade,fore) in enumerate(parts):
            f=PHASES[i]
            geometry=bank[fam]['frames'][f]
            metal=crop(blade)[:,:,3]>0
            hand=crop(fore)
            stock=crop(bank[fam]['pins'][1][f])
            covered=(hand[:,:,3]>0)&~(geometry['stock']&np.all(hand==stock,axis=2))
            guard=(metal|covered|geometry['arm'])&(y>=294)&(y<522)
            phases.append(dict(phase=f,guard=runs(guard),approval=row['states'][i]['approved']['sha256']))
        guards[str(row['item'])]=dict(family=fam,pad=(row['nativeCanvas'][0]-640)//2,phases=phases)
    if len(guards)!=12 or any(len(v['items'])!=20 for v in bank.values()):
        raise ValueError('Incomplete blade wardrobe')
    for family in bank.values():
        del family['frames']
    files['register.json']=json.dumps(dict(rigs=bank,guards=guards),separators=(',',':')).encode()
    return files


def south_blade_legs(folder):
    with zipfile.ZipFile(OUTPUT) as archive:
        register=json.loads(archive.read('register.json'))
        for family in register['rigs'].values():
            for garment in family['items'].values():
                for phase in garment['phases']:
                    for key in ('rear','front'):
                        if phase.get(key):
                            digest=phase[key][0]
                            raw=archive.read(digest+'.png')
                            if hashlib.sha256(raw).hexdigest()!=digest:
                                raise ValueError('Changed fitted blade textile')
                            (folder/(digest+'.png')).write_bytes(raw)
        return register


if __name__=='__main__':
    files=generate()
    if '--verify' in sys.argv:
        with zipfile.ZipFile(OUTPUT) as archive:
            if set(archive.namelist())!=files.keys() or any(archive.read(k)!=v for k,v in files.items()):
                raise ValueError('Changed blade leg registration')
    else:
        with zipfile.ZipFile(OUTPUT,'w') as archive:
            for k,v in sorted(files.items()):
                archive.writestr(zipfile.ZipInfo(k),v,compress_type=zipfile.ZIP_DEFLATED)
