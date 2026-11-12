"""Validate immutable native assets and exact composition. No raster edits."""
from pathlib import Path
import json,hashlib
from PIL import Image
import numpy as np
R=Path(__file__).parent
index=json.load(open(R/'index.json'))
def load(a):
 p=R/a['url'];assert hashlib.sha256(p.read_bytes()).hexdigest()==a['sha256'];im=Image.open(p).convert('RGBA');assert list(im.size)==a['size'];return im
count=0
for record in index['records']:
 for state in record['states']:
  if record['item']==109:im=load(state['matchingRenderedBody'])
  else:im=Image.new('RGBA',tuple(record['nativeCanvas']))
  layers=sorted(state['layers'],key=lambda l:l['depth'])
  if state.get('referenceExclusion'):
   group=Image.new('RGBA',tuple(record['nativeCanvas']))
   for l in layers:
    layer=load(l)
    if l.get('mirrorX'):layer=layer.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    group.alpha_composite(layer)
   im.alpha_composite(group);layers=[]
  for l in layers:
   layer=load(l)
   if l.get('mirrorX'):layer=layer.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
   if l['operation']=='source-over':im.alpha_composite(layer)
   elif l['operation']=='replace-rgba-under-mask':
    mp=R/l['mask']['url'];assert hashlib.sha256(mp.read_bytes()).hexdigest()==l['mask']['sha256'];mask=np.array(Image.open(mp))>0;a=np.array(im);p=np.array(layer);a[mask]=p[mask];im=Image.fromarray(a)
   else:raise AssertionError(l['operation'])
  a=np.array(im);b=np.array(load(state['approved']));region=state.get('referenceExclusion',{}).get('region')
  if region:
   x0,y0,x1,y1=region;a[y0:y1,x0:x1]=b[y0:y1,x0:x1]
  assert np.array_equal(a,b),(record['id'],state['state']);count+=1
assert count==sum(len(r["states"]) for r in index["records"])
print(f'{count}/{count} source states exact outside explicitly disclosed head-calibration regions; all original PNG hashes valid; no resizing')
