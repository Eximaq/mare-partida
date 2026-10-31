"""Talent artwork stays uncovered; selection aligns; every zoom path respects 58%."""
import copy,json,os,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from polish_support import create,saved
OUT=Path(os.environ.get('MARE_TALENT_EVIDENCE',str(Path(tempfile.gettempdir())/'mare-talent-visual-fix')))
OUT.mkdir(parents=True,exist_ok=True)
URL=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/')
def page_for(browser,seed=None,size=(1366,768),touch=False):
 c=browser.new_context(viewport=dict(width=size[0],height=size[1]),has_touch=touch)
 c.route('**/__dev_version',lambda r:r.fulfill(body='stable'))
 if seed:c.add_init_script("localStorage.setItem('mare-partida-save-v1',"+json.dumps(json.dumps(seed))+")")
 q=c.new_page();q.clock.install();q.goto(URL);q.wait_for_load_state('networkidle')
 q.wait_for_function('typeof __mareDiagnostics==="function"')
 return c,q
def tree(q):
 q.locator('#characterMenuTrigger').click();q.locator('[data-character-section=talents]').click()
 q.wait_for_function("document.querySelector('.talent-tree-surface').dataset.iconsReady==='true'")
def scale(q):return int(q.locator('[data-tree-scale]').inner_text().replace('%',''))
def check_targets(q):
 rows=q.locator('[data-talent-select]').evaluate_all("""nodes=>{const c=document.querySelector('.constellation-canvas').getBoundingClientRect(),scale=c.width/1000;return nodes.map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e),p=getComputedStyle(e,'::after');return {id:e.dataset.talentSelect,covered:e.classList.contains('ui-button')||s.backgroundColor!=='rgba(0, 0, 0, 0)'||s.borderImageSource!=='none'||getComputedStyle(e.firstElementChild).display!=='none',outline:s.outlineStyle,before:getComputedStyle(e,'::before').content,dx:r.x+r.width/2-(c.x+Number(e.dataset.nodeX)*scale),dy:r.y+r.height/2-(c.y+Number(e.dataset.nodeY)*scale),ring:[p.left,p.top,p.right,p.bottom]}})}""")
 assert len(rows)==21
 for r in rows:
  assert not r['covered'],r
  assert r['outline']=='none' and r['before']=='none',r
  assert abs(r['dx'])<.1 and abs(r['dy'])<.1,r
  assert r['ring']==['-5px']*4,r
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH'))
 c,q=page_for(b);template=create(q);c.close()
 errors=[]
 for cls in ['sword','brawler','gunner','rogue','cyborg','strategist','healer']:
  seed=copy.deepcopy(template);seed.update(level=100,classId=cls)
  c,q=page_for(b,seed);q.on('pageerror',lambda e:errors.append(str(e)));tree(q)
  check_targets(q)
  before=saved(q)
  q.locator('[data-tree-zoom=fit]').click();assert scale(q)>=58
  check_targets(q)
  n=q.locator('[data-talent-select="'+cls+'-0-3"]')
  n.focus();n.click(modifiers=['Shift']);check_targets(q)
  assert q.locator('.constellation-node.is-selected').count()==1
  assert n.evaluate("(e)=>getComputedStyle(e,'::after').borderTopColor")!='rgba(0, 0, 0, 0)'
  assert saved(q)==before,'Inspection must not persist talent changes'
  c.close()
 # All controls must clamp, including fit on a small viewport and wheel/keyboard.
 c,q=page_for(b,{**template,'level':100},touch=True);q.on('pageerror',lambda e:errors.append(str(e)));tree(q)
 before=saved(q);vp=q.locator('.constellation-viewport')
 q.locator('[data-tree-zoom=fit]').click();assert scale(q)==58
 assert q.locator('[data-tree-zoom=out]').is_disabled()
 q.locator('[data-tree-zoom=in]').click();assert scale(q)>58
 q.locator('[data-tree-zoom=out]').click();assert scale(q)==58
 vp.focus()
 for _ in range(12):q.keyboard.press('-')
 assert scale(q)==58
 r=vp.bounding_box();q.mouse.move(r['x']+20,r['y']+20)
 for _ in range(12):q.mouse.wheel(0,1000);q.clock.run_for(20)
 assert scale(q)==58
 # Genuine multi-touch pinch through Chrome's input dispatcher.
 session=c.new_cdp_session(q);x=r['x']+r['width']/2;y=r['y']+r['height']/2
 def points(d):return [{'x':x-d,'y':y,'id':1},{'x':x+d,'y':y,'id':2}]
 session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':points(90)})
 session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':points(9)})
 session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 assert scale(q)==58
 vp.focus()
 for _ in range(20):q.keyboard.press('+')
 assert scale(q)==180 and q.locator('[data-tree-zoom=in]').is_disabled()
 q.locator('[data-tree-zoom=actual]').click();assert scale(q)==100
 # State changes never shift the target relative to its drawn icon.
 n=q.locator('[data-talent-select=sword-0-0]');n.focus();n.click()
 check_targets(q);assert q.locator('.constellation-node.is-selected').count()==1
 assert saved(q)==before
 for width,height in [(1920,1080),(1366,768),(1280,720),(393,852),(320,568)]:
  q.set_viewport_size(dict(width=width,height=height))
  q.locator('[data-tree-zoom=fit]').click();assert scale(q)>=58;check_targets(q)
 # Screenshot of final and intermediate artwork with a single selected node.
 c.close();seed=copy.deepcopy(template);seed.update(level=100,talentVersion=2,talentBuilds={'sword':{'nodes':{'sword-0-'+str(i):10 for i in range(5)},'keystone':'parry','ultimate':None}})
 c,q=page_for(b,seed,(1672,941));q.on('pageerror',lambda e:errors.append(str(e)));tree(q);vp=q.locator('.constellation-viewport');check_targets(q)
 assert q.locator('.constellation-node.is-max').count()>=5
 q.locator('[data-tree-zoom=fit]').click()
 q.locator('[data-tree-zoom=in]').click()
 n=q.locator('[data-talent-select=asura]');n.focus();n.click(modifiers=['Shift'])
 r=vp.bounding_box();q.mouse.move(r['x']+35,r['y']+350);q.mouse.down();q.mouse.move(r['x']+35,r['y']+96,steps=6);q.mouse.up()
 check_targets(q)
 assert q.evaluate('getSelection().toString()')==''
 q.mouse.move(1,1);q.clock.run_for(1000)
 q.screenshot(path=str(OUT/'talents-fixed.png'))
 assert not errors,errors
 c.close();b.close()
print(json.dumps({'classes':7,'zoom_min':58,'zoom_max':180,'inputs':['buttons','overview','wheel','keyboard','pinch'],'save_unchanged':True,'errors':errors}))
