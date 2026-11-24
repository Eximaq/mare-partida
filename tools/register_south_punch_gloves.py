"""Bind the signed front glove textures to the twelve original gauntlet drawings."""
import hashlib
import io
import json
import sys
import zipfile
from functools import lru_cache

from register_south_focus_trousers import ROOT, OUTFITS, index
from register_staff_gloves import bind
from export_staff_coats import BANK, weapons

ARCHIVE=ROOT/'tools/rework-combat-wardrobe/south-punch-gloves.zip'
# Wrist section and outline, in the original 640-pixel receiver. Some fists
# cross the chest. An explicit contour keeps those flesh pixels off the glove.
# Each entry gives the cuff-to-fingers axis followed by its hand polygon.
REST=((0,1),[(245,334),(261,335),(265,345),(278,351),(278,380),(243,383),(240,348)])
GUARD=((11,-23),[(270,270),(277,261),(282,243),(287,239),(301,239),(308,244),(308,255),(303,265),(296,270),(290,280)])
GUARD_FAR=((-11,-23),[(337,243),(343,239),(356,239),(361,244),(365,260),(372,272),(357,278),(348,267),(341,264),(337,255)])
def shift(panel,x,y):
    return panel[0],[(a+x,b+y) for a,b in panel[1]]
def reflect(panel,axis=640):
    return (-panel[0][0],panel[0][1]),[(axis-x,y) for x,y in panel[1]]
RECOVERY=((20,-10),[(272,291),(282,286),(287,276),(294,274),(303,276),(306,281),(304,292),(300,297),(288,301),(280,307)])
LOW=((18,10),[(266,309),(276,302),(282,306),(288,306),(298,311),(299,321),(293,327),(287,328),(278,325)])
LOWER=((13,16),[(262,310),(275,306),(281,313),(288,316),(292,321),(290,327),(286,334),(278,336),(268,331),(264,324)])
OPENING=((-1,25),[(249,324),(264,327),(266,334),(276,340),(279,360),(270,366),(246,366),(243,347)])
NEAR=[REST,GUARD,((16,12),[(257,294),(267,285),(276,286),(289,290),(293,297),(292,306),(282,317),(271,319),(258,310)]),
 ((2,20),[(248,269),(256,258),(274,251),(288,254),(299,262),(303,276),(302,285),(291,291),(262,292),(249,286)]),
 ((5,23),[(256,250),(270,241),(286,237),(303,237),(316,244),(322,259),(322,269),(316,279),(305,284),(272,286),(257,277)]),
 ((6,21),[(248,264),(259,254),(278,248),(292,247),(303,253),(310,263),(312,273),(310,284),(300,290),(264,294),(251,284)]),
 shift(GUARD,2,0),RECOVERY,LOW,LOWER,OPENING,shift(REST,-2,-5)]
FAR=[reflect(REST,645),GUARD_FAR,shift(GUARD_FAR,7,7),shift(GUARD_FAR,8,10),
 shift(GUARD_FAR,9,9),shift(GUARD_FAR,9,9),shift(GUARD_FAR,2,0),reflect(RECOVERY),reflect(LOW),reflect(LOWER),reflect(OPENING),reflect(shift(REST,-2,-5),645)]

def generate(verify=False):
    import numpy as np
    from PIL import Image, ImageDraw
    body=next(r for r in weapons()['orderedAttackProfiles'] if r['id']=='authored-ordered-14-south')
    urls=[s['layers'][0]['sha256'] for s in body['states']]
    if len(urls)!=12 or any(s['layers'][0]['component']!='anatomy' for s in body['states']):raise ValueError('Original twelve-state receiver required')
    sources={b:json.loads((b/'archives/archive-index.json').read_bytes())['sources'] for b in [BANK,OUTFITS]}
    @lru_cache(maxsize=40)
    def read(bank,key):
        row=sources[bank][key]
        with zipfile.ZipFile(bank/'archives'/row['archive']) as z:raw=z.read(row['path'])
        if hashlib.sha256(raw).hexdigest()!=key:raise ValueError('Original panel changed')
        return np.array(Image.open(io.BytesIO(raw)).convert('RGBA'))
    records=[r for r in index(OUTFITS)['records'] if r['id'].startswith('frozen-male-glove') and r['id'].endswith('-south-attack-unarmed-native-layers')]
    if len(records)!=10:raise ValueError('Incomplete original glove records')
    donor={}
    for record in records:
        item=record['equipment']['gloves']
        part=next(l for l in record['pack']['directions']['south']['layers'] if l['id']=='registered-frozen-glove-native-attack')
        if record['body']!='male' or part['binding']!={'kind':'fixed'} or len(part['frames'])!=8:raise ValueError('Unexpected garment')
        donor[item]=part['frames'][0]
    result={str(i):{} for i in donor};assets={}
    for side,track in [('right',NEAR),('left',FAR)]:
        panels={}
        for item,h in donor.items():
            im=read(OUTFITS,h).copy()
            if side=='right':im[:,320:]=0
            else:im[:,:320]=0
            panels[item]=im
        envelope=np.maximum.reduce([im[:,:,3] for im in panels.values()])
        masks=[]
        for phase,(axis,outline) in enumerate(track):
            anatomy=read(BANK,urls[phase]);area=Image.new('L',(640,640))
            ImageDraw.Draw(area).polygon(outline,fill=255)
            coverage=np.minimum(np.array(area),anatomy[:,:,3])
            masks.append((axis,coverage))
        for item,im in panels.items():
            phases=[]
            for f,(axis,coverage) in enumerate(masks):
                art=bind(Image.fromarray(im),coverage,axis,(0,1),envelope)
                alpha=np.asarray(art)[:,:,3];count=int(np.count_nonzero(alpha))
                if count<220 or np.any(alpha>coverage):raise ValueError('Invalid hand ownership '+str((item,side,f,count)))
                stream=io.BytesIO();art.save(stream,format='PNG',optimize=True);raw=stream.getvalue()
                key=hashlib.sha256(raw).hexdigest();assets[key+'.png']=raw
                phases.append(dict(art=key,source=donor[item],pixels=count))
            result[str(item)][side]=phases
    rig=next(r for r in index(ROOT/'tools/rework-base-hd')['records'] if r['id']=='male-attack-unarmed-south-drawn8')
    manifest=dict(bodyHashes=urls,articulatedBody=rig['sourcePackSHA256'],source='frozen-male-glove*-south-attack-unarmed-native-layers',items=result)
    if verify:
        with zipfile.ZipFile(ARCHIVE) as z:
            previous=json.loads(z.read('registration.json'))
            if previous['bodyHashes']!=urls or previous['articulatedBody']!=manifest['articulatedBody'] or set(previous['items'])!=set(result):raise ValueError('Receiver changed')
            for item,hands in result.items():
                for side,track in hands.items():
                    for row,old in zip(track,previous['items'][item][side],strict=True):
                        original=Image.open(io.BytesIO(z.read(old['art']+'.png'))).convert('RGBA')
                        new=Image.open(io.BytesIO(assets[row['art']+'.png'])).convert('RGBA')
                        if row['source']!=old['source'] or row['pixels']!=old['pixels'] or original.tobytes()!=new.tobytes():raise ValueError('Registered glove changed')
        return
    assets['registration.json']=json.dumps(manifest,separators=(',',':')).encode()
    with zipfile.ZipFile(ARCHIVE,'w') as z:
        for name,raw in sorted(assets.items()):z.writestr(zipfile.ZipInfo(name),raw,compress_type=zipfile.ZIP_DEFLATED)
if __name__=='__main__':
    generate('--verify' in sys.argv)
