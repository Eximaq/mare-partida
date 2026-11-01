"""Real compendium: native fruit masks, filters, unique registration, shared rarity and responsive HUD."""
import copy,json,os,tempfile,time
from pathlib import Path
from playwright.sync_api import sync_playwright
from polish_support import page_for,create,saved,KEY
OUT=Path(os.environ.get('MARE_COMPENDIUM_EVIDENCE',str(Path(tempfile.gettempdir())/'mare-compendium-hd')))
OUT.mkdir(parents=True,exist_ok=True)
def open_comp(q):
 q.locator('#characterMenuTrigger').click()
 q.locator('[data-character-section=akuma]').click()
 q.wait_for_function("document.querySelector('.compendium-hd')")
def ready(q):
 q.wait_for_function("Array.from(document.querySelectorAll('[data-compendium-art]')).every(c=>c.dataset.artReady==='true'||c.dataset.artError==='true')")
def select(q,id):
 q.locator('[data-compendium-fruit="'+id+'"]').click()
def reset(q):
 q.locator('[data-compendium-clear]').first.click()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH'))
 errors=[]
 c,q=page_for(b,size=(1672,990),errors=errors);template=create(q);c.close()
 seed=copy.deepcopy(template)
 seed['akumaCompendium']=['akuma_kuku_kuku','akuma_beri_beri','akuma_gura_gura','akuma_mera_mera','akuma_ope_ope','akuma_mero_mero','akuma_supa_supa','akuma_ryu_ryu']
 c,q=page_for(b,seed,size=(1672,990),errors=errors)
 q.clock.run_for(6000)
 requests=[];q.on('request',lambda r:requests.append(r.url))
 before=saved(q);stats=q.evaluate('__mareDiagnostics().stats')
 open_comp(q);ready(q)
 assert q.locator('[data-compendium-fruit]').count()==30
 q.wait_for_function("[...document.querySelectorAll('.compendium-hd img')].every(i=>i.complete)")
 assert q.locator('.compendium-hd img').evaluate_all("nodes=>nodes.every(i=>i.naturalWidth>0)"), 'No broken navigation or detail icons'
 assert q.locator('.comp-fruit-grid').evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ').length")==5
 assert not any('sprites-combat-v2' in url for url in requests),'Compendium must not request transformation sheets'
 assert q.locator('[data-compendium-art][data-art-error]').count()==0
 coverage=q.locator('.comp-fruit-grid [data-compendium-art]').evaluate_all("nodes=>nodes.map(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>240)n++;return {id:c.dataset.compendiumArt,ratio:n/(c.width*c.height)}})")
 assert len(coverage)==30 and all(0<r['ratio']<.70 for r in coverage),coverage
 for rank,rarity in [('S','Supremo'),('A','Lendário'),('B','Lendário'),('C','Épico'),('D','Épico'),('E','Raro')]:
  assert rarity in q.locator('[data-compendium-rank='+rank+']').inner_text()
 # Names and counters remain canonical; hover/focus do not write.
 target=q.locator('[data-compendium-fruit=akuma_tori_phoenix]')
 target.hover()
 tip=q.locator('#gameTooltip')
 assert tip.is_visible() and 'zoan' in tip.inner_text().casefold() and 'supremo' in tip.inner_text().casefold()
 assert saved(q)==before
 target.focus();assert tip.is_visible()
 box=tip.bounding_box();assert box['x']>=0 and box['y']>=0 and box['x']+box['width']<=1673 and box['y']+box['height']<=991
 select(q,'akuma_gura_gura');ready(q);q.mouse.move(1,1)
 assert q.locator('[data-compendium-bonus]').inner_text()=='+0,8%'
 q.screenshot(path=str(OUT/'compendium-desktop.png'))
 # S/A/B/C/D/E remain independent, rarities intentionally group ranks.
 q.locator('[data-compendium-rarity]').select_option('legendary');assert q.locator('[data-compendium-fruit]').count()==10
 q.locator('[data-compendium-rank=A]').click();assert q.locator('[data-compendium-fruit]').count()==5
 assert '2/5' in q.locator('[data-compendium-rank=S]').inner_text(),'global collection counts must not follow filters'
 reset(q);q.locator('[data-compendium-type=zoan]').click()
 assert q.locator('[data-compendium-type-select]').input_value()=='zoan'
 assert q.locator('[data-compendium-fruit]').count()==9
 q.locator('[data-compendium-type-select]').select_option('logia')
 assert q.locator('[data-compendium-type=logia]').get_attribute('aria-pressed')=='true'
 q.locator('[data-compendium-query]').fill('não existe')
 assert q.locator('[data-compendium-fruit]').count()==0
 assert 'Nenhuma fruta selecionada' in q.locator('.comp-details').inner_text()
 reset(q)
 q.locator('[data-compendium-query]').fill('Albatroz')
 assert q.locator('[data-compendium-fruit]').count()==1
 ready(q)
 art=q.locator('.comp-details [data-compendium-art]')
 assert art.get_attribute('data-colored')=='false'
 assert 'akuma_tori_albatroz' in art.get_attribute('data-art-source')
 mask=art.evaluate("""c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let opaque=0,colored=0;for(let i=0;i<p.length;i+=4)if(p[i+3]>240){opaque++;if(p[i]>15||p[i+1]>15||p[i+2]>15)colored++;}return {opaque,colored,corner:p[3]}}""")
 assert mask['opaque']>1000 and mask['colored']==0 and mask['corner']==0,mask
 assert q.locator('[data-compendium-bonus]').inner_text()=='+0,8%'
 q.mouse.move(1,1);q.screenshot(path=str(OUT/'zoan-fruit-silhouette.png'))
 # Fast selection must never paint stale art over the selected item.
 reset(q)
 t=time.perf_counter()
 q.evaluate("""()=>{const cards=[...document.querySelectorAll('[data-compendium-fruit]')];for(let i=0;i<100;i++)cards[i%cards.length].click();cards.find(c=>c.dataset.compendiumFruit==='akuma_uma_uma').click()}""")
 selection_ms=round((time.perf_counter()-t)*1000)
 ready(q)
 assert q.locator('.comp-details [data-compendium-art]').get_attribute('data-compendium-art')=='akuma_uma_uma'
 assert 'akuma_uma_uma' in q.locator('.comp-details [data-compendium-art]').get_attribute('data-art-source')
 assert q.evaluate('MareCompendium.cacheSize()')==30
 assert saved(q)==before and q.evaluate('__mareDiagnostics().stats')==stats
 # Registration grants the existing demo copy exactly once and is permanent.
 q.locator('[data-fruit-register=akuma_uma_uma]').click();ready(q)
 after=saved(q)
 assert after['akumaCompendium'].count('akuma_uma_uma')==1
 copies=[i for i in after['inventory'] if i.get('fruitId')=='akuma_uma_uma'];assert len(copies)==1
 assert q.locator('[data-fruit-register=akuma_uma_uma]').is_disabled()
 assert q.locator('[data-compendium-bonus]').inner_text()=='+0,9%'
 assert q.locator('.comp-details [data-compendium-art]').get_attribute('data-colored')=='true'
 q.locator('#closePanel').click();q.locator('.bottom-nav [data-panel=inventory]').click()
 item=q.locator('[data-item="'+copies[0]['id']+'"]').first
 assert item.evaluate("e=>!!e.closest('.rarity-rare')"),'Rank E must also appear Raro in the inventory'
 item.hover()
 assert 'raro' in q.locator('#gameTooltip').inner_text().casefold()
 q.locator('[data-close-panel]').click();open_comp(q);ready(q)
 assert q.locator('.comp-heading-subtitle').count()==1
 assert q.locator('[data-compendium-bonus]').inner_text()=='+0,9%'
 q.reload();q.wait_for_load_state('networkidle');open_comp(q);ready(q)
 q.locator('[data-compendium-query]').fill('Uma-Uma');ready(q)
 assert q.locator('[data-fruit-register=akuma_uma_uma]').is_disabled()
 # Permanence after losing the item; no second copy or bonus allowed.
 retained=copy.deepcopy(after);retained['inventory']=[i for i in retained['inventory'] if i.get('fruitId')!='akuma_uma_uma']
 c.close();c,q=page_for(b,retained,size=(1672,990),errors=errors);open_comp(q);ready(q)
 q.locator('[data-compendium-query]').fill('Uma-Uma');ready(q)
 assert q.locator('[data-fruit-register=akuma_uma_uma]').is_disabled()
 assert 'Não' in q.locator('.comp-information').inner_text()
 # Storage failures must not give a copy or a permanent bonus.
 reset(q);q.locator('[data-compendium-query]').fill('Albatroz');ready(q)
 old=saved(q);oldstats=q.evaluate('__mareDiagnostics().stats')
 q.evaluate("""()=>{window.compRealSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='mare-partida-save-v1')throw Error('quota test');return window.compRealSet.call(this,k,v)}}""")
 q.locator('[data-fruit-register=akuma_tori_albatroz]').click()
 assert saved(q)==old and q.evaluate('__mareDiagnostics().stats')==oldstats
 q.evaluate('()=>{Storage.prototype.setItem=window.compRealSet}')
 q.clock.run_for(6000)
 # Stable selectors, no clipping at supported desktop/tablet/phone widths.
 reset(q);select(q,'akuma_gura_gura');ready(q)
 for width,height in [(1920,1080),(1672,990),(1366,768),(1280,720),(1024,768),(393,852),(360,800),(320,568)]:
  q.set_viewport_size(dict(width=width,height=height))
  q.locator('.comp-workspace').evaluate('(e)=>e.scrollTop=0')
  dims=q.evaluate("""()=>{const d=document.querySelector('#dialogBody'),s=document.querySelector('.comp-workspace'),g=document.querySelector('.comp-gallery'),c=document.querySelector('.comp-fruit-card');return {body:[d.clientWidth,d.scrollWidth],workspace:[s.clientWidth,s.scrollWidth],gallery:[g.clientWidth,g.scrollWidth],card:c.getBoundingClientRect().height}}""")
  assert dims['body'][1]<=dims['body'][0]+1 and dims['workspace'][1]<=dims['workspace'][0]+1 and dims['gallery'][1]<=dims['gallery'][0]+1,dims
  assert dims['card']>=200
  q.mouse.move(1,1);q.screenshot(path=str(OUT/f'compendium-{width}.png'))
 assert not errors,errors
 c.close()
 # Touch opens the actual details panel rather than depending on hover.
 c=b.new_context(viewport=dict(width=393,height=852),is_mobile=True,has_touch=True)
 c.add_init_script("localStorage.setItem("+json.dumps(KEY)+","+json.dumps(json.dumps(seed))+")")
 q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.clock.install();q.goto(os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/'));q.wait_for_load_state('networkidle');open_comp(q);ready(q)
 q.locator('[data-compendium-fruit=akuma_gura_gura]').tap();ready(q)
 assert q.locator('.comp-details [data-compendium-art]').get_attribute('data-compendium-art')=='akuma_gura_gura'
 assert q.locator('.comp-details h2').is_visible()
 c.close()
 # One broken icon remains a readable, selectable item without a phantom silhouette.
 c=b.new_context(viewport=dict(width=1366,height=768))
 c.add_init_script("localStorage.setItem("+json.dumps(KEY)+","+json.dumps(json.dumps(seed))+")")
 c.route('**/items-hd/akuma_tori_phoenix.png*',lambda route:route.abort())
 q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.clock.install();q.goto(os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/'));q.wait_for_load_state('networkidle');open_comp(q)
 q.wait_for_function("document.querySelector('[data-compendium-art=akuma_tori_phoenix]').dataset.artError==='true'")
 select(q,'akuma_tori_phoenix')
 q.wait_for_function("document.querySelector('.comp-details [data-compendium-art]').dataset.artError==='true'")
 assert 'Arte indisponível' in q.locator('.comp-details').inner_text()
 assert 'Phoenix' in q.locator('.comp-details h2').inner_text()
 assert not errors,errors
 c.close();b.close()
print(json.dumps({'catalog':30,'ranks':6,'individual_zoan_mask':mask,'global_bonus':True,'registration_unique_persistent':True,'storage_failure_atomic':True,'responsive_sizes':8,'rapid_100_selections_ms':selection_ms,'cache_bound':30,'errors':errors,'screenshots':str(OUT)}))
