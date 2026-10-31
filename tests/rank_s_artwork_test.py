import hashlib,json,unittest
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
class RankSArtTest(unittest.TestCase):
 def test_all_original_bytes_and_native_frames(self):
  manifest=json.loads((ROOT/'assets/akuma/rank-s-manifest.json').read_text(encoding='utf-8'));self.assertEqual(len(manifest['files']),26)
  for f in manifest['files']:self.assertEqual(hashlib.sha256((ROOT/f['file']).read_bytes()).hexdigest(),f['sha256'],f['file'])
  count=0;sheets=0
  for family in ['yami','mera']:
   for p in (ROOT/'assets/akuma'/family).glob('*.json'):
    data=json.loads(p.read_text(encoding='utf-8'));im=Image.open(p.with_suffix('.png'));self.assertEqual(im.size,(data['meta']['size']['w'],data['meta']['size']['h']))
    for f in data['frames']:
     b=f['frame'];self.assertGreater(b['w']*b['h'],0);self.assertLessEqual(b['x']+b['w'],im.width);self.assertLessEqual(b['y']+b['h'],im.height);self.assertEqual(f['duration'],83);count+=1
    im.close();sheets+=1
  self.assertEqual(sheets,9);self.assertEqual(count,361)
 def test_aura_holes_have_precomputed_finite_pixel_anchors(self):
  data=json.loads((ROOT/'rank-s-data.js').read_text(encoding='utf-8').split('=',1)[1].strip().removesuffix(';'))
  for key in ['yamiAura','meraAura']:
   for f in data['effects'][key]['frames'][:35]:self.assertTrue(0<f['anchor']['x']<f['w']);self.assertTrue(0<f['anchor']['y']<f['h'])
 def test_aura_ring_anchor_does_not_jump_to_small_holes_in_flames(self):
  data=json.loads((ROOT/'rank-s-data.js').read_text(encoding='utf-8').split('=',1)[1].strip().removesuffix(';'))
  for key in ['yamiAura','meraAura']:
   frames=data['effects'][key]['frames'][:35]
   for first,second in zip(frames,frames[1:]+frames[:1]):
    self.assertLess(abs(first['anchor']['x']-second['anchor']['x']),5,key)
    self.assertLess(abs(first['anchor']['y']-second['anchor']['y']),5,key)
if __name__=='__main__':unittest.main()
