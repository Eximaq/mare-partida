#!/usr/bin/env python3
from pathlib import Path
from PIL import Image
import zipfile,io,numpy as np,json,hashlib,argparse
parser=argparse.ArgumentParser(description='Repackage verified approved source layers; no new art.');parser.add_argument('--source-dir',type=Path,required=True);parser.add_argument('--output-dir',type=Path,required=True);args=parser.parse_args();p=args.source_dir;o=args.output_dir;o.mkdir(parents=True,exist_ok=True);z=zipfile.ZipFile(p/'male15_east-west_four-torsos_approved-v1.zip');b=zipfile.ZipFile(p/'male118_east-west_four-torsos_approved-v2.zip');assert hashlib.sha256((p/'male15_east-west_four-torsos_approved-v1.zip').read_bytes()).hexdigest()=='7e5a8cc954562e40e781c7e526c3ff15d0ce99d7b6921fa67f531dbbe70cf461';assert hashlib.sha256((p/'male118_east-west_four-torsos_approved-v2.zip').read_bytes()).hexdigest()=='55b2ab8f948c726a6d9cc9861c941475867cb8f13ec8d12eedfdc3b2b7f69525';assets={};dirs={d:{'base':[],'coats':{str(c):[]for c in [151,158,165,179]},'weapons':{'15':[]}}for d in ['east','west']};proof=[]
def ar(z,n):return np.array(Image.open(io.BytesIO(z.read(n))).convert('RGBA'))
def asset(a):
 s=io.BytesIO();Image.fromarray(a).save(s,format='PNG');v=s.getvalue();h=hashlib.sha256(v).hexdigest();assets[h]=v;return {'url':'assets/'+h+'.png','sha256':h,'size':[640,640]}
for k in range(8):
 base=ar(b,f'base/{k}.png');gear=ar(z,f'equipment/{k}.png');m=np.array(Image.open(io.BytesIO(z.read(f'contacts/{k}.png'))))>0;m|=np.array(Image.open(io.BytesIO(z.read('head-mask.png'))))>0;m[:205]=True
 for d in dirs:
  flip=lambda a:a if d=='east' else a[:,::-1].copy();dirs[d]['base'].append(asset(flip(base)));dirs[d]['weapons']['15'].append(asset(flip(gear)))
 for c in [151,158,165,179]:
  cloth=ar(z,f'{c}/{k}-cloth.png');cloth[m]=0;out=np.array(Image.alpha_composite(Image.alpha_composite(Image.fromarray(base),Image.fromarray(cloth)),Image.fromarray(gear)))
  for d in dirs:
   flip=lambda a:a if d=='east' else a[:,::-1].copy();expected=ar(z,f'{c}/{k}-'+('frame' if d=='east' else 'west')+'.png');assert np.array_equal(flip(out),expected);dirs[d]['coats'][str(c)].append(asset(flip(cloth)));proof.append({'coat':c,'state':k,'direction':d,'rgbaDifferencePixels':0})
name='separable-male-15-coats-151-158-165-179.zip'
with zipfile.ZipFile(o/name,'w',compression=zipfile.ZIP_STORED)as z:
 for h,v in sorted(assets.items()):
  info=zipfile.ZipInfo(h+'.png',date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_STORED;z.writestr(info,v)
data=(o/name).read_bytes();manifest={'schema':'approved-separable-attacks-v1','body':'male','nativeCanvas':[640,640],'logicalFrame':[160,160],'pivot':[80,128],'density':4,'fps':12,'timeline':list(map(str,list(range(8))+[7]*12)),'approvedAppearance':{'hair':'original','hairColor':'brown','face':'original','eyeColor':'brown','skin':'light'},'directions':dirs};(o/'separableAttacks.json').write_text(json.dumps(manifest,indent=2)+'\n');archive={'file':name,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'pngCount':len(assets),'compression':'stored'};(o/'archive-additions.json').write_text(json.dumps({'archives':[archive],'sources':{h:{'archive':name,'path':h+'.png','bytes':len(v)}for h,v in assets.items()}},indent=2)+'\n');(o/'proof.json').write_text(json.dumps({'source15SHA256':hashlib.sha256((p/'male15_east-west_four-torsos_approved-v1.zip').read_bytes()).hexdigest(),'source118SHA256':hashlib.sha256((p/'male118_east-west_four-torsos_approved-v2.zip').read_bytes()).hexdigest(),'policy':'Zero masked cloth pixels only, authored weapon retained, clean base from118, no new art; WEST literal source-verified mirror','renders':proof},indent=2)+'\n');print(archive);print('64 exact renders verified')
