"""Built Pages release: versioned resources bypass stale unversioned scripts."""
import functools,hashlib,http.server,json,re,threading
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
from polish_support import ROOT,KEY,page_for,create

entry=(ROOT/'dist/index.html').read_text(encoding='utf-8')
links=re.findall(r'(?:src|href)="([^\"]+\.(?:js|css))\?v=([a-f0-9]+)"',entry)
assert len(links)==17,len(links)
for name,version in links:assert version==hashlib.sha256((ROOT/'dist'/name).read_bytes()).hexdigest()[:16]
requests=[]
class Release(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT/'dist'),**kwargs)
 def log_message(self,*args):pass
 def do_GET(self):
  requests.append(self.path)
  if self.path=='/game.js':
   # Emulate an obsolete script delivered at the previous cache key.
   self.send_response(200);self.end_headers();self.wfile.write(b'throw Error("obsolete cached game loaded")');return
  super().do_GET()
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Release)
threading.Thread(target=server.serve_forever,daemon=True).start()
out=ROOT/'docs/evidence-pages-cache';out.mkdir(exist_ok=True)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True);c,q=page_for(b);template=create(q);c.close()
  errors=[];c=b.new_context(viewport=dict(width=393,height=852),is_mobile=True,has_touch=True,device_scale_factor=2)
  c.add_init_script('if(!sessionStorage.seeded){localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(template))+');sessionStorage.seeded="1"}')
  q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.goto(f'http://127.0.0.1:{server.server_port}/?v=ruinas64');q.wait_for_load_state('networkidle');q.evaluate('MareEmberRenderer.boot')
  before=json.loads(q.evaluate('localStorage.getItem('+json.dumps(KEY)+')'));q.locator('#enterHunt').click();q.locator('[data-island][data-current=true]').click();q.locator('[data-travel-area]').click();q.wait_for_timeout(300)
  d=q.evaluate('__mareDiagnostics()');assert d['map']==dict(id='embers',width=2048,height=2048);assert all(m['skin'] for m in d['mobs']);assert q.evaluate('MareEmberRenderer.stats().monsters')==4
  q.screenshot(path=str(out/'mobile-new-map.png'));q.reload();q.wait_for_load_state('networkidle')
  after=json.loads(q.evaluate('localStorage.getItem('+json.dumps(KEY)+')'))
  for key in ['name','classId','factionId','inventory','equipment']:assert before[key]==after[key],key
  assert '/game.js' not in requests;assert not errors,errors
  result=dict(passed=True,versioned_resources=len(links),mobile_map=d['map'],stale_game_requested=False,save_preserved=True,errors=errors)
  (out/'results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));b.close()
finally:server.shutdown();server.server_close()
