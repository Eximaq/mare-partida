"""Fit the South boots to the eight original focus silhouettes."""
import hashlib
import io
import json
import re
import sys
import zipfile
from functools import lru_cache
from pathlib import Path

from register_south_focus_trousers import BASE, OUTFITS, ROOT, index

OUTPUT = ROOT / 'tools/rework-combat-wardrobe/south-focus-boots.json'


def register():
    import numpy as np
    from PIL import Image

    banks = {b: json.loads((b/'archives/archive-index.json').read_bytes())['sources'] for b in (BASE, OUTFITS)}
    renderer = (ROOT/'player-rework-native-hd.js').read_text(encoding='utf8')

    def registry(name):
        # These two signed source tables are also consumed by the original punch rig.
        return json.loads(re.search(r'^ const '+name+r'=(.+);$', renderer, re.M)[1])

    @lru_cache(maxsize=160)
    def alpha(bank, key):
        row = banks[bank][key]
        with zipfile.ZipFile(bank/'archives'/row['archive']) as z:
            raw = z.read(row['path'])
        if hashlib.sha256(raw).hexdigest()!=key:
            raise ValueError('Changed boot or anatomy source '+key)
        im = Image.open(io.BytesIO(raw)).convert('RGBA')
        if im.size!=(640,640):
            raise ValueError('Unregistered canvas geometry')
        return np.array(im)[:,:,3]

    bodies = {r['id']:r for r in index(BASE)['records']}
    outfits = {r['id']:r for r in index(OUTFITS)['records']}
    focus = bodies['male-attack-focus-south-drawn8']
    donor = bodies['male-attack-unarmed-south-drawn8']
    def limbs(b):
        p = b['pack']
        d = p['directions']['south']
        if (p['density'],p['pivot'],p['frame'],d['clip']['frames'])!=(4,{'x':80,'y':128},{'width':160,'height':160},8):
            raise ValueError('Incompatible lower-body geometry')
        skin = d['layers'][0]
        if skin['id']!='skin-arms-phase' or skin['binding']!={'kind':'fixed'} or len(skin['frames'])!=8:
            raise ValueError('Unowned leg plane')
        return skin['frames']

    skin_frames, reference = limbs(focus), limbs(donor)
    offsets=[]
    for f,h in enumerate(skin_frames):
        current,previous=alpha(BASE,h),alpha(BASE,reference[f])
        phase=[]
        for origin in (0,320):
            foot = current[:,origin:origin+320]>127
            target = previous[:,origin:origin+320]>127
            y1,y0 = (int(np.nonzero(mask)[0].max()) for mask in (foot,target))
            # Median centre of the sole across 17 transverse slices, separately for each foot.
            def centre(mask,y):
                x=np.flatnonzero(mask[y])
                return (x[0]+x[-1])/2
            delta=int(round(np.median([centre(foot,y1-k)-centre(target,y0-k) for k in range(4,21)])))
            if abs(delta)>8 or abs(y1-y0)>2:
                raise ValueError('Different foot articulation')
            phase.append([delta,y1-y0])
        offsets.append(phase)

    original=registry('maleSouthPunchOwn')
    tracks=registry('southPunchSoleTrack')
    parts={}
    for item,authored in original.items():
        rows=[]
        for layer,record,frame,source,plate,*binding in authored:
            geometry=outfits[record]
            local=binding[0] if binding else layer
            own=next(l for l in geometry['pack']['directions']['south']['layers'] if l['id']==local)
            if own.get('frames',[own.get('source')])[frame if 'frames' in own else 0]!=source or source not in geometry['sourceRefs']:
                raise ValueError('Invalid frozen boot donor '+record)
            rows.append(dict(id=layer,record=record,source=source,plate=plate))
        parts[item]=rows
    for item in ('9','148'):
        record='male-pants133-attack-focus-south-drawn8-candidate-boots'+item+'-isolated-candidate'
        row=outfits[record]
        entries=[l for l in row['pack']['directions']['south']['layers'] if l['id'] in row['bootsOverlay']['sourceLayerIds']]
        if not entries or row['equipment'].get('boots')!=int(item):
            raise ValueError('Missing original focus boot '+item)
        parts[item]=[]
        for l in entries:
            side=l['id'].split('-')[1]
            cuff=next(v for v in entries if v['id']=='boot'+item+'-'+side+'-front')
            parts[item].append(dict(id=l['id'],record=record,source=l['source'],plate=l['source'],track=tracks[cuff['source']]))
    if len(parts)!=10:
        raise ValueError('Expected all ten boot identities')

    for item, layers in parts.items():
        signed=[]
        for layer in layers:
            match=re.fullmatch('boot'+item+'-(left|right)-(front|rear|own-material-backing)',layer['id'])
            if not match:
                raise ValueError('Unexpected foreign material '+layer['id'])
            side=int(match[1]=='right')
            layer['depth']={'front':2.5,'rear':-1,'own-material-backing':2.49}[match[2]]
            donor_track=layer.pop('track',[[0,0]]*8)
            layer['offsets']=[[x+offsets[f][side][0],y+offsets[f][side][1]] for f,(x,y) in enumerate(donor_track)]
        layers.sort(key=lambda v:v['depth'])
        for f,h in enumerate(skin_frames):
            # Only exposed native foot outside the actual boot outline below the
            # instep is clipped. Interior openings keep the player's skin.
            lower=alpha(BASE,h)
            trim=np.zeros((640,640),dtype=bool)
            for s,origin in enumerate((0,320)):
                ink=np.zeros((640,640),dtype=bool)
                for layer in layers:
                    if ('-right-' in layer['id'])!=bool(s):continue
                    dx,dy=layer['offsets'][f]
                    plane=np.roll(alpha(OUTFITS,layer['plate'])>0,(dy,dx),(0,1))
                    yy,xx=np.where(plane)
                    if yy.min()<=380 or xx.min()<origin-12 or xx.max()>origin+332:
                        raise ValueError('Boot leaves its own calf')
                    ink|=plane
                for y in range(478,518):
                    span=np.flatnonzero(ink[y])
                    exposed=lower[y,origin:origin+320]>0
                    if span.size:
                        exposed=exposed.copy()
                        exposed[max(0,int(span[0])-origin):int(span[-1])+1-origin]=False
                    trim[y,origin:origin+320]=exposed
            edges=np.flatnonzero(np.diff(np.r_[False,trim.ravel(),False])).reshape(-1,2)
            signed.append([[int(a),int(b-a)] for a,b in edges])
        parts[item]=dict(layers=layers,distal=signed)
    return dict(receiver=focus['id'],sha=focus['sourcePackSHA256'],skin=skin_frames,items=parts)


if __name__=='__main__':
    data=json.dumps(register(),separators=(',',':'))+'\n'
    if '--verify' in sys.argv:
        if OUTPUT.read_text(encoding='utf8')!=data:
            raise ValueError('Published sole registrations differ')
    else:
        OUTPUT.write_text(data,encoding='utf8')
