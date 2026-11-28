import hashlib
import random
import sys
import zipfile
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from game_loading_catalog import build_catalog


class CatalogTest(unittest.TestCase):
    def test_hd_transport_restores_the_exact_archives(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / 'tools/rework-base-hd'
            target.mkdir(parents=True)
            shared = random.Random(42).randbytes(100_000)
            for idx in range(3):
                with zipfile.ZipFile(target / f'{idx}.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
                    archive.writestr(f'{idx}-frame.png', shared)
                    archive.writestr('another.png', shared)
                    archive.writestr('unique.png', bytes([idx]) * 100)
            catalog = build_catalog(root)
            units = catalog['units']
            patches = catalog['patches']
            self.assertTrue(patches)
            self.assertEqual(build_catalog(root), catalog)
            saved = 0
            for index, (path, size, digest) in enumerate(units):
                if digest not in patches:
                    continue
                patch_path, patch_size, spans = patches[digest]
                literal = (root / patch_path).read_bytes()
                self.assertEqual(len(literal), patch_size)
                saved += size - patch_size
                rebuilt = bytearray()
                consumed = 0
                for offset, provider, start, count in spans:
                    gap = offset - len(rebuilt)
                    rebuilt.extend(literal[consumed:consumed + gap])
                    consumed += gap
                    if provider == index:
                        self.assertLessEqual(start + count, len(rebuilt))
                        source = rebuilt
                    else:
                        self.assertNotIn(units[provider][2], patches)
                        source = (root / units[provider][0]).read_bytes()
                    rebuilt.extend(source[start:start + count])
                rebuilt.extend(literal[consumed:])
                self.assertEqual(rebuilt, (root / path).read_bytes())
                self.assertEqual(hashlib.sha256(rebuilt).hexdigest(), digest)
            self.assertGreater(saved, len(shared) * 2)

    def test_gameplay_bundle_skips_opt_in_cycles_and_groups_medium_assets(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            inputs = {
                'assets/ui/medium-a.png': b'a' * 80_000,
                'assets/ui/medium-b.png': b'b' * 80_000,
                'tools/rework-weapons/grip-corrections/approved.png': b'grip',
                'tools/rework-weapons/catalog.json': b'preview catalog',
                'tools/rework-outfits/generated/preview.zip': b'preview cycle',
            }
            for path, data in inputs.items():
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
            catalog = build_catalog(root)
            self.assertEqual(set(catalog['files']), set(list(inputs)[:3]))
            self.assertEqual(len(catalog['units']), 1)
            for path, (unit, offset, size, _) in catalog['files'].items():
                data = (root / catalog['units'][unit][0]).read_bytes()
                self.assertEqual(data[offset:offset + size], inputs[path])
            self.assertTrue((root / 'tools/rework-outfits/generated/preview.zip').exists())

    def test_release_bytes_are_complete_and_versioned(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for path in ['assets/ui/slot.png', 'tools/rework-base-hd/base.zip',
                         'portal/test.png', 'docs/review.png']:
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(path.encode())
            first = build_catalog(root)
            self.assertEqual(set(first['files']), {'assets/ui/slot.png', 'tools/rework-base-hd/base.zip'})
            for path, (unit, offset, size, _) in first['files'].items():
                data = (root / first['units'][unit][0]).read_bytes()
                self.assertEqual(data[offset:offset + size], (root / path).read_bytes())
            self.assertEqual(build_catalog(root), first)
            (root / 'assets/ui/slot.png').write_bytes(b'changed')
            self.assertNotEqual(first, build_catalog(root))


if __name__ == '__main__':
    unittest.main()
