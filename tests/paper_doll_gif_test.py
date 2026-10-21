"""Lossless GIF export guards; synthetic geometry only, never character artwork."""
import sys,tempfile,unittest
from pathlib import Path
from PIL import Image
ART=Path(__file__).resolve().parents[1]/'pixellab-pip-generations/paper-doll-north-finish-20261021'
sys.path.insert(0,str(ART))
from assemble_review import save_exact_gif
from prepare_inputs import normalized
class GifTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.path=Path(self.temp.name)/'preview.gif';self.frames=[]
  for i in range(8):
   im=Image.new('RGBA',(8,8));im.putpixel((i,2),(0,0,0,255));im.putpixel((i,3),(80+i,110,130,255));self.frames.append(im)
 def tearDown(self):self.temp.cleanup()
 def test_native_colours_transparency_frame_order_and_disposal(self):
  self.assertEqual(save_exact_gif(self.frames,self.path),9)
  with Image.open(self.path) as result:
   self.assertEqual(result.n_frames,8);self.assertEqual(result.info['loop'],0);duration=0
   for i,source in enumerate(self.frames):result.seek(i);self.assertEqual(normalized(result.convert('RGBA')),normalized(source));self.assertEqual(result.disposal_method,2);duration+=result.info['duration']
   self.assertEqual(duration,1000)
 def test_reject_palette_overflow_without_silent_quantization(self):
  self.frames=[Image.new('RGBA',(16,16)) for _ in range(8)]
  for i in range(256):self.frames[0].putpixel((i%16,i//16),(i,i,i,255))
  with self.assertRaises(ValueError):save_exact_gif(self.frames,self.path)
  self.assertFalse(self.path.exists())
 def test_reject_partial_alpha_and_wrong_frame_counts(self):
  self.frames[0].putpixel((0,0),(80,90,100,128))
  with self.assertRaises(ValueError):save_exact_gif(self.frames,self.path)
  with self.assertRaises(ValueError):save_exact_gif(self.frames[:4],self.path)
if __name__=='__main__':unittest.main()
