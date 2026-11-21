from pathlib import Path
import zipfile,json,hashlib,io
from PIL import Image,ImageOps
import argparse
parser=argparse.ArgumentParser(description='Replay original staff123–127 layers against approved index hashes; no art generation.')
parser.add_argument('--source-dir',type=Path,required=True)
parser.add_argument('--recipe-zip',type=Path,required=True)
parser.add_argument('--approved-index',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
a=parser.parse_args();OUT=a.output;OUT.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
def im(b):return Image.open(io.BytesIO(b)).convert('RGBA')
def png(i):b=io.BytesIO();i.save(b,format='PNG');return b.getvalue()
z=zipfile.ZipFile(a.source_dir/'Cetro123_EAST_WEST_v1_Editavel.zip');v=zipfile.ZipFile(a.recipe_zip);old31=zipfile.ZipFile(a.source_dir/'Cajado31_EAST_WEST_v3_Editavel.zip')
profile=json.loads(z.read('shared-profile/registry.json'));manifest=json.loads(v.read('SOURCE_MANIFEST.json'));index=json.loads(a.approved_index.read_text());rows=[];inputs=[]
for item in range(123,128):
 entry=next(e for e in manifest if e['key']==str(item));path=a.source_dir/entry['filename'];assert sha(path.read_bytes())==entry['sha256'];inputs.append({k:v for k,v in entry.items() if k not in ['library_file_id','library_version']});src=zipfile.ZipFile(path)
 recs=None if item==123 else json.loads(v.read(f'recipes/staff_{item}.json'))['records']
 for k in range(8):
  spec=next(p for p in profile['poses'] if p['direction']=='east' and p['pose']==k)
  if item==123:gear=im(src.read(f'east/gear/{k:02}.png'));texture=None
  else:
   rec=next(r for r in recs if r['pose']==k);matches=[n for n in src.namelist() if n.startswith('sources/') and n.endswith('.png') and sha(src.read(n))==rec['sourceSha256']];assert len(matches)==1;texture=matches[0];gear=im(src.read(texture)).transform((640,640),Image.Transform.AFFINE,rec['affine'],Image.Resampling.BICUBIC)
  composite=Image.new('RGBA',(640,640));body=Image.new('RGBA',(640,640));roles=[]
  for layer in spec['layers']:
   if layer.get('slot')=='equipment':piece=gear
   else:
    raw=z.read('shared-profile/'+layer['asset']);assert sha(raw)==layer['sha256'];original=str(Path(layer['source']).relative_to('31-original-base-restored-v3'));assert raw==old31.read(original);piece=im(raw);body.alpha_composite(piece)
   roles.append(layer.get('slot') or layer.get('id'));composite.alpha_composite(piece)
  if recs:assert sha(body.tobytes())==rec['bodyRgbaSha256']
  for direction,image in [('east',composite),('west',ImageOps.mirror(composite))]:
   record=next(r for r in index['records'] if r.get('item')==item and r.get('direction')==direction and r['id'].startswith('staff'))
   state=next(s for s in record['states'] if s['state']==str(k));expected=state['approved']['sha256'];raw=png(image);actual=sha(raw)
   p=OUT/str(item)/direction;p.mkdir(parents=True,exist_ok=True);(p/f'{k:02}-gear.png').write_bytes(png(gear if direction=='east' else ImageOps.mirror(gear)));(p/f'{k:02}-composite.png').write_bytes(raw)
   rows.append({'item':item,'direction':direction,'phase':k,'sha256':actual,'approvedSHA256':expected,'byteExact':actual==expected,'reference':state['approved']['sourceMember'],'textureMember':texture,'roles':roles})
report={'inputs':inputs,'profileId':profile['id'],'sourceProfileAssetsVerifiedAgainst31':True,'rows':rows};(OUT/'proof.json').write_text(json.dumps(report,indent=2))
for item in range(123,128):print(item,sum(r['byteExact']for r in rows if r['item']==item),'/16 exact')
