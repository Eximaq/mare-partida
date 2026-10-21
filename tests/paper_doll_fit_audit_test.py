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
 def test_nonrectangular_binary_mask(self):
  mask=Image.new('RGB',(8,8));mask.putpixel((3,2),(255,255,255));path=self.root/'mask.png';mask.save(path)
  edit=self.base.copy();edit.putpixel((3,2),(20,40,60,255));target=self.root/'edit.png';edit.save(target)
  self.assertTrue(fit.audit(self.source,target,mask_path=path)['passed'])
  edit.putpixel((3,3),(20,40,60,255));edit.save(target)
  self.assertEqual(fit.audit(self.source,target,mask_path=path)['outside_region_pixels'],1)
 def test_invalid_masks(self):
  for size,color in [((4,4),'white'),((8,8),'gray'),((8,8),'black')]:
   path=self.root/'bad-mask.png';Image.new('RGB',size,color).save(path)
   with self.assertRaises(ValueError):fit.audit(self.source,self.source,mask_path=path)
 def test_explicit_draft_keeps_original_outside_mask(self):
  mask=Image.new('RGB',(8,8));mask.putpixel((3,2),(255,255,255));path=self.root/'mask.png';mask.save(path)
  edit=self.base.copy();edit.putpixel((3,2),(20,40,60,255));edit.putpixel((0,0),(99,88,77,255));target=self.root/'edit.png';edit.save(target)
  result=fit.inspection_draft(self.source,target,self.root/'draft-layer.png',self.root/'draft.png',mask_path=path)
  self.assertFalse(result['raw_audit']['passed']);self.assertTrue(result['draft_audit']['passed'])
  self.assertEqual(Image.open(self.root/'draft.png').getpixel((0,0)),self.base.getpixel((0,0)))
  self.assertEqual(Image.open(self.root/'draft-layer.png').getpixel((3,2)),edit.getpixel((3,2)))
  self.assertIn('not final',result['status'])
 def test_native_changes_layer_keeps_body_and_requires_contact(self):
  mask=Image.new('RGB',(8,8));mask.putpixel((2,3),(255,255,255));mask.putpixel((0,7),(255,255,255));mp=self.root/'mask.png';mask.save(mp)
  layer=Image.new('RGBA',(8,8));layer.putpixel((2,3),(170,180,190,255));lp=self.root/'native-layer.png';layer.save(lp)
  result=fit.audit_changes_layer(self.source,lp,mp,(3,3));self.assertTrue(result['passed']);self.assertFalse(result['artwork_approved']);self.assertEqual(result['changed_body_pixels'],0)
  layer.putpixel((3,3),(20,30,40,255));layer.save(lp);result=fit.audit_changes_layer(self.source,lp,mp,(3,3));self.assertFalse(result['passed']);self.assertEqual(result['outside_mask_pixels'],1);self.assertEqual(result['body_overlap_pixels'],1)
  detached=Image.new('RGBA',(8,8));detached.putpixel((0,7),(170,180,190,255));detached.save(lp)
  result=fit.audit_changes_layer(self.source,lp,mp,(3,3));self.assertFalse(result['passed']);self.assertEqual(result['hand_contact_pixels'],0)
 def test_changes_layer_rejects_empty_translucency_and_wrong_canvas(self):
  mask=Image.new('RGB',(8,8));mask.putpixel((2,3),(255,255,255));mp=self.root/'mask.png';mask.save(mp);lp=self.root/'native-layer.png'
  for size,alpha in [((8,8),0),((8,8),128),((4,4),255)]:
   layer=Image.new('RGBA',size);layer.putpixel((2,3),(170,180,190,alpha));layer.save(lp)
   self.assertFalse(fit.audit_changes_layer(self.source,lp,mp,(3,3))['passed'])
  with self.assertRaises(ValueError):fit.audit_changes_layer(self.source,self.source,mp,(20,20))
 def test_changes_layer_mask_must_freeze_every_body_pixel(self):
  mask=Image.new('RGB',(8,8));mask.putpixel((2,3),(255,255,255));mask.putpixel((3,3),(255,255,255));mp=self.root/'mask.png';mask.save(mp)
  layer=Image.new('RGBA',(8,8));layer.putpixel((2,3),(170,180,190,255));lp=self.root/'native-layer.png';layer.save(lp)
  result=fit.audit_changes_layer(self.source,lp,mp,(3,3));self.assertFalse(result['passed']);self.assertEqual(result['unprotected_body_pixels'],1)

if __name__=='__main__':unittest.main()
