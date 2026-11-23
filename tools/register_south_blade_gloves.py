"""Register the owned South hand materials against the two drawn blade grips."""
import hashlib
import io
import json
import struct
import sys
import zipfile
from functools import lru_cache

from export_staff_coats import BANK
from register_south_focus_trousers import BASE, OUTFITS, ROOT, index
from register_staff_gloves import bind

OUTPUT=ROOT/'tools/rework-combat-wardrobe/south-blade-gloves.zip'
SIZE=(640,640)
# Wrist crease to the terminal fingers in each actual drawing, player-right then
# player-left. The XML rest skeleton is static while both drawn hands move.
CONTACT={
 'sword':[
  [(252,342,256,372),(389,340,385,373)],
  [(239,303,216,284),(389,340,385,373)],
  [(263,260,278,234),(393,316,424,324)],
  [(344,265,366,241),(409,315,433,326)],
  [(374,261,398,240),(391,322,424,336)],
  [(337,317,358,334),(392,318,418,333)],
  [(251,323,252,345),(398,327,423,350)],
  [(250,340,249,369),(389,339,390,371)]],
 'daggers':[
  [(256,341,255,372),(380,338,379,374)],
  [(256,341,254,372),(330,288,306,276)],
  [(245,314,229,332),(335,290,309,278)],
  [(219,319,201,340),(332,290,307,278)],
  [(229,339,209,363),(338,292,311,277)],
  [(234,339,216,364),(341,290,312,281)],
  [(241,339,241,366),(358,328,340,339)],
  [(256,340,257,369),(378,340,380,371)]],
}
# Drawn fists crossing the torso require their own outline rather than the
# body's shared opaque chest. Outline coordinates are in the original 640 rig.
CROSSED={
 ('sword',2,0):[(258,254),(260,249),(260,242),(264,236),(269,234),(270,232),(276,231),(281,233),(284,235),(289,242),(289,250),(285,255),(282,258),(280,263),(274,266),(268,269),(261,265),(258,262)],
 ('sword',3,0):[(343,257),(347,252),(350,247),(353,240),(359,233),(365,230),(371,231),(375,236),(379,239),(380,246),(376,251),(373,253),(372,260),(366,261),(361,267),(354,268),(347,270)],
 ('sword',5,0):[(335,316),(341,313),(347,310),(353,309),(356,312),(362,313),(365,318),(371,323),(373,329),(369,335),(364,339),(359,342),(354,340),(346,339),(342,335),(337,330),(333,324)],
}
# This clenched hand and its wrist are on the chest. The outline moves;
# clipping it to the signed foreground also preserves the crease at the wrist.
CHEST = {1:(330,288),2:(335,290),3:(332,290),4:(338,292),5:(341,290)}
FAMILIES=('sword','daggers')


def manifest():
    source=(ROOT/'player-rework-weapon-native-hd.js').read_text(encoding='utf8')
    def table(label):
        marker='const '+label+'='
        if source.count(marker)!=1:raise ValueError('Missing blade anatomy '+label)
        return json.JSONDecoder().raw_decode(source.split(marker,1)[1])[0]
    w=table('ownW70SouthAuthority');d=table('ownDaggersSouthProof')
    prefix='Object.assign(ownDaggersSouthProof.frames,'
    if source.count(prefix)!=1:raise ValueError('Missing original dagger contacts')
    d['frames'].update(json.JSONDecoder().raw_decode(source.split(prefix,1)[1])[0])
    all_states=index(BANK)['records']
    profiles={}
    for key,v in d['frames'].items():
        profiles[key]=('daggers',[[u[7:-4] for u in row[1:]] for row in v['states']])
    for record in all_states:
        if record['body']!='male' or record['direction']!='south' or record.get('approvedSouthHead') or record['item'] not in (1,67,68,69,70):continue
        if record['id'] not in ('nodachi69-south-native-layers',f"sword{record['item']}-south-native-layers"):continue
        profiles[str(record['item'])]=('sword',[[l['sha256'] for l in s['layers']] for s in record['states']])
    profiles['0']=('sword',[v['layers'] for v in table('case42W0Material')])
    if len(profiles)!=12 or any(len(p[1])!=9 for p in profiles.values()):raise ValueError('Incomplete blade receivers')
    skin={'sword':w['pack']['directions']['south']['layers'][0]['frames'],'daggers':[a[0][7:-4] for a in d['anatomy']]}
    stock={'sword':w['pack']['directions']['south']['layers'][1]['frames'],'daggers':[a[1][7:-4] for a in d['anatomy']]}
    return skin,stock,profiles,table('case42F1OwnVisibleHilt')


@lru_cache(maxsize=3)
def inventory(bank):
    return json.loads((bank/'archives/archive-index.json').read_bytes())['sources']


@lru_cache(maxsize=80)
def pixels(sha):
    from PIL import Image
    for bank in (OUTFITS,BASE,BANK):
        row=inventory(bank).get(sha)
        if row:
            with zipfile.ZipFile(bank/'archives'/row['archive']) as z:data=z.read(row['path'])
            if hashlib.sha256(data).hexdigest()!=sha:raise ValueError('Changed South source '+sha)
            return Image.open(io.BytesIO(data)).convert('RGBA')
    raise ValueError('Missing source '+sha)


def contacts(family,phase,state):
    pair=list(CONTACT[family][phase])
    # Initial wind-up has the rest body's color donor but a raised drawn wrist.
    if state==1:
        if family=='sword':pair[0]=(255,318,247,341)
        else:pair[1]=(368,314,374,338)
    return pair


def hand_mattes(fam,frame,anatomy,foreground=None,state=None):
    import numpy as np
    from PIL import Image,ImageDraw
    skin=np.asarray(anatomy)
    y,x=np.indices(skin.shape);found=[]
    for side,(ax,ay,bx,by) in enumerate(contacts(fam,frame,state)):
        axis=np.array([bx-ax,by-ay],float);length=np.linalg.norm(axis);axis/=length
        u=(x-ax)*axis[0]+(y-ay)*axis[1];v=-(x-ax)*axis[1]+(y-ay)*axis[0]
        allowed=(u>=-2)&(u<length+9)&(np.abs(v)<24)
        polygon=CROSSED.get((fam,frame,side))
        if polygon:
            p=Image.new('L',SIZE);ImageDraw.Draw(p).polygon(polygon,fill=255)
            allowed &= np.asarray(p)>0
        matte=np.where(allowed,skin,0).astype('uint8')
        if fam=='daggers' and side==1 and frame in CHEST:
            fa=np.asarray(foreground)[:,:,3];matte=np.minimum(matte,fa)
        if np.count_nonzero(matte)<170:raise ValueError(('Missing blade hand',fam,frame,side))
        found.append(matte)
    if np.any(np.minimum(*found)):raise ValueError('Ambiguous hands')
    return found


def generate():
    import numpy as np
    from PIL import Image
    skins,stock,profiles,hilt=manifest();tiles={};sources={};rigs={};bindings={}
    def store(im):
        stream=io.BytesIO();im.save(stream,format='PNG',compress_level=6);raw=stream.getvalue()
        sha=hashlib.sha256(raw).hexdigest();tiles[sha+'.png']=raw;return sha
    rows=[r for r in index(OUTFITS)['records'] if r['id'].startswith('frozen-male-glove') and r['id'].endswith('-south-attack-unarmed-native-layers')]
    donors=[{},{}]
    for row in rows:
        l,=[l for l in row['pack']['directions']['south']['layers'] if l['id']=='registered-frozen-glove-native-attack']
        item=str(row['equipment']['gloves']);sha=l['frames'][0]
        if l['binding']!={'kind':'fixed'} or l['slot']!='foreground' or len(l['frames'])!=8 or sha not in row['sourceRefs']:raise ValueError('Unexpected material source')
        sources[item]={'record':row['id'],'material':sha}
        for side in range(2):
            a=np.array(pixels(sha))
            if side:a[:,:320]=0
            else:a[:,320:]=0
            donors[side][item]=a
    if len(sources)!=10:raise ValueError('Expected ten separate gloves')
    envelopes=[np.maximum.reduce([a[:,:,3] for a in group.values()]) for group in donors]
    phases=[0,0,1,2,3,4,5,6,7];cache={}
    for weapon,(family,rows) in profiles.items():
        records=rigs.setdefault(family,{'skin':skins[family],'contacts':{}})
        bindings[weapon]=[]
        for n,(phase,(bk,gk,fk)) in enumerate(zip(phases,rows,strict=True)):
            pad=(pixels(bk).width-640)//2
            if pad not in (0,128):raise ValueError('Unexpected blade margin')
            region=(pad,pad,pad+640,pad+640)
            body=np.array(pixels(bk).crop(region));fore=np.array(pixels(fk).crop(region));neutral=np.asarray(pixels(skins[family][phase]))
            shorts=np.asarray(pixels(stock[family][phase]))
            # The authored foreground also contains small pieces of the stock
            # pants at the left fist, and 41 metal samples on the first hilt.
            # Neither is a glove surface.
            fore[np.all(fore==shorts,axis=2)]=0
            if weapon=='0' and n==hilt['phase']:
                if fk!=hilt['foreground']:raise ValueError('Unexpected initial hilt source')
                for x,y,*_ in hilt['points']:fore[y,x]=0
            anatomy=np.maximum(np.minimum(body[:,:,3],neutral[:,:,3]),fore[:,:,3])
            masks=hand_mattes(family,phase,anatomy,Image.fromarray(fore),n)
            key=hashlib.sha256(family.encode()+bytes([phase])+b''.join(m.tobytes() for m in masks)).hexdigest()
            bindings[weapon].append(key)
            if key in cache:continue
            cache[key]=True;materials=records['contacts'][key]={}
            for item in sources:
                canvas=Image.new('RGBA',SIZE)
                for side,mask in enumerate(masks):
                    x,y,tx,ty=contacts(family,phase,n)[side]
                    own=bind(Image.fromarray(donors[side][item]),mask,(tx-x,ty-y),(0,1),envelopes[side])
                    if np.any(np.asarray(own)[:,:,3]>mask):raise ValueError('Glove crosses hand')
                    canvas.alpha_composite(own)
                materials[item]=store(canvas)
    tiles['register.json']=json.dumps({'rigs':rigs,'sources':sources,'bindings':bindings},separators=(',',':')).encode()
    return tiles


def materialize(bank):
    with zipfile.ZipFile(OUTPUT) as z:
        record=json.loads(z.read('register.json'))
        if len(record['sources'])!=10 or set(record['rigs'])!=set(FAMILIES):raise ValueError('Incomplete glove set')
        for r in record['rigs'].values():
            if len(r['skin'])!=8 or any(set(p)!=set(record['sources']) for p in r['contacts'].values()):raise ValueError('Incomplete blade pose')
        if len(record['bindings'])!=12 or any(len(v)!=9 for v in record['bindings'].values()):raise ValueError('Incomplete blade contacts')
        for name in z.namelist():
            if name=='register.json':continue
            raw=z.read(name)
            if hashlib.sha256(raw).hexdigest()+'.png'!=name or struct.unpack('>II',raw[16:24])!=SIZE:raise ValueError('Changed glove source')
            (bank/name).write_bytes(raw)
    return record


if __name__=='__main__':
    raw=generate()
    if '--verify' in sys.argv:
        from PIL import Image
        with zipfile.ZipFile(OUTPUT) as z:
            old=json.loads(z.read('register.json'));new=json.loads(raw['register.json'])
            if old['sources']!=new['sources'] or old['bindings']!=new['bindings']:raise ValueError('Changed contact sources')
            for k,r in new['rigs'].items():
                prior=old['rigs'][k]
                if r['skin']!=prior['skin'] or r['contacts'].keys()!=prior['contacts'].keys():raise ValueError('Changed blade rig')
                for key,items in r['contacts'].items():
                    if items.keys()!=prior['contacts'][key].keys():raise ValueError('Changed glove set')
                    for item,a in items.items():
                        b=prior['contacts'][key][item]
                        if Image.open(io.BytesIO(raw[a+'.png'])).tobytes()!=Image.open(io.BytesIO(z.read(b+'.png'))).tobytes():raise ValueError('Changed glove pixels')
    else:
        with zipfile.ZipFile(OUTPUT,'w') as z:
            for name,data in sorted(raw.items()):z.writestr(zipfile.ZipInfo(name),data,compress_type=zipfile.ZIP_DEFLATED)
