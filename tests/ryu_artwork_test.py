import hashlib,json,unittest
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
class RyuArtwork(unittest.TestCase):
 def test_icon_hashes(self):
  manifest=json.loads((ROOT/'assets/akuma/ryu/manifest.json').read_text())
  for item in manifest['assets']:self.assertEqual(hashlib.sha256((ROOT/'assets/akuma/ryu'/item['file']).read_bytes()).hexdigest(),item['sha256'])
 def test_original_frames(self):
  clips=json.loads((ROOT/'assets/akuma/ryu/clips.json').read_text());count=0
  for dirs in clips.values():
   for c in dirs.values():
    atlas=Image.open(ROOT/c['image']).convert('RGBA');self.assertEqual(atlas.size,(c['size']*c['frames'],c['size']))
    for i,(w,h) in enumerate(c['source_sizes']):
     x=i*c['size']+(c['size']-w)//2;y=(c['size']-h)//2
     self.assertEqual(hashlib.sha256(atlas.crop((x,y,x+w,y+h)).tobytes()).hexdigest(),c['rgba_sha256'][i]);count+=1
  self.assertEqual(count,304)
if __name__=='__main__':unittest.main()
