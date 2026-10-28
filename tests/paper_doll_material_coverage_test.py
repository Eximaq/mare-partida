"""A returned body/shorts is not evidence that the requested trousers exist."""
import sys,tempfile,unittest
from pathlib import Path
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
import paper_doll_fit_audit as fit

class Coverage(unittest.TestCase):
 def test_skin_and_tiny_repaints_are_not_garment_coverage(self):
  self.assertTrue(hasattr(fit,'audit_material_coverage'))
  with tempfile.TemporaryDirectory() as directory:
   p=Path(directory);base=Image.new('RGBA',(4,4),(180,110,70,255));mask=Image.new('RGB',(4,4));mask.putpixel((1,2),(255,255,255));mask.putpixel((2,2),(255,255,255));ref=Image.new('RGBA',(4,4));ref.putpixel((1,2),(25,35,65,255))
   base.save(p/'base.png');mask.save(p/'mask.png');ref.save(p/'ref.png')
   for color in [(180,110,70,255),(182,112,72,255)]:
    target=base.copy();target.putpixel((1,2),color);target.putpixel((2,2),color);target.save(p/'target.png')
    report=fit.audit_material_coverage(p/'base.png',p/'target.png',p/'mask.png',p/'ref.png')
    self.assertFalse(report['passed']);self.assertEqual(report['covered_pixels'],0)
   target=base.copy();target.putpixel((1,2),(25,35,65,255));target.putpixel((2,2),(27,34,64,255));target.save(p/'target.png')
   report=fit.audit_material_coverage(p/'base.png',p/'target.png',p/'mask.png',p/'ref.png');self.assertTrue(report['passed']);self.assertFalse(report['artwork_approved'])
   target.putpixel((2,2),(0,0,0,0));target.save(p/'target.png');self.assertFalse(fit.audit_material_coverage(p/'base.png',p/'target.png',p/'mask.png',p/'ref.png')['passed'])
 def test_empty_or_invalid_requirements_never_succeed(self):
  self.assertTrue(hasattr(fit,'audit_material_coverage'))
  with tempfile.TemporaryDirectory() as directory:
   p=Path(directory);Image.new('RGBA',(4,4),(180,110,70,255)).save(p/'base.png');Image.new('RGB',(4,4)).save(p/'mask.png');Image.new('RGBA',(4,4),(25,35,65,255)).save(p/'ref.png')
   with self.assertRaises(ValueError):fit.audit_material_coverage(p/'base.png',p/'base.png',p/'mask.png',p/'ref.png')

if __name__=='__main__':unittest.main()
