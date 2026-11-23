// RAF is paused by this harness: prepareMap advances the real deferred navigation
// budget before drawing, without advancing gameplay or faking the map.
/* Current default lobby, HD source pixel parity and save isolation. Reference uses raw authored packs and compositor, not the runtime selector/cache. No fixture is written to the repository. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright');
const base=process.argv.find(a=>/^https?:/.test(a))||process.env.MARE_TEST_URL||'http://127.0.0.1:8157/dist/';
const smoke=process.argv.includes('--smoke');
const output=process.argv.find(a=>a.startsWith('--evidence='))?.slice(11);
const hook=`window.__lobby96QA={prepareMap(){lastTime=performance.now();if(mapArtState()!=='ready')return false;presentWorld();return lobby96.worldReady(game)},get game(){return game},get runtime(){return lobby96},get hero(){return world.hero},save:saveGame,restore(value){game=JSON.parse(value)},draw(){presentWorld();drawVfxPanels()},panel(){openPanel('character');characterTab='appearance';renderPanel()},close:closePanel,enterHunt,returnLobby,stats:getDerived,step(dt){tick(dt);camera.update(combatFocus(),activeMap(),dt);presentWorld()},async pixels(action,direction,frame,count){if(!await lobby96.prepareVisual(game,{action,direction,consumer:'archive-probe'}))throw Error('HD clip unavailable');const c=document.createElement('canvas');c.width=c.height=512;const options={scene:'lobby',action,direction,progress:(frame+.25)/(count||8),x:256,y:400,worldView:true,consumer:'archive-probe'};const cx=c.getContext('2d'),paint=cx.drawImage.bind(cx);cx.drawImage=(im,...bounds)=>{window.__lobbyNativeFrame=im;window.__lobbyPlacement=bounds;return paint(im,...bounds);};const ok=lobby96.draw(cx,game,options),s=lobby96.snapshot(),d=s.renderer==='rework-default-hd'?s.defaultHD?.last:s.nativeHD?.last;const alpha=c.getContext('2d').getImageData(0,0,512,512).data;return {ok,pose:d,renderer:s.renderer,pixels:alpha.filter((v,i)=>i%4===3&&v>0).length,png:c.toDataURL()};},async profiles(){const old=game,failures=[];try{for(const classId of Object.keys(classes))for(const factionId of Object.keys(factions)){game={...old,classId,factionId};for(const direction of ['south','north','west','east'])for(const action of ['idle','walk']){const p=await this.pixels(action,direction,0);if(!p.ok||p.pose?.state!=='rendered'||p.pixels<=100)failures.push({classId,factionId,direction,action,p});}}return failures;}finally{game=old;}}};
const observeLobbyDraw=lobby96.draw;lobby96.draw=function(c,p,o){const result=observeLobbyDraw(c,p,o);if(c===ctx&&o.consumer==='world'){const s=lobby96.snapshot();window.__lobby96World={renderer:s.renderer,pose:s.lastPose||(s.renderer==='rework-default-hd'?s.defaultHD?.last:s.nativeHD?.last),draws:(window.__lobby96World?.draws||0)+(result?1:0)};}return result;};`;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true}),context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await context.route('**/game.js*',async route=>{const response=await route.fetch(),source=await response.text();assert(source.includes('  window.__mareDiagnostics='));await route.fulfill({response,body:source.replace('  window.__mareDiagnostics=',hook+'\n  window.__mareDiagnostics=').replaceAll('requestAnimationFrame(frame)','window.__testFrame=frame')});});
  await context.route('**/api/akuma/catalog',r=>r.fulfill({status:404,body:'{}'}));
  await context.route('**/__dev_version',r=>r.fulfill({body:'stable'}));
  const go=async url=>{await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__lobby96QA&&__mareDiagnostics().lobby96.state!=='loading');};
  await go(base+'?paperDoll96=1');await page.waitForFunction(()=>__mareDiagnostics().lobby96.state==='ready',null,{timeout:90000});
  await page.locator('#characterName').fill('Revisão96');await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();
  await page.waitForFunction(()=>__lobby96QA.game);
  assert(await page.evaluate(()=>__lobby96QA.runtime.ensure(__lobby96QA.game)));
  await page.waitForFunction(()=>__lobby96QA.prepareMap(),null,{timeout:90000});
  const first=await page.evaluate(()=>__lobby96QA.pixels('idle','south',0));assert.equal(first.pose.state,'rendered');assert(first.pixels>100);await page.waitForFunction(()=>{__lobby96QA.draw();return window.__lobby96World?.pose?.state==='rendered';},null,{timeout:90000});assert(['native96','native-hd','rework-default-hd'].includes(await page.evaluate(()=>__lobby96World.renderer)));assert.equal(await page.evaluate(()=>__lobby96QA.runtime.worldVisual().state),'ready','World renders the current pose');
  const initial=await page.evaluate(()=>JSON.stringify(__lobby96QA.game)),saved=await page.evaluate(()=>localStorage.getItem('mare-partida-save-v1'));
  // The editor is a draft; only explicit confirmation can replace saved appearance.
  await page.evaluate(()=>__lobby96QA.panel());
  await page.locator('#profile-gender').selectOption('feminino');await page.locator('#profile-skinColor').selectOption('ebony');
  assert.equal(await page.evaluate(()=>JSON.stringify(__lobby96QA.game)),initial);
  assert.equal(await page.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),saved);
  await page.locator('[data-appearance-cancel]').click();assert.equal(await page.locator('#profile-gender').inputValue(),'masculino');
  await page.evaluate(()=>__lobby96QA.close());
  // Independent oracle: raw original packs, PNG archive loader and low-level compositor.
  // Unknown combinations must fail without publishing a replacement actor.
  // Supported coats/pants now retain their authored pixels and cannot be used as bare-body fixtures.
  await page.evaluate(async()=>{
   const json=url=>fetch(url).then(r=>r.json());
   const [index,archive,north,profile]=await Promise.all(['tools/rework-base-hd/index.json',
    'tools/rework-base-hd/archives/archive-index.json','tools/rework-female-north-rig/index.json',
    'tools/rework-female-profile-rig/index.json'].map(json));
   const archiveImages=MareReworkHDAssets.create(archive,{baseURL:location.href});
   const profileImages=MareReworkHDAssets.create(profile.archiveIndex,{baseURL:location.href,prefix:'tools/rework-female-profile-rig/archives/'});
   const canvas=(width=512,height=width)=>Object.assign(document.createElement('canvas'),{width,height});
   const loose=async url=>{const im=new Image();im.src=url;await im.decode();return im;};
   window.__rawHD={
    record(body,action,direction){return index.records.find(r=>r.body===(body==='feminino'?'female':'male')&&r.action===action&&r.direction===direction&&r.hairStyle==='original');},
    clip(body,action,direction){const r=this.record(body,action,direction),special=body==='feminino'&&action==='walk'&&direction!=='south';
     if(!special)return {id:r.id,count:r.pack.directions[direction].clip.frames};
     if(direction==='north')return {id:'authored-north-layered:null:null:',base:north.bodyRecord,count:north.frameToPhase.length};
     return {id:'profile-separated-candidate:null:null:',base:profile.directions[direction].sourceId,count:profile.directions[direction].clock.length};},
    async pixels(body,action,direction,tick){
     const r=this.record(body,action,direction),pack=r.pack,d=pack.directions[direction],clip=this.clip(body,action,direction);
     const profileDir=clip.base&&direction!=='north'?profile.directions[direction]:null;
     if(clip.base&&clip.base!==r.id)throw Error('Wrong source for contact poses');
     const phaseIndex=profileDir?profileDir.clock[tick]:north.frameToPhase[tick];
     const frame=clip.base?(profileDir?profile:north).phaseMap[phaseIndex]:tick;
     const images=new Map();
     for(const layer of d.layers){const sha=layer.frames?.[frame]||layer.source;
      if(sha&&!images.has(sha))images.set(sha,await archiveImages.load('tools/rework-base-hd/assets/'+sha+'.png'));}
     const c=canvas(pack.frame.width*pack.density,pack.frame.height*pack.density),ctx=c.getContext('2d');
     const render=layers=>ReworkAccessoryVendor.compositor.render(ctx,{...pack,directions:{...pack.directions,
      [direction]:{...d,layers}}},images,{direction,frame,density:pack.density});
     if(profileDir){
      const contact=profileDir.poses[phaseIndex];
      for(const l of [...contact.layers].sort((a,b)=>a.id-b.id))ctx.drawImage(await profileImages.load(l.source),0,0);
      // The actor's head remains on top of the directed contact layers.
      const head=canvas(c.width),headCtx=head.getContext('2d'),layers=d.layers.filter(l=>['headBase','face','hair'].includes(l.slot));
      ReworkAccessoryVendor.compositor.render(headCtx,{...pack,directions:{[direction]:{...d,layers}}},images,{direction,frame,density:pack.density});
      ctx.drawImage(head,0,0);
     }else{
      if(clip.base){
       const leg=d.layers.find(l=>l.id==='legs').frames[frame],arm=d.layers.find(l=>l.id==='arms').frames[frame];
       images.set(leg,await loose(north.legs[phaseIndex]));
       const arms=canvas(),ax=arms.getContext('2d'),mask=canvas(),mx=mask.getContext('2d');
       ax.drawImage(images.get(arm),0,0);mx.drawImage(await loose(north.armOcclusion[phaseIndex]),0,0);
       const rgba=ax.getImageData(0,0,512,512),owner=mx.getImageData(0,0,512,512).data;
       for(let i=0;i<owner.length;i+=4)if(owner[i])rgba.data.fill(0,i,i+4);
       ax.putImageData(rgba,0,0);images.set(arm,arms);
      }
      render(d.layers);
     }
     let source=c;
     if(r.mirrorX){source=canvas(c.width,c.height);const m=source.getContext('2d');m.imageSmoothingEnabled=false;m.translate(c.width,0);m.scale(-1,1);m.drawImage(c,0,0);}
     const target=canvas(),x=target.getContext('2d'),scale=105/374;x.imageSmoothingEnabled=false;
     window.__rawLobbyFrame=source;x.drawImage(source,256-pack.pivot.x*pack.density*scale,400-pack.pivot.y*pack.density*scale,c.width*scale,c.height*scale);return target.toDataURL();
    }};
  });
  let pixels=0;
  for(const body of (smoke?['feminino']:['masculino','feminino'])){
   const kit='base';
   const failure=await page.evaluate(async body=>{
    const q=__lobby96QA,p={...q.game,appearance96:{...MareCharacterAppearance.read(q.game),gender:body,hairStyle:'future-unregistered-style'},
     equipment:{coat:{def:999998},legs:{def:999999}}};
    const before=JSON.stringify(p.appearance96),entry=q.runtime.requestWorldVisual(p,{action:'idle',direction:'south',consumer:'world'});
    await entry.promise;
    return {state:entry.state,published:!!entry.bundle,saved:JSON.stringify(p.appearance96)===before};
   },body);
   assert.deepEqual(failure,{state:'failed',published:false,saved:true},'an unregistered look has no replacement world frame');
   await page.evaluate(async body=>{
    const q=__lobby96QA;q.game.appearance96={...MareCharacterAppearance.read(q.game),gender:body,hairStyle:'original',
     eyeStyle:'original',eyeColor:'original',skinColor:'original',hairColor:'original'};
    q.game.equipment={};await q.runtime.ensure(q.game);
   },body);
   for(const action of ['idle','walk'])for(const dir of ['south','north','east','west']){
    const source=await page.evaluate(({body,action,dir})=>__rawHD.clip(body,action,dir),{body,action,dir});
    for(let frame=0;frame<(smoke?1:source.count);frame++){
    const actual=await page.evaluate(({action,dir,frame,count})=>__lobby96QA.pixels(action,dir,frame,count),{action,dir,frame,count:source.count});
    assert(actual.ok&&actual.pixels>100,`${body}/${kit}/${action}/${dir}/${frame}: visible HD source`);
    assert.equal(actual.pose.state,'rendered');assert(['native-hd','rework-default-hd'].includes(actual.renderer));assert.equal(actual.pose.sourceScale,1);assert.equal(actual.pose.physicalScale,105/374);assert(actual.pose.width>=512&&actual.pose.height>=512,'native source pixels preserved');
    assert.equal(actual.pose.frame,frame,JSON.stringify({body,kit,action,dir,frame,count:source.count,pose:actual.pose.source,runtimeFrames:actual.pose.frames}));assert(source.base?actual.pose.source.startsWith(source.id):actual.pose.source===source.id||actual.pose.source.startsWith(source.id+':'),JSON.stringify({message:'runtime uses the expected original source',body,kit,action,dir,frame,actual:actual.pose.source,expected:source.id}));
    const expected=await page.evaluate(({body,action,dir,frame})=>__rawHD.pixels(body,action,dir,frame),{body,action,dir,frame});if(source.base&&dir!=='north'){
     const delta=await page.evaluate(()=>{
      const read=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data,a=read(__lobbyNativeFrame),b=read(__rawLobbyFrame);
      let alpha=0,color=0;for(let i=0;i<a.length;i+=4){
       if(a[i+3]!==b[i+3])alpha++;
       for(let j=0;j<3;j++)if(Math.round(a[i+j]*a[i+3]/255)!==Math.round(b[i+j]*b[i+3]/255))color++;
      }
      return {alpha,color,placement:__lobbyPlacement};
     });
     assert.equal(delta.alpha,0,'profile silhouette matches the original contact');
     assert.equal(delta.color,0,'profile premultiplied pixels match the authored clothing-free layers');
     const unit=105/374;assert.deepEqual(delta.placement,[256-actual.pose.pivot.x*unit,400-actual.pose.pivot.y*unit,actual.pose.width*unit,actual.pose.height*unit]);
    }else assert.equal(actual.png===expected,true,`${body}/${kit}/${action}/${dir}/${frame}: pixels match raw pack composition`);
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
  await page.evaluate(()=>__lobby96QA.enterHunt());await page.waitForFunction(()=>__lobby96QA.prepareMap(),null,{timeout:90000});const count=await page.evaluate(()=>__lobby96World.draws);
  await page.evaluate(()=>__lobby96QA.draw());assert(await page.evaluate(()=>__lobby96World.draws)>count,'sword/rogue combat invokes the replacement renderer');
  await page.evaluate(()=>__lobby96QA.returnLobby());assert(await page.evaluate(()=>__lobby96QA.runtime.ensure(__lobby96QA.game)));await page.evaluate(()=>__lobby96QA.draw());
  const stats=await page.evaluate(()=>__mareDiagnostics().lobby96);assert(stats.images<=192&&stats.imageBytes<=64*1024*1024&&stats.bundles<=2&&stats.previews<=8&&stats.peakLoads<=6,JSON.stringify(stats));
  // Test-only memory edits never persist; the confirmed save remains authoritative.
  await go(base+'?paperDoll96=1');await page.waitForFunction(()=>__mareDiagnostics().lobby96.state==='ready',null,{timeout:90000});
  assert.equal(await page.evaluate(()=>__mareDiagnostics().lobby96.look.body),'masculino');
  // Optional HD archives cannot replace or block the approved current world body.
  await context.route('**/tools/rework-base-hd/index.json*',r=>r.fulfill({status:503,body:'{}'}));
  await go(base+'?paperDoll96=1');await page.waitForFunction(()=>__mareDiagnostics().lobby96.nativeHD.state==='failed');
  assert(await page.evaluate(()=>!!__mareDiagnostics().lobby96.nativeHD.error));
  await page.waitForFunction(()=>{__lobby96QA.prepareMap();return __mareDiagnostics().lobby96.worldVisual?.state==='failed';},null,{timeout:90000});
  const missing=await page.evaluate(()=>__mareDiagnostics().lobby96.worldVisual);
  assert(missing.error&&!missing.publishedKey,'a failed source has a diagnosis and does not publish a replacement frame');
  assert.equal(await page.evaluate(()=>__mareDiagnostics().paperDollReview.draws),0);
  await context.unroute('**/tools/rework-base-hd/index.json*');
  // An obsolete opt-out query cannot restore a retired player renderer.
  let requests=0;page.on('request',r=>{if(r.url().includes('tools/paper-doll-96-v3/'))requests++;});await go(base+'?paperDoll96=0');
  assert.equal(await page.evaluate(()=>__mareDiagnostics().lobby96.state),'ready');assert(requests>0);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({pixels,profiles:28,attackPreviews,viewports:8,peakLoads:stats.peakLoads,cache:{images:stats.images,bundles:stats.bundles,previews:stats.previews},saveIsolation:true,missingHDIndexIsolated:true,normalRequests:requests,errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
