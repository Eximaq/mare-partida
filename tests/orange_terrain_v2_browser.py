"""Same-coordinate before/after captures using the actual terrain renderer and game."""
import argparse,json,hashlib,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/evidence-orange-terrain-v2'
parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['before','after'],required=True);args=parser.parse_args();dest=OUT/args.phase;dest.mkdir(parents=True,exist_ok=True)
VIEWS={'rua':(640,672),'praca':(864,864),'litoral':(64,1216),'cantos':(1280,128),'cais':(0,1440),'chunks':(960,960),'fachadas':(1088,1056)}
with sync_playwright() as p:
    b=p.chromium.launch();c=b.new_context(viewport={'width':1366,'height':768});errors=[]
    c.route('**/__dev_version',lambda r:r.fulfill(body='stable'))
    c.add_init_script('Math.random=(()=>{let x=42317;return()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296}})()')
    q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.clock.install(time=1792500000000);q.goto(os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/'))
    q.wait_for_function('typeof __mareDiagnostics==="function"');q.evaluate('MareOrangeRenderer.boot')
    q.locator('#characterName').fill('Nauta terreno');q.locator('#nextToClass').click();q.locator('#nextToAppearance').click();q.locator('#createCharacter').click();q.locator('[data-confirm-accept]').click();q.clock.run_for(100)
    q.locator('#devLauncher').click();q.locator('[data-dev-enter]').click();q.wait_for_url('**/?dev=1');q.wait_for_function('window.__mareDiagnostics?.().dev.active')
    q.locator('#devLauncher').click();q.locator('#devLevel').fill('30');q.locator('[data-dev-command=level]:not([data-value])').click();q.locator('[data-dev-option=godMode]').check();q.locator('[data-dev-travel=orange]').click();q.evaluate('MareOrangeRenderer.boot')
    if q.evaluate('__mareDiagnostics().autoPlay'):q.locator('#autoToggle').click()
    q.clock.run_for(100);q.screenshot(path=str(dest/'jogo-chegada.png'))
    invariant=q.evaluate('''()=>({terrain:[...MareOrange.terrain],map:{width:MareOrange.map.width,height:MareOrange.map.height,colliders:MareOrange.map.colliders,spawn:MareOrange.spawn,spawnZones:MareOrange.map.spawnZones,safeZones:MareOrange.map.safeZones,paths:MareOrange.paths,frontages:MareOrange.frontages,props:MareOrange.props}})''')
    canonical=json.dumps(invariant,sort_keys=True,separators=(',',':'));fingerprint=hashlib.sha256(canonical.encode()).hexdigest()
    if args.phase=='before':(OUT/'world-before.json').write_text(canonical,encoding='utf-8')
    else:assert canonical==(OUT/'world-before.json').read_text(encoding='utf-8'),'World/collision/spawn/props changed'
    q.evaluate('''()=>{const e=document.createElement('canvas');e.id='terrain-inspection';e.style.cssText='position:absolute;left:0;top:0;z-index:100000;image-rendering:pixelated';document.body.append(e)}''')
    for name,(x,y) in {**VIEWS,'mapa-completo':(0,0)}.items():
        size=2048 if name=='mapa-completo' else 768;height=2048 if name=='mapa-completo' else 512
        q.evaluate('''([x,y,w,h])=>{const e=document.getElementById('terrain-inspection');e.width=w;e.height=h;const c=e.getContext('2d');c.imageSmoothingEnabled=false;c.translate(-x,-y);MareOrangeRenderer.ground(c,{x,y},w,h,0,true);MareOrange.props.slice().sort((a,b)=>a.y-b.y).forEach(p=>MareOrangeRenderer.prop(c,p));MareOrangeRenderer.environment(c,0,true)}''',[x,y,size,height])
        q.locator('#terrain-inspection').screenshot(path=str(dest/(name+'.png')))
        if name in ['rua','cantos','cais','chunks']:
            q.locator('#terrain-inspection').evaluate('e=>{const s=document.createElement("canvas");s.width=e.width;s.height=e.height;s.getContext("2d").drawImage(e,0,0);e.width*=2;e.height*=2;const c=e.getContext("2d");c.imageSmoothingEnabled=false;c.drawImage(s,0,0,e.width,e.height)}')
            q.locator('#terrain-inspection').screenshot(path=str(dest/(name+'-2x.png')))
    q.locator('#terrain-inspection').evaluate('e=>e.remove()')
    for sector in ['rua','praca','picadeiro']:
        q.locator('#huntRoute').click();q.locator('[data-hunt-sector='+sector+']').click()
        for _ in range(80):
            q.clock.run_for(250)
            if not q.evaluate('__mareDiagnostics().path.length'):break
        d=q.evaluate('__mareDiagnostics()');assert d['walkable'] and not d['path'];q.screenshot(path=str(dest/('jogo-'+sector+'.png')))
    technical=None
    if args.phase=='after':
        technical=q.evaluate('''async()=>{
          const m=await(await fetch('assets/terrain/harbor-v2/manifest.json')).json(),images={};
          await Promise.all([...Object.values(m.sets).map(s=>s.url),...Object.values(m.variants).flat()].map(url=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[url]=im;resolve()};im.onerror=reject;im.src=url})));
          const cfg=MareOrangeTerrain.configure(MareOrange,m,images),canvas=(w,h)=>{const e=document.createElement('canvas');e.width=w;e.height=h;return e},a=canvas(2048,2048),b=canvas(2048,2048);
          const start=performance.now();MareOrangeTerrain.drawRegion(a.getContext('2d'),cfg,0,0,2048,2048);
          for(let y=0;y<4;y++)for(let x=0;x<4;x++){const c=canvas(512,512);MareOrangeTerrain.drawChunk(c.getContext('2d'),x,y,cfg);b.getContext('2d').drawImage(c,x*512,y*512)}
          const ad=a.getContext('2d').getImageData(0,0,2048,2048).data,bd=b.getContext('2d').getImageData(0,0,2048,2048).data;
          let seams=0;for(let i=0;i<ad.length;i++)if(ad[i]!==bd[i])seams++;
          const reference=canvas(2048,2048);MareOrangeRenderer.ground(reference.getContext('2d'),{x:0,y:0},2048,2048,0,true);
          let cameraErrors=0,alphaErrors=0;
          for(const [x,y]of [[511,511],[512,512],[1023,1023],[1024,1024],[1279,255]]){
            const view=canvas(384,256),c=view.getContext('2d');c.translate(-x,-y);MareOrangeRenderer.ground(c,{x,y},384,256,0,true);
            const got=c.getImageData(0,0,384,256).data,expected=reference.getContext('2d').getImageData(x,y,384,256).data;
            for(let i=0;i<got.length;i++){if(got[i]!==expected[i])cameraErrors++;if(i%4===3&&got[i]!==255)alphaErrors++;}
          }
          const warm=canvas(1366,768),wc=warm.getContext('2d'),warmStart=performance.now();for(let n=0;n<30;n++)MareOrangeRenderer.ground(wc,{x:0,y:0},1366,768,0,true);const warmMs=(performance.now()-warmStart)/30;
          return{chunk_vs_monolithic_rgba_errors:seams,camera_crop_errors:cameraErrors,uncovered_pixels:alphaErrors,cache_entries:MareOrangeRenderer.stats().chunks,verification_ms:performance.now()-start,warm_canvas_submission_ms: warmMs};
        }''')
        assert technical['chunk_vs_monolithic_rgba_errors']==technical['camera_crop_errors']==technical['uncovered_pixels']==0,technical
        assert technical['cache_entries']<=20
    assert not errors,errors
    (dest/'results.json').write_text(json.dumps({'phase':args.phase,'views':VIEWS,'world_fingerprint':fingerprint,'renderer':q.evaluate('MareOrangeRenderer.stats()'),'technical':technical,'errors':errors},indent=2),encoding='utf-8');b.close();print('Orange terrain captures:',args.phase,'world',fingerprint,'technical',technical,flush=True)
