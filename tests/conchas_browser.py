"""Cidade das Conchas: real UI, walking, rendering and old-save compatibility in isolated contexts."""
import copy,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/evidence-conchas/after';OUT.mkdir(parents=True,exist_ok=True)
KEY='mare-partida-save-v1';URL=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/');errors=[]
def state(q):return q.evaluate('__mareDiagnostics()')
def page(b,seed=None,size=(1366,768)):
    c=b.new_context(viewport={'width':size[0],'height':size[1]})
    c.route('**/__dev_version',lambda r:r.fulfill(body='stable'))
    c.route('**/api/akuma/catalog',lambda r:r.fulfill(status=404,body='{}'))
    c.add_init_script('Math.random=(()=>{let x=17391;return()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296}})()')
    if seed:c.add_init_script('if(!sessionStorage.seeded){localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(seed))+');sessionStorage.seeded="1"}')
    q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.clock.install(time=1792500000000);q.goto(URL);q.wait_for_function('typeof __mareDiagnostics==="function"');q.evaluate('MareConchasRenderer.boot');assert q.evaluate('MareConchasRenderer.stats().ready');return c,q
def travel(q):
    q.locator('#enterHunt').click();q.locator('[data-quick-mode=map]').click();q.locator('[data-island=conchas]').click();q.locator('[data-travel-area=swamp]').click();q.clock.run_for(100)
    if state(q)['autoPlay']:q.locator('#autoToggle').click()
def route(q,sector):
    if q.locator('#journeyToggle').get_attribute('aria-expanded')=='false':q.locator('#journeyToggle').click()
    q.locator('#huntRoute').click();q.locator('[data-hunt-sector='+sector+']').click()
    for _ in range(160):
        q.clock.run_for(250)
        if not state(q)['path']:break
    d=state(q);assert not d['path'] and d['walkable'],d
    goal=q.evaluate('(id)=>MareConchas.paths.find(p=>p.id===id)',sector)
    assert ((d['hero']['x']-goal['x'])**2+(d['hero']['y']-goal['y'])**2)**.5<3,(sector,d['hero'])

with sync_playwright() as p:
    b=p.chromium.launch();c,q=page(b);q.locator('#characterName').fill('Nauta Conchas');q.locator('#nextToClass').click();q.locator('#createCharacter').click();q.clock.run_for(100);template=json.loads(q.evaluate('localStorage.getItem('+json.dumps(KEY)+')'));c.close()
    low=copy.deepcopy(template);low['level']=10;c,q=page(b,low);q.locator('#enterHunt').click();q.locator('[data-quick-mode=map]').click();q.locator('[data-island=conchas]').click();assert q.locator('[data-travel-area=swamp]').is_disabled();c.close()
    high=copy.deepcopy(template);high['level']=20
    for size in [(1920,1080),(1366,768),(1280,720),(393,852),(320,568)]:
        c,q=page(b,high,size);travel(q);d=state(q);assert d['map']=={'id':'conchas','width':2048,'height':2048};assert d['walkable'] and d['alive']>0
        assert all(11<=m['level']<=13 for m in d['mobs']),d['mobs'];q.screenshot(path=str(OUT/f'chegada-{size[0]}.png'))
        if q.locator('#journeyToggle').get_attribute('aria-expanded')=='false':q.locator('#journeyToggle').click()
        q.locator('#huntRoute').click();assert q.locator('[data-hunt-sector]').count()==4;assert q.locator('#dialogBody').evaluate('e=>e.scrollWidth<=e.clientWidth+1');q.locator('#closePanel').click()
        q.locator('#returnLobby').click();q.reload();q.wait_for_function('typeof __mareDiagnostics==="function"');saved=json.loads(q.evaluate('localStorage.getItem('+json.dumps(KEY)+')'))
        for key in ['name','classId','factionId','equipment','inventory','gold','materials','claimed']:assert saved[key]==high[key],key
        assert saved['area']=='swamp' and saved['level']==20;c.close();print('Conchas arrival, gate, route UI and old-save preservation',size,'passed',flush=True)
    c,q=page(b,high);travel(q);d=state(q);point=q.evaluate('MareConchas.returnPoint');box=q.locator('#worldCanvas').bounding_box();q.mouse.click(box['x']+point['x']-round(d['camera']['x']),box['y']+point['y']-round(d['camera']['y']))
    for _ in range(40):
        q.clock.run_for(250)
        if state(q)['scene']=='lobby':break
    assert state(q)['scene']=='lobby','Clicking the quay return must walk and return to port';c.close()
    ready=copy.deepcopy(high);ready['hunts']['areas']['swamp']['kills']=12
    c,q=page(b,ready);q.locator('#devLauncher').click();q.locator('[data-dev-enter]').click();q.wait_for_url('**/?dev=1');q.wait_for_function('__mareDiagnostics().dev.active');q.locator('#devLauncher').click();q.locator('[data-dev-option=godMode]').check();q.locator('[data-dev-travel=swamp]').click();q.evaluate('MareConchasRenderer.boot')
    if state(q)['autoPlay']:q.locator('#autoToggle').click()
    q.clock.run_for(100);q.screenshot(path=str(OUT/'chegada.png'))
    for sector in ['vigilia','docas','catacumbas','bastiao']:
        route(q,sector);q.screenshot(path=str(OUT/(sector+'.png')))
    assert any(m['type']=='boss' and m['level']==20 for m in state(q)['mobs']),state(q)
    warned=False
    for _ in range(100):
        q.clock.run_for(200)
        if any(m['telegraph'] for m in state(q)['mobs']):warned=True;break
    assert warned,'Live boss warning missing';q.screenshot(path=str(OUT/'chefe-aviso.png'));q.locator('#autoToggle').click()
    for _ in range(240):
        q.clock.run_for(1000)
        if state(q)['hunt']['progress']['areas']['swamp']['bosses']>0:break
    assert state(q)['hunt']['progress']['areas']['swamp']['bosses']>0,'Boss not defeated'
    q.locator('#huntRoute').click();button=q.locator('[data-hunt-first=swamp]');assert button.is_enabled()
    q.evaluate('()=>{window.realSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error("quota")}}');button.click();assert not state(q)['hunt']['progress']['areas']['swamp']['firstRewardClaimed']
    q.evaluate('()=>{Storage.prototype.setItem=window.realSet}');button.click();assert button.is_disabled();q.locator('#closePanel').click();q.locator('#returnLobby').click();q.reload();q.wait_for_function('typeof __mareDiagnostics==="function"')
    dev=json.loads(q.evaluate("localStorage.getItem('mare-partida-dev-save-v1')"));prizes=[i for i in dev['inventory'] if i.get('origin')=='Primeira vitória · Cidade das Conchas'];assert len(prizes)==1 and prizes[0]['rarity']=='epic' and prizes[0]['level']==4
    assert dev['hunts']['areas']['swamp']['firstRewardClaimed'];normal=json.loads(q.evaluate('localStorage.getItem('+json.dumps(KEY)+')'));assert normal['hunts']['areas']['swamp']['bosses']==0
    print('Real sector walking, boss warning/victory, reward rollback/single claim/reload and DEV isolation passed',flush=True)
    # Compare the published compositor at chunk boundaries, independently of camera position.
    q.evaluate('MareConchasRenderer.boot')
    technical=q.evaluate('''()=>{const make=(w,h)=>{const e=document.createElement('canvas');e.width=w;e.height=h;return e},full=make(2048,2048);MareConchasRenderer.ground(full.getContext('2d'),{x:0,y:0},2048,2048,0,true);let errors=0,holes=0;
      for(const [x,y]of [[511,511],[512,512],[1023,1023],[1024,1024],[1279,255]]){const e=make(384,256),c=e.getContext('2d');c.translate(-x,-y);MareConchasRenderer.ground(c,{x,y},384,256,0,true);const got=c.getImageData(0,0,384,256).data,want=full.getContext('2d').getImageData(x,y,384,256).data;for(let i=0;i<got.length;i++){if(got[i]!==want[i])errors++;if(i%4===3&&got[i]!==255)holes++;}}
      const pixels=(t,reduced)=>{const e=make(128,128);MareConchasRenderer.ground(e.getContext('2d'),{x:0,y:0},128,128,t,reduced);return e.getContext('2d').getImageData(0,0,128,128).data},a=pixels(0,false),b=pixels(8,false),c=pixels(8,true);let water=0,reduced=0;for(let i=0;i<a.length;i++){if(a[i]!==b[i])water++;if(a[i]!==c[i])reduced++;}return{camera_errors:errors,uncovered_pixels:holes,water_animation_pixels:water,reduced_motion_errors:reduced,...MareConchasRenderer.stats()};}''')
    assert technical['camera_errors']==technical['uncovered_pixels']==technical['reduced_motion_errors']==0,technical;assert technical['water_animation_pixels']>0 and technical['chunks']<=20 and not technical['missing'];assert not errors,errors
    q.evaluate('''()=>{const e=document.createElement('canvas');e.id='map-review';e.width=e.height=2048;e.style.cssText='position:absolute;top:0;left:0;z-index:100000;image-rendering:pixelated';document.body.append(e);const c=e.getContext('2d');c.imageSmoothingEnabled=false;MareConchasRenderer.ground(c,{x:0,y:0},2048,2048,0,true);MareConchas.props.slice().sort((a,b)=>a.y-b.y).forEach(p=>MareConchasRenderer.prop(c,p));MareConchasRenderer.environment(c,0,true)}''')
    q.locator('#map-review').screenshot(path=str(OUT/'mapa-completo.png'))
    for name,x,y in [('litoral',128,1376),('ruas',512,1056),('bastiao-terreno',864,480)]:
        q.locator('#map-review').evaluate('''(e,p)=>{e.width=768;e.height=512;const c=e.getContext('2d');c.imageSmoothingEnabled=false;c.scale(2,2);c.translate(-p[0],-p[1]);MareConchasRenderer.ground(c,{x:p[0],y:p[1]},384,256,0,true);MareConchas.props.slice().sort((a,b)=>a.y-b.y).forEach(p=>MareConchasRenderer.prop(c,p))}''',[x,y])
        q.locator('#map-review').screenshot(path=str(OUT/(name+'-2x.png')))
    (OUT/'results.json').write_text(json.dumps({'errors':errors,'entry_level':11,'map':[32,32],'browser_cases':5,'technical':technical},indent=2),encoding='utf-8');c.close();b.close();print('Terrain, camera seams, animated water and reduced motion:',technical,flush=True)
