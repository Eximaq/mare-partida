"""Mount the ten original two-hand rifle materials on the eight sideways recoil poses."""
import hashlib
import io
import json
import struct
import sys
import zipfile
from functools import lru_cache
from pathlib import Path
from export_firearm_wardrobe import DIGESTS
from export_staff_coats import BANK, ROOT, weapons
from register_staff_gloves import bind

OUT=ROOT/'tools/rework-combat-wardrobe/rifle-profile-gloves.zip'
ORIGIN='pistolas114-laterais'
DIRECTION=('east','west')


def generate():
    import numpy as np
    from PIL import Image

    source=(ROOT/'docs/native-hd/editable-female-equipment/checkpoint-2026-11-18'/(ORIGIN+'.zip')).read_bytes()
    if hashlib.sha256(source).hexdigest()!=DIGESTS[ORIGIN]:raise ValueError('Changed original firearm clothes')
    index=weapons()['records']
    directions={}
    for side in DIRECTION:
        r=next(r for r in index if r['body']=='male' and r['item']==4 and r['direction']==side)
        p=r['basePack']['pack']
        d=p['directions'][side]
        if p['frame']!={'width':160,'height':160} or p['pivot']!={'x':80,'y':128} or p['density']!=4 or d['clip']!={'frames':8,'fps':12,'loop':False,'contactFrame':4}:
            raise ValueError('Wrong receiving recoil')
        directions[side]=d
    witness={d:{l['id']:l['frames'] for l in rig['layers'] if l['id'] in ('forearm-hand-near','forearm-hand-far')} for d,rig in directions.items()}
    bank=json.loads((BANK/'archives/archive-index.json').read_bytes())['sources']
    @lru_cache(maxsize=56)
    def receiver(key):
        pos=bank[key]
        with zipfile.ZipFile(BANK/'archives'/pos['archive']) as z:raw=z.read(pos['path'])
        if hashlib.sha256(raw).hexdigest()!=key:raise ValueError('Changed original hand')
        return np.array(Image.open(io.BytesIO(raw)).convert('RGBA'))[:,:,3]
    yy,xx=np.indices((640,640))
    def point(p,k):
        q=p[k]
        return np.array((q['x'],q['y']))*4
    def store(art):
        stream=io.BytesIO();art.save(stream,format='PNG',compress_level=6)
        raw=stream.getvalue();sha=hashlib.sha256(raw).hexdigest();assets[sha+'.png']=raw;return sha
    mask={}
    for f,pose in enumerate(directions['east']['poses']):
        for side,name in [('RIGHT','forearm-hand-near'),('LEFT','forearm-hand-far')]:
            alpha=receiver(witness['east'][name][f])
            if not np.array_equal(alpha[:,::-1],receiver(witness['west'][name][f])):raise ValueError('West palm is not the native mirror')
            wrist=point(pose,side+' ARM');tip=point(pose,side+' HAND CENTER')
            axis=tip-wrist
            if not 5<np.linalg.norm(axis)<16:raise ValueError('Unregistered wrist')
            normal=axis/np.linalg.norm(axis)
            # Start the cuff four physical pixels before the hand joint.
            delta=(xx-wrist[0])*normal[0]+(yy-wrist[1])*normal[1]
            owner=np.where((delta>=-4)&((xx-tip[0])**2+(yy-tip[1])**2<40**2),alpha,0)
            if not 12<np.count_nonzero(owner)<1150:raise ValueError('Empty or excessive receiving hand '+str((f,name,np.count_nonzero(owner))))
            mask[side,f]=(owner,axis)
    with zipfile.ZipFile(io.BytesIO(source)) as z:
        def m(file):return json.loads(z.read(ORIGIN+'/'+file+'.json'))
        def image(sha):
            raw=z.read(ORIGIN+'/assets/'+sha+'.png')
            if hashlib.sha256(raw).hexdigest()!=sha:raise ValueError('Changed source glove')
            im=Image.open(io.BytesIO(raw)).convert('RGBA')
            if im.size!=(640,640):raise ValueError('Wrong glove dimensions')
            return im
        poses=m('canonical-east')['pack']['directions']['east']['poses']
        catalog=m('catalog')
        assets={};gloves={}
        for key,track in catalog.items():
            direction,slot,num=key.split('/')
            if (direction,slot)!=('east','gloves'):continue
            if track['16']!=track['22'] or track['18']!=track['24']:raise ValueError('Unexpected duplicate material')
            out=gloves[num]=dict(sources={},frames={})
            for idx,side in [('16','RIGHT'),('18','LEFT')]:
                seq=out['frames'][side]=[];out['sources'][side]=track[idx]
                for f,sha in enumerate(track[idx]):
                    im=image(sha);support,axis=mask[side,f]
                    sy,sx=np.where(np.asarray(im)[:,:,3]>50)
                    if len(sx)<120:raise ValueError('Empty original material '+str((key,f,side)))
                    p=poses[f];a=point(p,side+'_WRIST');b=point(p,side+'_HANDCENTER')
                    # Some portable East pose annotations were mirrored while
                    # the real glove raster was retained. Choose its actual side.
                    other=b.copy();other[0]=640-other[0]
                    center=np.array([sx.mean(),sy.mean()])
                    ma=b-a
                    if np.linalg.norm(center-other)<np.linalg.norm(center-b):ma[0]=-ma[0]
                    art=bind(im,support,axis,ma)
                    al=np.asarray(art)[:,:,3]
                    if np.any(al>support) or np.count_nonzero(al)<.3*np.count_nonzero(support):raise ValueError('Unregistered textile '+str((key,f,side)))
                    seq.append(store(art))
        if len(gloves)!=10:raise ValueError('Expected all ten pairs')
        assets['register.json']=json.dumps(dict(archive=DIGESTS[ORIGIN],rigs=witness,items=gloves),separators=(',',':')).encode()
        return assets


def materialize(bank):
    with zipfile.ZipFile(OUT) as z:
        result=json.loads(z.read('register.json'))
        if len(result['items'])!=10 or result['archive']!=DIGESTS[ORIGIN]:raise ValueError('Incomplete rifle hand registration')
        for r in result['items'].values():
            if set(r['frames'])!={'LEFT','RIGHT'}:raise ValueError('Incomplete hands')
            for seq in r['frames'].values():
                if len(seq)!=8:raise ValueError('Incomplete cycle')
                for sha in set(seq):
                    data=z.read(sha+'.png')
                    if hashlib.sha256(data).hexdigest()!=sha or struct.unpack('>II',data[16:24])!=(640,640):raise ValueError('Invalid rifle hand plate')
                    (bank/(sha+'.png')).write_bytes(data)
        return result


if __name__=='__main__':
    data=generate()
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(OUT) as z:
            prev=json.loads(z.read('register.json'));now=json.loads(data['register.json'])
            if prev['archive']!=now['archive'] or prev['rigs']!=now['rigs'] or prev['items'].keys()!=now['items'].keys():raise ValueError('Changed original rifle hands')
            for i,r in now['items'].items():
                claimed=prev['items'][i]
                if r['sources']!=claimed['sources']:raise ValueError('Changed donor')
                for k,seq in r['frames'].items():
                    for a,b in zip(seq,claimed['frames'][k],strict=True):
                        if Image.open(io.BytesIO(data[a+'.png'])).tobytes()!=Image.open(io.BytesIO(z.read(b+'.png'))).tobytes():raise ValueError('Changed glove fit')
    else:
        with zipfile.ZipFile(OUT,'w') as z:
            for k,v in sorted(data.items()):z.writestr(zipfile.ZipInfo(k),v,compress_type=zipfile.ZIP_DEFLATED)
