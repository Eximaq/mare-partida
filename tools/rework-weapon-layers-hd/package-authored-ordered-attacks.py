from pathlib import Path
import json,hashlib,zipfile,copy,argparse
parser=argparse.ArgumentParser();parser.add_argument('--prototype-dir',type=Path,required=True);parser.add_argument('--output-dir',type=Path,required=True);parser.add_argument('--root-members',action='store_true');parser.add_argument('--source-archives',type=Path,required=True,help='JSON mapping source keys to original ZIP paths');args=parser.parse_args();p=args.prototype_dir;out=args.output_dir;out.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
specs=json.loads((p/'specs.json').read_text());assets={};refs={};descriptors=[]
look={'hair':'original','hairColor':'brown','face':'original','eyeColor':'brown','skin':'light'}
for original in specs:
 r=copy.deepcopy(original);r['schema']='approved-native-ordered-attack-v1';r['approvedAppearance']=look;r['allowedAdditionalEquipment']=[];r['clockAuthority']='authored-nominal-only; gameplay controller unchanged';r['sourceFPS']=r['fps'];r['phaseCount']=len(r['states']);r['contactPhase']=int(r['timeline'][r['contactTick']]);r['sourceScope']='male bare original appearance only; no arbitrary wardrobes';r['westRecipe']='mirror each approved EAST input and mask horizontally at640px, preserving layer order; no own WEST art'if r['direction']=='west'else None
 for state in r['states']:
  ref=state.pop('reference');raw=(p/ref['url']).read_bytes();refs[f"{r['item']}/{r['direction']}/{int(state['state']):02}.png"]=raw
  state['approvedReferenceSHA256']=sha(raw)
  for n,l in enumerate(state['layers']):
   l['id']=l['role'];l['component']='equipment'if l['role']in ['gear','equipment']else 'anatomy';l['sourceMember']=l['url']
   for a in [l]+([l['mask']]if 'mask'in l else[]):
    raw=(p/a['url']).read_bytes();h=sha(raw);assert a['url']==f'assets/{h}.png';assets[h]=raw;a['sha256']=h
 r['compositorTolerance']={'alphaChangedPixels':0,'opaqueRGBMax':1,'semiTransparentRGBMax':7 if r['item']==14 else 0 if r['item']==16 else 1,'note':'14 phases9/10 max4/7 only; keep detailed frozen report, no blanket geometry tolerance.'}
 descriptors.append(r)
sourcePaths=json.loads(args.source_archives.read_text());assert set(sourcePaths)=={'14','31','31-approved','16-texture','16-base'}
provenance={k:{'file':Path(v).name,'sha256':sha(Path(v).read_bytes())}for k,v in sourcePaths.items()}
provenance['rules']={'14':'Original body/equipment12PNG pairs; later approved source ZIP exact; no WEST/N/E invented.','16':'Original texture placement and exact approved distal hand mask; gear behindbody0/7, aheadotherwise; body restore only hand region, not weapon pixels.','31':'Original authored EAST ordered parts; gear separated from grip; discard nonmatching ownWEST variant and mirror approvedEAST.','headJSON':'Not included or modified.'}
def archive(name,data):
 with zipfile.ZipFile(out/name,'w',compression=zipfile.ZIP_STORED)as z:
  for name,b in sorted(data.items()):z.writestr(zipfile.ZipInfo(name,date_time=(2026,1,1,0,0,0)),b)
 b=(out/name).read_bytes() if False else b
archive('approved-attacks-14-16-31-assets.zip',{(f'{h}.png' if args.root_members else f'assets/{h}.png'):b for h,b in assets.items()})
archive('approved-attacks-14-16-31-fixtures.zip',refs)
manifest={'schema':'approved-attack-package-v1','profiles':descriptors,'provenance':provenance,'archives':[{ 'file':f,'sha256':sha((out/f).read_bytes()),'bytes':(out/f).stat().st_size}for f in ['approved-attacks-14-16-31-assets.zip','approved-attacks-14-16-31-fixtures.zip']],'assetCount':len(assets),'referenceCount':len(refs),'runtimeChanges':False,'assetMemberStyle':'root-sha' if args.root_members else 'assets-prefix','previousAssetsArchiveSHA256':'0f6483e1851f3aad2eac84692f999333cd125fb19fa751ee210cd902742001c4'}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(out/'descriptors.json').write_text(json.dumps(descriptors,indent=2)+'\n');(out/'native-compositor-report.json').write_bytes((p/'native-compositor-report.json').read_bytes())
# Verify every member hash, order/depth, reference and archive after writing.
with zipfile.ZipFile(out/'approved-attacks-14-16-31-assets.zip')as z:
 assert z.testzip()is None
 for n in z.namelist():assert sha(z.read(n))==Path(n).stem
 for r in descriptors:
  for s in r['states']:
   assert [x['depth']for x in s['layers']]==list(range(len(s['layers'])))
   for l in s['layers']:
    for a in [l]+([l['mask']]if 'mask'in l else[]):assert sha(z.read(Path(a['url']).name if args.root_members else a['url']))==a['sha256']
with zipfile.ZipFile(out/'approved-attacks-14-16-31-fixtures.zip')as z:
 assert z.testzip()is None
 for r in descriptors:
  for s in r['states']:assert sha(z.read(f"{r['item']}/{r['direction']}/{int(s['state']):02}.png"))==s['approvedReferenceSHA256']
print(json.dumps({'archives':manifest['archives'],'assets':len(assets),'references':len(refs),'profiles':len(descriptors)}))
