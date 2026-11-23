"""Register the original focus glove panels on the two signed lateral orb receivers."""
import hashlib
import io
import json
import sys
import zipfile
from functools import lru_cache
from pathlib import Path

from export_staff_coats import BANK, ROOT, weapons
from register_staff_gloves import LEFT_AXIS, bind

ARCHIVE = ROOT / 'tools/rework-combat-wardrobe/orb-gloves.zip'
CHECKPOINT = ROOT / 'docs/native-hd/editable-female-equipment/checkpoint-2026-11-18'
# Cuff and fingertip in the original native-pixel field, including the open
# palm redrawn for the orb. The underlying staff arm has a different gesture.
PALM = (((355,332),(383,323)), ((364,300),(397,288)), ((374,265),(406,248)),
        ((391,276),(427,253)), ((405,268),(449,260)), ((395,278),(436,270)),
        ((365,315),(396,301)), ((354,340),(385,329)))

def generate(verify=False):
    import numpy as np
    from PIL import Image
    from export_combat_wardrobe import ARCHIVES, read_archive

    index = weapons()
    rig = next(r for r in index['records'] if r['id']=='orb17-east-native-layers')['basePack']['pack']['directions']['east']
    profiles = [r for r in index['orderedAttackProfiles'] if r['id'].startswith('authored-orb-')
                and r['action']=='attack-focus' and r['direction'] in ('east','west')]
    lookup = json.loads((BANK/'archives/archive-index.json').read_bytes())['sources']
    @lru_cache(maxsize=32)
    def native(key):
        row = lookup[key]
        with zipfile.ZipFile(BANK/'archives'/row['archive']) as z:
            raw = z.read(row['path'])
        if hashlib.sha256(raw).hexdigest()!=key:
            raise ValueError('Changed orb receiver '+key)
        return Image.open(io.BytesIO(raw)).convert('RGBA')
    def layer(part,f):
        return native(part['frames'][f] if part.get('frames') else part['source'])
    signed = {}
    east = next(r for r in profiles if r['item']==17 and r['direction']=='east')
    for record in profiles:
        phases=[]
        for f,state in enumerate(record['states']):
            body,gear,restore=state['layers']
            if [body['id'],gear['id'],restore['id']]!=['body','gear','original-anatomy'] or restore['sha256']!=body['sha256']:
                raise ValueError('Unbound original orb hand')
            actual=np.array(native(body['sha256']))
            if record['direction']=='west':actual=actual[:,::-1]
            ref=np.array(native(east['states'][f]['layers'][0]['sha256']))
            if not np.array_equal(actual,ref):raise ValueError('Changed original orb anatomy')
            phases.append([body['sha256'],gear['sha256'],restore['mask']['sha256']])
        if len(phases)!=8:raise ValueError('Incomplete focus sequence')
        signed[record['id']]=phases
    if len(signed)!=4:raise ValueError('Incomplete orb receivers')
    y,x=np.indices((640,640));masks=[]
    for f,pose in enumerate(rig['poses']):
        body=np.array(native(east['states'][f]['layers'][0]['sha256']))
        near=next(p for p in rig['layers'] if p['id']=='forearm-hand-near')
        raw=np.array(layer(near,f))
        def point(key):
            return np.array([pose[key]['x'],pose[key]['y']])*4
        axis=point('RIGHT HAND CENTER')-point('RIGHT ARM')
        start=point('RIGHT ARM')-.6*axis
        right=np.where((x-start[0])*axis[0]+(y-start[1])*axis[1]>=0,raw[:,:,3],0)
        if np.max(np.abs(body.astype(int)-raw.astype(int))[right>40])>4:
            raise ValueError('Unregistered near wrist')
        # Compare the actual approved orb body with the same rig excluding
        # the far arm, only inside the distal palm. No donor anatomy is copied.
        behind=Image.new('RGBA',(640,640))
        for p in rig['layers']:
            if p['id'] in ('upper-arm-far','forearm-hand-far') or p['slot'] in ('face','headBase','hair'):continue
            if p['binding']!={'kind':'fixed'}:raise ValueError('Unknown arm background')
            behind.alpha_composite(layer(p,f))
        wrist,tip=map(np.array,PALM[f]);vector=tip-wrist
        free=(x-wrist[0])*vector[0]+(y-wrist[1])*vector[1]>=0
        free&=((x-wrist[0])**2+(y-wrist[1])**2<55**2)&(x>=343)&(y>=227)
        own=np.abs(body.astype(int)-np.array(behind).astype(int)).max(axis=2)>4
        left=np.where(free&own,body[:,:,3],0)
        if not (360<np.count_nonzero(left)<1800 and 510<np.count_nonzero(right)<850):
            raise ValueError('Invalid area of a receiving hand '+str((f,np.count_nonzero(left),np.count_nonzero(right))))
        masks.append(((left,vector),(right,axis)))
    archive=read_archive(CHECKPOINT,'focus')
    rows=[r for r in json.loads(archive['orbe-cajado-reviewed-gloves/map.json'])['rows'] if r['direction']=='east']
    bank={hashlib.sha256(v).hexdigest():v for k,v in archive.items() if k.endswith('.png')}
    items={}; assets={}
    for row in rows:
        item=str(row['item']);hands={}
        for part in row['layers']:
            side=part['id'].split(':')[-1]
            if side not in ('left','right') or part['id']!='reviewed-gloves:'+item+':'+side or part['binding']!={'kind':'fixed'}:
                raise ValueError('Unowned glove material')
            track=[]
            for f,src in enumerate(part['frames']):
                coverage,axis=masks[f][0 if side=='left' else 1]
                cloth=Image.open(io.BytesIO(bank[src])).convert('RGBA')
                if cloth.size!=(640,640):raise ValueError('Invalid material density')
                art=bind(cloth,coverage,axis,LEFT_AXIS[f] if side=='left' else (2,-29))
                alpha=np.asarray(art)[:,:,3];n=int(np.count_nonzero(alpha))
                if n<.62*np.count_nonzero(coverage) or np.any(alpha>coverage):
                    raise ValueError('Unowned garment '+str((item,side,f,n)))
                out=io.BytesIO();art.save(out,format='PNG',optimize=True);data=out.getvalue()
                key=hashlib.sha256(data).hexdigest();assets[key+'.png']=data
                track.append(dict(art=key,source=src,pixels=n))
            hands[side]=track
        if set(hands)!={'left','right'} or len(track)!=8:raise ValueError('Incomplete hand')
        items[item]=hands
    if len(items)!=10:raise ValueError('Incomplete catalogue')
    manifest=dict(sourceArchive=ARCHIVES['focus'],ordered=signed,items=items)
    if verify:
        with zipfile.ZipFile(ARCHIVE) as z:
            stored=json.loads(z.read('registration.json'))
            if stored['sourceArchive']!=manifest['sourceArchive'] or stored['ordered']!=signed or stored['items'].keys()!=items.keys():
                raise ValueError('Unregistered receiver')
            for item,hands in items.items():
                for side,track in hands.items():
                    for a,b in zip(track,stored['items'][item][side],strict=True):
                        if a['source']!=b['source'] or a['pixels']!=b['pixels'] or Image.open(io.BytesIO(assets[a['art']+'.png'])).tobytes()!=Image.open(io.BytesIO(z.read(b['art']+'.png'))).tobytes():
                            raise ValueError('Changed orb glove panel')
        return
    assets['registration.json']=json.dumps(manifest,separators=(',',':')).encode()
    with zipfile.ZipFile(ARCHIVE,'w') as z:
        for name,data in sorted(assets.items()):
            z.writestr(zipfile.ZipInfo(name),data,compress_type=zipfile.ZIP_DEFLATED)

if __name__=='__main__':
    generate('--verify' in sys.argv)
