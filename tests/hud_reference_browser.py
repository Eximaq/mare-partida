"""HUD geometry, readability and controls in isolated Chromium contexts.

Catches clipped resources, inaccessible touch targets and collisions when optional
Haki/Zoan controls or long messages are present. Never uses a personal browser.
"""
import argparse
import atexit
import json
import os
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
from polish_support import page_for, create, fixture, saved, panel, ROOT

parser = argparse.ArgumentParser()
parser.add_argument('--capture-only', action='store_true')
parser.add_argument('--slots-only', action='store_true', help='Only inspect optional fruit/Zoan hotbar states')
parser.add_argument('--phase', default='after')
parser.add_argument('--sizes', help='Optional comma-separated WxH viewports for focused diagnosis')
parser.add_argument('--serve-dist', action='store_true', help='Serve the built static package on an isolated local port')
args = parser.parse_args()
if args.serve_dist:
    class QuietHandler(SimpleHTTPRequestHandler):
        def log_message(self,*args):pass
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT/'dist')))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    atexit.register(server.server_close)
    atexit.register(server.shutdown)
    os.environ['MARE_TEST_URL']=f'http://127.0.0.1:{server.server_port}/'
OUT = Path(os.environ.get('MARE_QA_DIR',str(ROOT/'docs/evidence-hud-reference'))) / args.phase
OUT.mkdir(parents=True, exist_ok=True)
SIZES = [(1920,1080),(1600,900),(1366,768),(1280,720),(1024,768),(844,390),(390,844)]
if args.sizes:SIZES=[tuple(map(int,s.split('x'))) for s in args.sizes.split(',')]
SURFACES = ['.topbar','#mainMenu','#hudUtilities','.action-panel','#journeyHud',
            '#floatingChat','#chatCornerToggle','.world-command','#targetHud','#huntXpTracker']
errors, results = [], []

def geometry(q):
    return q.evaluate('''selectors => Object.fromEntries(selectors.map(s => {
      const e=document.querySelector(s),r=e?.getBoundingClientRect();
      return [s,e && getComputedStyle(e).visibility!=='hidden' && r.width && r.height
        ? {x:r.x,y:r.y,width:r.width,height:r.height}:null];
    }))''', SURFACES)

def inspect(q, name):
    w,h=q.viewport_size['width'],q.viewport_size['height']
    rects=geometry(q)
    q.screenshot(path=str(OUT/f'{name}-{w}x{h}.png'))
    results.append({'state':name,'size':[w,h],'rects':rects})
    if args.capture_only:return
    for s,r in rects.items():
        if not r:continue
        assert r['x']>=-1 and r['y']>=-1 and r['x']+r['width']<=w+1 and r['y']+r['height']<=h+1,(s,r,(w,h))
    visible=[(s,r) for s,r in rects.items() if r]
    for i,(a,r) in enumerate(visible):
        for b,t in visible[i+1:]:
            dx=min(r['x']+r['width'],t['x']+t['width'])-max(r['x'],t['x'])
            dy=min(r['y']+r['height'],t['y']+t['height'])-max(r['y'],t['y'])
            assert dx<=1 or dy<=1,(name,(w,h),a,b,dx,dy)
    assert q.evaluate('document.documentElement.scrollWidth<=innerWidth')
    for s in ['#miniHPText','#miniEnergyText','#miniXPText','#miniGold']:
        assert q.locator(s).evaluate('e=>e.scrollWidth<=e.clientWidth+1'),('clipped resource',s,w)
    for s in ['#mainMenu :is([data-panel],#socialMenuTrigger)','.action-panel .skill-button','#journeyToggle','#enterHunt','#returnLobby']:
        for e in q.locator(s).all():
            if e.is_visible():
                r=e.bounding_box();assert min(r['width'],r['height'])>=44,(s,r)
    for s in ['#miniHPText','#miniEnergyText','#miniXPText','#gameLog']:
        if q.locator(s).is_visible():
            assert q.locator(s).evaluate('e=>parseFloat(getComputedStyle(e).fontSize)>=12'),('small type',s,w)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    c,q=page_for(browser,errors=errors);template=create(q);c.close()
    seed=fixture(template)
    seed.update(level=53,has_haki_unlocked=True,haki={'current':100,'unlocked':True})
    for size in ([] if args.slots_only else SIZES):
        c,q=page_for(browser,seed,size,errors);q.clock.run_for(1000)
        inspect(q,'lobby')
        if not args.capture_only:
            assert q.evaluate('document.elementFromPoint(innerWidth/2,innerHeight/2).id')=='worldCanvas'
            before=saved(q)
            if not q.locator('#floatingChat').is_visible():q.locator('#chatCornerToggle').click()
            q.locator('#chatInput').fill('Navegação: '+('mensagem longa ' * 8))
            q.locator('#chatInput').press('Enter');q.locator('[data-chat-channel=notes]').click()
            assert 'Anotação local:' in q.locator('#gameLog').inner_text()
            inspect(q,'chat');q.locator('[data-close-window=chat]').click()
            q.locator('#characterPosterToggle').click();assert q.locator('#wantedPortrait').is_visible()
            q.locator('#characterPosterClose').click()
            for key in ['inventory','forge','character','contracts','map','help']:
                panel(q,key)
                assert q.locator('#dialogBody').evaluate('e=>e.scrollWidth<=e.clientWidth+1'),key
                q.screenshot(path=str(OUT/f'{key}-{size[0]}x{size[1]}.png'))
                q.keyboard.press('Escape');assert q.locator('#panelOverlay').is_hidden()
            after=saved(q)
            for k in ['gold','inventory','equipment','attributes','level','xp','potions']:
                assert before[k]==after[k],('UI changed save',k)
            panel(q,'map');q.locator('[data-island=dawn]').click();q.locator('[data-travel-area]').click()
            q.clock.run_for(1200);inspect(q,'hunt')
            q.keyboard.press('h');assert q.evaluate('__mareDiagnostics().haki.active')=='armament'
            q.keyboard.press('j');assert q.evaluate('__mareDiagnostics().haki.active')=='observation'
            q.keyboard.press('j')
            q.locator('#returnLobby').click();q.reload();q.wait_for_load_state('networkidle')
        c.close();print('HUD',size,'captured' if args.capture_only else 'passed',flush=True)
    if not args.capture_only:
        c,q=page_for(browser,seed,errors=errors)
        # Test-only fixture bridge. Production scripts and bindings stay unchanged.
        def expose_fixture(route):
            source=((ROOT/'dist' if args.serve_dist else ROOT)/'game.js').read_text(encoding='utf-8')
            anchor='  window.__mareDiagnostics='
            assert source.count(anchor)==1,'fixture hook drifted'
            route.fulfill(content_type='application/javascript',body=source.replace(anchor,
                '  window.__hudReferenceQA={get game(){return game},defs:itemDefs,newItem,sync:syncFruitVfx,update:updateUI,enter:enterHunt,pause(){autoPlay=false;updateUI();}};window.__mareDiagnostics='))
        c.route('**/game.js*',expose_fixture)
        q.reload();q.wait_for_load_state('networkidle')
        q.evaluate('__hudReferenceQA.enter()');q.clock.run_for(100)
        if q.locator('#floatingChat').is_visible():q.locator('[data-close-window=chat]').click()
        for fruit,control in [('akuma_mera_mera','#skill3'),('akuma_uma_uma','#zoanTransform'),('akuma_tori_phoenix','#zoanTransform')]:
            q.evaluate('''id=>{const q=__hudReferenceQA,def=q.defs.find(d=>d.fruitId===id);
              if(!def)throw Error('missing fixture '+id);
              q.game.equipment.akuma_no_mi=q.newItem(def);q.sync();q.update();q.pause();}''',fruit)
            assert q.locator(control).is_visible(),fruit
            for w,h in SIZES:
                q.set_viewport_size({'width':w,'height':h});q.clock.run_for(150)
                inspect(q,fruit)
            print('HUD optional slots',fruit,'passed',flush=True)
        c.close()
    browser.close()
    (OUT/'results.json').write_text(json.dumps({'results':results,'errors':errors},indent=2),encoding='utf-8')
    assert not errors,errors
