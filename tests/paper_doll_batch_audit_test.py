"""Geometry fixtures only; never delivered character sprites."""
import sys,tempfile,unittest
from pathlib import Path
from PIL import Image

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from paper_doll_batch_audit import audit_batch

class BatchAuditTest(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
  self.body=Image.new('RGBA',(8,8));self.layer=Image.new('RGBA',(8,8));self.mask=Image.new('RGB',(8,8))
  for i in range(4):
   x,y=(i%2)*4,(i//2)*4
   self.body.putpixel((x+2,y+2),(160,90,50,255))
   self.layer.putpixel((x+1,y+2),(20+i*20,40,80,255))
   self.mask.putpixel((x+1,y+2),(255,255,255))
  self.anchors=[(2,2)]*4;self.write()
 def tearDown(self):self.temp.cleanup()
 def write(self):
  for name,image in [('source',self.body),('layer',self.layer),('mask',self.mask)]:image.save(self.root/(name+'.png'))
 def run_audit(self,**kwargs):
  return audit_batch(self.root/'source.png',self.root/'layer.png',self.root/'mask.png',4,self.anchors,**kwargs)
 def test_exact_row_major_cells_and_export(self):
  out=self.root/'export';result=self.run_audit(output_dir=out)
  self.assertTrue(result['passed']);self.assertEqual(result['unique_visible_frames'],4)
  self.assertEqual([r['cell'][:2] for r in result['frames']],[[0,0],[4,0],[0,4],[4,4]])
  for i in range(4):self.assertEqual(Image.open(out/f'frame-{i+1:02}.png').getpixel((1,2)),(20+i*20,40,80,255))
 def test_one_leaking_cell_rejects_entire_export(self):
  self.layer.putpixel((4,4),(100,100,100,255));self.write();out=self.root/'export'
  result=self.run_audit(output_dir=out);self.assertFalse(result['passed']);self.assertFalse(out.exists())
  self.assertEqual(result['frames'][3]['outside_mask_pixels'],1)
 def test_no_static_duplicate_sequence(self):
  for i in range(4):self.layer.putpixel(((i%2)*4+1,(i//2)*4+2),(20,40,80,255))
  self.write();result=self.run_audit();self.assertFalse(result['passed']);self.assertTrue(result['static_layer_rejected'])
 def test_clothing_requires_occlusion_opt_in(self):
  for i in range(4):
   x,y=(i%2)*4,(i//2)*4;self.mask.putpixel((x+2,y+2),(255,255,255));self.layer.putpixel((x+2,y+2),(20+i*20,40,80,255))
  self.write();self.assertFalse(self.run_audit()['passed']);self.assertTrue(self.run_audit(allow_body_occlusion=True)['passed'])
 def test_size_and_anchor_mismatches(self):
  Image.new('RGBA',(4,4)).save(self.root/'layer.png');self.assertEqual(self.run_audit()['reason'],'canvas-size-mismatch');self.write()
  self.anchors=self.anchors[:3]
  with self.assertRaises(ValueError):self.run_audit()

if __name__=='__main__':unittest.main()
