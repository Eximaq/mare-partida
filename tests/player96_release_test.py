"""Release fingerprints must survive Windows/Linux text checkout differences."""
import sys
from pathlib import Path
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from player96_release import fingerprint_content, verify_release

class ReleaseTest(unittest.TestCase):
    def test_current_release_is_fresh(self):
        self.assertTrue(verify_release()['resources'])

    def test_text_checkout_does_not_change_release_identity(self):
        for name in ['root/character-appearance.js', 'appearance-catalog.json']:
            self.assertEqual(fingerprint_content(name, b'a\r\nb\r\n'), fingerprint_content(name, b'a\nb\n'))

    def test_binary_art_remains_exact(self):
        art = b'\x89PNG\r\n\x1a\n\0\r\n'
        self.assertEqual(fingerprint_content('assets/head.png', art), art)

if __name__ == '__main__':
    unittest.main()
