// RAF is paused by this harness: prepareMap advances the real deferred navigation
// budget before drawing, without advancing gameplay or faking the map.
/* Current default lobby, HD source pixel parity and save isolation. Reference uses raw authored packs and compositor, not the runtime selector/cache. No fixture is written to the repository. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright');
const base=process.argv.find(a=>/^https?:/.test(a))||'http://127.0.0.1:8157/dist/';
const smoke=process.argv.includes('--smoke');
const output=process.argv.find(a=>a.startsWith('--evidence='))?.slice(11);
const hook=`window.__lobby96QA={prepareMap(){lastTime=performance.now();return mapArtState()==='ready'},get game(){return game},get runtime(){return lobby96},get hero(){return world.hero},save:saveGame,restore(value){game=JSON.parse(value)},draw(){presentWorld();drawVfxPanels()},panel(){openPanel('character');characterTab='appearance';renderPanel()},close:closePanel,enterHunt,returnLobby,stats:getDerived,step(dt){tick(dt);camera.update(combatFocus(),activeMap(),dt);presentWorld()},async pixels(action,direction,frame,count){if(!await lobby96.prepareVisual(game,{action,direction}))throw Error('HD clip unavailable');const c=document.createElement('canvas');c.width=c.height=512;const options={scene:'lobby',action,direction,progress:(frame+.25)/(count||8),x:256,y:400,worldView:true,consumer:'world'};const ok=lobby96.draw(c.getContext('2d'),game,options),s=lobby96.snapshot(),d=s.renderer==='rework-default-hd'?s.defaultHD?.last:s.nativeHD?.last;const alpha=c.getContext('2d').getImageData(0,0,512,512).data;return {ok,pose:d,renderer:s.renderer,pixels:alpha.filter((v,i)=>i%4===3&&v>0).length,png:c.toDataURL()};},async profiles(){const old=game,failures=[];try{for(const classId of Object.keys(classes))for(const factionId of Object.keys(factions)){game={...old,classId,factionId};for(const direction of ['south','north','west','east'])for(const action of ['idle','walk']){const p=await this.pixels(action,direction,0);if(!p.ok||p.pose?.state!=='rendered'||p.pixels<=100)failures.push({classId,factionId,direction,action,p});}}return failures;}finally{game=old;}}};
const observeLobbyDraw=lobby96.draw;lobby96.draw=function(c,p,o){const result=observeLobbyDraw(c,p,o);if(c===ctx&&o.consumer==='world'){const s=lobby96.snapshot();window.__lobby96World={renderer:s.renderer,pose:s.renderer==='rework-default-hd'?s.defaultHD?.last:s.nativeHD?.last};}return result;};`;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true}),context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await context.route('**/game.js*',async route=>{const response=await route.fetch(),source=await response.text();assert(source.includes('  window.__mareDiagnostics='));await route.fulfill({response,body:source.replace('  window.__mareDiagnostics=',hook+'\n  window.__mareDiagnostics=').replaceAll('requestAnimationFrame(frame)','window.__testFrame=frame')});});
  await context.route('**/api/akuma/catalog',r=>r.fulfill({status:404,body:'{}'}));
  await context.route('**/__dev_version',r=>r.fulfill({body:'stable'}));
  const go=async url=>{await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__lobby96QA&&__mareDiagnostics().lobby96.state!=='loading');};
  await go(base+'?paperDoll96=1');await page.waitForFunction(()=>__mareDiagnostics().lobby96.state==='ready');
  await page.locator('#characterName').fill('Revisão96');await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();
  assert(await page.evaluate(()=>__lobby96QA.runtime.ensure(__lobby96QA.game)));
  await page.waitForFunction(()=>__lobby96QA.prepareMap());
  const first=await page.evaluate(()=>__lobby96QA.pixels('idle','south',0));assert.equal(first.pose.state,'rendered');assert(first.pixels>100);await page.waitForFunction(()=>{__lobby96QA.draw();return window.__lobby96World?.pose?.state==='rendered';},null,{timeout:90000});assert(['native-hd','rework-default-hd'].includes(await page.evaluate(()=>__lobby96World.renderer)));
  const initial=await page.evaluate(()=>JSON.stringify(__lobby96QA.game)),saved=await page.evaluate(()=>localStorage.getItem('mare-partida-save-v1'));
  // The editor is a draft; only explicit confirmation can replace saved appearance.
  await page.evaluate(()=>__lobby96QA.panel());
  await page.locator('#profile-gender').selectOption('feminino');await page.locator('#profile-skinColor').selectOption('ebony');
  assert.equal(await page.evaluate(()=>JSON.stringify(__lobby96QA.game)),initial);
  assert.equal(await page.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),saved);
  await page.locator('[data-appearance-cancel]').click();assert.equal(await page.locator('#profile-gender').inputValue(),'masculino');
  await page.evaluate(()=>__lobby96QA.close());
  // Independent oracle: raw original packs, PNG archive loader and low-level compositor.
  // The synthetic face-calm look below is unsupported by HD, so authorized bare/original is expected.
  await page.evaluate(async()=>{
   const index=await (await fetch('tools/rework-base-hd/index.json')).json(),archive=await (await fetch('tools/rework-base-hd/archives/archive-index.json')).json();
   const assets=MareReworkHDAssets.create(archive,{baseURL:location.href});
   window.__rawHD={record(body,action,direction){return index.records.find(r=>r.body===(body==='feminino'?'female':'male')&&r.action===action&&r.direction===direction&&r.hairStyle==='original');},async pixels(body,action,direction,frame){const r=this.record(body,action,direction);if(!r)throw Error('Missing authored original reference');const pack=r.pack,d=pack.directions[direction],images=new Map();for(const l of d.layers){const sha=l.frames?.[frame]||l.source;if(sha&&!images.has(sha))images.set(sha,await assets.load('tools/rework-base-hd/assets/'+sha+'.png'));}const c=document.createElement('canvas');c.width=pack.frame.width*pack.density;c.height=pack.frame.height*pack.density;ReworkAccessoryVendor.compositor.render(c.getContext('2d'),pack,images,{direction,frame,density:pack.density});let source=c;if(r.mirrorX){source=document.createElement('canvas');source.width=c.width;source.height=c.height;const m=source.getContext('2d');m.imageSmoothingEnabled=false;m.translate(c.width,0);m.scale(-1,1);m.drawImage(c,0,0);}const target=document.createElement('canvas');target.width=target.height=512;const x=target.getContext('2d'),scale=105/374;x.imageSmoothingEnabled=false;x.drawImage(source,256-pack.pivot.x*pack.density*scale,400-pack.pivot.y*pack.density*scale,c.width*scale,c.height*scale);return target.toDataURL();}};
  });
  let pixels=0;
  for(const body of (smoke?['feminino']:['masculino','feminino']))for(const kit of (smoke?['base']:['base','armored'])){
   await page.evaluate(async({body,kit})=>{const q=__lobby96QA; q.game.appearance96={...MareCharacterAppearance.read(q.game),gender:body,hairStyle:'hair-wavy',eyeStyle:'face-calm',skinColor:'dark',hairColor:'black'};q.game.equipment={...q.game.equipment,coat:kit==='armored'?{def:6}:null,legs:kit==='armored'?{def:21}:null,head:null};await q.runtime.ensure(q.game);},{body,kit});
   for(const action of ['idle','walk'])for(const dir of ['south','north','east','west']){
    const source=await page.evaluate(({body,action,dir})=>{const r=__rawHD.record(body,action,dir);return {id:r.id,count:r.pack.directions[dir].clip.frames};},{body,action,dir});
    for(let frame=0;frame<(smoke?1:source.count);frame++){
    const actual=await page.evaluate(({action,dir,frame,count})=>__lobby96QA.pixels(action,dir,frame,count),{action,dir,frame,count:source.count});
    assert(actual.ok&&actual.pixels>100,`${body}/${kit}/${action}/${dir}/${frame}: visible HD source`);
    assert.equal(actual.pose.state,'rendered');assert(['native-hd','rework-default-hd'].includes(actual.renderer));assert.equal(actual.pose.sourceScale,1);assert.equal(actual.pose.physicalScale,105/374);assert(actual.pose.width>=512&&actual.pose.height>=512,'native source pixels preserved');
    assert.equal(actual.pose.frame,frame,'every authored frame is covered');assert(actual.pose.source.startsWith(source.id+':'),'runtime uses the expected original source');
    const expected=await page.evaluate(({body,action,dir,frame})=>__rawHD.pixels(body,action,dir,frame),{body,action,dir,frame});assert.equal(actual.png,expected,`${body}/${kit}/${action}/${dir}/${frame}: native pixels match independent raw pack composition`);
    const repeated=await page.evaluate(({action,dir,frame,count})=>__lobby96QA.pixels(action,dir,frame,count),{action,dir,frame,count:source.count});assert.equal(actual.png,repeated.png,'same authored state remains pixel-exact on repeated draw');pixels++;
    }
   }
  }
  assert.deepEqual(await page.evaluate(()=>__lobby96QA.profiles()),[]);console.log('native-HD-lobby:pixels='+pixels+',profiles=28');
  // Every attack can be rehearsed in the real appearance window without entering combat.
  let attackPreviews=0;
  for(const body of (smoke?['feminino']:['masculino','feminino'])){
   await page.evaluate(async body=>{const q=__lobby96QA;q.game.appearance96.gender=body;await q.runtime.ensure(q.game);},body);
   for(const action of (smoke?['attack-sword']:['attack-sword','attack-unarmed','attack-firearm','attack-daggers','attack-focus','attack-tech']))for(const direction of ['south','north','east','west']){
    await page.waitForFunction(({action,direction})=>{const c=document.createElement('canvas');c.width=c.height=320;return __lobby96QA.runtime.preview(c.getContext('2d'),__lobby96QA.game,{action,direction,time:.3,appearance:__lobby96QA.game.appearance96});},{action,direction},{timeout:30000});attackPreviews++;
   }
  }
  console.log('native-HD-lobby:attack-previews='+attackPreviews);
  // Restore synthetic look sweeps before real travel, which intentionally saves.
  await page.evaluate(async initial=>{__lobby96QA.restore(initial);const q=__lobby96QA;await q.runtime.ensure(q.game);q.close();q.draw();},initial);
  // Real movement input and collisions use the existing navigator and gait clock.
  const start=await page.evaluate(()=>({...__lobby96QA.hero}));await page.keyboard.down('d');
  for(let i=0;i<10;i++)await page.evaluate(()=>__lobby96QA.step(.05));await page.keyboard.up('d');
  const moved=await page.evaluate(()=>({...__lobby96QA.hero}));assert(Math.hypot(moved.x-start.x,moved.y-start.y)>1,'real manual movement');
  assert.equal(await page.evaluate(()=>__mareDiagnostics().walkable),true);
  await page.evaluate(()=>__lobby96QA.step(.05));
  if(output){await fs.mkdir(output,{recursive:true});for(const [width,height]of [[1920,1080],[1366,768],[1280,720]]){await page.setViewportSize({width,height});await page.evaluate(()=>new Promise(requestAnimationFrame));await page.evaluate(()=>__lobby96QA.draw());await page.evaluate(()=>new Promise(requestAnimationFrame));await page.screenshot({path:path.join(output,`lobby-${width}.png`)});}await page.evaluate(()=>__lobby96QA.panel());await page.waitForFunction(()=>{__lobby96QA.draw();return document.getElementById('profileAppearanceState')?.textContent.includes('Prévia');});await page.screenshot({path:path.join(output,'editor.png')});}
  await page.evaluate(()=>__lobby96QA.panel());
  for(const [width,height]of [[1920,1080],[1366,768],[1280,720],[1024,768],[393,852],[360,800],[320,568],[852,393]]){
   await page.setViewportSize({width,height});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`viewport ${width}`);
   assert(await page.locator('#profile-gender').isVisible());
   await page.locator('[data-appearance-apply]').scrollIntoViewIfNeeded();const box=await page.locator('[data-appearance-apply]').boundingBox();assert(box&&box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=height,`reachable apply at ${width}`);
   await page.locator('#profile-gender').scrollIntoViewIfNeeded();
   if(output&&width===393)await page.screenshot({path:path.join(output,'editor-mobile.png')});
  }
  await page.evaluate(()=>__lobby96QA.close());
  // Zoans stay on their renderer; supported sword/rogue hunts use the HD replacement.
  assert.equal(await page.evaluate(()=>{const c=document.createElement('canvas');return __lobby96QA.runtime.draw(c.getContext('2d'),{...__lobby96QA.game,zoanTransformed:true},{scene:'lobby'});}),false);
  await page.evaluate(()=>__lobby96QA.enterHunt());await page.waitForFunction(()=>__lobby96QA.prepareMap());const count=await page.evaluate(()=>__mareDiagnostics().lobby96.draws);
  await page.evaluate(()=>__lobby96QA.draw());assert(await page.evaluate(()=>__mareDiagnostics().lobby96.draws)>count,'sword/rogue combat invokes the replacement renderer');
  await page.evaluate(()=>__lobby96QA.returnLobby());assert(await page.evaluate(()=>__lobby96QA.runtime.ensure(__lobby96QA.game)));await page.evaluate(()=>__lobby96QA.draw());
  const stats=await page.evaluate(()=>__mareDiagnostics().lobby96);assert(stats.images<=192&&stats.imageBytes<=64*1024*1024&&stats.bundles<=2&&stats.previews<=8&&stats.peakLoads<=6,JSON.stringify(stats));
  // Test-only memory edits never persist; the confirmed save remains authoritative.
  await go(base+'?paperDoll96=1');await page.waitForFunction(()=>__mareDiagnostics().lobby96.state==='ready');
  assert.equal(await page.evaluate(()=>__mareDiagnostics().lobby96.look.body),'masculino');
  // Missing HD index must not display retired sprites, even when legacy assets exist.
  await context.route('**/tools/rework-base-hd/index.json*',r=>r.fulfill({status:503,body:'{}'}));
  await go(base+'?paperDoll96=1');await page.waitForFunction(()=>__mareDiagnostics().lobby96.nativeHD.state==='failed');
  assert(await page.evaluate(()=>!!__mareDiagnostics().lobby96.nativeHD.error));
  await page.waitForFunction(()=>__lobby96QA.prepareMap());
  await page.evaluate(()=>__lobby96QA.draw());assert.notEqual(await page.evaluate(()=>__mareDiagnostics().lobby96.defaultHD.last?.state),'rendered');assert.equal(await page.evaluate(()=>__mareDiagnostics().lobby96.lastPose),null,'missing HD cannot reactivate legacy body');
  assert.equal(await page.evaluate(()=>__mareDiagnostics().paperDollReview.draws),0);
  await context.unroute('**/tools/rework-base-hd/index.json*');
  // An obsolete opt-out query cannot restore a retired player renderer.
  let requests=0;page.on('request',r=>{if(r.url().includes('tools/paper-doll-96-v3/'))requests++;});await go(base+'?paperDoll96=0');
  assert.equal(await page.evaluate(()=>__mareDiagnostics().lobby96.state),'ready');assert(requests>0);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({pixels,profiles:28,attackPreviews,viewports:8,peakLoads:stats.peakLoads,cache:{images:stats.images,bundles:stats.bundles,previews:stats.previews},saveIsolation:true,missingHDIndexBlocksLegacy:true,normalRequests:requests,errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
