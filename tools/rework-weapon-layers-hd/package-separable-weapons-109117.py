#!/usr/bin/env python3
from pathlib import Path
from PIL import Image
import zipfile,json,hashlib,io,numpy as np,argparse
parser=argparse.ArgumentParser();parser.add_argument('--source-dir',type=Path,required=True);parser.add_argument('--output-dir',type=Path,required=True);args=parser.parse_args();p=args.source_dir;o=args.output_dir;o.mkdir(parents=True,exist_ok=True);assets={};directions={d:{'weapons':{}}for d in ['east','west']};evidence={}
def load(z,n):return Image.open(io.BytesIO(z.read(n))).convert('RGBA')
def store(a):
 b=io.BytesIO();a.save(b,format='PNG');b=b.getvalue();h=hashlib.sha256(b).hexdigest();assets[h]=b;return {'url':'assets/'+h+'.png','sha256':h,'size':[640,640],'occludesCoat':True}
basez=zipfile.ZipFile(p/'male118_east-west_four-torsos_approved-v2.zip')
for item,name,want in [(109,'Manopla109_Masculino_Quatro_Trajes_EW_Editavel.zip','7ee8b53eb631139192cd3bedce8c7fb2a0dc007813b583136aafce7e92ad1eac'),(117,'Braco117_M_EW_QuatroTrajes_Editavel.zip','3cdfb435942dc2ee134311de64c8ad69805e47944d53be1e319d2fd433a5e912')]:
 b=(p/name).read_bytes();assert hashlib.sha256(b).hexdigest()==want;z=zipfile.ZipFile(io.BytesIO(b));nested=zipfile.ZipFile(io.BytesIO(z.read('equipment-source.zip')))if item==109 else None;evidence[str(item)]={'sourceArchive':name,'sourceArchiveSHA256':want,'sourceCommit':'2801902fa2dad8e83069815faeaa3f53f90bc1b6','frames':[]}
 for d in directions:directions[d]['weapons'][str(item)]=[]
 for k in range(8):
  if item==109:
   members=[f'inputs/{k:02}-far.png',f'inputs/{k:02}-near.png'];base=load(z,f'inputs/{k:02}-base.png');gear=Image.alpha_composite(*(load(z,n)for n in members));ref=load(nested,f'candidate-eight-editable/reference/{k:02}-east.png')
  else:
   members=[f'original/117/v1/east/layers/{k:02}-right-gear.png'];base=load(z,f'original/117/v1/east/layers/{k:02}-base.png');gear=load(z,members[0]);ref=load(z,f'original/117/v1/east/frames/{k:02}.png')
  assert base.tobytes()==load(basez,f'base/{k}.png').tobytes();out=Image.alpha_composite(base,gear);diff=int(np.count_nonzero(np.any(np.array(out)!=np.array(ref),axis=2)));assert diff==0,(item,k,diff)
  directions['east']['weapons'][str(item)].append(store(gear));directions['west']['weapons'][str(item)].append(store(gear.transpose(Image.Transpose.FLIP_LEFT_RIGHT)))
  evidence[str(item)]['frames'].append({'state':k,'sourceMembers':[{'path':n,'sha256':hashlib.sha256(z.read(n)).hexdigest()}for n in members],'baseMatchesPublishedRig':True,'approvedBareSourceRgbaDifferencePixels':0,'referenceRgbaSHA256':hashlib.sha256(ref.tobytes()).hexdigest(),'originalClothedReferencesNotClaimedExact':True})
name='separable-weapons-109-117.zip'
with zipfile.ZipFile(o/name,'w',compression=zipfile.ZIP_STORED)as z:
 for h,b in sorted(assets.items()):
  info=zipfile.ZipInfo(h+'.png',date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_STORED;z.writestr(info,b)
archive={'file':name,'sha256':hashlib.sha256((o/name).read_bytes()).hexdigest(),'bytes':(o/name).stat().st_size,'pngCount':len(assets),'compression':'stored'}
(o/'additions.json').write_text(json.dumps({'directions':directions,'archives':[archive],'sources':{h:{'archive':name,'path':h+'.png','bytes':len(b)}for h,b in assets.items()}},indent=2)+'\n');(o/'source-proof.json').write_text(json.dumps({'schema':'separable-weapons109117-proof-v1','sourcePixelPolicy':'Native RGBA unscaled;109 far+near authored source-over;117 authored singlegear;WEST literal mirror. Binary alpha>0 occlusion applies to optional coat only, never base. No coat ID dependency.','evidence':evidence},indent=2)+'\n');print(archive)
