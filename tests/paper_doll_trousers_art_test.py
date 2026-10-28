"""Native draft layers preserve generated pixels; this is not art approval."""
import json,unittest
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
RUN=ROOT/'pixellab-pip-generations/paper-doll-trousers-20261028'
BASE=ROOT/'pixellab-pip-generations/paper-doll-complete-20261026'

class TrousersArt(unittest.TestCase):
 def test_real_layers_have_native_geometry_and_no_unrelated_pixels(self):
  data=json.loads((RUN/'locomotion-audit.json').read_text());self.assertEqual(len(data['frames']),24)
  self.assertFalse(data['approved']);self.assertFalse(data['productionEnabled'])
  pack=json.loads((BASE/'player-pack.json').read_text());body=next(p for p in pack['pieces'] if p['slot']=='body')
  for r in data['frames']:
   with self.subTest(pose=(r['animationId'],r['direction'],r['frameIndex'])):
    clip=body['animations'][r['animationId']];row=clip['directions'].index(r['direction']);f=r['frameIndex'];atlas=Image.open(BASE/clip['url']).convert('RGBA');src=atlas.crop((f*84+10,row*84+13,f*84+74,row*84+77))
    layer=Image.open(RUN/r['layer']).convert('RGBA');mask=Image.open(RUN/r['mask']).convert('RGB');raw=Image.open(RUN/'transfers'/f"batch-{r['batch']}"/f"{r['outputIndex']:02}.png").convert('RGBA')
    self.assertEqual(layer.size,src.size);composite=Image.alpha_composite(src,layer)
    for y in range(64):
     for x in range(64):
      c=layer.getpixel((x,y));self.assertIn(c[3],(0,255))
      if c[3]:self.assertEqual(c,raw.getpixel((x,y)));self.assertEqual(mask.getpixel((x,y)),(255,255,255))
      if mask.getpixel((x,y))==(0,0,0):self.assertEqual(composite.getpixel((x,y)),src.getpixel((x,y)))
    sheet=Image.open(RUN/f"trousers-{r['animationId']}.png").convert('RGBA');i=['west','east'].index(r['direction']);cell=sheet.crop((f*84,i*84,(f+1)*84,(i+1)*84));self.assertEqual(cell.crop((10,13,74,77)).tobytes(),layer.tobytes())
 def test_missing_directions_and_actions_are_not_fabricated(self):
  pack=json.loads((RUN/'review-pack.json').read_text());p=next(p for p in pack['pieces'] if p['slot']=='pants')
  self.assertFalse(pack['productionEnabled']);self.assertFalse(p['approved']);self.assertEqual(set(p['animations']),{'idle','walk'})
  for clip in p['animations'].values():self.assertEqual(clip['directions'],['west','east'])

if __name__=='__main__':unittest.main()
