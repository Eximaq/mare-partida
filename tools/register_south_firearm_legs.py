"""Register all original South trousers and paired boot parts against the firearm legs."""
import hashlib
import io
import json
import sys
import zipfile
from functools import lru_cache

from export_staff_coats import BANK, ROOT, weapons
from register_south_focus_trousers import BASE, OUTFITS, index

DIR = ROOT / 'tools/rework-combat-wardrobe'
OUT = DIR / 'south-firearm-legs.zip'


def generate():
    import numpy as np
    from PIL import Image, ImageDraw

    references = {b: json.loads((b/'archives/archive-index.json').read_bytes())['sources'] for b in (BASE, BANK, OUTFITS)}
    @lru_cache(maxsize=90)
    def pixels(sha):
        for bank, refs in references.items():
            if sha in refs:
                r=refs[sha]
                with zipfile.ZipFile(bank/'archives'/r['archive']) as z:
                    raw=z.read(r['path'])
                if hashlib.sha256(raw).hexdigest()!=sha:
                    raise ValueError('Changed limb or cloth '+sha)
                im=Image.open(io.BytesIO(raw)).convert('RGBA')
                if im.size!=(640,640):raise ValueError('Changed plate coordinates')
                return im
        raise KeyError(sha)

    def runs(a):
        edges=np.flatnonzero(np.diff(np.r_[False,a.ravel(),False])).reshape(-1,2)
        return [[int(k),int(j-k)] for k,j in edges]

    files={}
    def emit(im):
        box=im.getbbox()
        if not box:return None
        tile=im.crop(box);buf=io.BytesIO();tile.save(buf,'PNG');raw=buf.getvalue()
        key=hashlib.sha256(raw).hexdigest()
        files[key+'.png']=raw
        return [key,*box[:2]]

    rows=weapons()['records']
    original=next(r for r in rows if r['id']=='rifle115-south-original-body-native-attachment')
    rig=original['basePack']['pack']['directions']['south']
    boots=json.loads((DIR/'south-focus-boots.json').read_bytes())
    pants=json.loads((DIR/'south-focus-trousers.json').read_bytes())
    focus=next(r for r in index(BASE)['records'] if r['id']==boots['receiver'])
    if focus['sourcePackSHA256']!=boots['sha'] or focus['sourcePackSHA256']!=pants['sha']:raise ValueError('Changed source rig')
    d=focus['pack']['directions']['south']
    pins={l['id']:l['frames'] for l in rig['layers'][:2]}
    if set(pins)!={'skin-arms-phase','shorts-phase'} or len(pins['skin-arms-phase'])!=8:raise ValueError('Unexpected original rifle phases')
    lower={};limbs=[];stock=[];hands=[]
    yy,xx=np.indices((640,640))
    # Control rows below the open belt, around both knees, insteps and feet.
    # Both source and target feet face the camera. Per-row transverse choice
    # retains each item's left and right artwork and its original native density.
    src_rows=[348,388,425,452,480,496];dst_rows=[351,391,425,452,480,496]
    for f in range(8):
        skin=pixels(pins['skin-arms-phase'][f]);short=pixels(pins['shorts-phase'][f])
        limbs.append(np.array(Image.alpha_composite(skin,short)))
        a=np.asarray(short)
        # Cloth and its dark outline are a connected component; incidental hand
        # pixels in this source live outside it. The cut uses only signed indigo.
        garment=(a[:,:,3]>0)&(a[:,:,2].astype(int)>a[:,:,0].astype(int))
        stock.append(garment)
        live=np.asarray(skin)[:,:,3]>0
        # Below the belt only original distal arms can cross the garment.
        # At the top of the belt admit only the signed wrist zones; the middle
        # is the player's abdomen. Raised states have both wrists above the belt.
        hand_zone=(yy>=324)&(yy<385)
        if f==0:hand_zone&=(xx<279)|(xx>365)
        elif f==1:hand_zone&=((xx>277)&(xx<321))|((xx>=323)&(xx<366))
        elif f==7:hand_zone&=(xx<313)|(xx>328)
        else:hand_zone&=False
        hands.append(live&hand_zone)
        fd=d['layers']
        sf=np.asarray(pixels(fd[0]['frames'][f]));bf=np.asarray(pixels(fd[1]['frames'][f]))
        def cloth(m):return (m[:,:,3]>60)&(m[:,:,2].astype(int)>m[:,:,0].astype(int))
        previous=[cloth(bf),sf[:,:,3]>50];now=[garment,live]
        coords=[]
        for side,left in enumerate((0,320)):
            lines=[]
            for k,(y0,y1) in enumerate(zip(src_rows,dst_rows)):
                p=np.flatnonzero(previous[int(k>=2)][y0,left:left+320])+left
                t=np.flatnonzero(now[int(k>=2)][y1,left:left+320])+left
                if min(len(p),len(t))<8:raise ValueError('Unverified shin silhouette')
                lines.append([p[0],p[-1],t[0],t[-1]])
            coords.append(np.array(lines))
        sy=np.rint(np.interp(np.arange(640),[0,314,320,*dst_rows,508,639],[0,310,316,*src_rows,508,639])).astype(int)
        sx=np.zeros((640,640),int)
        for side,left in enumerate((0,320)):
            points=[np.interp(np.arange(640),dst_rows,coords[side][:,j])[:,None] for j in range(4)]
            x0,x1,u0,u1=points
            # Avoid stretching the bridge between legs or narrowing a cuff to
            # the ankle width. Legitimate garment overhang keeps native scale.
            raw=np.arange(left,left+320)[None,:]
            inner=(raw-u0)/(u1-u0)
            mapped=np.where(raw<u0,raw+x0-u0,np.where(raw>u1,raw+x1-u1,x0+inner*(x1-x0)))
            sx[:,left:left+320]=np.clip(np.rint(mapped),0,639).astype(int)
        def fit(im):
            return Image.fromarray(np.asarray(im)[sy[:,None],sx])
        for item,p in pants['items'].items():
            im=fit(pixels(p['sha']))
            if np.asarray(im)[:310,:,3].any():raise ValueError('Trouser escaped the hips')
            fitrow=lower.setdefault('pants'+item,dict(origin=p['source'],parts=[p['sha']],phases=[]))
            ink=np.asarray(im)[:,:,3]
            fitrow['phases'].append(dict(front=emit(im),cut=runs(garment&(ink>0)&p['replace'])))
        for item,b in boots['items'].items():
            canvases=[Image.new('RGBA',(640,640)) for _ in range(2)]
            for l in b['layers']:
                canvas=canvases[int(l['depth']>=0)]
                canvas.alpha_composite(pixels(l['plate']),tuple(l['offsets'][f]))
            rear,front=(fit(c) for c in canvases)
            ink=(np.asarray(rear)[:,:,3]>0)|(np.asarray(front)[:,:,3]>0)
            if ink[:380].any():raise ValueError('Boot escaped the calf')
            trim=np.zeros((640,640),bool)
            for left in (0,320):
                for y in range(478,518):
                    row=live[y,left:left+320].copy();span=np.flatnonzero(ink[y,left:left+320])
                    if span.size:row[span[0]:span[-1]+1]=False
                    trim[y,left:left+320]=row
            fitrow=lower.setdefault('boots'+item,dict(origin=[l['record']+'/'+l['id'] for l in b['layers']],parts=[l['plate'] for l in b['layers']],phases=[]))
            fitrow['phases'].append(dict(front=emit(front),rear=emit(rear),cut=runs(trim)))
    # Fused registrations use their original pixels as proof. A changed bit of
    # barrel or foreground hand is never redrawn from a donor. Below the knee
    # all three registrations must match the measured original body exactly.
    fused={}
    variants={'mosquete5-south-initial-v2':[0,1,2,3,4,5,6,7,0,0],
              'rifle116-south-original-body-native-layers':[0,1,2,4,4],
              'pistolas114-south-native-original-source':[0]*8}
    for id,mapping in variants.items():
        record=next(r for r in rows if r['id']==id);track=[]
        for s,phase in zip(record['states'],mapping,strict=True):
            src=s['layers'][0]['sha256'];im=np.asarray(pixels(src))
            bare=limbs[phase]
            different=np.any(abs(im.astype(int)-bare.astype(int))>1,axis=2)
            if different[408:,250:400].any():raise ValueError('New or unrelated lower anatomy '+id)
            covered=(im[:,:,3]>0)&different
            # At the top of the garment only keep visible foreground materials.
            # No dependency on the saved skin or on any neighboring equipment.
            protected=covered|hands[phase]
            protected&=(yy>=310)&(yy<518)&(xx>=225)&(xx<420)
            track.append(dict(phase=phase,approval=s['approved']['sha256'],source=src,guard=runs(protected)))
        fused[record['sourceArchiveSHA256']]=dict(timeline=record['timeline'],fps=record['fps'],states=track)
    out=dict(pins=pins,lower=lower,guards=[runs(h) for h in hands],fused=fused)
    files['register.json']=json.dumps(out,separators=(',',':')).encode()
    return files


def south_firearm_legs(folder):
    with zipfile.ZipFile(OUT) as z:
        row=json.loads(z.read('register.json'))
        if len(row['lower'])!=20 or len(row['fused'])!=3:raise ValueError('Incomplete firearm legs')
        for item in row['lower'].values():
            if len(item['phases'])!=8:raise ValueError('Incomplete firearm step')
            for phase in item['phases']:
                for part in ('front','rear'):
                    if not phase.get(part):continue
                    k=phase[part][0];raw=z.read(k+'.png')
                    if hashlib.sha256(raw).hexdigest()!=k:raise ValueError('Changed firearm garment')
                    if not (folder/(k+'.png')).exists():(folder/(k+'.png')).write_bytes(raw)
        return row


if __name__=='__main__':
    files=generate()
    if '--verify' in sys.argv:
        with zipfile.ZipFile(OUT) as z:
            if set(z.namelist())!=files.keys() or any(z.read(k)!=v for k,v in files.items()):raise ValueError('Changed firearm legs')
    else:
        with zipfile.ZipFile(OUT,'w') as z:
            for k,v in sorted(files.items()):z.writestr(zipfile.ZipInfo(k),v,compress_type=zipfile.ZIP_DEFLATED)
