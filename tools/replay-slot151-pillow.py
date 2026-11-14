"""Verify immutable approved preview PNGs from original source ZIP and pants layers.
python tools/replay-slot151-pillow.py SOURCE.zip
"""
import sys,json,io,hashlib
from pathlib import Path
from zipfile import ZipFile
from PIL import Image
root=Path(__file__).resolve().parents[1];z=ZipFile(sys.argv[1]);out=root/'tools/rework-modular-outfits-hd';idx=json.loads((out/'index.json').read_bytes());arch=json.loads((out/'archives/archive-index.json').read_bytes());proof=json.loads((root/'tests/fixtures/slot151-cross-engine-proof.json').read_bytes());assert hashlib.sha256(Path(sys.argv[1]).read_bytes()).hexdigest()==proof['sourceArchiveSHA256'];archives={};count=0
for direction in ['east','west']:
 p=json.loads(z.read(f'current/{direction}/pack.json'));layers=[l for l in p['directions'][direction]['layers']if l['id']=='visible-clothed-composite'or l['id'].startswith(('coat151-','original-neck-coverage'))or l['id']=='native-visible-near-arm-manual']
 for pants in [None,147,168]:
  record=next((r for r in idx['independentPants']['records']if r['direction']==direction and r['equipment']=={'pants':pants}),None)if pants else None
  for frame in [0,7,20,32]:
   seq=[]
   for l in layers:seq.append((l['depth'],Image.open(io.BytesIO(z.read(f'current/{direction}/'+(l.get('frames')or[l['source']])[frame if l.get('frames')else 0]))).convert('RGBA')))
   for n,l in enumerate(record['pack']['directions'][direction]['layers'][1:]if record else[]):
    h=(l.get('frames')or[l['source']])[frame if l.get('frames')else 0];a=arch['sources'][h]
    if a['archive']not in archives:archives[a['archive']]=ZipFile(out/'archives'/a['archive'])
    data=archives[a['archive']].read(a['path']);assert hashlib.sha256(data).hexdigest()==h;seq.append((5+n*.1,Image.open(io.BytesIO(data)).convert('RGBA')))
   canvas=Image.new('RGBA',(512,512))
   for _,im in sorted(seq,key=lambda t:t[0]):canvas.alpha_composite(im)
   b=io.BytesIO();canvas.save(b,format='PNG');name=f'coat151-{pants or "none"}-{direction}-tick{frame}.png';assert hashlib.sha256(b.getvalue()).hexdigest()==proof['pillowReferences'][name],name;count+=1
print(json.dumps({'pillowOriginalPreviewPNGByteExact':count}))
