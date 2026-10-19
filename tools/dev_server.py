"""Local-only preview with automatic reload; no dependencies or save access."""
import http.server
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIVE = b'''<script>(()=>{let version;setInterval(async()=>{try{const v=await(await fetch('/__dev_version',{cache:'no-store'})).text();if(version&&v!==version)location.reload();version=v}catch{}},1200)})();</script>'''

class Preview(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=str(ROOT),**kwargs)

    def do_GET(self):
        if self.path == '/__dev_version':
            paths = [ROOT/'index.html', ROOT/'game.js', ROOT/'styles.css', ROOT/'world-system.js', ROOT/'island-world.js', ROOT/'island-assets.js', ROOT/'character-system.js', ROOT/'faction-sprites.js', ROOT/'faction-assets.js']
            paths += [ROOT/'combat-animation.js', ROOT/'combat-assets.js', ROOT/'ui-nautical.css', ROOT/'forge-system.js', ROOT/'forge-ui.js', ROOT/'ember-world.js', ROOT/'ember-renderer.js', ROOT/'archipelago.js', ROOT/'assets/ruinas-brasas/manifest.json']
            data = json.dumps([p.stat().st_mtime_ns if p.exists() else 0 for p in paths]).encode()
            self.send_response(200); self.send_header('Cache-Control','no-store')
            self.send_header('Content-Length',str(len(data))); self.end_headers(); self.wfile.write(data)
        elif self.path.split('?')[0] in ('/', '/index.html'):
            data = (ROOT/'index.html').read_bytes().replace(b'</body>',LIVE+b'</body>')
            self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8')
            self.send_header('Cache-Control','no-store'); self.send_header('Content-Length',str(len(data)))
            self.end_headers(); self.wfile.write(data)
        else:
            super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        super().end_headers()

if __name__ == '__main__':
    print('Mare Partida live preview: http://127.0.0.1:8123',flush=True)
    http.server.ThreadingHTTPServer(('127.0.0.1',8123),Preview).serve_forever()
