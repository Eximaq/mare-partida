"""Transparent-margin compaction tests use geometry fixtures, never character art."""
import importlib.util,unittest
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('compact',ROOT/'pixellab-pip-generations/paper-doll-walk-north-20261021/prepare_review.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class CompactTests(unittest.TestCase):
 def test_native_crop_is_reversible_including_boundary_pixels(self):
  source=Image.new('RGBA',(64,64))
  for point in [(16,4),(47,4),(16,55),(47,55),(32,30)]:source.putpixel(point,(27,53,91,255))
  cropped=module.compact_cell(source);self.assertEqual(cropped.size,(32,52))
  restored=Image.new('RGBA',(64,64));restored.paste(cropped,(16,4));self.assertEqual(module.normalized(source),module.normalized(restored))
 def test_any_visible_clipped_pixel_rejects_compaction(self):
  for point in [(15,30),(48,30),(32,3),(32,56)]:
   source=Image.new('RGBA',(64,64));source.putpixel((32,30),(27,53,91,255));source.putpixel(point,(27,53,91,1))
   with self.assertRaises(ValueError):module.compact_cell(source)
 def test_hidden_rgb_is_not_visible_loss(self):
  source=Image.new('RGBA',(64,64),(150,120,100,0));source.putpixel((32,30),(27,53,91,255));self.assertEqual(module.compact_cell(source).getpixel((16,26)),(27,53,91,255))
 def test_empty_or_wrong_native_size_rejected(self):
  for source in [Image.new('RGBA',(64,64)),Image.new('RGBA',(32,52),(0,0,0,255))]:
   with self.assertRaises(ValueError):module.compact_cell(source)
if __name__=='__main__':unittest.main()
