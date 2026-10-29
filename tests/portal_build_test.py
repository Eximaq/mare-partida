"""The public coming-soon package must not ship the game or local files."""
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


class PortalBuildTest(unittest.TestCase):
    def test_refuses_to_publish_stale_game_or_overwrite_source(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / 'site'
            output.mkdir()
            sentinel = output / 'game.js'
            sentinel.write_text('private development build', encoding='utf-8')
            command = [sys.executable, str(ROOT / 'tools/build_portal.py'), '--output-dir']
            result = subprocess.run(command + [str(output)], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(sentinel.read_text(encoding='utf-8'), 'private development build')
            original = (ROOT / 'portal/index.html').read_bytes()
            result = subprocess.run(command + [str(ROOT / 'portal')], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual((ROOT / 'portal/index.html').read_bytes(), original)

    def test_isolated_repeatable_package_with_working_relative_assets(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / 'site'
            command = [sys.executable, str(ROOT / 'tools/build_portal.py'),
                       '--output-dir', str(output)]
            for _ in range(2):
                result = subprocess.run(command, capture_output=True, text=True, cwd=temporary)
                self.assertEqual(result.returncode, 0, result.stderr)
            landing = output / 'portal/index.html'
            self.assertTrue(landing.is_file())
            self.assertIn('url=./portal/', (output / 'index.html').read_text(encoding='utf-8'))
            html = landing.read_text(encoding='utf-8')
            self.assertNotRegex(html, r'<(?:form|input)\b')
            for reference in re.findall(r'(?:src|href)="([^"#]+)"', html):
                path = urlsplit(reference)
                if not path.scheme:
                    self.assertTrue((landing.parent / path.path).exists(), reference)
            self.assertFalse((output / 'game.js').exists())
            self.assertFalse((output / 'assets').exists())
            self.assertFalse(list(output.rglob('*.py')))
            self.assertFalse(list(output.rglob('*.js')))


if __name__ == '__main__':
    unittest.main()
