"""Bind the signed focus glove panels to the sculpted hand of the side scepter."""
import hashlib
import io
import json
import struct
import sys
import zipfile
from functools import lru_cache
from pathlib import Path

from export_staff_coats import BANK, REGISTRATION, package, weapons

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'tools/rework-combat-wardrobe/scepter-profile-gloves.zip'
BODY = ["80d4b0e44b1f34c7be8aa8be7bbd65ff2308033285b35641c09e1de5dc306742","876091f363321cdd3b9b757c808c8f736332a9cd4bf6fe4e545452cd8febbe50","c9e4d8f12eeb01826e3213ecad379ef6a77f4e95c6cc98515b13357839adc7ef","a1f30d41937abc4beec2a072442a8faddc06a38b65fa5ba7cc9827a855bda827","9859fc0d6f4436e33e0f08b9a0c38370f77624e86dfb6e883d9abf154fb33d6b","3f81242096bf40024ed5b411bcb1174f59f02c39a522938f875327c20a33c353","567a50cd3a78ffcaeec9fc80820711dff919edf8d164dfaa699ea700306ad6e9","d78738d632d06c533a72e0caecd08d1d6bd50a20f0abb9773d17ab79b247241b"]
REFERENCE = ["94b5506ea2c9d0340e16bd3269d1058eec0b3d7dabf59a061323ac73a720fca0","e0707dea2a9acc262a12d1b910cc81ce71a5c1b15b95b320b9bb3e57609707c3","9bcd8f0a8451b22598cef02ab0f9ecec54e65eb7623320bff9536b874b3f977e","6e72330d4a1ddb28f948f84a7e5fefaa46a8a89637c6fda843c36b4a76523501","37c4b332b83bb883d2e7d7e8218e0cfe18addc7a3d6784f6676c57e2d4eaf092","f2ac9d28b271ab23ca26692dbfca5d5f73e956de7b9105b516b3783f980ed1d5","dc5316ed050bbf561a8fb664c39619872e60afafc84dd5a0ffc6f2cd6f7a6870","f51cf31d9173dea1f38c10d159d0b7ded22bcf9c44b0bbbe07159274d7f63f95"]


def generate():
    import numpy as np
    from PIL import Image
    from export_combat_wardrobe import read_archive
    from register_staff_gloves import bind

    rows = json.loads((BANK / 'archives/archive-index.json').read_bytes())['sources']
    @lru_cache(maxsize=48)
    def image(key):
        row = rows[key]
        with zipfile.ZipFile(BANK / 'archives' / row['archive']) as z:
            data = z.read(row['path'])
        if hashlib.sha256(data).hexdigest() != key:
            raise ValueError('Unregistered scepter source ' + key)
        return Image.open(io.BytesIO(data)).convert('RGBA')

    assets = {}
    def emit(im):
        buf = io.BytesIO()
        im.save(buf, format='PNG', optimize=True)
        data = buf.getvalue()
        key = hashlib.sha256(data).hexdigest()
        assets[key+'.png'] = data
        return key

    phases = next(r['states'] for r in weapons()['orderedAttackProfiles'] if r['id']=='authored-ordered-124-east')
    by_frame = json.loads(REGISTRATION.read_bytes())
    masks, covers = [], []
    yy, xx = np.indices((640,640))
    with package(121) as approved:
        for f,state in enumerate(phases):
            painted = np.asarray(image(BODY[f]))
            ref = np.asarray(image(REFERENCE[f]))
            diff = np.any(painted != ref, axis=2)
            if np.any(diff & (yy>215) & ~((xx>=350)&(xx<=382)&(yy>=296)&(yy<=326))):
                raise ValueError('Upper arm or lower-body divergence')
            changes = diff & (yy>215)
            far = Image.new('RGBA',(640,640))
            for part in state['layers']:
                if part['id']=='gear':break
                far.alpha_composite(image(part['sha256']))
            exposed = np.any(painted != np.asarray(far), axis=2) & (painted[:,:,3]>0)
            hand = next(l for l in state['layers'] if l['id']=='grip')
            front = np.array(image(hand['sha256']))[:,:,3].copy()
            distal = np.zeros_like(front)
            for start,length in by_frame[f]:
                distal.ravel()[start:start+length] = front.ravel()[start:start+length]
            new = np.where(exposed,painted[:,:,3],0)
            distal[changes] = new[changes]
            front[changes] = new[changes]
            if not 350<np.count_nonzero(distal)<1050 or np.any(distal>front):
                raise ValueError('Unexpected native grip shape')
            metal = np.asarray(Image.open(io.BytesIO(approved.read(f'GEAR121-{f}.png'))))
            if not np.any(metal & distal):
                raise ValueError('Lost scepter contact')
            mask = Image.new('RGBA',(640,640),'white'); mask.putalpha(Image.fromarray(front))
            covers.append(emit(mask));masks.append(distal)
    source = read_archive(ROOT/'docs/native-hd/editable-female-equipment/checkpoint-2026-11-18','focus')
    raws = {hashlib.sha256(data).hexdigest():data for k,data in source.items() if k.endswith('.png')}
    track = json.loads(source['orbe-cajado-reviewed-gloves/map.json'])['rows']
    clothes = {}
    for row in track:
        if row['direction']!='east':continue
        n = str(row['item'])
        near, = [l for l in row['layers'] if l['id']=='reviewed-gloves:'+n+':right']
        if near['binding']!={'kind':'fixed'} or len(near['frames'])!=8:raise ValueError('Wrong glove clock or owner')
        clothes[n]=[]
        for key,mask in zip(near['frames'],masks,strict=True):
            im=bind(Image.open(io.BytesIO(raws[key])).convert('RGBA'),mask,(33,1),(2,-29))
            alpha=np.asarray(im)[:,:,3]
            if np.any(alpha>mask) or np.count_nonzero(alpha)<.6*np.count_nonzero(mask):raise ValueError('Invalid palm')
            clothes[n].append(dict(source=key,art=emit(im)))
    if len(clothes)!=10:raise ValueError('Incomplete scepter gloves')
    return assets,dict(body=BODY,occlusion=covers,right=clothes)


def materialize(bank):
    with zipfile.ZipFile(OUTPUT) as z:
        reg=json.loads(z.read('registration.json'))
        keys=set(reg['occlusion'])
        if len(reg['right'])!=10 or len(reg['occlusion'])!=8:raise ValueError('Incomplete scepter grip')
        for track in reg['right'].values():
            if len(track)!=8:raise ValueError('Wrong glove clock')
            keys.update(row['art'] for row in track)
        for key in keys:
            data=z.read(key+'.png')
            if hashlib.sha256(data).hexdigest()!=key or struct.unpack('>II',data[16:24])!=(640,640):raise ValueError('Invalid glove raster')
            (bank/(key+'.png')).write_bytes(data)
    return reg


if __name__=='__main__':
    assets,reg=generate()
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(OUTPUT) as z:
            old=json.loads(z.read('registration.json'))
            if old['body']!=reg['body'] or old['right'].keys()!=reg['right'].keys():raise ValueError('Scepter provenance changed')
            matches=list(zip(old['occlusion'],reg['occlusion'],strict=True))
            for k,rows in reg['right'].items():
                for a,b in zip(old['right'][k],rows,strict=True):
                    if a['source']!=b['source']:raise ValueError('Changed glove source')
                    matches.append((a['art'],b['art']))
            for a,b in matches:
                if Image.open(io.BytesIO(z.read(a+'.png'))).tobytes()!=Image.open(io.BytesIO(assets[b+'.png'])).tobytes():raise ValueError('Changed bound pixels')
    else:
        assets['registration.json']=json.dumps(reg,separators=(',',':')).encode()
        with zipfile.ZipFile(OUTPUT,'w') as z:
            for name,data in sorted(assets.items()):z.writestr(zipfile.ZipInfo(name),data,compress_type=zipfile.ZIP_DEFLATED)
