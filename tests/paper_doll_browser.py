"""Real browser acceptance of infrastructure/fallback, not modular character artwork."""
import base64,copy,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/evidence-paper-doll';OUT.mkdir(parents=True,exist_ok=True)
URL=os.environ.get('MARE_TEST_URL','http://127.0.0.1:8123/');KEY='mare-partida-save-v1';errors=[];rows=[]
def new_page(browser,seed=None,size=(1366,900),clock=True):
 # Exercise the real legacy fallback explicitly when the approved pack cannot load.
 c=browser.new_context(viewport={'width':size[0],'height':size[1]});c.route('**/api/akuma/catalog',lambda r:r.fulfill(status=404,body='{}'));c.route('**/__dev_version',lambda r:r.fulfill(body='stable'))
 c.route('**/player-pack.json',lambda r:r.fulfill(status=503,body='{}'))
 if seed:c.add_init_script('if(!sessionStorage.seeded){localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(seed))+');sessionStorage.seeded="1"}')
 q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)))
 if clock:q.clock.install()
 return c,q
def diag(q):return q.evaluate('__mareDiagnostics()')
def saved(q):return json.loads(q.evaluate('localStorage.getItem('+json.dumps(KEY)+')'))
def game(q):q.goto(URL,wait_until='domcontentloaded');q.wait_for_function('typeof __mareDiagnostics==="function"');q.evaluate('Promise.all([MareDawnRenderer.boot,MareEmberRenderer.boot])')
def travel(q):
 q.locator('#enterHunt').click();q.locator('[data-quick-mode=map]').click();q.locator('[data-island=dawn]').click();q.locator('[data-travel-area=beach]').click()
with sync_playwright() as p:
 b=p.chromium.launch()
 for size in [(1366,900),(393,852)]:
  c,q=new_page(b,size=size);q.goto(URL+'tools/paper-doll-inspector/index.html');q.wait_for_load_state('networkidle');q.wait_for_function('MareFactionSprites.frame("pirate-sword","attack","south",0)!==null');q.evaluate('localStorage.setItem("mare-partida-save-v1","preserve-inspector-sentinel")')
  assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  cases=0
  for action,count in [('idle',4),('walk',8),('attack',8)]:
   q.locator('#animation').select_option(action)
   for frame in range(count):
    q.locator('#frame').fill(str(frame));s=q.evaluate('__paperDollInspector.state()');assert s['mode']=='fallback' and not s['artworkValidated'];assert len(s['differences'])==4 and all(d['pixels']==0 for d in s['differences']);assert len(s['missing'])==4;cases+=4
   q.screenshot(path=str(OUT/(action+'-'+str(size[0])+'.png')),full_page=True)
  q.locator('#direction').select_option('north');assert q.locator('article.board:visible').count()==1
  q.locator('[data-layer=hair]').uncheck();assert 'hair' in q.evaluate('__paperDollInspector.state().hidden');assert all(d['pixels']==0 for d in q.evaluate('__paperDollInspector.state().differences'))
  q.locator('#resetLayers').click();assert q.locator('[data-layer=hair]').is_checked()
  q.locator('#weapon').select_option('1');assert q.evaluate('__paperDollInspector.state().appearance.pieces.weapon')=='human-weapon-1';q.locator('#weapon').select_option('none');assert q.evaluate('__paperDollInspector.state().appearance.pieces.weapon')=='human-weapon-0'
  q.locator('#outfit').select_option('7');assert q.evaluate('__paperDollInspector.state().appearance.pieces.outfit')=='human-coat-7';q.locator('#outfit').select_option('none')
  q.locator('#frame').fill('0');q.locator('#play').click();q.clock.run_for(350);assert int(q.locator('#frame').input_value())>0;q.locator('#play').click();q.locator('#pivots').uncheck()
  q.locator('#importPanel > summary').click();q.locator('#importPack').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{"rig": {}}'});q.wait_for_function('document.querySelector("#importStatus").textContent.includes("não aplicado")');assert q.evaluate('__paperDollInspector.state().mode')=='fallback'
  assert q.evaluate('localStorage.getItem("mare-partida-save-v1")')=='preserve-inspector-sentinel'
  q.locator('#resetPack').click();assert q.locator('#importPack').input_value()=='';rows.append({'test':'inspector','size':size,'matching_fallback_poses':cases,'save_untouched':True});c.close()
 # Rendering conformance uses offscreen coloured blocks, NOT character sprites or delivered art.
 c,q=new_page(b);q.goto(URL+'tools/paper-doll-inspector/index.html');q.wait_for_load_state('networkidle')
 technical=q.evaluate('''async()=>{
 const dirs=['south','north','west','east'],animations={idle:{frames:4,fps:4,loop:true,directions:dirs},walk:{frames:8,fps:8,loop:true,directions:dirs},attack:{frames:8,fps:12,loop:false,directions:dirs}},rig={id:'geometry-only',frameWidth:84,frameHeight:84,pivotX:42,pivotY:65,scale:1,requiredSlots:['body','hair','outfit','weapon'],animations};
 const engine=MarePaperDoll.create({getImage:url=>images.get(url),maxCacheBytes:84*84*4*3,maxCacheEntries:3}),images=new Map();engine.registerRig(rig);
 const colors={body:'#aa2211',hair:'#eedd33',outfit:'#2244bb',weapon:'#22cc55'},pieces={},fixturePieces=[],fixtureFiles=[];
 for(const [slot,color]of Object.entries(colors)){
  const piece={id:slot,slot,rigId:rig.id,approved:true,available:true,revision:1,animations:{}};pieces[slot]=slot;
  for(const [id,a]of Object.entries(animations)){
   const sheet=document.createElement('canvas');sheet.width=84*a.frames;sheet.height=336;const s=sheet.getContext('2d');s.fillStyle=color;
   for(let row=0;row<4;row++)for(let frame=0;frame<a.frames;frame++)s.fillRect(frame*84+20+frame,row*84+20+row,4,4);
   const url=slot+'-'+id,image=new Image();image.src=sheet.toDataURL();await image.decode();images.set(url,image);piece.animations[id]={...a,url,frameWidth:84,frameHeight:84};fixtureFiles.push({name:url+'.png',base64:image.src.split(',')[1]});
   if(slot==='weapon')piece.animations[id].directionOverrides={north:{zIndex:-10}};
  }
  engine.registerPiece(piece);const exported=structuredClone(piece);for(const clip of Object.values(exported.animations))clip.url+='.png';fixturePieces.push(exported);
 }
 const output=document.createElement('canvas');output.width=84;output.height=84;const ctx=output.getContext('2d'),appearance={rigId:rig.id,pieces};window.__geometryPack={manifest:{rig,pieces:fixturePieces,appearance},files:fixtureFiles};let checked=0;
 for(const [animationId,a]of Object.entries(animations))for(const direction of dirs)for(let frameIndex=0;frameIndex<a.frames;frameIndex++){
  ctx.clearRect(0,0,84,84);if(!engine.draw(ctx,appearance,{animationId,direction,frameIndex},42,65))throw Error('fixture unexpectedly rejected');
  const got=[...ctx.getImageData(20+frameIndex,20+dirs.indexOf(direction),1,1).data],expected=direction==='north'?[238,221,51,255]:[34,204,85,255];if(JSON.stringify(got)!==JSON.stringify(expected))throw Error('incorrect depth/frame/pivot '+got);checked++;
 }
 const pose={animationId:'attack',direction:'south',frameIndex:3};ctx.clearRect(0,0,84,84);engine.draw(ctx,appearance,pose,42,65,{hidden:['weapon']});if(ctx.getImageData(23,20,1,1).data[0]!==238)throw Error('hide layer failed');
 const hair=engine.piece('hair');hair.animations.attack.poseOverrides={south:[{},{},{},{offsetX:5,zIndex:100}]};engine.registerPiece(hair);const plan=engine.resolve(appearance,pose);if(plan.layers.at(-1).offsetX!==5)throw Error('pose offset failed');
 const white={...engine.piece('outfit'),id:'other-coat',revision:2};for(const clip of Object.values(white.animations))clip.url='body-'+Object.entries(white.animations).find(([id,c])=>c===clip)[0];engine.registerPiece(white);
 const cfg={...appearance,pieces:{...pieces,outfit:'other-coat'}};if(!engine.draw(ctx,cfg,pose,42,65))throw Error('change outfit failed');
 ctx.clearRect(0,0,84,84);engine.draw(ctx,appearance,pose,42,65,{hidden:['body','hair','weapon']});const oldCoat=[...ctx.getImageData(23,20,1,1).data];
 ctx.clearRect(0,0,84,84);engine.draw(ctx,cfg,pose,42,65,{hidden:['body','hair','weapon']});const newCoat=[...ctx.getImageData(23,20,1,1).data];if(JSON.stringify(oldCoat)!=='[34,68,187,255]'||JSON.stringify(newCoat)!=='[170,34,17,255]')throw Error('visual equipment change not reflected');
 engine.draw(ctx,cfg,pose,42,65);const first=engine.stats().compositions;engine.draw(ctx,cfg,pose,42,65);if(engine.stats().compositions!==first)throw Error('cache failed');
 const stats=engine.stats();if(stats.cacheBytes>stats.maxCacheBytes||stats.cacheEntries>3)throw Error('unbounded cache');
 const empty=new Image(),blank=document.createElement('canvas');blank.width=336;blank.height=336;empty.src=blank.toDataURL();await empty.decode();images.set('empty',empty);hair.animations.idle.url='empty';engine.registerPiece(hair);const failure=engine.resolve(appearance,{animationId:'idle',direction:'south',frameIndex:0});if(!failure.missing.some(x=>x.code==='empty-frame'))throw Error('empty frames accepted');
 const fixed=blank.getContext('2d');fixed.fillStyle='#ff0000';for(let r=0;r<4;r++)for(let c=0;c<4;c++)fixed.fillRect(c*84+20,r*84+20,4,4);const staticImage=new Image();staticImage.src=blank.toDataURL();await staticImage.decode();images.set('static',staticImage);hair.animations.idle.url='static';engine.registerPiece(hair);if(!engine.resolve(appearance,{animationId:'idle',direction:'south',frameIndex:0}).missing.some(x=>x.code==='static-animation'))throw Error('static simulation accepted');
 const fallback=MarePaperDollCatalog.createRuntime({getImage:MareFactionSprites.image}),fallbackConfig=MarePaperDollCatalog.appearance({classId:'sword',factionId:'pirate',equipment:{}}),frame=MarePaperDollCatalog.sample(fallback,{classId:'sword',factionId:'pirate'},'attack','south',0),start=performance.now();for(let i=0;i<10000;i++)fallback.resolve(fallbackConfig,frame);const ms=performance.now()-start;
 return{fixture:'offscreen geometry only; not character art',poses:checked,cache:stats,fallback_resolves:10000,fallback_resolve_ms:ms};}''')
 rows.append(technical)
 fixture=q.evaluate('__geometryPack');files=[{'name':'geometry-only.json','mimeType':'application/json','buffer':json.dumps(fixture['manifest']).encode()}]+[{'name':f['name'],'mimeType':'image/png','buffer':base64.b64decode(f['base64'])}for f in fixture['files']]
 q.locator('#importPanel > summary').click();q.locator('#importPack').set_input_files(files);q.wait_for_function('__paperDollInspector.state().mode==="draft"');assert not q.evaluate('__paperDollInspector.state().artworkValidated');assert q.locator('#weapon').is_disabled();q.locator('[data-layer=weapon]').uncheck();assert 'weapon' in q.evaluate('__paperDollInspector.state().hidden');q.locator('#resetPack').click();assert q.evaluate('__paperDollInspector.state().mode')=='fallback' and q.locator('#weapon').is_enabled();c.close()
 c,q=new_page(b);game(q);q.locator('#characterName').fill('Nauta Paper Doll');q.locator('#nextToClass').click();q.locator('[data-class=sword]').click();q.locator('#nextToAppearance').click();q.locator('#createCharacter').click();q.locator('[data-confirm-accept]').click();q.clock.run_for(100);template=saved(q);book_def=diag(q)['hakiBookDef'];c.close()
 seed=copy.deepcopy(template);seed['inventory'].append({'id':'proto-sabre','def':1,'level':1,'plus':0,'rarity':'uncommon','locked':False,'obtainedAt':1})
 c,q=new_page(b,seed);game(q);q.locator('.bottom-nav [data-panel=inventory]').click();q.locator('[data-item=proto-sabre]').click();q.locator('[data-equip=proto-sabre]').click();assert diag(q)['paperDoll']['appearance']['pieces']['weapon']=='human-weapon-1'
 q.screenshot(path=str(OUT/'inventory-fallback.png'));q.locator('[data-inv-slot=weapon]').click();q.locator('[data-unequip=weapon]').click();assert diag(q)['paperDoll']['appearance']['pieces']['weapon']=='human-weapon-0';q.keyboard.press('Escape');q.reload();q.wait_for_function('typeof __mareDiagnostics==="function"');after=saved(q);assert after['equipment']['weapon'] is None;assert after['gold']==seed['gold'];assert after['name']==seed['name'];assert after.get('paperDollLook')==seed.get('paperDollLook');c.close()
 haki=copy.deepcopy(template);haki.update(level=50,hp=99999,has_haki_unlocked=True,haki={'current':100,'unlocked':True})
 c,q=new_page(b,haki);game(q);travel(q)
 if diag(q)['autoPlay']:q.locator('#autoToggle').click()
 q.keyboard.press('h');assert diag(q)['haki']['active']=='armament';q.clock.run_for(1000);assert diag(q)['haki']['current']<100;assert diag(q)['paperDoll']['compositions']==0;q.screenshot(path=str(OUT/'haki-fallback.png'));c.close()
 zoan=copy.deepcopy(template);zoan['equipment']['akuma_no_mi']={'id':'test-zoan','type':'akuma_no_mi','fruitId':'akuma_tori_albatroz','def':book_def+3,'level':1,'plus':0,'locked':False,'obtainedAt':1};zoan['zoanTransformed']=True;zoan['akumaCompendium']=['akuma_tori_albatroz']
 c,q=new_page(b,zoan);game(q);travel(q);q.clock.run_for(1000);zoan_diag=diag(q);zoan_save=saved(q);assert zoan_diag['paperDoll']['fallbacks']==0 and zoan_diag['combatAssetId'] is None, {'paperDoll':zoan_diag['paperDoll'],'combatAssetId':zoan_diag['combatAssetId'],'combat':zoan_diag['combat'],'transformed':zoan_save['zoanTransformed'],'equipped':zoan_diag['akuma']['equipped']};assert zoan_save['zoanTransformed'] and zoan_diag['akuma']['equipped']=='test-zoan';q.screenshot(path=str(OUT/'zoan-bypasses-paper-doll.png'));q.keyboard.press('t');q.clock.run_for(100);assert not saved(q)['zoanTransformed'];assert diag(q)['paperDoll']['fallbacks']>0;c.close()
 # Actual combat RAF intervals; this measures the fallback path, not a modular-art crowd.
 perf_seed=copy.deepcopy(template);perf_seed.update(level=10,hp=99999,potions=20)
 c,q=new_page(b,perf_seed,clock=False);game(q);travel(q)
 performance=q.evaluate('''async()=>{const intervals=[],end=performance.now()+1800;let last=performance.now();await new Promise(resolve=>{function frame(t){intervals.push(t-last);last=t;if(t<end)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)});const valid=intervals.filter(x=>x>0);valid.sort((a,b)=>a-b);return{sample_ms:1800,frames:valid.length,median_interval_ms:valid[Math.floor(valid.length/2)],p95_interval_ms:valid[Math.floor(valid.length*.95)],paperDoll:__mareDiagnostics().paperDoll,combat:__mareDiagnostics().combat};}''');q.screenshot(path=str(OUT/'combat-fallback.png'));rows.append({'test':'actual-combat-fallback-performance',**performance});assert performance['paperDoll']['compositions']==0;c.close()
 assert not errors,errors;b.close();(OUT/'results.json').write_text(json.dumps({'url':URL,'artwork_validated':False,'new_generations':0,'rows':rows,'errors':errors},indent=2),encoding='utf-8');print(json.dumps({'passed':True,'url':URL,'rows':rows,'errors':errors}),flush=True)
