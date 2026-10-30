"""Verify every packed native frame against its original decoded RGBA hash."""
import hashlib,json,unittest
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]

class NativeFrames(unittest.TestCase):
    def test_original_pixels_and_playback_ranges(self):
        files=list((ROOT/'assets/sprites-combat-v2').glob('*/metadata.json'))
        self.assertEqual(len(files),26)
        count=0
        for path in files:
            entry=json.loads(path.read_text(encoding='utf8'))
            for action,directions in entry['clips'].items():
                for direction,clip in directions.items():
                    sheet=Image.open(ROOT/clip['image']).convert('RGBA')
                    self.assertEqual(sheet.size,(clip['size']*clip['frames'],clip['size']))
                    self.assertEqual(len(clip['rgba_sha256']),clip['frames'])
                    for i,((w,h),digest) in enumerate(zip(clip['source_sizes'],clip['rgba_sha256'])):
                        dx,dy=(clip['size']-w)//2,(clip['size']-h)//2
                        pixels=sheet.crop((i*clip['size']+dx,dy,i*clip['size']+dx+w,dy+h)).tobytes()
                        self.assertEqual(hashlib.sha256(pixels).hexdigest(),digest,(path.parent.name,action,direction,i))
                        count+=1
                    if action=='hurt':
                        self.assertLessEqual(clip['playback_start']+clip['playback_frames'],clip['frames'])
                        self.assertGreaterEqual(clip['playback_seconds'],.12)
                        self.assertLessEqual(clip['playback_seconds'],.22)
        print('Verified',count,'unaltered native frames across 26 characters.')

if __name__=='__main__':unittest.main()
