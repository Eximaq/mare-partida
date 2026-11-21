from pathlib import Path
from PIL import Image
import io,hashlib,json,zipfile,argparse
p=argparse.ArgumentParser();p.add_argument('--library-dir',type=Path,required=True);p.add_argument('--approved-dir',type=Path,required=True);p.add_argument('--rebuilt112',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();o=a.output_dir;o.mkdir(exist_ok=True,parents=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
files={111:('Manopla111_EAST_WEST_BaseLocal_v1_Candidata_Recuperavel.zip','339d40aed7dd77c2ae4d49e1fc7540f9b32ea60bd4524d0da9ce544737aa2c7a','weapon111_east-west_local-base-v1_approved.zip'),112:('Ruptura112_Encaixe_Recuperacao_Ciclo_20261111_v3.zip','84937046c298b74bf5bc7ff1c760be292a66180345f7f893d6e88c9de24d9338','weapon112_north-east-west_approved-v3.zip')}
assets={};proof={'scope':'Original separate base and equipment only; no clothing compatibility asserted; E/W only. Source preview hold is not runtime timing approval.','items':{}};candidates=[]
for item,(filename,digest,approvedname) in files.items():
 raw=(a.library_dir/filename).read_bytes();assert sha(raw)==digest
 src=zipfile.ZipFile(io.BytesIO(raw));apraw=(a.approved_dir/approvedname).read_bytes();ap=zipfile.ZipFile(io.BytesIO(apraw));rows=[];directions={}
 for d in ['east','west']:
  parts={'base':[],'coats':{},'weapons':{str(item):[]}}
  for k in range(8):
   layers={}
   for kind in ['base','equipment']:
    member=f'manopla111-ew-candidate-v1/{d}/layers/{k:02}-{kind}.png' if item==111 else f'{d}/layers/{k:02}-{kind}.png'
    b=src.read(member) if item==111 else (a.rebuilt112/member).read_bytes()
    image=Image.open(io.BytesIO(b));assert image.mode=='RGBA' and image.size==(640,640)
    h=sha(b);assets[h]=b;layers[kind]=image
    descriptor={'url':'assets/'+h+'.png','sha256':h,'size':[640,640]}
    (parts['base'] if kind=='base' else parts['weapons'][str(item)]).append(descriptor)
   refmember=f'frames/{d}/{k:02}.png' if item==111 else f'{d}/frames/{k:02}.png';refraw=ap.read(refmember);ref=Image.open(io.BytesIO(refraw)).convert('RGBA');composite=Image.alpha_composite(layers['base'],layers['equipment']);assert composite.tobytes()==ref.tobytes(),(item,d,k)
   rows.append({'direction':d,'phase':k,'referenceMember':refmember,'referenceSHA256':sha(refraw),'rgbaSHA256':sha(ref.tobytes()),'changedPixels':0})
  directions[d]=parts
 proof['items'][str(item)]={'recoveryArchive':filename,'recoverySHA256':digest,'approvedArchive':approvedname,'approvedSHA256':sha(apraw),'comparisons':rows,'basePolicy':'Preserve original authored base repairs/hand occlusion; do not substitute generic punch base.'}
 candidates.append({'item':item,'body':'male','nativeCanvas':[640,640],'logicalFrame':[160,160],'pivot':[80,128],'density':4,'sourceSequence':list(range(8)),'sourceFPS':12,'directions':directions})
name='separable-111112-original-base-gear.zip'
with zipfile.ZipFile(o/name,'w',compression=zipfile.ZIP_STORED) as z:
 for h,b in sorted(assets.items()):z.writestr(zipfile.ZipInfo(h+'.png',date_time=(2026,1,1,0,0,0)),b)
archive={'file':name,'sha256':sha((o/name).read_bytes()),'bytes':(o/name).stat().st_size,'pngCount':len(assets),'compression':'stored'}
proof['archive']=archive
(o/'separable-111112-source-proof.json').write_text(json.dumps(proof,indent=2)+'\n')
(o/'candidate-rigs-111112.json').write_text(json.dumps(candidates,indent=2)+'\n')
(o/'archive-additions-111112.json').write_text(json.dumps({'archives':[archive],'sources':{h:{'archive':name,'path':h+'.png','bytes':len(b)}for h,b in assets.items()}},indent=2)+'\n')
print(json.dumps(archive));print('PASS32 original composites; no clothing claim; no index changes')
