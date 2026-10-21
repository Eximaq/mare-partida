"""Derived PNG encoding may vary; immutable raw art and decoded pixels may not."""
from contextlib import redirect_stdout
from pathlib import Path
import hashlib,importlib.util,io,json,shutil,tempfile,unittest
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
PREVIOUS=ROOT/'pixellab-pip-generations/paper-doll-layer-batch-20261021'
SCRIPT=ROOT/'pixellab-pip-generations/paper-doll-rigid-weapon-20261021/assemble_review.py'

class RigidAssemblyTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        root=Path(self.temp.name);self.previous=root/'previous';self.output=root/'review'
        self.previous.mkdir();self.output.mkdir();(self.previous/'weapon').mkdir()
        files=['attachment-plan-audit.json','weapon-job.json','weapon-raw.png','body-idle-south.png','weapon-idle-south.png','weapon/frame-01.png']
        files += [f'body-source-{i:02}.png' for i in range(1,5)]
        for name in files:shutil.copy2(PREVIOUS/name,self.previous/name)
        spec=importlib.util.spec_from_file_location('rigid_review_test_module',SCRIPT)
        self.module=importlib.util.module_from_spec(spec);spec.loader.exec_module(self.module)
        self.module.HERE=self.output;self.module.PREVIOUS=self.previous

    def run_assembly(self):
        with redirect_stdout(io.StringIO()):self.module.main()

    def test_changed_compression_preserves_art(self):
        file=self.previous/'weapon/frame-01.png'
        before=file.read_bytes();image=Image.open(file).convert('RGBA');image.save(file,compress_level=0)
        self.assertNotEqual(before,file.read_bytes())
        self.run_assembly()
        self.assertEqual((self.output/'rigid-weapon.png').read_bytes(),file.read_bytes())
        review=json.loads((self.output/'review.json').read_text())
        self.assertEqual(review['new_generations'],0)
        self.assertTrue(all(r['body_pixel_changes']==0 for r in review['audits']))

    def test_changed_visible_pixel_is_rejected(self):
        file=self.previous/'weapon/frame-01.png';image=Image.open(file).convert('RGBA')
        point=next((x,y) for y in range(64) for x in range(64) if image.getpixel((x,y))[3])
        r,g,b,a=image.getpixel(point);image.putpixel(point,((r+1)%256,g,b,a));image.save(file)
        with self.assertRaisesRegex(ValueError,'Candidate pixels changed'):self.run_assembly()

    def test_changed_original_file_is_rejected(self):
        file=self.previous/'weapon-raw.png';image=Image.open(file).convert('RGBA');image.save(file,compress_level=0)
        self.assertNotEqual(hashlib.sha256(file.read_bytes()).hexdigest(),json.loads((self.previous/'weapon-job.json').read_text())['raw_sha256'])
        with self.assertRaisesRegex(ValueError,'Original generated atlas changed'):self.run_assembly()

if __name__=='__main__':unittest.main()
