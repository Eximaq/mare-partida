"""The public coming-soon package must not ship the game or local files."""
import re
import hashlib
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


class PortalBuildTest(unittest.TestCase):
    def test_public_portal_contains_three_plans_and_community_actions(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / 'site'
            subprocess.run([sys.executable, str(ROOT / 'tools/build_portal.py'),
                            '--output-dir', str(output)], check=True, capture_output=True)
            html = (output / 'portal/index.html').read_text(encoding='utf-8')
            self.assertEqual(re.findall(r'class="plan-price">(R\$ \d+)</p>', html),
                             ['R$ 15', 'R$ 25', 'R$ 50'])
            self.assertIn('aria-label="Comunidade"', html)
            self.assertFalse('nubank.com.br/cobrar/' in html,
                             'O portal público não deve expor links pessoais de cobrança')
            for amount in (15, 25, 50):
                card = re.search(rf'<article[^>]+aria-labelledby="plan-{amount}">.*?</article>',
                                 html, re.DOTALL)
                self.assertIsNotNone(card, amount)
                self.assertIn(f'data-pix-amount="{amount}"', card[0])
                reference = re.search(r'data-pix-qr="([^"]+)"', card[0])
                self.assertIsNotNone(reference, 'O plano precisa apontar para um QR local')
                self.assertEqual(urlsplit(reference[1]).path, f'./assets/pix-{amount}.png')
                qr = output / f'portal/assets/pix-{amount}.png'
                self.assertTrue(qr.is_file(), 'Cada plano precisa do QR correspondente no build')
                self.assertTrue(qr.read_bytes().startswith(b'\x89PNG\r\n\x1a\n'))
            self.assertIn('href="https://www.instagram.com/kaizokuidle2d"', html)
            self.assertIn('href="https://discord.gg/uRnP79cp7h"', html)
            self.assertIn('<dialog', html)

    def test_pages_styles_bypass_cached_unversioned_assets(self):
        from urllib.parse import parse_qs
        portal = ROOT / 'dist/portal'
        html = (portal / 'index.html').read_text(encoding='utf-8')
        styles = re.findall(r'href="([^"]+\.css(?:[?][^"]+)?)"', html)
        self.assertEqual(len(styles), 2)
        for reference in styles:
            url = urlsplit(reference)
            digest = hashlib.sha256((portal / url.path).read_bytes()).hexdigest()[:16]
            self.assertEqual(parse_qs(url.query).get('v'), [digest], reference)

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
            self.assertEqual(list(output.rglob('*.js')), [landing.parent / 'pix-dialog.js'])


if __name__ == '__main__':
    unittest.main()
