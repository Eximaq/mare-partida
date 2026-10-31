import hashlib,json,unittest
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
class RankAArtwork(unittest.TestCase):
 def test_supplied_bytes_and_all_animation_frames(self):
  manifest=json.loads((ROOT/'assets/akuma/rank-a-manifest.json').read_text(encoding='utf8'));self.assertEqual(len(manifest['files']),21)
  total=0
  for f in manifest['files']:
   p=ROOT/f['file'];self.assertEqual(hashlib.sha256(p.read_bytes()).hexdigest(),f['sha256'])
   if p.suffix=='.json':
    data=json.loads(p.read_text());im=Image.open(p.with_suffix('.png'));im.load();self.assertIn('A',im.getbands())
    for row in data['frames']:
     r=row['frame'];self.assertGreater(row['duration'],0);self.assertLessEqual(r['x']+r['w'],im.width);self.assertLessEqual(r['y']+r['h'],im.height);total+=1
    im.close()
  self.assertEqual(total,158)
  room=json.loads((ROOT/'assets/akuma/ope/power-aura-take-16.json').read_text());self.assertEqual(len(room['frames']),29)
if __name__=='__main__':unittest.main()
