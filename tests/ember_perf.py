import json,time,base64
from playwright.sync_api import sync_playwright
from polish_support import *
out=ROOT/'docs/evidence-ruinas-brasas'
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 c,q=page_for(b);template=create(q);c.close()
 c=b.new_context(viewport=dict(width=1366,height=768));c.route('**/__dev_version',lambda r:r.fulfill(body='stable-test'))
 c.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(fixture(template)))+')')
 q=c.new_page();q.goto('http://127.0.0.1:8123/');q.wait_for_load_state('networkidle');q.evaluate('MareEmberRenderer.boot');q.locator('#enterHunt').click()
 data=q.evaluate('''async()=>{const samples=[];let last;await new Promise(done=>{function sample(t){if(last!==undefined)samples.push(t-last);last=t;if(samples.length<180)requestAnimationFrame(sample);else done();}requestAnimationFrame(sample)});samples.sort((a,b)=>a-b);return {environment:'Chromium headless, 1366x768, real requestAnimationFrame clock, 180 intervals',median_ms:samples[90],p95_ms:samples[171],mean_ms:samples.reduce((a,b)=>a+b,0)/samples.length,cache:MareEmberRenderer.stats(),js_heap_bytes:performance.memory?.usedJSHeapSize||null};}''')
 (out/'performance.json').write_text(json.dumps(data,indent=2));print(json.dumps(data),flush=True)
 url=q.evaluate('''()=>{const c=document.createElement('canvas');c.width=c.height=2048;const x=c.getContext('2d');x.imageSmoothingEnabled=false;MareEmberRenderer.ground(x,{x:0,y:0},2048,2048,0);for(const p of MareEmber.props.slice().sort((a,b)=>a.y-b.y))MareEmberRenderer.prop(x,p);MareEmberRenderer.environment(x,{x:0,y:0},2048,2048,0,false);const small=document.createElement('canvas');small.width=small.height=2048;small.getContext('2d').drawImage(c,0,0,2048,2048);return small.toDataURL('image/png');}''')
 (out/'full-map.png').write_bytes(base64.b64decode(url.split(',')[1]))
 q.set_viewport_size(dict(width=2560,height=1440));q.wait_for_timeout(300)
 assert q.evaluate('''()=>{const c=document.querySelector('#worldCanvas');return c.width===2560&&c.getContext('2d').getImageData(c.width-2,c.height/2,1,1).data[3]===255;}''')
 q.screenshot(path=str(out/'ultrawide-ocean-2560x1440.png'));print('Ultra-wide viewport beyond map bounds: surrounding sea rendered, no transparent canvas.',flush=True);b.close()
