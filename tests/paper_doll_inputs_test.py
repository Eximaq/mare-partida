"""Guard against spending on rescaled/clipped or misordered animation inputs."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))


class ProductionInputs(unittest.TestCase):
    def test_manual_archive_is_allowlisted(self):
        self.assertIsNotNone(importlib.util.find_spec('package_paper_doll_manual'))
        from package_paper_doll_manual import create_archive
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            inputs = root / 'inputs'
            inputs.mkdir()
            Image.new('RGBA', (64, 64)).save(inputs / 'body-idle-south-00.png')
            report = {'generationPerformed': False, 'inputCanvas': [64, 64], 'frames': [{'file': 'body-idle-south-00.png'}], 'batches': [{'direction': 'south', 'frames': ['body-idle-south-00.png']}]}
            manifest = inputs / 'input-manifest.json'
            manifest.write_text(json.dumps(report), encoding='utf-8')
            (inputs / 'private.txt').write_text('not part of the deliverable')
            guide = root / 'guide.md'
            guide.write_text('Manual only; no paid calls.', encoding='utf-8')
            archive = root / 'kit.zip'
            create_archive(inputs, guide, archive)
            with zipfile.ZipFile(archive) as packed:
                self.assertEqual(set(packed.namelist()), {'README.md', 'LOTES.txt', 'referencias/input-manifest.json', 'referencias/body-idle-south-00.png'})
                self.assertEqual(packed.read('referencias/body-idle-south-00.png'), (inputs / 'body-idle-south-00.png').read_bytes())
            with self.assertRaises(FileExistsError):
                create_archive(inputs, guide, archive)
            report['frames'][0]['file'] = '../private.txt'
            manifest.write_text(json.dumps(report), encoding='utf-8')
            with self.assertRaises(ValueError):
                create_archive(inputs, guide, root / 'bad.zip')
            self.assertFalse((root / 'bad.zip').exists())

    def test_native_crop_and_pose_batches(self):
        self.assertIsNotNone(importlib.util.find_spec('prepare_paper_doll_inputs'))
        from prepare_paper_doll_inputs import prepare
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            sheet = Image.new('RGBA', (336, 336))
            for row in range(4):
                for col in range(4):
                    sheet.putpixel((col * 84 + 20 + col, row * 84 + 30), (50 + col, 60 + row, 70, 255))
            sheet.save(root / 'body.png')
            manifest = {'rig': {'frameWidth': 84, 'frameHeight': 84, 'pivotX': 42, 'pivotY': 65}, 'pieces': [{'slot': 'body', 'animations': {'idle': {'url': 'body.png', 'frames': 4, 'directions': ['south', 'north', 'west', 'east']}}}]}
            path = root / 'pack.json'
            path.write_text(json.dumps(manifest), encoding='utf-8')
            report = prepare(path, root / 'out')
            self.assertEqual(len(report['frames']), 16)
            self.assertEqual(report['pivot'], {'x': 32, 'y': 52})
            self.assertEqual(report['frames'][0]['direction'], 'south')
            self.assertEqual(report['frames'][4]['direction'], 'north')
            for frame in report['frames']:
                native = Image.open(root / 'out' / frame['file']).convert('RGBA')
                self.assertEqual(native.size, (64, 64))
                restored = Image.new('RGBA', (84, 84))
                restored.paste(native, (10, 13))
                row = ['south', 'north', 'west', 'east'].index(frame['direction'])
                col = frame['frameIndex']
                self.assertEqual(restored.tobytes(), sheet.crop((col * 84, row * 84, col * 84 + 84, row * 84 + 84)).tobytes())
            self.assertTrue(all(len(b['frames']) <= 15 for b in report['batches']))
            with self.assertRaises(FileExistsError):
                prepare(path, root / 'out')
            sheet.putpixel((1, 1), (255, 0, 0, 255))
            sheet.save(root / 'body.png')
            with self.assertRaisesRegex(ValueError, 'crop'):
                prepare(path, root / 'clipped')
            self.assertFalse((root / 'clipped').exists(), 'validate everything before writing outputs')


if __name__ == '__main__':
    unittest.main()
