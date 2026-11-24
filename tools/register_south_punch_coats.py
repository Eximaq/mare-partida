"""Bind the original modular coats to the signed twelve-state front punch."""
import hashlib
import io
import json
import math
import struct
import sys
import zipfile
from functools import lru_cache
from pathlib import Path

from export_staff_coats import BANK, weapons
from register_south_focus_trousers import ROOT, OUTFITS, index
from register_south_punch_gloves import NEAR, FAR

ARCHIVE = ROOT / 'tools/rework-combat-wardrobe/south-punch-coats.zip'
# Right/left shoulder, elbow and wrist, in native 640px coordinates.
# These four in-between drawings are present in the armed twelve-state clip.
PROJECTED = [
    ([(284,254),(264,299),(288,292)], [(361,254),(377,299),(351,292)]),
    ([(284,254),(263,297),(279,317)], [(361,254),(379,297),(362,317)]),
    ([(284,254),(262,299),(273,319)], [(361,254),(380,300),(368,319)]),
    ([(284,254),(253,302),(255,336)], [(361,254),(387,302),(385,336)]),
]
COATS = {6,7,130,137,144,151,158,165,172,179}
SIZE = (640,640)

def generate():
    from PIL import Image, ImageDraw, ImageChops
    assets = {}
    records = index(OUTFITS)['records']
    originals = {bank:json.loads((bank / 'archives/archive-index.json').read_bytes())['sources']
                 for bank in (OUTFITS,BANK)}
    @lru_cache(maxsize=100)
    def read(bank,key):
        row = originals[bank][key]
        with zipfile.ZipFile(bank / 'archives' / row['archive']) as archive:
            raw = archive.read(row['path'])
        if hashlib.sha256(raw).hexdigest() != key:
            raise ValueError('Changed original: ' + key)
        return Image.open(io.BytesIO(raw)).convert('RGBA')

    def tile():
        return Image.new('RGBA',SIZE)
    def save(img):
        buf = io.BytesIO()
        img.save(buf,format='PNG',optimize=True)
        raw = buf.getvalue()
        key = hashlib.sha256(raw).hexdigest()
        assets[key+'.png'] = raw
        return key
    def padded(key,registration):
        im = read(OUTFITS,key)
        if im.size == SIZE and not registration:
            return im
        if im.size != (512,512) or registration['sourceSize'] != 512 or registration['offset'] != 64:
            raise ValueError('Unexpected outfit density or offset '+key)
        result = tile()
        result.paste(im,(64,64))
        return result
    def fit(im,a,b,c,d,distal=False):
        angle = math.atan2(d[1]-c[1],d[0]-c[0])-math.atan2(b[1]-a[1],b[0]-a[0])
        cos,sin = math.cos(angle),math.sin(angle)
        (x,y),(X,Y) = (b,d) if distal else (a,c)
        tx,ty = X-cos*x+sin*y,Y-sin*x-cos*y
        return im.transform(SIZE,Image.Transform.AFFINE,
                            (cos,sin,-cos*tx-sin*ty,-sin,cos,sin*tx-cos*ty),Image.Resampling.NEAREST)
    def xy(p):
        return (p['x']*4,p['y']*4)
    def projected(anchors,arms):
        coords = {joint:xy(value) for joint,value in anchors.items()}
        for side,points in zip(('RIGHT','LEFT'),arms):
            for joint,p in zip(('SHOULDER','ELBOW','ARM'),points):
                coords['cloth:'+side+' '+joint] = p
        return coords
    def sleeve151(im,a,b,c,d,distal):
        out = fit(im,a,b,c,d,distal)
        cover = Image.new('L',SIZE)
        draw = ImageDraw.Draw(cover)
        draw.line([c,d],fill=255,width=40)
        for x,y in (c,d):
            draw.ellipse((x-20,y-20,x+20,y+20),fill=255)
        out.putalpha(ImageChops.multiply(out.getchannel('A'),cover))
        return out

    receiver = next(r for r in weapons()['orderedAttackProfiles'] if r['id']=='authored-ordered-14-south')
    hashes = [s['layers'][0]['sha256'] for s in receiver['states']]
    if len(hashes)!=12 or any(s['layers'][0]['component']!='anatomy' for s in receiver['states']):
        raise ValueError('Invalid front punch receiver')
    hand_masks = []
    for f,key in enumerate(hashes):
        mask = Image.new('L',SIZE)
        for outline in (NEAR[f][1],FAR[f][1]):
            ImageDraw.Draw(mask).polygon(outline,fill=255)
        hand_masks.append(ImageChops.multiply(mask,read(BANK,key).getchannel('A')))
    atlas = {}
    for item in sorted(COATS):
        name = ('male-torso'+str(item)+'-south-frozen-attack-native-candidate' if item!=151 else
                'male-pants133-attack-unarmed-south-drawn8-candidate-coat151-native')
        row = next(r for r in records if r['id']==name)
        pack = row['pack']; model = pack['directions']['south']
        if (row['equipment'].get('torso')!=item or row['body']!='male' or pack['density']!=4 or
                pack['frame']['width']!=160 or pack['pivot']!={'x':80,'y':128} or len(model['poses'])!=8):
            raise ValueError('Invalid modular garment '+name)
        layers = [l for l in model['layers'] if l['id'].startswith('coat'+str(item)+'-')]
        owned = {h for l in layers for h in (l['frames'] if 'frames' in l else [l['source']])}
        if not layers or not owned.issubset(row['sourceRefs']):
            raise ValueError('Missing owned garment '+name)
        materials = set(owned)
        if item==151:
            idle = next(r for r in records if r.get('isolatedCoat151') and r['direction']=='south' and r['action']=='idle')
            idle_parts = [l for l in idle['pack']['directions']['south']['layers'] if l['id'].startswith('coat151')]
            parts = {l['id'].removeprefix('coat151-own-original-control-'):l['source'] for l in idle_parts}
            if set(parts)!={'core','hem','right-upper','right-lower','left-upper','left-lower','coat151-rear-openings'}:
                raise ValueError('Seven original coat 151 panels required')
            materials.update(parts.values())
            def idle_panel(name):
                return padded(parts[name],{'sourceSize':512,'offset':64}).copy()
        frames = []
        for f in range(12):
            source_phase = f if f<7 else 7
            arms = PROJECTED[f-7] if 7<=f<=10 else None
            back,front = tile(),tile()
            if item==151 and arms:
                for part_name in ('coat151-rear-openings','core','hem'):
                    part = idle_panel(part_name)
                    if part_name=='coat151-rear-openings':
                        part.paste((0,0,0,0),(0,300,640,640))
                    part.paste((0,0,0,0),(0,330,245,365));part.paste((0,0,0,0),(398,330,640,365))
                    front.alpha_composite(part)
                for side,coords in zip(('right','left'),arms):
                    rest = [xy(model['rest'][side.upper()+' '+j]) for j in ('SHOULDER','ELBOW','ARM')]
                    for j,part in enumerate(('upper','lower')):
                        front.alpha_composite(sleeve151(idle_panel(side+'-'+part),rest[j],rest[j+1],coords[j],coords[j+1],j==1))
            else:
                pose = model['poses'][source_phase]
                placed = projected(pose,arms or ())
                for layer in sorted(layers,key=lambda l:l['depth']):
                    h = layer['frames'][source_phase] if 'frames' in layer else layer['source']
                    im = padded(h,row.get('sourceRasterPadding',{}).get(h))
                    bind = layer['binding']
                    if bind['kind']=='rigid':
                        a,b = bind['a'],bind['b']
                        if not (a.startswith('cloth:') and b.startswith('cloth:')):
                            raise ValueError('Unexpected garment bone')
                        im = fit(im,xy(model['rest'][a]),xy(model['rest'][b]),placed[a],placed[b])
                    elif item!=151 or bind!={'kind':'fixed'}:
                        raise ValueError('Unexpected garment binding')
                    if layer['depth'] not in (-5,-1,100,101) or layer.get('depthTrack'):
                        raise ValueError('Unexpected garment depth')
                    (back if layer['depth']<0 else front).alpha_composite(im)
            front.putalpha(ImageChops.subtract(front.getchannel('A'),hand_masks[f]))
            if not front.getbbox():
                raise ValueError('Missing garment surface')
            frames.append(dict(front=save(front),rear=save(back) if back.getbbox() else None))
        atlas[str(item)] = dict(record=name,materials=sorted(materials),phases=frames)
    result = dict(bodyHashes=hashes,items=atlas)
    assets['registration.json']=json.dumps(result,separators=(',',':')).encode()
    return assets

def materialize(bank):
    with zipfile.ZipFile(ARCHIVE) as archive:
        reg = json.loads(archive.read('registration.json'))
        if set(map(int,reg['items']))!=COATS or len(reg['bodyHashes'])!=12:
            raise ValueError('Incomplete South coat bank')
        for item,entry in reg['items'].items():
            if len(entry['phases'])!=12 or not entry['materials']:
                raise ValueError('Incomplete South coat '+item)
            for phase in entry['phases']:
                for key in (phase['front'],phase['rear']):
                    if key is None:continue
                    data = archive.read(key+'.png')
                    if hashlib.sha256(data).hexdigest()!=key or struct.unpack('>II',data[16:24])!=SIZE:
                        raise ValueError('Invalid South coat material')
                    (bank/(key+'.png')).write_bytes(data)
    return reg

if __name__=='__main__':
    data = generate()
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(ARCHIVE) as current:
            before,after = json.loads(current.read('registration.json')),json.loads(data['registration.json'])
            if before['bodyHashes']!=after['bodyHashes'] or before['items'].keys()!=after['items'].keys():
                raise ValueError('Receiver changed')
            for item,row in after['items'].items():
                saved = before['items'][item]
                if row['materials']!=saved['materials'] or row['record']!=saved['record']:raise ValueError('Sources changed')
                for f,(a,b) in enumerate(zip(row['phases'],saved['phases'],strict=True)):
                    for field in ('rear','front'):
                        x,y = a[field],b[field]
                        if bool(x)!=bool(y) or x and Image.open(io.BytesIO(data[x+'.png'])).tobytes()!=Image.open(io.BytesIO(current.read(y+'.png'))).tobytes():
                            raise ValueError(f'Changed {item}/{f}/{field}')
    else:
        with zipfile.ZipFile(ARCHIVE,'w') as out:
            for name,raw in sorted(data.items()):
                out.writestr(zipfile.ZipInfo(name),raw,compress_type=zipfile.ZIP_DEFLATED)
