import argparse,zipfile,json,hashlib,io,base64,math,pathlib,numpy as np
from PIL import Image,ImageOps
ap=argparse.ArgumentParser();ap.add_argument('--source-dir',required=True);ap.add_argument('--recipe-zip',required=True);ap.add_argument('--output',required=True);args=ap.parse_args();d=pathlib.Path(args.source_dir);out=pathlib.Path(args.output);out.mkdir(exist_ok=True)
v=zipfile.ZipFile(args.recipe_zip);s=zipfile.ZipFile(d/'Espada0 NORTH - Base original restaurada - Pacote.zip');q=zipfile.ZipFile(d/'Nodachi69_EW_FonteAnterior_Intacta_Candidato_Editavel_v2.zip');r=zipfile.ZipFile(d/'Espadas0_67_70_male_EAST_WEST_QuatroTrajes_Editavel.zip');rec=json.loads(v.read('qa/sword0_v2_RECIPE.json'));sha=lambda b:hashlib.sha256(b).hexdigest();wb=s.read('sources/espada0-south.png');assert sha(wb)==rec['weapon_sha256'];pb=q.read('source68/sources/base-east.json');assert sha(pb)==rec['source_pack_sha256'];p=json.loads(pb);w=Image.open(io.BytesIO(wb)).convert('RGBA');yy,xx=np.mgrid[:640,:640];assets={};refs={};states=[]
def png(im):
 b=io.BytesIO();im.save(b,format='PNG');return b.getvalue()
def add(im):
 b=png(im);h=sha(b);assets[h+'.png']=b;return {'member':h+'.png','sha256':h}
for k in range(8):
 body=Image.new('RGBA',(640,640));gx,gy=rec['grips'][k];t=math.radians(rec['angles'][k]+47.06);A=np.array([[math.cos(t),-math.sin(t)],[math.sin(t),math.cos(t)]])*.1;iv=np.linalg.inv(A);off=np.array([260,1020])-iv@np.array([gx,gy]);gear=w.transform((640,640),Image.Transform.AFFINE,(*iv[0],off[0],*iv[1],off[1]),Image.Resampling.BICUBIC)
 for l in sorted(p['pack']['directions']['east']['layers'],key=lambda x:x['depth']):
  key=l['frames'][k] if 'frames'in l else l['source'];a=Image.open(io.BytesIO(base64.b64decode(p['images'][key].split(',')[-1]))).convert('RGBA')
  if l['id'] in ['headBase','face','hair']:
   shifted=Image.new('RGBA',(640,640));shifted.alpha_composite(a,tuple(rec['head_offsets'][k]));a=shifted
  if l['id']=='forearm-hand-near':ha=np.array(a)[:,:,3]
  body.alpha_composite(a)
 mask=(ha>0)&((xx-gx)**2+(yy-gy)**2<24**2);arr=np.array(Image.alpha_composite(body,gear));arr[mask]=np.array(body)[mask];maskim=Image.fromarray(mask.astype('uint8')*255)
 for direction in ['east','west']:
  b,g,m,final=[ImageOps.mirror(x) if direction=='west' else x for x in [body,gear,maskim,Image.fromarray(arr)]];rb=r.read(f'original0/{direction}/{k:02}.png');assert sha(png(final))==sha(rb);refs[sha(rb)+'.png']=rb
  states.append({'item':0,'direction':direction,'phase':k,'body':add(b),'gear':add(g),'contactMask':add(m),'order':['body source-over','gear source-over','body replace-rgba-under-mask'],'referenceSHA256':sha(rb)})
def arc(name,items):
 with zipfile.ZipFile(out/name,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for n,b in sorted(items.items()):
   info=zipfile.ZipInfo(n,(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;z.writestr(info,b)
 return {'file':name,'members':len(items),'sha256':sha((out/name).read_bytes())}
proof={'scope':'original male sword0 E/W only; no coats, later nape correction, runtime or map claim','clip':rec['clip'],'canvas':[640,640],'logicalFrame':p['pack']['frame'],'pivot':p['pack']['pivot'],'density':p['pack']['density'],'pivotEvidence':'Exact c996c409 base pack; no body/canvas scale or translation beyond documented original head-only offsets; WEST literal 640px mirror. No new registration guessed.','weaponSourceSHA256':sha(wb),'baseSourceSHA256':sha(pb),'recipeMember':'recipes/historical_scripts/sword0_v2_build.py','approvalLimit':'Authenticated corrected0/67/70 delivery and positive continue response; historical attachments not re-fetched. Exact16PNG hashes match preserved original0 approved-work archive.','verifiedFrames':16,'states':states,'archives':[arc('sword0-independent-components.zip',assets),arc('sword0-approved-references.zip',refs)]};(out/'proof.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof['archives'],indent=2))
