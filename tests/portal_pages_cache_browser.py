"""Both public builds must bypass an old cached portal stylesheet."""
import http.server
import json
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'docs/evidence-portal-cache'
EVIDENCE.mkdir(parents=True, exist_ok=True)


def check_release(browser, folder):
    requests = []
    class Release(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ROOT / folder), **kwargs)
        def log_message(self, *args):
            pass
        def do_GET(self):
            requests.append(self.path)
            if self.path == '/portal/portal.css':
                # The old login CSS has no sizing rule for the new logo image.
                self.send_response(200)
                self.send_header('Content-Type', 'text/css')
                self.end_headers()
                self.wfile.write(b'body{margin:0}.logo-image{max-width:620px}')
                return
            super().do_GET()
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Release)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    context = browser.new_context(reduced_motion='reduce')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.goto(f'http://127.0.0.1:{server.server_port}/portal/')
        page.wait_for_load_state('networkidle')
        page.evaluate("localStorage.setItem('portal-cache-test', 'preserved')")
        results = []
        for width, height in [(1920, 1080), (1366, 768), (1280, 720), (390, 844), (320, 740)]:
            page.set_viewport_size(dict(width=width, height=height))
            state = page.evaluate("""() => ({
                logo: document.querySelector('.game-logo').getBoundingClientRect().width,
                overflow: document.documentElement.scrollWidth > innerWidth,
                header: getComputedStyle(document.querySelector('.masthead')).display,
                images: [...document.images].every(i => i.complete && i.naturalWidth > 0),
                forms: document.forms.length
            })""")
            page.screenshot(path=str(EVIDENCE / f'{folder}-{width}.png'), full_page=True)
            assert state['logo'] <= 550, (folder, width, state)
            assert not state['overflow'], (folder, width, state)
            assert state['header'] == 'flex', (folder, state)
            assert state['images'] and state['forms'] == 0, state
            results.append(dict(viewport=[width, height], **state))
        page.locator('summary').focus()
        page.keyboard.press('Enter')
        assert page.locator('details').evaluate('(el) => el.open')
        page.keyboard.press('Enter')
        assert not page.locator('details').evaluate('(el) => el.open')
        page.reload()
        page.wait_for_load_state('networkidle')
        assert page.evaluate("localStorage.getItem('portal-cache-test')") == 'preserved'
        assert '/portal/portal.css' not in requests, requests
        assert not errors, errors
        return dict(build=folder, stale_css_requested=False, screens=results, errors=errors)
    finally:
        context.close()
        server.shutdown()
        server.server_close()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    try:
        results = [check_release(browser, folder) for folder in ['dist', 'dist-portal']]
        (EVIDENCE / 'results.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
        print(json.dumps(results))
    finally:
        browser.close()
