"""Validate shipped PixelLab exports; never repairs or alters the art."""
import json, hashlib, unittest
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'assets/haki/mastery'
class HakiMasteryArt(unittest.TestCase):
 def test_icons(self):
  files=[p for p in ART.glob('*.png') if not p.name.startswith('effect-')]
  self.assertEqual(len(files),19)
  hashes=set()
  for p in files:
   im=Image.open(p).convert('RGBA')
   self.assertEqual(im.size,(96,96),p.name)
   alpha=im.getchannel('A')
   self.assertEqual(alpha.getextrema(),(0,255),p.name)
   self.assertIsNotNone(alpha.getbbox())
   self.assertLess(sum(v>0 for v in alpha.getdata()),96*96*.85,p.name)
   hashes.add(hashlib.sha256(p.read_bytes()).hexdigest())
  self.assertEqual(len(hashes),19)
 def test_effect_frames(self):
  clips=json.loads((ART/'effects.json').read_text())
  self.assertEqual(set(clips),{'armament','observation','conqueror'})
  for name,c in clips.items():
   im=Image.open(ART/c['file']).convert('RGBA')
   export=json.loads((ART/('effect-'+name+'.json')).read_text())
   self.assertEqual(len(export['frames']),c['frames'])
   seen=set()
   for f in export['frames']:
    r=f['frame'];self.assertGreater(f['duration'],0)
    self.assertLessEqual(r['x']+r['w'],im.width)
    self.assertLessEqual(r['y']+r['h'],im.height)
    cell=im.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']))
    seen.add(hashlib.sha256(cell.tobytes()).hexdigest())
    self.assertEqual(cell.getchannel('A').getextrema()[0],0)
    if name=='conqueror':
     self.assertLess(sum(v>0 for v in cell.getchannel('A').getdata())/(cell.width*cell.height),.15)
   self.assertGreaterEqual(len(seen),c['frames']*.7)
   self.assertEqual(c['anchor'],[export['meta']['anchor']['x'],export['meta']['anchor']['y']])
   if name=='conqueror':
    self.assertFalse(c['loop']);self.assertIsNone(cell.getchannel('A').getbbox())
   else:self.assertTrue(c['loop'])
if __name__=='__main__':unittest.main()
