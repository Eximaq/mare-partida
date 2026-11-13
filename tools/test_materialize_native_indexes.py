import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('materialize_native_indexes', Path(__file__).with_name('materialize_native_indexes.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class MaterializeTest(unittest.TestCase):
    def test_exact_restore_idempotent_and_integrity(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            data = b'{"records":[{"source":"original pixels","value":1}]}\n'
            compressed = gzip.compress(data, mtime=0)
            folder = root / 'tools/rework-modular-outfits-hd'
            folder.mkdir(parents=True)
            (folder / 'index.json.gz').write_bytes(compressed)
            entry = {'source':'tools/rework-modular-outfits-hd/index.json.gz','target':'tools/rework-modular-outfits-hd/index.json','bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'compressedBytes':len(compressed),'compressedSha256':hashlib.sha256(compressed).hexdigest()}
            (root / 'tools/native-index-transport.json').write_text(json.dumps({'schema':'native-index-gzip-v1','indexes':[entry]}))
            module.materialize(root)
            target = folder / 'index.json'
            self.assertEqual(target.read_bytes(), data)
            before = target.stat().st_mtime_ns
            module.materialize(root)
            self.assertEqual(target.stat().st_mtime_ns, before)
            target.write_bytes(b'local edit')
            with self.assertRaises(ValueError): module.materialize(root)
            self.assertEqual(target.read_bytes(), b'local edit')
            target.unlink()
            (folder / 'index.json.gz').write_bytes(compressed[:-3]+b'bad')
            with self.assertRaises(ValueError): module.materialize(root)
            self.assertFalse(target.exists())

if __name__ == '__main__': unittest.main()
