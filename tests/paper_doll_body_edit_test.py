"""Mask invariants for body corrections; synthetic geometry only, never character art."""
import importlib.util,unittest
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('body_edit',ROOT/'pixellab-pip-generations/paper-doll-walk-fit-20261021/audit_body.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class BodyEditTests(unittest.TestCase):
 def setUp(self):
  self.source=Image.new('RGBA',(256,128));self.mask=Image.new('RGB',self.source.size)
  draw=ImageDraw.Draw(self.source);mask=ImageDraw.Draw(self.mask)
  for i in range(8):
   x,y=(i%4)*64,(i//4)*64;draw.rectangle((x+26,y+10,x+37,y+51),fill=(80+i,90,110,255));draw.point((x+22,y+30),fill=(160,120,80,255));mask.rectangle((x+18,y+25,x+25,y+39),fill='white')
  self.edited=self.source.copy()
  for i in range(8):
   x,y=(i%4)*64,(i//4)*64;self.edited.putpixel((x+22,y+30),(0,0,0,0));self.edited.putpixel((x+22,y+35),(170,130,90,255))
 def test_masked_replacement_can_erase_old_arm_without_inventing_other_pixels(self):
  report=module.audit(self.source,self.edited,self.mask);self.assertTrue(report['passed']);self.assertEqual(report['unique_frames'],8)
 def test_face_changes_outside_mask_fail(self):
  self.edited.putpixel((30,12),(255,0,0,255));self.assertFalse(module.audit(self.source,self.edited,self.mask)['passed'])
 def test_interpolated_alpha_fails(self):
  self.edited.putpixel((22,35),(170,130,90,128));self.assertFalse(module.audit(self.source,self.edited,self.mask)['passed'])
 def test_wrong_size_and_empty_frame_fail(self):
  self.assertFalse(module.audit(self.source,self.edited.crop((0,0,128,128)),self.mask)['passed'])
  ImageDraw.Draw(self.edited).rectangle((0,0,63,63),fill=(0,0,0,0));self.assertFalse(module.audit(self.source,self.edited,self.mask)['passed'])
 def test_foot_baseline_cannot_be_changed_even_inside_a_bad_mask(self):
  draw=ImageDraw.Draw(self.mask);draw.rectangle((26,50,37,51),fill='white');ImageDraw.Draw(self.edited).rectangle((26,50,37,51),fill=(0,0,0,0));self.assertFalse(module.audit(self.source,self.edited,self.mask)['passed'])

if __name__=='__main__':unittest.main()
