from pathlib import Path
import json,zipfile,hashlib,io
from PIL import Image,ImageOps
import argparse
parser=argparse.ArgumentParser(description='Package verified staff layers into deterministic canonical archives.')
parser.add_argument('--source-dir',type=Path,required=True)
parser.add_argument('--replay-dir',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
a=parser.parse_args();D=a.replay_dir;OUT=a.output;OUT.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
def png(im):b=io.BytesIO();im.save(b,format='PNG');return b.getvalue()
def flip(b):return png(ImageOps.mirror(Image.open(io.BytesIO(b)).convert('RGBA')))
z=zipfile.ZipFile(a.source_dir/'Cetro123_EAST_WEST_v1_Editavel.zip');profile=json.loads(z.read('shared-profile/registry.json'));proof=json.loads((D/'proof.json').read_text());assets={};fixtures={};anatomy=set();gearset=set();descriptors=[];oldWest=[]
for item in range(123,128):
 for direction in ['east','west']:
  r={'schema':'approved-native-ordered-attack-v1','id':f'authored-ordered-{item}-{direction}','item':item,'body':'male','direction':direction,'action':'attack-focus','nativeCanvas':[640,640],'logicalFrame':[160,160],'pivot':[80,128],'density':4,'timeline':list(map(str,range(8))),'fps':12,'contactTick':4,'loop':False,'phaseCount':8,'approvedAppearance':{'hair':'original','hairColor':'brown','face':'original','eyeColor':'brown','skin':'light'},'visualSampling':{'schema':'authored-contact-progress-v1','contactTick':4},'states':[]}
  for k in range(8):
   layers=[]
   for depth,l in enumerate(next(p for p in profile['poses']if p['direction']=='east'and p['pose']==k)['layers']):
    isgear=l.get('slot')=='equipment';name='gear'if isgear else l['name']
    if isgear:raw=(D/str(item)/direction/f'{k:02}-gear.png').read_bytes();origin=f'123/east/gear/{k:02}.png' if item==123 else f'recorded staff_{item}.json affine on SHA-bound texture'
    else:raw=z.read('shared-profile/'+l['asset']);raw=flip(raw)if direction=='west'else raw;origin='123/shared-profile/'+l['asset']
    h=sha(raw);assets[h+'.png']=raw;(gearset if isgear else anatomy).add(h)
    layers.append({'id':name,'role':name,'component':'equipment'if isgear else'anatomy','operation':'source-over','depth':depth,'url':'assets/'+h+'.png','sha256':h,'size':[640,640],'sourceMember':origin,'mirror':direction=='west'})
   ref=next(x for x in proof['rows']if x['item']==item and x['direction']==direction and x['phase']==k);assert ref['byteExact'];raw=(D/str(item)/direction/f'{k:02}-composite.png').read_bytes();assert sha(raw)==ref['approvedSHA256'];fixtures[f'{item}/{direction}/{k:02}.png']=raw
   r['states'].append({'state':str(k),'layers':layers,'approvedReferenceSHA256':ref['approvedSHA256']})
  descriptors.append(r)
for k in range(8):
 raw=z.read(f'west/frames/{k:02}.png');expected=next(x for x in proof['rows']if x['item']==123 and x['direction']=='west'and x['phase']==k);oldWest.append({'phase':k,'oldNativeWestSHA256':sha(raw),'approvedMirrorSHA256':expected['approvedSHA256'],'sameBytes':sha(raw)==expected['approvedSHA256']})
def writezip(name,members):
 p=OUT/name
 with zipfile.ZipFile(p,'w',zipfile.ZIP_DEFLATED)as out:
  for n,b in sorted(members.items()):info=zipfile.ZipInfo(n,date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;out.writestr(info,b)
 return {'file':name,'sha256':sha(p.read_bytes()),'members':len(members),'bytes':p.stat().st_size}
archives=[writezip('staff123-127-independent-assets.zip',assets),writezip('staff123-127-approved-fixtures.zip',fixtures)]
manifest={'archives':archives,'assetSets':{'anatomy':{'count':len(anatomy),'sha256':sha(('\n'.join(sorted(anatomy))+'\n').encode()),'members':sorted(anatomy)},'equipment':{'count':len(gearset),'sha256':sha(('\n'.join(sorted(gearset))+'\n').encode()),'members':sorted(gearset)}},'assetSetHashRule':'SHA256 of sorted PNG SHA256 values, each followed by LF','referenceFramesExact':80,'old123WestRejected':oldWest,'scope':'male original appearance; attack-focus E/W, weapon only; no clothes or other slots certified; source replay only, no Canvas/runtime/browser proof','timing':'8 phases, nominal12fps, contact4, nonloop; renderer contact mapping must not change gameplay clock','mirror':'all WEST layers are literal EAST flips, not native authored WEST','historicalProfileApproval':'profile metadata predates final approval; proof is exact approved final hashes, not universal anatomy approval'}
(OUT/'descriptors.json').write_text(json.dumps(descriptors,indent=2));(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2));print(json.dumps({'archives':archives,'anatomy':len(anatomy),'equipment':len(gearset),'oldWestEqual':sum(x['sameBytes']for x in oldWest)}))
