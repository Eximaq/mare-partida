import argparse,zipfile,json,hashlib,io,base64,math,pathlib,numpy as np
from PIL import Image,ImageOps
ap=argparse.ArgumentParser();ap.add_argument('--item',type=int,choices=[67,70],required=True);ap.add_argument('--equipment-zip',required=True);ap.add_argument('--source-dir',required=True);ap.add_argument('--recipe-zip',required=True);ap.add_argument('--output',required=True);args=ap.parse_args();d=pathlib.Path(args.source_dir);out=pathlib.Path(args.output);out.mkdir(exist_ok=True)
v=zipfile.ZipFile(args.recipe_zip);s=zipfile.ZipFile(args.equipment_zip);q=zipfile.ZipFile(d/'Nodachi69_EW_FonteAnterior_Intacta_Candidato_Editavel_v2.zip');r=zipfile.ZipFile(d/'Espadas0_67_70_male_EAST_WEST_QuatroTrajes_Editavel.zip');rec=json.loads(v.read(f'qa/sword{args.item}_v2_RECIPE.json'));sha=lambda b:hashlib.sha256(b).hexdigest();wb=s.read('sources/equipment.png');assert sha(wb)==rec['weapon_sha256'];pb=q.read('source68/sources/base-east.json');assert sha(pb)==rec['source_pack_sha256'];p=json.loads(pb);w=Image.open(io.BytesIO(wb)).convert('RGBA');yy,xx=np.mgrid[:768,:768];assets={};refs={};states=[]
def png(im):
 b=io.BytesIO();im.save(b,format='PNG');return b.getvalue()
def add(im):
 b=png(im);h=sha(b);assets[h+'.png']=b;return {'member':h+'.png','sha256':h}
for k in range(8):
 body=Image.new('RGBA',(768,768));gx,gy=rec['grips'][k];t=math.radians(rec['angles'][k]+rec['source_angle_offset']);A=np.array([[math.cos(t),-math.sin(t)],[math.sin(t),math.cos(t)]])*rec['scale'];iv=np.linalg.inv(A);off=np.array(rec['source_grip'])-iv@np.array([gx,gy]);gear=(w.transform((1536,1536),Image.Transform.AFFINE,(iv[0,0]/2,iv[0,1]/2,off[0],iv[1,0]/2,iv[1,1]/2,off[1]),Image.Resampling.BICUBIC).resize((768,768),Image.Resampling.LANCZOS) if args.item==70 else w.transform((768,768),Image.Transform.AFFINE,(*iv[0],off[0],*iv[1],off[1]),Image.Resampling.BICUBIC))
 for l in sorted(p['pack']['directions']['east']['layers'],key=lambda x:x['depth']):
  key=l['frames'][k] if 'frames'in l else l['source'];a=Image.open(io.BytesIO(base64.b64decode(p['images'][key].split(',')[-1]))).convert('RGBA')
  if l['id'] in ['headBase','face','hair']:
   shifted=Image.new('RGBA',(640,640));shifted.alpha_composite(a,tuple(rec['head_offsets'][k]));a=shifted
  padded=Image.new('RGBA',(768,768));padded.alpha_composite(a,(64,64));a=padded
  if l['id']=='forearm-hand-near':ha=np.array(a)[:,:,3]
  body.alpha_composite(a)
 mask=(ha>0)&((xx-gx)**2+(yy-gy)**2<24**2);arr=np.array(Image.alpha_composite(body,gear));arr[mask]=np.array(body)[mask];maskim=Image.fromarray(mask.astype('uint8')*255)
 for direction in ['east','west']:
  b,g,m,final=[ImageOps.mirror(x) if direction=='west' else x for x in [body,gear,maskim,Image.fromarray(arr)]];rb=r.read(f'original{args.item}/{direction}/{k:02}.png');assert sha(png(final))==sha(rb);refs[sha(rb)+'.png']=rb
  states.append({'item':args.item,'direction':direction,'phase':k,'body':add(b),'gear':add(g),'contactMask':add(m),'order':['body source-over','gear source-over','body replace-rgba-under-mask'],'referenceSHA256':sha(rb)})
def arc(name,items):
 with zipfile.ZipFile(out/name,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for n,b in sorted(items.items()):
   info=zipfile.ZipInfo(n,(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;z.writestr(info,b)
 return {'file':name,'members':len(items),'sha256':sha((out/name).read_bytes())}
proof={'scope':f'original male sword{args.item} E/W only; no coats, later nape correction, runtime or map claim','clip':rec['clip'],'canvas':[768,768],'constantPadding':64,'logicalFrame':p['pack']['frame'],'pivot':p['pack']['pivot'],'density':p['pack']['density'],'pivotEvidence':'Exact c996c409 base pack; no body/canvas scale or translation beyond documented original head-only offsets; WEST literal 768px mirror; original640 body padded64 each edge. No new registration guessed.','weaponSourceSHA256':sha(wb),'baseSourceSHA256':sha(pb),'recipeMember':f'recipes/historical_scripts/sword{args.item}_v2_build.py','approvalPreview':'Sentinel_948cf5e833948191bf2e88a93fa11e0a','approvalResponse':'Sentinel_3a7e31d2aed481918a33e83d12611903','approvalLimit':'Authenticated corrected0/67/70 delivery and positive continue response; historical attachments not re-fetched. Exact16PNG hashes match preserved original67/70 approved-work archive.','verifiedFrames':16,'states':states,'archives':[arc(f'sword{args.item}-independent-components.zip',assets),arc(f'sword{args.item}-approved-references.zip',refs)]};(out/f'proof{args.item}.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof['archives'],indent=2))
