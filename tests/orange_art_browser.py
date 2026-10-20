"""Load production art and render an unobstructed local composition inspection."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/evidence-orange-town';OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
    b=p.chromium.launch();q=b.new_page(viewport={'width':2048,'height':2048});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
    q.goto(os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/'));q.evaluate('MareOrangeRenderer.boot')
    q.locator('#characterName').fill('Nauta composição');q.locator('#nextToClass').click();q.locator('#createCharacter').click()
    q.locator('#devLauncher').click();q.locator('[data-dev-enter]').click();q.wait_for_url('**/?dev=1');q.wait_for_function('window.__mareDiagnostics?.().dev.active')
    q.locator('#devLauncher').click();q.locator('#devLevel').fill('30');q.locator('[data-dev-command=level]:not([data-value])').click();q.locator('[data-dev-travel=orange]').click();q.evaluate('MareOrangeRenderer.boot');q.wait_for_timeout(100)
    stats=q.evaluate('MareOrangeRenderer.stats()');assert stats['artReady'] and stats['monsters']==4 and not stats['missing'],stats;print(stats)
    q.evaluate('''()=>{
      const c=document.createElement('canvas');c.id='orange-inspection';c.width=c.height=2048;document.body.append(c);c.style.cssText='position:absolute;left:0;top:0;z-index:100000';document.body.style.margin=0;
      const x=c.getContext('2d');x.imageSmoothingEnabled=false;
      MareOrangeRenderer.ground(x,{x:0,y:0},2048,2048,0,true);
      MareOrange.props.slice().sort((a,b)=>a.y-b.y).forEach(p=>MareOrangeRenderer.prop(x,p));
      MareOrangeRenderer.environment(x,0,true);
    }''')
    q.locator('#orange-inspection').screenshot(path=str(OUT/'full-map.png'));assert not errors,errors;b.close()
