"""Recover the original hand/shaft contacts of the six front-facing focus weapons."""
import hashlib
import io
import json
import struct
import sys
import zipfile
from functools import lru_cache

from export_staff_coats import BANK, weapons
from register_south_focus_trousers import BASE, OUTFITS, ROOT, index
from register_staff_gloves import bind

ARCHIVE=ROOT/'tools/rework-combat-wardrobe/south-staff-grips.zip'
SIZE=(640,640)
# Wrist crease through the outer fingers, in native coordinates of the signed
# grip. Each weapon has its own right hand. Distal ornaments stay on the shaft.
GRIPS={
 123:[(250,345),(261,345),(265,350),(264,356),(262,362),(261,367),(258,370),(251,371),(247,368),(244,364),(243,358),(243,353)],
 124:[(250,345),(261,345),(264,352),(265,358),(262,363),(261,368),(255,372),(248,369),(245,364),(244,358),(245,354)],
 125:[(248,344),(259,343),(263,347),(264,352),(263,357),(262,364),(257,369),(250,370),(245,365),(243,360),(242,354),(243,349)],
 126:[(249,343),(260,343),(263,348),(263,354),(261,360),(259,364),(254,367),(247,364),(244,360),(242,354),(243,347)],
 127:[(250,344),(261,345),(263,350),(264,354),(264,359),(261,366),(257,369),(251,369),(246,366),(244,359),(244,352)],
 128:[(249,345),(261,345),(262,350),(266,354),(267,357),(265,361),(263,363),(263,368),(258,372),(252,371),(247,367),(244,360),(245,351)],
}

def generate():
    import numpy as np
    from PIL import Image,ImageDraw
    banks={b:json.loads((b/'archives/archive-index.json').read_bytes())['sources'] for b in (BASE,BANK,OUTFITS)}
    @lru_cache(maxsize=48)
    def image(b,k):
        row=banks[b][k]
        with zipfile.ZipFile(b/'archives'/row['archive']) as z: raw=z.read(row['path'])
        if hashlib.sha256(raw).hexdigest()!=k:raise ValueError('Source changed '+k)
        return Image.open(io.BytesIO(raw)).convert('RGBA')
    saved={}
    def store(im):
        v=io.BytesIO();im.save(v,format='PNG',compress_level=6);raw=v.getvalue()
        sha=hashlib.sha256(raw).hexdigest();saved[sha+'.png']=raw;return sha
    base=next(r for r in index(BASE)['records'] if r['id']=='male-attack-focus-south-drawn8')
    layers=base['pack']['directions']['south']['layers'];left_sources={}
    for row in index(OUTFITS)['records']:
        if row['id'].startswith('frozen-male-glove') and row['id'].endswith('-south-attack-unarmed-native-layers'):
            item=row['equipment']['gloves']
            layer,=[l for l in row['pack']['directions']['south']['layers'] if l['id']=='registered-frozen-glove-native-attack']
            k=layer['frames'][0];panel=np.array(image(OUTFITS,k));panel[:,320:]=0
            left_sources[item]=(k,panel)
    if len(left_sources)!=10:raise ValueError('Ten glove sources required')
    envelope=np.maximum.reduce([arr[:,:,3] for _,arr in left_sources.values()])
    profiles={r['item']:r for r in weapons()['records'] if r['direction']=='south' and r['body']=='male' and r['id'].startswith('staff') and r['item'] in GRIPS}
    y,x=np.indices((640,640));track={}
    for item,profile in profiles.items():
        frames=[];palm=Image.new('L',SIZE);ImageDraw.Draw(palm).polygon(GRIPS[item],fill=255)
        for phase,pose in enumerate(profile['states']):
            ref=pose['approved']['sha256'];art=np.asarray(image(BANK,ref));naked=Image.new('RGBA',SIZE)
            for l in layers[:2]:naked.alpha_composite(image(BASE,l['frames'][phase]))
            stock=np.asarray(naked);alpha=art[:,:,3]
            # The entire opposite hand, chest and legs share the eight-state
            # source. Reject changes in anatomy before recovering the own grip.
            probe=(x>=284)&(y>=248)
            if np.any(np.abs(art.astype('int16')-stock.astype('int16'))[probe]>2):raise ValueError(('Changed shared body',item,phase))
            own=((art!=stock).any(2)&(alpha>0)&(x<284)&((y>=240)|((x<256)&(y>=180))))
            glove=np.minimum(np.asarray(palm),alpha)
            # Alpha of the original image bounds the fingers. The shaft passes
            # behind those fingers and remains visible above/below the wrist.
            hand=glove>0;own|=hand
            if not (300<hand.sum()<1050 and 1500<own.sum()<6500):raise ValueError(('Unexpected owned contact',item,phase,int(hand.sum()),int(own.sum())))
            cut=np.zeros((640,640,4),dtype='uint8');cut[:,:,0]=own*255;cut[:,:,1]=glove;cut[:,:,3]=own*255
            q=dict(source=ref,mask=store(Image.fromarray(cut)),gloves={})
            for gid,(key,fabric) in left_sources.items():
                v=bind(Image.fromarray(fabric),glove,(1,20),(0,1),envelope)
                if np.any(np.asarray(v)[:,:,3]>glove):raise ValueError('Foreign glove pixel')
                q['gloves'][gid]=store(v)
            frames.append(q)
        track[item]=dict(source=profile['id'],frames=frames)
    meta=dict(sha=base['sourcePackSHA256'],items=track,originalGloves={k:v[0] for k,v in left_sources.items()})
    saved['register.json']=json.dumps(meta,separators=(',',':')).encode()
    return saved

def materialize(bank):
    with zipfile.ZipFile(ARCHIVE) as z:
        obj=json.loads(z.read('register.json'))
        if set(map(int,obj['items']))!=set(GRIPS):raise ValueError('Incomplete staff family')
        for row in obj['items'].values():
            if len(row['frames'])!=8:raise ValueError('Incomplete staff cycle')
        for name in z.namelist():
            if name=='register.json':continue
            raw=z.read(name)
            if hashlib.sha256(raw).hexdigest()+'.png'!=name or struct.unpack('>II',raw[16:24])!=SIZE:raise ValueError('Changed contact')
            (bank/name).write_bytes(raw)
    return obj

if __name__=='__main__':
    data=generate()
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(ARCHIVE) as old:
            a=json.loads(data['register.json']);b=json.loads(old.read('register.json'))
            if a['sha']!=b['sha'] or a['originalGloves']!=b['originalGloves'] or a['items'].keys()!=b['items'].keys():raise ValueError('Changed sources')
            for item,r in a['items'].items():
                for v,w in zip(r['frames'],b['items'][item]['frames'],strict=True):
                    if v['source']!=w['source'] or v['gloves'].keys()!=w['gloves'].keys():raise ValueError('Changed cycle')
                    for k,h in [(v['mask'],w['mask']),*((h,w['gloves'][g]) for g,h in v['gloves'].items())]:
                        if Image.open(io.BytesIO(data[k+'.png'])).tobytes()!=Image.open(io.BytesIO(old.read(h+'.png'))).tobytes():raise ValueError('Contact pixels changed')
    else:
        with zipfile.ZipFile(ARCHIVE,'w') as z:
            for name,raw in sorted(data.items()):z.writestr(zipfile.ZipInfo(name),raw,compress_type=zipfile.ZIP_DEFLATED)
