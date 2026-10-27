import hashlib,json,unittest
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
class VfxArtwork(unittest.TestCase):
 def test_supplied_bytes_and_frames(self):
  folder=ROOT/'assets/combat-vfx';manifest=json.loads((folder/'manifest.json').read_text(encoding='utf8'));rules=json.loads((folder/'rules.json').read_text(encoding='utf8'));self.assertEqual(len(manifest['assets']),14)
  for item in manifest['assets']:
   for asset in item['files']:self.assertEqual(hashlib.sha256((folder/asset['file']).read_bytes()).hexdigest(),asset['sha256'])
   image=Image.open(folder/(item['id']+'.png'));image.load();self.assertIn('A',image.getbands());sheet=json.loads((folder/(item['id']+'.json')).read_text(encoding='utf8'));frames=sheet['frames'];frames=frames if isinstance(frames,list) else list(frames.values());self.assertEqual(rules['effects'][item['id']]['frames'],[dict(f['frame'],duration=f['duration']) for f in frames])
   for f in frames:self.assertLessEqual(f['frame']['x']+f['frame']['w'],image.width);self.assertLessEqual(f['frame']['y']+f['frame']['h'],image.height)
if __name__=='__main__':unittest.main()
