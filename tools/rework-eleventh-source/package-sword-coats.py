"""Package authentic clothing clipped only by original ownership; preserve published bare layers."""
import argparse,zipfile,json,hashlib,io,pathlib
from PIL import Image
import numpy as np
p=argparse.ArgumentParser();p.add_argument('--source-zip',required=True);p.add_argument('--bare-proof-dir',required=True);p.add_argument('--output',required=True);a=p.parse_args();out=pathlib.Path(a.output);out.mkdir(parents=True,exist_ok=True);bare=pathlib.Path(a.bare_proof_dir)
H=lambda b:hashlib.sha256(b).hexdigest();data=pathlib.Path(a.source_zip).read_bytes();assert H(data)=='3b3ff09ef98716f5d4b0faff6c9b90c3d3b366a7822c33a137ecb5981056ad84';z=zipfile.ZipFile(io.BytesIO(data));bm=json.loads((bare/'manifest.json').read_text());bz=zipfile.ZipFile(bare/'sword1-68-independent-components.zip');assert H((bare/'sword1-68-independent-components.zip').read_bytes())=='5e7c1e3d676c96fcb0495d6664afb3012697a329a93f604f7b8d8b62f0e4210d'
im=lambda zz,n:Image.open(io.BytesIO(zz.read(n))).convert('RGBA')
enc=lambda im:encode(im)
def encode(im):
 b=io.BytesIO();im.save(b,format='PNG');return b.getvalue()
def put(z,n,data):
 i=zipfile.ZipInfo(n,(2020,1,1,0,0,0));i.compress_type=zipfile.ZIP_DEFLATED;z.writestr(i,data)
manifest={'scope':'Add approved coat151/158/165/179 to original male sword1/68 E/W only. Published bare component archive unchanged. No runtime/map claim.','sourceSHA256':H(data),'bareComponentSHA256':H((bare/'sword1-68-independent-components.zip').read_bytes()),'approval':{'previewUTC':'2026-11-11T22:43:56Z','acceptanceUTC':'2026-11-11T22:45:23Z','quote':'Todas aprovadas.','context':'Explicit four-torso1/68 preview followed by orb preview; acknowledgment specifically identifies1/68/17/122. Prior rejection111 not this cohort.','limit':'Authenticated textual chain; historical attachment bytes not refetched. Original archive final hashes retained.'},'policy':'Append clipped genuine cloth after the three existing bare layers. Clip alpha/RGBA to zero only where original ownership mask >0. Mask is not a rendered layer; never derive clothing from final composite. WEST literal mirror.','profiles':[]}
components={};refs={};receipts={}
for profile in bm['profiles']:
 item,d=profile['item'],profile['direction'];r={'item':item,'body':'male','class':'sword','action':'attack-sword','direction':d,'nativeCanvas':[768,768],'density':4,'pivot':[96,144],'phaseCount':8,'clip':{'fps':12,'contactFrame':4,'loop':False},'coats':{}}
 for c in [151,158,165,179]:
  states=[]
  for state in profile['states']:
   k=state['phase'];base=Image.new('RGBA',(768,768))
   for layer in state['layers']:
    src=im(bz,layer['member'])
    if layer['operation']=='source-over':base=Image.alpha_composite(base,src)
    else:
     ar=np.array(base);mask=np.array(im(bz,layer['mask']['member']))[:,:,0]>0;ar[mask]=np.array(src)[mask];base=Image.fromarray(ar)
   cp=f'clothing/{c}/{k}-cloth.png';mp=f'frames/{item}/{c}/{k}-ownership.png';cloth=np.array(im(z,cp));mask=np.array(Image.open(io.BytesIO(z.read(mp))))>0;cloth[mask]=0
   if d=='west':cloth=cloth[:,::-1]
   overlay=Image.fromarray(cloth);raw=enc(overlay);sha=H(raw);components[sha+'.png']=raw
   final=enc(Image.alpha_composite(base,overlay));ref=z.read(f'frames/{item}/{c}/{k}-{d}.png');assert final==ref,(item,c,k,d);rh=H(ref);refs[rh+'.png']=ref
   receipts[cp]=z.read(cp);receipts[mp]=z.read(mp)
   states.append({'phase':k,'layer':{'id':'coat-'+str(c),'operation':'source-over','member':sha+'.png','sha256':sha},'approvedReferenceSHA256':rh,'originalCloth':{'member':cp,'sha256':H(z.read(cp))},'originalOwnershipMask':{'member':mp,'sha256':H(z.read(mp))},'mirror':d=='west'})
  r['coats'][str(c)]=states
 manifest['profiles'].append(r)
for name,entries in [('coat-components.zip',components),('approved-references.zip',refs),('original-cloth-ownership.zip',receipts)]:
 with zipfile.ZipFile(out/name,'w')as zz:
  for n,data in sorted(entries.items()):put(zz,n,data)
 manifest.setdefault('archives',[]).append({'name':name,'sha256':H((out/name).read_bytes()),'members':len(entries)})
manifest['verifiedFinalFrames']=128;(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(manifest['archives'],indent=2))
