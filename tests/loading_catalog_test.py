import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from game_loading_catalog import build_catalog


class CatalogTest(unittest.TestCase):
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
