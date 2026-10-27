"""Production-only additions must be exported even when absent from the DEV pack."""
import importlib.util
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))


class CatalogExport(unittest.TestCase):
    def test_both_manifests_and_safe_paths(self):
        self.assertIsNotNone(importlib.util.find_spec('paper_doll_pages'), 'Pages needs a shared pack dependency collector')
        from paper_doll_pages import pack_sources
        draft = {'pieces': [{'animations': {'idle': {'url': 'body.png'}}}]}
        player = {'pieces': [{'animations': {'walk': {'url': 'new-hair.png', 'sources': {'south': {'url': 'sword.png'}}}}}]}
        self.assertEqual(pack_sources(draft, player), {'body.png', 'new-hair.png', 'sword.png'})
        self.assertEqual(pack_sources(draft, draft), {'body.png'})
        for path in ['../secret.png', 'https://example.com/image.png', 'nested/hair.png', 'nested\\hair.png', 'saves.json']:
            with self.subTest(path=path), self.assertRaises(ValueError):
                pack_sources({'pieces': [{'animations': {'idle': {'url': path}}}]})


if __name__ == '__main__':
    unittest.main()
