from pathlib import Path
from PIL import Image,ImageOps
import argparse,zipfile,hashlib,json,io,numpy as np
p=argparse.ArgumentParser();p.add_argument('--approved-dir',type=Path,required=True);p.add_argument('--recovery111',type=Path,required=True);p.add_argument('--rebuilt112',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();o=a.output_dir;o.mkdir(exist_ok=True,parents=True);(o/'assets').mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest();read=lambda z,n:Image.open(io.BytesIO(z.read(n))).convert('RGBA');assets={};fixtures={};inputs={};rows=[];rigs=[];sources={};z111=zipfile.ZipFile(a.recovery111)
def put(im,dest):
 b=io.BytesIO();im.save(b,format='PNG');raw=b.getvalue();h=sha(raw);dest[h+'.png']=raw;(o/'assets'/f'{h}.png').write_bytes(raw);return {'url':f'assets/{h}.png','sha256':h,'size':[640,640]}
for item,fn in [(111,'male111-four-torsos-ew-v3.zip'),(112,'male112-four-torsos-ew.zip')]:
 raw=(a.approved_dir/fn).read_bytes();z=zipfile.ZipFile(io.BytesIO(raw));sources[str(item)]={'filename':fn,'sha256':sha(raw)};rig={'rig':f'male-authored-gauntlet{item}-eight','item':item,'directions':{'east':{'coats':{}},'west':{'coats':{}}},'timeline':list(map(str,range(8))),'fps':12,'scope':'New optional coat layers only. Existing anatomy and gear remain separate and unchanged; no arbitrary extra slots or palette.'}
 for coat in [151,158,165,179]:
  for d in ['east','west']:rig['directions'][d]['coats'][str(coat)]=[]
  for k in range(8):
   base=read(z111,f'manopla111-ew-candidate-v1/east/layers/{k:02}-base.png')if item==111 else Image.open(a.rebuilt112/f'east/layers/{k:02}-base.png').convert('RGBA');gear=read(z111,f'manopla111-ew-candidate-v1/east/layers/{k:02}-equipment.png')if item==111 else Image.open(a.rebuilt112/f'east/layers/{k:02}-equipment.png').convert('RGBA')
   assert Image.alpha_composite(base,gear).tobytes()==read(z,f'source/{k}/composite.png').tobytes()
   cloth=np.array(read(z,f'{coat}/{k}-cloth.png'));owner=np.array(Image.open(io.BytesIO(z.read(f'{coat}/{k}-ownership.png'))))>0;cloth[owner,3]=0;cloth[:205,:,3]=0;cl=Image.fromarray(cloth)
   for d in ['east','west']:
    b,g,c=[ImageOps.mirror(x)if d=='west'else x for x in [base,gear,cl]];refraw=z.read(f'{coat}/{k}-{d}.png');ref=Image.open(io.BytesIO(refraw)).convert('RGBA');comp=Image.alpha_composite(Image.alpha_composite(b,c),g);assert comp.tobytes()==ref.tobytes(),(item,coat,k,d)
    asset=put(c,assets);rig['directions'][d]['coats'][str(coat)].append(asset);fixtures[f'{item}/{coat}/{d}/{k:02}.png']=refraw
    rows.append({'item':item,'coat':coat,'direction':d,'phase':k,'base':put(b,inputs),'gear':put(g,inputs),'cloth':asset,'reference':f'{item}/{coat}/{d}/{k:02}.png','referenceSHA256':sha(refraw),'rgbaExact':True})
 rigs.append(rig)
def archive(name,data):
 with zipfile.ZipFile(o/name,'w',compression=zipfile.ZIP_STORED)as z:
  for n,b in sorted(data.items()):z.writestr(zipfile.ZipInfo(n,date_time=(2026,1,1,0,0,0)),b)
 with zipfile.ZipFile(o/name)as z:assert z.testzip()is None
 return {'file':name,'sha256':sha((o/name).read_bytes()),'bytes':(o/name).stat().st_size,'members':len(data)}
archives=[archive('lot6-coats-151-158-165-179-on-111-112.zip',assets),archive('lot6-independent-approved-fixtures.zip',fixtures),archive('lot6-verification-base-gear-only.zip',inputs)]
manifest={'schema':'lot6-authored-coat-overlay-proof-v1','sources':sources,'recovery111SHA256':sha(a.recovery111.read_bytes()),'archives':archives,'rigs':rigs,'comparisons':rows,'recipe':'PreserveRGBA; clear cloth alpha where originalownership>0 androwsy<205. Base source-over cloth source-over unchanged gear. WEST literal mirror of each approvedEASTlayer and checks against ownWESTreference. No new pixels; transparent RGB preserved.','headJSON':'Not included or modified','runtime':'No changes;8tick12fps staysunchanged; sourcepreviewhold12not adopted'}
(o/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(o/'rig-coat-additions.json').write_text(json.dumps(rigs,indent=2)+'\n');print(json.dumps(archives));print('PASS128 exact approved composites')
