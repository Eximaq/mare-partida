"""Portable exact RGBA reconstruction test. Requires Pillow and numpy; no network."""
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image
ROOT=Path(__file__).parent/'assets'
def image(p):return Image.open(ROOT/p).convert('RGBA')
def verify():
 m=json.loads((ROOT/'manifest.json').read_text());assert m['productionEnabled']is False and m['completeModularity']is False
 total=0
 for key,p in m['items'].items():
  for f in p['frames']:
   assert hashlib.sha256((ROOT/f['approved']).read_bytes()).hexdigest()==f['approvedSHA256']
   assert hashlib.sha256((ROOT/f['body']).read_bytes()).hexdigest()==f['bodySHA256']
   base=image(f['body']);assert base.size==(640,640)
   if f.get('equipment'):base.alpha_composite(image(f['equipment']))
   a=np.array(base);t=np.array(image(f['approved']));mask=np.array(Image.open(ROOT/f['interfaceMask']))>0;patch=np.array(image(f['interfacePixels']))
   assert int(mask.sum())==f['changedPixels']
   if key=='109':assert np.abs(a.astype(int)-t.astype(int)).max()<=1
   else:
    yy,xx=np.where(mask);assert xx.min()>=230 and xx.max()<425 and yy.min()>=230 and yy.max()<425
   a[mask]=patch[mask];assert np.array_equal(a,t),(key,f['state'])
   total+=1
 assert total==15
 assert m['items']['17']['frames'][5]['approvedSHA256']=='01632a633734764feecabdc298472778bf8e81586a36df5e66466484d31688d9'
 print(f'{total}/15 approved states RGBA-exact; 17 frame5 preserved; production disabled')
if __name__=='__main__':verify()
