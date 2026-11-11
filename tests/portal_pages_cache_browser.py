"""Both public builds must bypass an old cached portal stylesheet."""
import http.server
import json
import threading
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'docs/evidence-portal-cache'
EVIDENCE.mkdir(parents=True, exist_ok=True)


def check_configured_actions(page, url, folder):
    script = (ROOT / folder / 'portal/collaborators.js').read_text(encoding='utf-8')
    script = script.replace("instagram: ''", "instagram: 'https://www.instagram.com/example/'")
    script = script.replace("discord: ''", "discord: 'https://discord.gg/example'")
    script = script.replace('enabled: false', 'enabled: true')
    script = script.replace("claimUrl: ''", "claimUrl: 'https://discord.com/channels/123/456'")
    page.route('**/collaborators.js?*', lambda route: route.fulfill(
        content_type='text/javascript', body=script))

    # A harmless local image stands in for loaded artwork. No test pays or opens an external link.
    fixture = ROOT / folder / 'portal/assets/ui/banner-compass.webp'

    def respond_with_image(route):
        if urlsplit(route.request.url).path.endswith('pix-50.png'):
            route.fulfill(status=404)
            return
        route.fulfill(path=fixture, content_type='image/webp')

    page.route('**/assets/pix-*.png', respond_with_image)
    page.goto(url)
    page.get_by_role('link', name='Instagram').wait_for()
    assert page.get_by_role('link', name='Discord').get_attribute('href') == 'https://discord.gg/example'
    for amount in [15, 25]:
        control = page.locator(f'[data-pix="{amount}"] summary')
        control.wait_for()
        control.focus()
        page.keyboard.press('Enter')
        image = page.get_by_role('img', name=f'QR Code Pix de R$ {amount}', exact=True)
        assert image.get_attribute('src') == f'./assets/pix-{amount}.png'
        assert control.locator('..').get_by_role('link').get_attribute('href') == 'https://discord.com/channels/123/456'
        page.keyboard.press('Enter')
    page.wait_for_load_state('networkidle')
    assert page.locator('[data-pix="50"]').is_hidden()
    assert page.get_by_text('Pix em breve', exact=True).count() == 3
    assert page.get_by_text('Pix em breve', exact=True).filter(visible=True).count() == 1


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
        url = f'http://127.0.0.1:{server.server_port}/portal/'
        page.goto(url)
        page.wait_for_load_state('networkidle')
        plans = page.get_by_role('region', name='Planos de colaborador')
        assert plans.is_visible(), 'A página pública deve mostrar os planos'
        assert plans.locator('.plan-price').all_text_contents() == ['R$ 15', 'R$ 25', 'R$ 50']
        assert plans.get_by_text('Pix em breve', exact=True).count() == 3
        assert plans.locator('img').count() == 0
        community = page.get_by_role('navigation', name='Comunidade')
        assert community.get_by_text('Instagram Em breve', exact=True).is_visible()
        assert community.get_by_text('Discord Em breve', exact=True).is_visible()
        assert community.get_by_role('link').count() == 0
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
        page.locator('.captains-note summary').focus()
        page.keyboard.press('Enter')
        assert page.locator('.captains-note').evaluate('(el) => el.open')
        page.keyboard.press('Enter')
        assert not page.locator('.captains-note').evaluate('(el) => el.open')
        page.reload()
        page.wait_for_load_state('networkidle')
        assert page.evaluate("localStorage.getItem('portal-cache-test')") == 'preserved'
        check_configured_actions(page, url, folder)
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
