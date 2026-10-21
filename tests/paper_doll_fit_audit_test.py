"""Synthetic audit fixtures only; these are not character artwork."""
import importlib.util,tempfile,unittest
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fit',ROOT/'tools/paper_doll_fit_audit.py')
fit=importlib.util.module_from_spec(spec);spec.loader.exec_module(fit)

class FitAuditTest(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
  self.base=Image.new('RGBA',(8,8));self.base.putpixel((3,3),(200,100,50,255))
  self.source=self.root/'base.png';self.base.save(self.source)
 def tearDown(self):self.temp.cleanup()
 def check_edit(self,edit,region):
  path=self.root/'edit.png';edit.save(path)
  return fit.audit(self.source,path,region,self.root/'layer.png')
 def test_extract_exact_overlay(self):
  edit=self.base.copy();edit.putpixel((3,3),(20,40,60,255));edit.putpixel((3,2),(20,40,60,255))
  result=self.check_edit(edit,(2,2,3,3));self.assertTrue(result['passed'])
  layer=Image.open(self.root/'layer.png');self.assertEqual(layer.getpixel((3,3)),edit.getpixel((3,3)))
  self.assertEqual(list(fit.pixels(Image.alpha_composite(self.base,layer))),list(fit.pixels(edit)))
 def test_outside_changes_are_rejected(self):
  edit=self.base.copy();edit.putpixel((0,0),(1,2,3,255))
  result=self.check_edit(edit,(2,2,3,3));self.assertFalse(result['passed'])
  self.assertEqual(result['outside_region_pixels'],1);self.assertFalse((self.root/'layer.png').exists())
 def test_erasing_or_translucent_repaint_cannot_be_extracted(self):
  for alpha in [0,128]:
   edit=self.base.copy();edit.putpixel((3,3),(20,40,60,alpha))
   result=self.check_edit(edit,(0,0,8,8));self.assertFalse(result['passed'])
   self.assertGreater(result['alpha_erasure_pixels'],0)
 def test_empty_edit_and_size_mismatch(self):
  self.assertFalse(self.check_edit(self.base,(0,0,8,8))['passed'])
  self.assertEqual(self.check_edit(Image.new('RGBA',(4,4)),(0,0,4,4))['reason'],'canvas-size-mismatch')

if __name__=='__main__':unittest.main()
