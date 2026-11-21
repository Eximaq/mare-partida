from pathlib import Path
from PIL import Image
import zipfile,json,hashlib,io,numpy as np,argparse
parser=argparse.ArgumentParser();parser.add_argument('--source-dir',type=Path,required=True);parser.add_argument('--output-dir',type=Path,required=True);args=parser.parse_args();p=args.source_dir;o=args.output_dir;o.mkdir(parents=True,exist_ok=True);assets={};rigs=[];proof=[]
def store(a):
 b=io.BytesIO();Image.fromarray(a).save(b,format='PNG');b=b.getvalue();h=hashlib.sha256(b).hexdigest();assets[h]=b;return {'url':'assets/'+h+'.png','sha256':h,'size':[640,640]}
for item,fn,want in[(109,'Manopla109_Masculino_Quatro_Trajes_EW_Editavel.zip','7ee8b53eb631139192cd3bedce8c7fb2a0dc007813b583136aafce7e92ad1eac'),(117,'Braco117_M_EW_QuatroTrajes_Editavel.zip','3cdfb435942dc2ee134311de64c8ad69805e47944d53be1e319d2fd433a5e912')]:
 assert hashlib.sha256((p/fn).read_bytes()).hexdigest()==want;z=zipfile.ZipFile(p/fn)
 def im(n):return Image.open(io.BytesIO(z.read(n))).convert('RGBA')
 spec={'schema':'approved-separable-attacks-v1','rig':f'male-punch-source-sleeves-{item}','action':'attack-unarmed','body':'male','nativeCanvas':[640,640],'logicalFrame':[160,160],'pivot':[80,128],'density':4,'fps':12,'timeline':list(map(str,list(range(8))+[7]*12)),'approvedAppearance':{'hair':'original','hairColor':'brown','face':'original','eyeColor':'brown','skin':'light'},'directions':{d:{'base':[],'coats':{str(c):[]for c in[151,158,165,179]},'weapons':{str(item):[]}}for d in['east','west']},'sourceProvenance':{'sourceCommit':'2801902fa2dad8e83069815faeaa3f53f90bc1b6','archive':fn,'archiveSHA256':want,'policy':'Own authored sleeve variants, never cannon15-clipped coats. Independent gear has no coat prerequisite. Neutral coat protects head and source hand contacts outside gear alpha; generic runtime gear ownership masks coat only while that gear is present. No synthesized anatomy, cloth or pixels.'}}
 for k in range(8):
  base=im(f'inputs/{k:02}-base.png'if item==109 else f'original/117/v1/east/layers/{k:02}-base.png');gear=Image.alpha_composite(im(f'inputs/{k:02}-far.png'),im(f'inputs/{k:02}-near.png'))if item==109 else im(f'original/117/v1/east/layers/{k:02}-right-gear.png');g=np.array(gear)[:,:,3]>0;source=np.array(Image.alpha_composite(base,gear))
  for d in spec['directions']:
   flip=lambda a:a if d=='east'else a[:,::-1].copy();body=spec['directions'][d];body['base'].append(store(flip(np.array(base))));a=store(flip(np.array(gear)));a['occludesCoat']=True;body['weapons'][str(item)].append(a)
  for c in[151,158,165,179]:
   member=f'{c}/{k}-cloth.png'if item==109 else f'template112/{c}/{k}-cloth.png';cloth=np.array(im(member));mask=np.zeros(g.shape,bool)
   if item==117:mask=np.array(Image.open(io.BytesIO(z.read(f'template112/{c}/{k}-ownership.png'))))>0
   mask[:205]=True;mask&=~g;assert np.array_equal(source[mask],np.array(base)[mask]);cloth[mask]=0;occluded=cloth.copy();occluded[g]=0;out=np.array(Image.alpha_composite(Image.alpha_composite(base,Image.fromarray(occluded)),gear))
   for d in spec['directions']:
    flip=lambda a:a if d=='east'else a[:,::-1].copy();ref=np.array(im(f'{c}/{k}-{d}.png'if item==109 else f'male/{c}/{k}-{d}.png'));diff=int(np.count_nonzero(np.any(flip(out)!=ref,axis=2)));assert diff==0;spec['directions'][d]['coats'][str(c)].append(store(flip(cloth)));proof.append({'item':item,'coat':c,'state':k,'direction':d,'sourceRGBAReferenceDifferencePixels':0,'newSkinVsReferencePixels':0,'clothSourceMember':member,'clothSourceSHA256':hashlib.sha256(z.read(member)).hexdigest(),'weaponIndependentOfCoat':True})
 rigs.append(spec)
name='separable-109117-authored-sleeves.zip'
with zipfile.ZipFile(o/name,'w',compression=zipfile.ZIP_STORED)as zz:
 for h,b in sorted(assets.items()):
  info=zipfile.ZipInfo(h+'.png',date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_STORED;zz.writestr(info,b)
a={'file':name,'sha256':hashlib.sha256((o/name).read_bytes()).hexdigest(),'bytes':(o/name).stat().st_size,'pngCount':len(assets),'compression':'stored'};(o/'rigs.json').write_text(json.dumps(rigs,indent=2)+'\n');(o/'archive-additions.json').write_text(json.dumps({'archives':[a],'sources':{h:{'archive':name,'path':h+'.png','bytes':len(b)}for h,b in assets.items()}},indent=2)+'\n');(o/'proof.json').write_text(json.dumps({'scope':'Authentic109117sleeves replacing mismatched15coat clips','sourceMatches':proof},indent=2)+'\n');print(a);print('128source references exact; no newly exposed skin')
