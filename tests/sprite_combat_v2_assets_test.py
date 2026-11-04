"""Verify every packed native frame against its original decoded RGBA hash."""
import hashlib,json,unittest
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]

class NativeFrames(unittest.TestCase):
    def test_original_pixels_and_playback_ranges(self):
        files=list((ROOT/'assets/sprites-combat-v2').glob('*/metadata.json'))
        dungeon_names={'dungeon-'+name for name in ('alvida','morgan','buggy','kuro','krieg','arlong','smoker','wapol','crocodile')}
        self.assertEqual({path.parent.name for path in files if path.parent.name.startswith('dungeon-')},dungeon_names)
        self.assertEqual(sum(not path.parent.name.startswith('dungeon-') for path in files),27)
        self.assertIn('satori',{path.parent.name for path in files})
        count=0
        for path in files:
            entry=json.loads(path.read_text(encoding='utf8'))
            for action,directions in entry['clips'].items():
                for direction,clip in directions.items():
                    sheet=Image.open(ROOT/clip['image']).convert('RGBA')
                    self.assertEqual(sheet.size,(clip['size']*clip['frames'],clip['size']))
                    source=clip if 'rgba_sha256' in clip else entry['provenance']['clips'][action][direction]
                    self.assertEqual(len(source['rgba_sha256']),clip['frames'])
                    self.assertEqual(len(source['source_sizes']),clip['frames'])
                    for i,((w,h),digest) in enumerate(zip(source['source_sizes'],source['rgba_sha256'])):
                        dx,dy=(clip['size']-w)//2,(clip['size']-h)//2
                        pixels=sheet.crop((i*clip['size']+dx,dy,i*clip['size']+dx+w,dy+h)).tobytes()
                        self.assertEqual(hashlib.sha256(pixels).hexdigest(),digest,(path.parent.name,action,direction,i))
                        count+=1
                    if action=='hurt':
                        self.assertFalse(clip['loop'])
                        self.assertGreater(clip['fps'],0)
                    if action=='hurt' and 'playback_frames' in clip:
                        self.assertLessEqual(clip['playback_start']+clip['playback_frames'],clip['frames'])
                        self.assertGreaterEqual(clip['playback_seconds'],.12)
                        self.assertLessEqual(clip['playback_seconds'],.22)
        print('Verified',count,'unaltered native frames across',len(files),'characters.')

if __name__=='__main__':unittest.main()
