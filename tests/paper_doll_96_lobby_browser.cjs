/* Real lobby opt-in, native pixel parity and save isolation. No fixture is written to the repository. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright');
const base=process.argv.find(a=>/^https?:/.test(a))||'http://127.0.0.1:8157/dist/';
const smoke=process.argv.includes('--smoke');
const output=process.argv.find(a=>a.startsWith('--evidence='))?.slice(11);
const hook=`window.__lobby96QA={get game(){return game},get runtime(){return lobby96},get hero(){return world.hero},save:saveGame,draw(){presentWorld();drawVfxPanels()},panel(){openPanel('character');characterTab='appearance';renderPanel()},close:closePanel,enterHunt,returnLobby,stats:getDerived,step(dt){tick(dt);camera.update(combatFocus(),activeMap(),dt);presentWorld()},pixels(action,direction,frame){const c=document.createElement('canvas');c.width=c.height=512;const ok=lobby96.draw(c.getContext('2d'),game,{scene:'lobby',action,direction,time:frame/(action==='idle'?4:8)+.000001,x:256,y:400,scale:null,worldView:true});if(!ok)throw Error('96px frame unavailable');return c.toDataURL()},async profiles(){const old=game,failures=[];try{for(const classId of Object.keys(classes))for(const factionId of Object.keys(factions)){game={...old,classId,factionId};await lobby96.ensure(game);for(const dir of ['south','north','west','east'])for(const action of ['idle','walk']){const c=document.createElement('canvas');c.width=c.height=128;if(!lobby96.draw(c.getContext('2d'),game,{scene:'lobby',action,direction:dir,x:64,y:112}))failures.push({classId,factionId,dir,action});}}return failures;}finally{game=old;}}};`;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true}),context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await context.route('**/game.js*',async route=>{const response=await route.fetch(),source=await response.text();assert(source.includes('  window.__mareDiagnostics='));await route.fulfill({response,body:source.replace('  window.__mareDiagnostics=',hook+'\n  window.__mareDiagnostics=').replaceAll('requestAnimationFrame(frame)','window.__testFrame=frame')});});
  await context.route('**/api/akuma/catalog',r=>r.fulfill({status:404,body:'{}'}));
  await context.route('**/__dev_version',r=>r.fulfill({body:'stable'}));
  const go=async url=>{await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__lobby96QA&&__mareDiagnostics().paperDollReview.state==='ready');};
  await go(base+'?paperDoll96=1');await page.waitForFunction(()=>__mareDiagnostics().lobby96.state==='ready');
  await page.locator('#characterName').fill('Revisão96');await page.locator('#nextToClass').click();await page.locator('#createCharacter').click();
  assert(await page.evaluate(()=>__lobby96QA.runtime.ensure(__lobby96QA.game)));
  await page.evaluate(()=>__lobby96QA.draw());assert.equal(await page.evaluate(()=>__mareDiagnostics().lobby96.lastPose.action),'idle');
  const initial=await page.evaluate(()=>JSON.stringify(__lobby96QA.game)),saved=await page.evaluate(()=>localStorage.getItem('mare-partida-save-v1'));
  await page.evaluate(()=>__lobby96QA.panel());
  await page.locator('[data-lobby96-look=body]').selectOption('feminino');await page.locator('[data-lobby96-look=skin]').selectOption('ebony');
  await page.locator('[data-lobby96-look=hair]').selectOption('hair-braided');await page.locator('[data-lobby96-look=kit]').selectOption('sample-b');
  await page.locator('[data-lobby96-apply]').click();assert(await page.evaluate(()=>__lobby96QA.runtime.ensure(__lobby96QA.game)));
  await page.evaluate(()=>__lobby96QA.draw());
  assert.equal(await page.evaluate(()=>__mareDiagnostics().lobby96.look.body),'feminino');
  assert.equal(await page.evaluate(()=>JSON.stringify(__lobby96QA.game)),initial,'visual apply must not modify game state');
  assert.equal(await page.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),saved,'visual apply must not modify the save');
  assert(!(await page.evaluate(()=>localStorage.getItem('mare-partida-dev-save-v1'))));
  await page.locator('[data-lobby96-look=body]').selectOption('masculino');await page.locator('[data-lobby96-cancel]').click();
  assert.equal(await page.locator('[data-lobby96-look=body]').inputValue(),'feminino');
  const bench=await context.newPage();await bench.goto(new URL('tools/paper-doll-96-v3/',base).href,{waitUntil:'networkidle'});await bench.waitForFunction(()=>window.__review96v3);
  let pixels=0;
  for(const body of (smoke?['feminino']:['masculino','feminino']))for(const kit of (smoke?['sample-a']:['sample-a','sample-b'])){
   await page.evaluate(async({body,kit})=>{const r=__lobby96QA.runtime;for(const [key,value]of Object.entries({body,kit,hair:'hair-wavy',face:'face-calm',skin:'dark',hairColor:'black'}))r.setDraft(key,value);r.apply(__lobby96QA.game);await r.ensure(__lobby96QA.game);},{body,kit});
   const look=await page.evaluate(()=>__lobby96QA.runtime.resolve(__lobby96QA.game).look);
   for(const action of ['idle','walk'])for(const dir of ['south','north','east','west'])for(let frame=0;frame<(smoke?1:action==='idle'?4:8);frame++){
    const actual=await page.evaluate(({action,dir,frame})=>__lobby96QA.pixels(action,dir,frame),{action,dir,frame});
    const expected=await bench.evaluate(async({body,action,dir,frame,look})=>{const img=await __review96v3.render(body,action,dir,frame,[],look),c=document.createElement('canvas');c.width=c.height=512;c.getContext('2d').drawImage(img,256-img.mareSpec.pivot.x,400-img.mareSpec.pivot.y);return c.toDataURL();},{body,action,dir,frame,look});
    assert.equal(actual,expected,`${body}/${kit}/${action}/${dir}/${frame}: pixels must match the audited bench`);pixels++;
   }
  }
  assert.deepEqual(await page.evaluate(()=>__lobby96QA.profiles()),[]);
  // Every attack can be rehearsed in the real appearance window without entering combat.
  let attackPreviews=0;
  for(const body of (smoke?['feminino']:['masculino','feminino'])){
   await page.evaluate(body=>__lobby96QA.runtime.setDraft('body',body),body);
   for(const action of (smoke?['attack-sword']:['attack-sword','attack-unarmed','attack-firearm','attack-daggers','attack-focus','attack-tech']))for(const direction of ['south','north','east','west']){
    await page.waitForFunction(({action,direction})=>{const c=document.createElement('canvas');c.width=c.height=320;return __lobby96QA.runtime.preview(c.getContext('2d'),__lobby96QA.game,{action,direction,time:.3});},{action,direction},{timeout:30000});attackPreviews++;
   }
  }
  await bench.close();
  await page.evaluate(async()=>{const r=__lobby96QA.runtime;for(const [k,v]of Object.entries({body:'feminino',hair:'hair-wavy',skin:'brown',hairColor:'brown',kit:'sample-a'}))r.setDraft(k,v);r.apply(__lobby96QA.game);await r.ensure(__lobby96QA.game);__lobby96QA.close();__lobby96QA.draw();});
  // Real movement input and collisions use the existing navigator and gait clock.
  const start=await page.evaluate(()=>({...__lobby96QA.hero}));await page.keyboard.down('d');
  for(let i=0;i<10;i++)await page.evaluate(()=>__lobby96QA.step(.05));await page.keyboard.up('d');
  const moved=await page.evaluate(()=>({...__lobby96QA.hero}));assert(Math.hypot(moved.x-start.x,moved.y-start.y)>1,'real manual movement');
  assert.equal(await page.evaluate(()=>__mareDiagnostics().walkable),true);
  await page.evaluate(()=>__lobby96QA.step(.05));
  if(output){await fs.mkdir(output,{recursive:true});for(const [width,height]of [[1920,1080],[1366,768],[1280,720]]){await page.setViewportSize({width,height});await page.evaluate(()=>new Promise(requestAnimationFrame));await page.evaluate(()=>__lobby96QA.draw());await page.evaluate(()=>new Promise(requestAnimationFrame));await page.screenshot({path:path.join(output,`lobby-${width}.png`)});}await page.evaluate(()=>__lobby96QA.panel());await page.waitForFunction(()=>{__lobby96QA.draw();return document.getElementById('lobby96State')?.textContent.startsWith('Prévia');});await page.screenshot({path:path.join(output,'editor.png')});}
  await page.evaluate(()=>__lobby96QA.panel());
  for(const [width,height]of [[1920,1080],[1366,768],[1280,720],[1024,768],[393,852],[360,800],[320,568],[852,393]]){
   await page.setViewportSize({width,height});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`viewport ${width}`);
   assert(await page.locator('[data-lobby96-look=body]').isVisible());
   await page.locator('[data-lobby96-apply]').scrollIntoViewIfNeeded();const box=await page.locator('[data-lobby96-apply]').boundingBox();assert(box&&box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=height,`reachable apply at ${width}`);
   await page.locator('[data-lobby96-look=body]').scrollIntoViewIfNeeded();
   if(output&&width===393)await page.screenshot({path:path.join(output,'editor-mobile.png')});
  }
  await page.evaluate(()=>__lobby96QA.close());
  // Zoans stay on their renderer; supported sword/rogue hunts use prepared96.
  assert.equal(await page.evaluate(()=>{const c=document.createElement('canvas');return __lobby96QA.runtime.draw(c.getContext('2d'),{...__lobby96QA.game,zoanTransformed:true},{scene:'lobby'});}),false);
  await page.evaluate(()=>__lobby96QA.enterHunt());const count=await page.evaluate(()=>__mareDiagnostics().lobby96.draws);
  await page.evaluate(()=>__lobby96QA.draw());assert(await page.evaluate(()=>__mareDiagnostics().lobby96.draws)>count,'sword/rogue combat uses the prepared96 renderer');
  await page.evaluate(()=>__lobby96QA.returnLobby());assert(await page.evaluate(()=>__lobby96QA.runtime.ensure(__lobby96QA.game)));await page.evaluate(()=>__lobby96QA.draw());
  const stats=await page.evaluate(()=>__mareDiagnostics().lobby96);assert(stats.images<=48&&stats.bundles<=2&&stats.previews<=8&&stats.peakLoads<=6,JSON.stringify(stats));
  // Reload discards the session appearance; the existing v1 save remains authoritative.
  await go(base+'?paperDoll96=1');await page.waitForFunction(()=>__mareDiagnostics().lobby96.state==='ready');
  assert.equal(await page.evaluate(()=>__mareDiagnostics().lobby96.look.body),'masculino');
  // Missing review data must leave the approved player intact, with a visible error.
  await context.route('**/tools/paper-doll-96-v3/manifest.json',r=>r.fulfill({status:503,body:'{}'}));
  await go(base+'?paperDoll96=1');await page.waitForFunction(()=>__mareDiagnostics().lobby96.state==='failed');
  assert((await page.evaluate(()=>__mareDiagnostics().lobby96.message)).includes('Visual anterior preservado'));
  await page.evaluate(()=>__lobby96QA.draw());assert.equal(await page.evaluate(()=>__mareDiagnostics().lobby96.draws),0);
  assert(await page.evaluate(()=>__mareDiagnostics().paperDollReview.draws)>0);
  await context.unroute('**/tools/paper-doll-96-v3/manifest.json');
  // Explicit legacy rollback requests no native96 assets. The default release is covered by headgear_visibility_browser.
  let requests=0;page.on('request',r=>{if(r.url().includes('tools/paper-doll-96-v3/'))requests++;});await go(base+'?paperDoll96=0');
  assert.equal(await page.evaluate(()=>__mareDiagnostics().lobby96.state),'off');assert.equal(requests,0);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({pixels,profiles:28,attackPreviews,viewports:8,peakLoads:stats.peakLoads,cache:{images:stats.images,bundles:stats.bundles,previews:stats.previews},saveIsolation:true,missingManifestFallback:true,normalRequests:requests,errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
