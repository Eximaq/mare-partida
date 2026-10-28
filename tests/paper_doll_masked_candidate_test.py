"""Regional extraction is a draft, never approval of a drifting full-body edit."""
import sys
import tempfile
import unittest
from pathlib import Path
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import paper_doll_fit_audit as fit


class MaskedCandidate(unittest.TestCase):
    def test_unrelated_redraw_is_excluded_and_disclosed(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory)
            base = Image.new('RGBA', (4, 4))
            base.putpixel((1, 1), (180, 120, 80, 255))
            base.putpixel((2, 2), (100, 100, 100, 255))
            edit = base.copy()
            edit.putpixel((1, 1), (200, 130, 90, 255))  # unwanted face redraw
            edit.putpixel((2, 2), (20, 30, 60, 255))  # intended garment
            mask = Image.new('RGB', (4, 4))
            mask.putpixel((2, 2), (255, 255, 255))
            for name, image in [('base', base), ('edit', edit), ('mask', mask)]:
                image.save(p / (name + '.png'))
            result = fit.inspection_draft(p/'base.png', p/'edit.png', p/'layer.png', p/'composite.png', mask_path=p/'mask.png')
            self.assertFalse(result['artwork_approved'])
            self.assertFalse(result['productionEnabled'])
            self.assertEqual(result['raw_audit']['outside_region_pixels'], 1)
            self.assertEqual(result['draft_audit']['outside_region_pixels'], 0)
            layer = Image.open(p/'layer.png').convert('RGBA')
            self.assertEqual(layer.getpixel((1, 1))[3], 0)
            self.assertEqual(layer.getpixel((2, 2)), edit.getpixel((2, 2)))
            self.assertEqual(Image.open(p/'base.png').convert('RGBA').tobytes(), base.tobytes())
            with self.assertRaises(FileExistsError):
                fit.inspection_draft(p/'base.png', p/'edit.png', p/'layer.png', p/'composite.png', mask_path=p/'mask.png')

    def test_same_output_paths_cannot_replace_a_layer(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory)
            base = Image.new('RGBA', (4, 4), (100, 80, 60, 255))
            edit = base.copy()
            edit.putpixel((1, 1), (20, 30, 60, 255))
            mask = Image.new('RGB', (4, 4), 'white')
            for name, image in [('base', base), ('edit', edit), ('mask', mask)]:
                image.save(p / (name + '.png'))
            with self.assertRaises(ValueError):
                fit.inspection_draft(p/'base.png', p/'edit.png', p/'layer.png', p/'layer.png', mask_path=p/'mask.png')
            self.assertFalse((p/'layer.png').exists())


if __name__ == '__main__':
    unittest.main()
