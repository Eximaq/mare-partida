"""Canvas talent trees: real mouse input, dependency states, saves and responsive HD rendering."""
import copy,json,os,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from polish_support import create,saved
BASE_URL=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/')
def page_for(browser,seed=None):
 c=browser.new_context(viewport=dict(width=1366,height=768))
 c.route('**/__dev_version',lambda route:route.fulfill(body='stable-test'))
 if seed:c.add_init_script("if(!sessionStorage.seeded){localStorage.setItem('mare-partida-save-v1',"+json.dumps(json.dumps(seed))+");sessionStorage.seeded='1'}")
 q=c.new_page();q.clock.install();q.goto(BASE_URL);q.wait_for_load_state('networkidle');q.wait_for_function('typeof __mareDiagnostics===\"function\"');return c,q
OUT=Path(os.environ.get('MARE_TALENT_EVIDENCE',str(Path(tempfile.gettempdir())/'mare-talent-canvas-qa')))
OUT.mkdir(parents=True,exist_ok=True)
def tree(q):
 q.locator('.bottom-nav [data-panel=character]').click()
 q.locator('[data-character-section=talents]').click()
def click(q,id,inspect=False):
 n=q.locator('[data-talent-select="'+id+'"]');n.focus();n.click(modifiers=['Shift'] if inspect else [])
def state(q,id):return q.locator('[data-talent-select="'+id+'"]').get_attribute('data-node-state')
def confirm(q):
 q.locator('[data-talent-confirm]').click();q.locator('[data-confirm-accept]').click()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH','C:/Program Files/Google/Chrome/Application/chrome.exe'))
 errors=[]
 def checked(seed=None):
  c,q=page_for(b,seed);q.on('pageerror',lambda e:errors.append(e.stack));return c,q
 c,q=checked();template=create(q);c.close()
 for cls in ['brawler','sword','gunner','rogue','cyborg','strategist','healer']:
  seed=copy.deepcopy(template);seed.update(level=30,classId=cls)
  c,q=checked(seed);tree(q)
  assert q.locator('[data-talent-select]').count()==21
  assert q.locator('[data-talent-select]').first.bounding_box()['width']==96
  surface=q.locator('.talent-tree-surface')
  q.wait_for_function("document.querySelector('.talent-tree-surface').dataset.iconsReady==='true'")
  assert q.evaluate("MareTalentUI.TALENT_TREE_CONFIG['"+cls+"'].nodes.length")==21
  a=cls+'-0-0';next=cls+'-0-1'
  assert state(q,next)=='locked'
  click(q,next);assert '0 PT na prévia' in q.locator('.talent-budget').inner_text()
  for i in range(4):click(q,a)
  assert state(q,next)=='locked'
  click(q,a);assert state(q,next)=='available'
  assert q.evaluate("MareTalentUI.configFor({classId:'"+cls+"',level:30,talentBuilds:{}},{nodes:{'"+a+"':5},keystone:null,ultimate:null}).edges.some(e=>e.from==='"+a+"'&&e.to==='"+next+"'&&e.active)")
  click(q,next,True);assert '5 PT na prévia' in q.locator('.talent-budget').inner_text()
  for i in range(5):click(q,a)
  assert state(q,a)=='max';click(q,a);assert '10 PT na prévia' in q.locator('.talent-budget').inner_text()
  assert not saved(q)['talentBuilds'][cls]['nodes']
  confirm(q);assert saved(q)['talentBuilds'][cls]['nodes'][a]==10
  q.reload();q.wait_for_load_state('networkidle');tree(q);assert state(q,a)=='max'
  q.locator('[data-tree-zoom=fit]').click();q.screenshot(path=str(OUT/(cls+'-tree.png')))
  c.close()
 # A single earned point cannot be overspent; discard and persistence stay transactional.
 c,q=checked(template);tree(q)
 click(q,'sword-0-0');click(q,'sword-0-0')
 assert '0 PT' in q.locator('[data-talent-points]').inner_text()
 assert 'insuficientes' in q.locator('.talent-message').inner_text()
 q.locator('[data-talent-cancel]').click();assert '1 PT' in q.locator('[data-talent-points]').inner_text()
 # Preserve old advanced ranks and independent class investments.
 seed=copy.deepcopy(template);seed.update(level=100,talentVersion=1)
 seed['talentBuilds']={cls:{'nodes':{cls+'-0-0':5,cls+'-0-1':5,cls+'-0-2':3},'keystone':None,'ultimate':None} for cls in ['sword','healer']}
 c.close();c,q=checked(seed);tree(q)
 assert saved(q)['talentBuilds']['sword']['nodes']['sword-0-2']==3
 assert saved(q)['talentBuilds']['healer']['nodes']['healer-0-2']==3
 click(q,'sword-0-2');assert 'intermediário' in q.locator('.talent-message').inner_text()
 # Mouse pan and zoom must not spend points; icons resolve on high-DPI screens.
 for w,h in [(1920,1080),(1366,768),(1280,720),(1024,768),(393,852),(360,800),(320,568)]:
  q.set_viewport_size(dict(width=w,height=h));q.locator('#dialogBody').evaluate('(e)=>e.scrollTop=0')
  q.locator('[data-tree-zoom=root]').click();vp=q.locator('.constellation-viewport');vp.scroll_into_view_if_needed()
  before=q.locator('.talent-budget').inner_text();box=vp.bounding_box()
  q.mouse.move(box['x']+25,box['y']+40);q.mouse.down();q.mouse.move(box['x']+80,box['y']+70,steps=6);q.mouse.up()
  assert q.locator('.talent-budget').inner_text()==before
  q.locator('[data-tree-zoom=in]').click()
  assert q.locator('.talent-tree-surface').evaluate('(e)=>e.width')>=1000
  q.locator('[data-tree-zoom=fit]').click()
  assert q.locator('#dialogBody').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
  q.locator('#dialogBody').evaluate('(e)=>e.scrollTop=0');q.screenshot(path=str(OUT/('responsive-'+str(w)+'.png')))
 c.close()
 # High-DPI backing surface: use HD source pixels, do not upscale a 32px bitmap.
 c=b.new_context(viewport=dict(width=1366,height=768),device_scale_factor=2)
 c.add_init_script("localStorage.setItem('mare-partida-save-v1',"+json.dumps(json.dumps(template))+")")
 q=c.new_page();q.on('pageerror',lambda e:errors.append(e.stack));q.goto(BASE_URL);q.wait_for_load_state('networkidle');tree(q)
 assert q.locator('.talent-tree-surface').evaluate('(e)=>e.width')==2000
 assert q.evaluate("Promise.all(MareTalentUI.TALENT_TREE_CONFIG.sword.nodes.map(n=>new Promise(r=>{const i=new Image;i.onload=()=>r([256,512].includes(i.naturalWidth)&&i.naturalWidth===i.naturalHeight);i.src=n.icon}))).then(a=>a.every(Boolean))")
 c.close()
 # Touch and failed storage: preview is reversible and confirmation stays atomic.
 c=b.new_context(viewport=dict(width=393,height=852),has_touch=True,is_mobile=True)
 c.add_init_script("localStorage.setItem('mare-partida-save-v1',"+json.dumps(json.dumps(template))+")")
 q=c.new_page();q.on('pageerror',lambda e:errors.append(e.stack));q.goto(BASE_URL);q.wait_for_load_state('networkidle');tree(q)
 n=q.locator('[data-talent-select=sword-0-0]');n.focus();n.tap()
 assert '0 PT' in q.locator('[data-talent-points]').inner_text()
 q.evaluate("()=>{window.realSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='mare-partida-save-v1')throw Error('quota');return realSet.call(this,k,v)}}")
 confirm(q);assert not saved(q)['talentBuilds']['sword']['nodes']
 q.evaluate('()=>{Storage.prototype.setItem=window.realSet}')
 confirm(q);assert saved(q)['talentBuilds']['sword']['nodes']['sword-0-0']==1
 assert not errors,errors
 b.close()
print(json.dumps({'seven_classes':True,'responsive_sizes':7,'common_HD':512,'special_HD':256,'display':96,'errors':errors,'screenshots':str(OUT)}))
