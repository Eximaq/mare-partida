"""Bind helmets to the signed original head inside each flattened pistol/rifle pose."""
import hashlib
import io
import json
import sys
import zipfile
from functools import lru_cache
from export_staff_coats import BANK,ROOT,weapons
from register_south_focus_trousers import BASE,index

OUT=ROOT/'tools/rework-combat-wardrobe/firearm-original-heads.json'
RIGS={d:('male-attack-unarmed-south-drawn8' if d=='south' else f'v7-punch-{d}-drawn8-{d}') for d in ('north','east','west','south')}


def generate():
    import numpy as np
    from PIL import Image
    bases={r['id']:r for r in index(BASE)['records']}
    archive={b:json.loads((b/'archives/archive-index.json').read_bytes())['sources'] for b in (BASE,BANK)}
    @lru_cache(maxsize=64)
    def image(b,key):
        row=archive[b][key]
        with zipfile.ZipFile(b/'archives'/row['archive']) as z:raw=z.read(row['path'])
        if hashlib.sha256(raw).hexdigest()!=key:raise ValueError('Changed firearm head')
        art=Image.open(io.BytesIO(raw)).convert('RGBA')
        if art.size!=(640,640):raise ValueError('Head density or bounds changed')
        return art
    refs={}
    for record in weapons()['records']:
        if record['id'] not in {f'pistolas114-{d}-native-original-source' for d in RIGS}|{'rifle116-south-original-body-native-layers'}:continue
        d=record['direction'];rig=bases[RIGS[d]];local=rig['pack']['directions'][d]
        parts=[p for p in sorted(local['layers'],key=lambda l:l['depth']) if p['slot'] in ('headBase','face','hair')]
        if not all(p['binding']=={'kind':'rigid','a':'NECK','b':'NOSE'} and not p.get('frames') for p in parts):raise ValueError('Different head mount')
        native=Image.new('RGBA',(640,640))
        for p in parts:native.alpha_composite(image(BASE,p['source']))
        head=np.asarray(native);y,x=np.where((head[:,:,3]>160)&(np.indices((640,640))[0]<231))
        sample=np.arange(0,len(y),19);sy,sx=y[sample],x[sample];target=head[sy,sx].astype(int)
        if min(len(sy),len(sx))<250:raise ValueError('Unverified receiving head')
        states=[]
        for f,state in enumerate(record['states']):
            key=state['approved']['sha256']
            if len(state['layers'])!=1 or state['layers'][0]['sha256']!=key or state['layers'][0]['operation']!='source-over':raise ValueError('Unexpected composite registration')
            origin=np.array(image(BANK,key));votes=[]
            for dy in range(-10,11):
                for dx in range(-10,11):
                    ok=(abs(origin[sy+dy,sx+dx].astype(int)-target).max(axis=1)<=2).sum()
                    votes.append((int(ok),dx,dy))
            count,dx,dy=max(votes)
            if count<.85*len(sy):raise ValueError(('Changed source head',record['id'],f,count,len(sy),dx,dy))
            placed=np.roll(head,(dy,dx),(0,1))
            # Foreign pixels in the crown region (a raised muzzle or arm)
            # stay above the helmet even when they cover the native hair.
            yy,xx=np.indices((640,640));changed=abs(placed.astype(int)-origin.astype(int)).max(axis=2)>3
            protect=(yy<232+dy)&(yy>=74)&(xx>187)&(xx<455)&(origin[:,:,3]>0)&changed
            # At the translucent skin-to-neck seam, both belong to the actor;
            # only positive color/coverage changes indicate a separate surface.
            diff=np.flatnonzero(np.diff(np.r_[False,protect.ravel(),False])).reshape(-1,2)
            states.append(dict(state=state['state'],sha=key,x=dx,y=dy,match=[count,len(sy)],
                               guard=[[int(a),int(b-a)] for a,b in diff]))
        refs[record['sourceArchiveSHA256']+'/'+d]=dict(source=record['id'],rig=rig['id'],pack=rig['sourcePackSHA256'],
            fps=record['fps'],timeline=record['timeline'],parts=[p['source'] for p in parts],states=states)
    if len(refs)!=5:raise ValueError('Expected four pistol directions and the original South rifle')
    return refs


if __name__=='__main__':
    data=json.dumps(generate(),separators=(',',':'))+'\n'
    if '--verify' in sys.argv:
        if OUT.read_text(encoding='utf8')!=data:raise ValueError('Changed head support')
    else:OUT.write_text(data,encoding='utf8')
