"""Register the original sword glove panels on the eight articulated male sword poses."""
import hashlib
import io
import json
import sys
import tempfile
import zipfile
from pathlib import Path

from export_male_sword_coats import BANK, ROOT, receptors, source_key
from export_sword0_checkpoint import EXPECTED, materialize as recover_sword
from register_staff_gloves import bind

ARCHIVE = ROOT / 'tools/rework-combat-wardrobe/sword-gloves.zip'
CHECKPOINT = ROOT / 'docs/native-hd/editable-female-equipment/checkpoint-2026-11-18'
# Cuff-to-palm vectors measured on the original sword glove seam, in native pixels.
AXES = {
    'left': [(12,4),(12,-5),(10,-8),(12,-4),(12,6),(11,6),(10,8),(12,5)],
    'right': [(10,8),(2,-13),(-10,-8),(-10,-8),None,(10,8),(7,11),(12,6)],
}

def generate(verify):
    import numpy as np
    from PIL import Image

    rigs = {side:p['pack']['directions'][side] for side,p in receptors().items()}
    sources = json.loads((BANK/'archives/archive-index.json').read_bytes())['sources']
    def alpha(key):
        row = sources[key]
        with zipfile.ZipFile(BANK/'archives'/row['archive']) as z:
            raw = z.read(row['path'])
        if hashlib.sha256(raw).hexdigest()!=key:
            raise ValueError('Receiver hand changed')
        return np.asarray(Image.open(io.BytesIO(raw)).convert('RGBA'))[:,:,3]
    y,x = np.indices((640,640))
    def hand(side, f):
        joint, role = ('LEFT','far') if side=='left' else ('RIGHT','near')
        layer = 'forearm-hand-'+role
        def pixels(d):
            l = next(l for l in rigs[d]['layers'] if l['id']==layer)
            if l['binding']!={'kind':'fixed'}:
                raise ValueError('Unexpected sword hand coordinate system')
            return alpha(l['frames'][f])
        east = pixels('east')
        if not np.array_equal(east[:,::-1],pixels('west')):
            raise ValueError('West is not the registered reflected anatomy')
        pose = rigs['east']['poses'][f]
        def point(label):
            p = pose[joint+' '+label]
            return np.array([p['x'],p['y']])*4
        wrist, center = point('ARM'),point('HAND CENTER')
        axis = center-wrist
        # ARM is the articulated palm joint. The cuff sits proximal to it.
        # The receiving forearm supplies the silhouette and individual finger gaps.
        start = wrist-.52*axis
        coverage = np.where((x-start[0])*axis[0]+(y-start[1])*axis[1]>=0,east,0)
        if np.count_nonzero(coverage)<200:
            raise ValueError('Missing distal hand')
        return coverage,axis
    from export_combat_wardrobe import ARCHIVES, read_archive
    parts = read_archive(CHECKPOINT,'focus')
    focus = {r['item']:next(l['frames'][0] for l in r['layers'] if l['id'].endswith(':right'))
             for r in json.loads(parts['orbe-cajado-reviewed-gloves/map.json'])['rows'] if r['direction']=='east'}
    source_bytes = {hashlib.sha256(raw).hexdigest():raw for n,raw in parts.items() if n.endswith('.png')}
    from export_staff_coats import weapons
    profiles = [r for r in weapons()['orderedAttackProfiles'] if r.get('action')=='attack-sword'
                and r.get('body')=='male' and r.get('direction') in ('east','west')
                and r.get('requiredClass')=='sword']
    if len(profiles)!=12 or len({r['item'] for r in profiles})!=6:
        raise ValueError('Incomplete original side sword catalogue')
    def rgba(key):
        row=sources[key]
        with zipfile.ZipFile(BANK/'archives'/row['archive']) as z:
            data=z.read(row['path'])
        if hashlib.sha256(data).hexdigest()!=key:raise ValueError('Changed sword image')
        return Image.open(io.BytesIO(data)).convert('RGBA')
    def original(r,f):
        im=rgba(r['states'][f]['layers'][0]['sha256'])
        pad=(im.width-640)//2
        return np.array(im.crop((pad,pad,pad+640,pad+640)))
    east={r['item']:r for r in profiles if r['direction']=='east'}
    base_hands=[original(east[0],f) for f in range(8)]
    turned={f:original(east[1],f) for f in (0,7)}
    def turned_palm(f):
        pose=rigs['east']['poses'][f];l=next(l for l in rigs['east']['layers'] if l['id']=='forearm-hand-near')
        stock=np.array(rgba(l['frames'][f]));old=base_hands[f];dest=turned[f]
        background=Image.new('RGBA',(640,640))
        for part in rigs['east']['layers']:
            if part['id']==l['id'] or part['slot'] in ('hair','face','headBase'):continue
            if part['binding']['kind']!='fixed':raise ValueError('Unregistered hand background')
            im=rgba(part['frames'][f] if part.get('frames') else part['source'])
            background=Image.alpha_composite(background,im)
        bg=np.asarray(background).astype(int)
        same=np.max(np.abs(dest.astype(int)-old.astype(int)),axis=2)<=2
        from_bg=np.max(np.abs(dest.astype(int)-bg),axis=2)>3
        local=(x>=281)&(x<345)&(y>=329)&(y<393)
        coverage=np.where(same,stock[:,:,3],np.where(from_bg,dest[:,:,3],0))
        # In these contact and recovery drawings the wrist is turned towards
        # the viewer. Measure its seam on the original grip, in native pixels.
        start=(312,356) if f==0 else (304,351)
        axis=(2,22)
        return np.where(local&((x-start[0])*axis[0]+(y-start[1])*axis[1]>=0),coverage,0),axis
    alternate={f:turned_palm(f) for f in (0,7)}
    ordered={}
    for r in profiles:
        if r['timeline']!=list(map(str,range(8))) and list(map(int,r['timeline']))!=list(range(8)):raise ValueError('Wrong original clock')
        phases=[]
        for f,s in enumerate(r['states']):
            back,metal,contact=s['layers'];actual=original(r,f)
            if r['direction']=='west':actual=actual[:,::-1]
            regular=np.array_equal(actual,base_hands[f])
            if not regular and (f not in turned or not np.array_equal(actual,turned[f])):
                raise ValueError('Unregistered original hand geometry '+str((r['id'],f)))
            phases.append(dict(body=back['sha256'],metal=metal['sha256'],contact=contact['mask']['sha256'],turned=not regular))
        ordered[r['id']]=dict(item=r['item'],direction=r['direction'],size=r['nativeCanvas'][0],phases=phases)
    assets = {}; items = {}
    with tempfile.TemporaryDirectory() as tmp:
        folder = Path(tmp)
        recover_sword(CHECKPOINT,folder)
        records = json.loads((folder/'sword-catalog.json').read_bytes())['records']
        rows = [r for r in records if r['slot']=='gloves' and r['direction']=='east']
        if len({r['item'] for r in rows})!=10:
            raise ValueError('Missing native sword gloves')
        for side in ('left','right'):
            layers = {}
            for row in rows:
                layer = next(l for l in row['layers'] if l['id']==side+'-hand')
                if layer['binding']!={'kind':'fixed'} or len(layer['frames'])!=8:
                    raise ValueError('Unexpected source hand')
                layers[row['item']] = layer
            def source(layer,phase):
                sha = layer['frames'][phase]
                return sha,Image.open(folder/'assets'/(sha+'.png')).convert('RGBA')
            # The editable sword checkpoint clips some models to its original
            # hilt. Keep their clean cloth from the same hand and item.
            panels = [[source(l,f) for f in range(8)] for l in layers.values()]
            material = dict(zip(layers,panels))
            envelopes = [np.maximum.reduce([np.asarray(track[f][1])[:,:,3] for track in panels]) for f in range(8)]
            def area(im):
                return int(np.count_nonzero(np.asarray(im)[:,:,3]>50))
            for f in range(8):
                coverage,axis = hand(side,f)
                for row in rows:
                    item=row['item']; track=material[item]
                    other=next(l for l in row['layers'] if l['id']!=side+'-hand')
                    peak=max([area(im) for _,im in track]+[area(source(other,k)[1]) for k in range(8)])
                    clean=[k for k,(_,im) in enumerate(track) if AXES[side][k] and area(im)>=.95*peak]
                    if clean:
                        chosen=min(clean,key=lambda k:(abs(k-f),-k))
                        sha,im=track[chosen]; source_axis=AXES[side][chosen]; envelope=envelopes[chosen]
                        source_pack='sword'
                    else:
                        # All eight donor grips are hidden by the sword for these
                        # fingerless materials. The separate right-hand focus panel
                        # carries the same item, without a hilt or a hand underneath.
                        if side!='right':raise ValueError('Missing independent left cloth')
                        chosen=0;sha=focus[item];im=Image.open(io.BytesIO(source_bytes[sha])).convert('RGBA')
                        source_axis=(2,-29);envelope=None;source_pack='focus'
                    fitted = bind(im,coverage,axis,source_axis,envelope)
                    a = np.asarray(fitted)[:,:,3]
                    if np.any(a>coverage) or np.count_nonzero(a)<.28*np.count_nonzero(coverage):
                        raise ValueError('Unowned or empty garment: '+str((item,side,f)))
                    buf=io.BytesIO();fitted.save(buf,format='PNG',optimize=True);raw=buf.getvalue()
                    key=hashlib.sha256(raw).hexdigest()
                    assets[key+'.png']=raw
                    items.setdefault(str(item),{}).setdefault(side,[]).append(
                        dict(art=key,source=sha,phase=chosen,archive=source_pack,pixels=int(np.count_nonzero(a))))
                    if side=='right' and f in alternate:
                        mask,axis2=alternate[f]
                        ref=bind(im,mask,axis2,source_axis,envelope)
                        if np.count_nonzero(np.asarray(ref)[:,:,3])<150:raise ValueError('Empty turned sword grip')
                        buf=io.BytesIO();ref.save(buf,format='PNG',optimize=True);raw=buf.getvalue()
                        key=hashlib.sha256(raw).hexdigest();assets[key+'.png']=raw
                        items[str(item)][side][-1]['turned']=key
    record=dict(ordered=ordered,headShift=[(8,4),(8,5),(10,5),(14,10),(16,12),(12,12),(8,5),(8,5)],sourceArchive=EXPECTED,focusArchive=ARCHIVES['focus'],rigs={d:source_key(p) for d,p in rigs.items()},items=items)
    if verify:
        with zipfile.ZipFile(ARCHIVE) as z:
            prev=json.loads(z.read('registration.json'))
            if record['ordered']!=prev['ordered'] or list(map(list,record['headShift']))!=prev['headShift'] or record['rigs']!=prev['rigs'] or record['sourceArchive']!=prev['sourceArchive'] or record['items'].keys()!=prev['items'].keys():
                raise ValueError('Wrong sword receiver or source archive')
            for item,hands in items.items():
                for side,track in hands.items():
                    for a,b in zip(track,prev['items'][item][side],strict=True):
                        if any(a[k]!=b[k] for k in ('source','archive','phase','pixels')) or (
                            Image.open(io.BytesIO(assets[a['art']+'.png'])).tobytes()!=Image.open(io.BytesIO(z.read(b['art']+'.png'))).tobytes()):
                            raise ValueError('Changed sword glove registration')
                        if 'turned' in a and Image.open(io.BytesIO(assets[a['turned']+'.png'])).tobytes()!=Image.open(io.BytesIO(z.read(b['turned']+'.png'))).tobytes():
                            raise ValueError('Changed turned grip')
        return
    assets['registration.json']=json.dumps(record,separators=(',',':')).encode()
    with zipfile.ZipFile(ARCHIVE,'w') as z:
        for n,data in sorted(assets.items()):
            z.writestr(zipfile.ZipInfo(n),data,compress_type=zipfile.ZIP_DEFLATED)

if __name__=='__main__':
    generate('--verify' in sys.argv)
