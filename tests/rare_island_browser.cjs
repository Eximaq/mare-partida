'use strict';
// A real browser journey catches old layout packaging, replaced art, blocked
// forest paths, incorrect scenery order and lost hunt progress. Fixtures are isolated.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const out=process.env.MARE_QA_DIR||path.join(root,'.maintenance-local/browser/rare-island');
const originalArt=[
 {file:'assets/new-islands/rare-map.png',width:3712,height:3200,sha:'b2044dbb4ea3815d4b2696cf0b7e3858d64e9a3eb324b31f6fd2e83b0eb07492'},
 {file:'assets/ui/voyage-hd/animais-raros.png',width:320,height:180,sha:'e9173c4604a621768fd7f7b59b634c0f96678bc2f3c8bcf931670b387598a671'}
];
const paintedArt={file:'assets/rare-animals/gaimon-island/scene-hd.png',width:1447,height:1087,sha:'c93dae2dfb9a199941c0e38bfcbaf191b8bc3ca4c35942d9ed13bd98c00012e5'};
const districtIds=['entrada','subbosque','mata-fechada','copa-antiga'];
const spawn={x:1504,y:1952},returnPoint={x:1504,y:2112,radius:48};
const checksum=bytes=>createHash('sha256').update(bytes).digest('hex');

function instrument(source){
 const marker='  window.__mareDiagnostics=',tick='function tickSimulation(dt){',hero='function drawHeroLayer(){';
 assert(source.includes(marker)&&source.includes(tick)&&source.includes(hero),'the served game must expose the established QA insertion points');
 source=source.replace(tick,tick+'if(window.__rareQA?.paused&&!window.__rareQA.stepping)return;');
 source=source.replace(hero,hero+"if(window.__rareQA?.tracking)window.__rareQA.events.push({kind:'hero'});");
 return source.replace(marker,`  window.__rareQA={paused:true,stepping:false,tracking:false,events:[],
 get game(){return game},get world(){return world},get writer(){return saveWriter},
 get context(){return ctx},map:activeMap,nav:navigator,state:mapArtState,open:openPanel,save:saveGame,
 cocoxProbe(){const m=world.mobs.find(m=>m.alive&&m.type==='cocox');if(!m)throw Error('No live Cocox for pointer geometry');
  const box=MareRareRenderer.cocoxLayout(m),y=(box.top+m.y)/2;
  return {id:m.spawnId,inside:monsterPointerHit(m,m.x,y),edgeInside:monsterPointerHit(m,m.x+box.halfWidth-1,y),
   outside:monsterPointerHit(m,m.x+box.halfWidth+1,y),topOutside:monsterPointerHit(m,m.x,box.top-1),footOutside:monsterPointerHit(m,m.x,m.y+13),
   barY:MareRareRenderer.cocoxHealthBarY(m),expectedBarY:box.top-22,visualHeight:combatActorHeight(m)};},
 stop(){autoPlay=false;autoSkills=false;travelPath=[];world.target=null;},
 fixture(level){game.level=level;Object.assign(game.attributes,{strength:50000,vitality:50000});
  game.equipment.weapon ||= newItem(itemDefs[starterWeapon(game.classId)]);
  game.equipment.weapon.baseStats={...game.equipment.weapon.baseStats,attack:10000000};
  game.hp=getDerived().maxHP;game.energy=getDerived().maxEnergy;saveGame();updateUI();},
 step(dt,render=true){this.stepping=true;try{tickSimulation(dt)}finally{this.stepping=false}if(render)presentWorld();},
 snap(){camera.update(nameplateCameraFocus(),activeMap(),0,true,world.hero);presentWorld();},
 walk(goal,tolerance=2){this.stop();const before={x:world.hero.x,y:world.hero.y};
  if(!walkTo(goal))throw Error('No real walking route to '+JSON.stringify(goal));
  let steps=0,walkable=true,travelled=0,maxStep=0,last={...before};const moveSpeed=getDerived().moveSpeed;
  for(;steps<2200&&Math.hypot(world.hero.x-goal.x,world.hero.y-goal.y)>tolerance;steps++){
   this.step(.05,false);walkable&&=navigator().walkable(world.hero.x,world.hero.y);
   const moved=Math.hypot(world.hero.x-last.x,world.hero.y-last.y);travelled+=moved;maxStep=Math.max(maxStep,moved);last={x:world.hero.x,y:world.hero.y};
  }this.snap();return {before,goal,steps,walkable,travelled,maxStep,moveSpeed,hero:{x:world.hero.x,y:world.hero.y}};},
 district(id){const p=MareMapExports.get('rare').districts.find(d=>d.id===id);if(!p)throw Error('Missing district '+id);return this.walk({x:p.x,y:p.y});},
 approachReturn(){const r=activeMap().returnPoint,n=navigator();
  // The long location badge covers the center on a narrow viewport; the
  // walkable left side of the same pier exposes the marker through movement.
  const p={x:r.x-(W<768?64:0),y:r.y-96};
  if(!n.walkable(p.x,p.y)||!n.clear(p,r)||!n.path(world.hero,p).length)throw Error('No natural pier approach to the return marker');return this.walk(p,.1);},
 returnScreen(){this.snap();const p=activeMap().returnPoint,r=canvas.getBoundingClientRect(),s=camera.worldToScreen(p.x,p.y);
  const x=r.left+s.x*r.width/W,y=r.top+s.y*r.height/H,hit=document.elementFromPoint(x,y),bounds=hit?.getBoundingClientRect();
  return {x,y,hitId:hit?.id,hitTag:hit?.tagName,hitClass:hit?.getAttribute('class'),hitText:hit?.textContent?.trim().slice(0,120),hitBounds:bounds&&{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height}};},
 cocoxScreen(id){this.snap();const m=world.mobs.find(m=>m.spawnId===id),box=MareRareRenderer.cocoxLayout(m),r=canvas.getBoundingClientRect();
  const p=camera.worldToScreen(m.x,(box.top+m.y)/2),x=r.left+p.x*r.width/W,y=r.top+p.y*r.height/H;
  return {x,y,hitId:document.elementFromPoint(x,y)?.id};},
 stageCombat(){this.stop();const m=world.mobs.find(m=>m.alive&&m.hp>0);if(!m)throw Error('No live Rare Island opponent');
  const n=navigator(),p=[[-48,0],[48,0],[0,48],[0,-48]].map(([dx,dy])=>({x:m.x+dx,y:m.y+dy})).find(p=>n.walkable(p.x,p.y)&&n.clear(p,m));
  if(!p)throw Error('No walkable combat fixture');Object.assign(world.hero,p);m.attackClock=10;this.snap();return m.spawnId;},
 fight(){const kills=game.stats.kills,hunts=game.hunts.areas.rare.kills;autoPlay=true;autoSkills=false;
  let steps=0;for(;steps<600&&game.stats.kills===kills;steps++)this.step(.05);
  this.stop();saveGame();return {steps,kills:game.stats.kills-kills,hunts:game.hunts.areas.rare.kills-hunts,respawns:{...game.hunts.areas.rare.respawns}};},
 depthFixture(){const n=navigator(),r=MareWorldDepth.regions('rare').find(r=>r.id==='rare-south-palm');
  if(!r?.tall)throw Error('The authored south palm depth region must be present');
  const point=(x,y)=>({x:Math.round(x*3072/1447*100)/100,y:Math.round(y*2304/1087*100)/100});
  const behind=point(880,665),front=point(880,730);
  if(!n.walkable(behind.x,behind.y)||!n.walkable(front.x,front.y)||!n.path(world.hero,behind).length||!n.path(behind,front).length)throw Error('Both sides of the south palm must be reachable');
  if(!MareWorld.occluded(behind,[r],74,74)||MareWorld.occluded(front,[r],74,74))throw Error('The south palm must distinguish its authored behind/front points');
  const probe=document.createElement('canvas');probe.width=48;probe.height=120;const c=probe.getContext('2d');let paintCalls=[];
  const originalDraw=c.drawImage.bind(c);c.drawImage=function(image,...args){paintCalls.push({newScene:image===MareRareAnimals.prepare(),natural:[image.naturalWidth,image.naturalHeight],smooth:this.imageSmoothingEnabled,quality:this.imageSmoothingQuality});return originalDraw(image,...args);};
  c.save();c.translate(24-behind.x,112-behind.y);MareWorldDepth.draw(c,r,[{...behind,visualHeight:74,visualWidth:74}]);c.restore();
  const data=c.getImageData(12,32,24,68).data;let pixels=0;for(let i=3;i<data.length;i+=4)if(data[i]>0)pixels++;
  const behindCalls=paintCalls.slice();paintCalls=[];MareWorldDepth.draw(c,r,[]);const emptyDraws=paintCalls.length;
  paintCalls=[];MareWorldDepth.draw(c,r,[{...front,visualHeight:74,visualWidth:74}]);
  return {id:r.id,type:r.type,assetId:r.assetId||null,source:{behind:{x:880,y:665},front:{x:880,y:730}},behind,front,pixels,paintCalls:behindCalls,emptyDraws,frontDraws:paintCalls.length};},
 depthOrder(id){this.events=[];this.depthTarget=id;this.tracking=true;try{this.snap()}finally{this.tracking=false;this.depthTarget=null}return this.events;},
 overview(){this.stop();const previous={W,H,width:canvas.width,height:canvas.height,camera:{...camera}};
  try{canvas.width=W=activeMap().width;canvas.height=H=activeMap().height;ctx.imageSmoothingEnabled=false;
   camera.width=W;camera.height=H;camera.x=0;camera.y=0;drawWorld();return canvas.toDataURL('image/png');
  }finally{canvas.width=previous.width;canvas.height=previous.height;W=previous.W;H=previous.H;Object.assign(camera,previous.camera);ctx.imageSmoothingEnabled=false;this.snap();}}
 };
 const rareDepthDraw=MareWorldDepth.draw;
 MareWorldDepth.draw=function(c,p,actors,...rest){const q=window.__rareQA;
  const event=q.tracking&&c===q.context?{kind:'scenery',id:p.id,drawn:false}:null;if(event)q.events.push(event);
  let sample=null;
  if(event&&p.id===q.depthTarget){const s=camera.worldToScreen(world.hero.x,world.hero.y),size=Math.ceil(combatVisualHeight(world.hero));
   const x=Math.max(0,Math.floor(s.x-size/2)),y=Math.max(0,Math.floor(s.y-size)),w=Math.min(size,W-x),h=Math.min(size,H-y);
   if(w>0&&h>0){event.sample={x,y,w,h};sample={x,y,w,h,before:c.getImageData(x,y,w,h).data};}}
  const drawn=rareDepthDraw.call(this,c,p,actors,...rest);if(event)event.drawn=!!drawn;
  if(sample){const after=c.getImageData(sample.x,sample.y,sample.w,sample.h).data;let changed=0;
   for(let i=0;i<after.length;i+=4)if([0,1,2].some(channel=>Math.abs(after[i+channel]-sample.before[i+channel])>3))changed++;
   event.changedHeroPixels=changed;}
  return drawn;
 };
`+marker);
}

function assertWalk(w,label){
 assert(w.steps<2200,label+' must finish through the real movement loop');
 assert(w.walkable,label+' must retain a walkable footprint at every step');
 assert(Math.hypot(w.hero.x-w.goal.x,w.hero.y-w.goal.y)<=2,label+' must reach the chosen destination');
 assert(w.maxStep<=w.moveSpeed*.05+1,label+' must walk at the character speed instead of teleporting');
 assert(w.travelled+2>=Math.hypot(w.before.x-w.goal.x,w.before.y-w.goal.y),label+' must traverse the actual route');
}

(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 let page,phase='boot';const errors=[],missing=[],results={viewports:[],journeys:[],playerFrames:[]};
 try{
  const preparePage=async context=>{
   const next=await context.newPage();next.setDefaultTimeout(30000);next.on('pageerror',e=>errors.push(e.message));
   next.on('response',r=>{if(r.status()>=400&&/rare|animais-raros|map-depth\/objects|sprites-combat-v2\/cocox|new-islands\/cocox/.test(r.url()))missing.push({status:r.status(),url:r.url()});});
   // Read the actual served build; a stale dist must fail without borrowing checkout code.
   await next.route('**/game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:instrument(await response.text())});});
   return next;
  };
  let context=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:1});page=await preparePage(context);
  const ready=()=>page.waitForFunction(()=>window.__rareQA?.game&&__rareQA.writer.owner&&__rareQA.state()==='ready',null,{timeout:60000});
  const readyHero=async label=>{
   const before=await page.evaluate(()=>{const v=__mareDiagnostics().lobby96.worldVisual;return {state:v?.state,displayed:v?.displayed||null,preparation:v?.preparation};});
   // The portrait's visualState can be ready before the world's required clips.
   // Let the real RAF and asset queue finish, and require an actual exact draw.
   await page.waitForFunction(()=>{__rareQA.snap();const v=__mareDiagnostics().lobby96.worldVisual;return v?.state==='ready'&&v.displayed?.exact===true&&v.preparation?.essentialReady===true;},null,{timeout:90000,polling:'raf'});
   const after=await page.evaluate(()=>{const v=__mareDiagnostics().lobby96.worldVisual;return {state:v.state,displayed:v.displayed,preparation:v.preparation,firstDrawAt:v.firstDrawAt};});
   results.playerFrames.push({label,before,after});
  };
  const shot=async name=>{await readyHero(name);await page.mouse.move(page.viewportSize().width-1,1);await page.screenshot({path:path.join(out,name+'.png')});};
  const openMap=async()=>{
   await page.evaluate(()=>__rareQA.open('map'));await page.locator('[data-voyage-region=east-blue]').click();
   await page.waitForFunction(()=>{const im=document.querySelector('[data-island=animais-raros] [data-location-art]');return im?.complete&&im.naturalWidth>0;});
   const cover=await page.locator('[data-island=animais-raros] [data-location-art]').getAttribute('src');
   assert(new URL(cover,page.url()).pathname.endsWith('/assets/ui/voyage-hd/animais-raros.png'),'the existing Rare Island cover must remain selected');
  };
  const travel=async()=>{
   await openMap();await page.locator('[data-island=animais-raros]').click();await page.locator('[data-travel-area=rare]').click();
   await page.waitForFunction(()=>__mareDiagnostics().map.id==='rare'&&__rareQA.state()==='ready',null,{timeout:60000});
   const selected=await page.evaluate(()=>new URL(MareMapExports.prepare('rare').src).pathname);
   assert(selected.endsWith('/'+paintedArt.file),'catalog travel must select the new Rare Island painting');
   const actual=await page.evaluate(()=>{const q=__rareQA;q.stop();q.snap();return {x:q.world.hero.x,y:q.world.hero.y};});
   assert.deepEqual(actual,spawn,'catalog travel must arrive at the new southern entrance');
   await readyHero('arrival');
  };
  const tour=async label=>{
   const routes=[];for(const id of districtIds){phase=label+' sector '+id;const route=await page.evaluate(id=>__rareQA.district(id),id);assertWalk(route,label+' '+id);routes.push({id,...route});if(id==='copa-antiga')await shot('rare-copa-'+label);}
   results.journeys.push({viewport:label,routes});
  };
  const returnByClick=async label=>{
   phase=label+' return';const approach=await page.evaluate(()=>__rareQA.approachReturn());assertWalk(approach,label+' return approach');
   const point=await page.evaluate(()=>__rareQA.returnScreen()),viewport=page.viewportSize();
   (results.returnAttempts ||= []).push({viewport:label,approach,marker:point});
   assert(point.x>=0&&point.x<viewport.width&&point.y>=0&&point.y<viewport.height,'the real return marker must be visible for clicking');
   assert.equal(point.hitId,'worldCanvas',label+' return marker must be exposed on the canvas when approaching along the pier');
   await page.mouse.click(point.x,point.y);
   const returned=await page.evaluate(()=>{const q=__rareQA;let steps=0;for(;steps<400&&__mareDiagnostics().map.id!=='lobby';steps++)q.step(.05,false);q.snap();return {map:__mareDiagnostics().map.id,steps};});
   assert.equal(returned.map,'lobby',label+' marker click must walk to the exit and return to the port');await ready();return {...returned,approach:{goal:approach.goal,hero:approach.hero},marker:point};
  };

  const runtimeUrl=process.env.MARE_TEST_URL||'http://127.0.0.1:8174/';
  await page.goto(runtimeUrl,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__rareQA);
  await page.locator('#characterName').fill('Rare QA');await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();await ready();
  phase='preserved artwork';results.originalArt=[];
  for(const asset of originalArt){
   assert.equal(checksum(fs.readFileSync(path.join(root,asset.file))),asset.sha,'original checkout art: '+asset.file);
   const response=await page.request.get(new URL(asset.file,page.url()).href);assert.equal(response.status(),200,asset.file+' must ship in the served build');
   assert.equal(checksum(await response.body()),asset.sha,'served image bytes: '+asset.file);
   const decoded=await page.evaluate(async file=>{const im=new Image();im.src=new URL(file,location.href).href;await im.decode();return {width:im.naturalWidth,height:im.naturalHeight};},asset.file);
   assert.deepEqual(decoded,{width:asset.width,height:asset.height},asset.file+' must decode at its original resolution');results.originalArt.push({...asset,...decoded});
  }
  phase='level gate';await page.evaluate(()=>{__rareQA.stop();__rareQA.fixture(15);});await openMap();await page.locator('[data-island=animais-raros]').click();
  assert(await page.locator('[data-travel-area=rare]').isDisabled(),'level 15 must not enter Rare Island');await page.locator('#closePanel').click();
  await page.evaluate(()=>__rareQA.fixture(16));
  phase='desktop arrival';await travel();
  await page.waitForFunction(()=>['cocox'].every(type=>MareSpriteCombatV2.status(type,'walk','south')==='ready'),null,{timeout:60000});
  phase='new HD painting';
  const newBytes=fs.readFileSync(path.join(root,paintedArt.file)),decodedSource=require('pngjs').PNG.sync.read(newBytes);
  assert.deepEqual([decodedSource.width,decodedSource.height],[paintedArt.width,paintedArt.height],'the original generated PNG retains its native resolution');
  assert.equal(checksum(newBytes),paintedArt.sha,'the complete generated painting must remain byte-identical');
  Object.assign(paintedArt,{pixels:checksum(decodedSource.data)});
  const newResponse=await page.request.get(new URL(paintedArt.file,page.url()).href);assert.equal(newResponse.status(),200,'the new painting must ship in dist');
  assert.equal(checksum(await newResponse.body()),checksum(newBytes),'the shipped painting must match the complete source instead of a thumbnail or downscale');
  const painting=await page.evaluate(async()=>{
   const image=MareRareAnimals.prepare(),canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
   const c=canvas.getContext('2d');c.drawImage(image,0,0);const pixels=c.getImageData(0,0,canvas.width,canvas.height).data;
   const hash=await crypto.subtle.digest('SHA-256',pixels),hex=Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
   return {src:new URL(image.src).pathname,natural:[image.naturalWidth,image.naturalHeight],declared:[MareRareAnimalsLayout.imageWidth,MareRareAnimalsLayout.imageHeight],pixels:hex,
    selected:MareMapExports.prepare('rare')===image,mode:MareMapExports.get('rare').spriteMode,
    regions:MareWorldDepth.regions('rare').map(r=>({id:r.id,type:r.type,assetId:r.assetId||null}))};
  });
  assert(painting.src.endsWith('/'+paintedArt.file),'the active renderer must use the new HD scene');
  assert.deepEqual(painting.natural,[paintedArt.width,paintedArt.height]);assert.deepEqual(painting.declared,painting.natural);
  assert.equal(painting.pixels,paintedArt.pixels,'native decoded pixels remain identical to the generated source');
  assert.equal(painting.selected,true);assert.equal(painting.mode,'painted');
  assert(painting.regions.length&&painting.regions.every(r=>r.type==='rare'&&!r.assetId),'painted silhouettes must not request or draw old object PNGs');results.painting=painting;
  phase='painting camera crops';
  const crops=await page.evaluate(()=>{
   const image=MareRareAnimals.prepare(),checks=[];
   for(const [x,y]of [[1420,1950],[1152,576],[1920,768]]){
    const actual=document.createElement('canvas'),expected=document.createElement('canvas');
    actual.width=expected.width=192;actual.height=expected.height=128;
    const a=actual.getContext('2d'),b=expected.getContext('2d'),draw=a.drawImage.bind(a),calls=[];
    a.drawImage=function(im,...args){calls.push({newScene:im===image,smooth:this.imageSmoothingEnabled,quality:this.imageSmoothingQuality});return draw(im,...args);};
    a.translate(-x,-y);MareRareAnimals.ground(a,{x,y},192,128);
    // Independent reference: place the entire source at world size, without
    // reusing the renderer's crop calculation or drawing an intermediate bitmap.
    b.imageSmoothingEnabled=true;b.imageSmoothingQuality='high';
    b.drawImage(image,0,0,image.naturalWidth,image.naturalHeight,-x,-y,3072,2304);
    const have=a.getImageData(4,4,184,120).data,want=b.getImageData(4,4,184,120).data;
    let difference=0,badChannels=0,maxDifference=0,opaque=0;
    for(let i=0;i<have.length;i++){
     if(i%4===3){opaque+=Number(have[i]===255);continue;}
     const delta=Math.abs(have[i]-want[i]);difference+=delta;badChannels+=Number(delta>3);maxDifference=Math.max(maxDifference,delta);
    }
    checks.push({x,y,calls,opaque,pixels:have.length/4,meanDifference:difference/(have.length*.75),badFraction:badChannels/(have.length*.75),maxDifference});
   }
   return checks;
  });
  for(const crop of crops){
   assert(crop.calls.length&&crop.calls.every(call=>call.newScene&&call.smooth&&call.quality==='high'),'actual camera crops must use the new scene with high quality smoothing');
   assert.equal(crop.opaque,crop.pixels,'camera crop must completely paint the viewport');
   assert(crop.meanDifference<.25&&crop.badFraction<.01,'camera crop must match the complete source at world scale: '+JSON.stringify(crop));
  }results.paintingCrops=crops;
  const layout=await page.evaluate(()=>{const q=__rareQA,m=q.map(),d=MareMapExports.get('rare');return {width:m.width,height:m.height,returnPoint:m.returnPoint,districts:d.districts.map(d=>d.id),mobs:q.world.mobs.map(m=>({id:m.spawnId,type:m.type,level:m.level,reachable:q.nav().path(q.world.hero,m).length>0})),outside:q.nav().walkable(8,8)};});
  assert.deepEqual([layout.width,layout.height],[3072,2304],'the active world dimensions remain independent from the native source image');
  assert.deepEqual({x:layout.returnPoint.x,y:layout.returnPoint.y,radius:layout.returnPoint.radius},returnPoint);
  assert.deepEqual(layout.districts,districtIds);assert.equal(layout.mobs.length,8);
  assert.deepEqual(layout.mobs.map(m=>m.id).sort(),districtIds.flatMap(id=>[0,1].map(n=>'rare-'+id+'-'+n)).sort());
  assert(layout.mobs.every(m=>['cocox'].includes(m.type)&&m.level===18&&m.reachable),'all eight Cocox encounters must remain reachable and level 18');assert.equal(layout.outside,false);results.layout=layout;
  const blockedPoints=[['treasure-summit',710,180],['mesa-face',700,400],['west-sea',100,1050],['east-sea',1350,1050]].map(([id,x,y])=>({id,source:{x,y},x:Math.round(x*3072/paintedArt.width*100)/100,y:Math.round(y*2304/paintedArt.height*100)/100}));
  results.blockedTerrain=await page.evaluate(points=>points.map(p=>({...p,walkable:__rareQA.nav().walkable(p.x,p.y)})),blockedPoints);
  for(const point of results.blockedTerrain)assert.equal(point.walkable,false,'the painted sea and inaccessible treasure rock must stay blocked: '+point.id);
  results.cocoxPointer=await page.evaluate(()=>__rareQA.cocoxProbe());
  assert.equal(results.cocoxPointer.inside,true,'the real Cocox pointer handler must accept its body');
  assert.equal(results.cocoxPointer.edgeInside,true,'the retained Cocox rectangle includes its horizontal edge');
  for(const key of ['outside','topOutside','footOutside'])assert.equal(results.cocoxPointer[key],false,'Cocox pointer bounds: '+key);
  assert.equal(results.cocoxPointer.barY,results.cocoxPointer.expectedBarY,'Cocox health labels retain the established feet-relative layout');
  assert(results.cocoxPointer.visualHeight>0,'the active combat height remains valid for Cocox');
  await shot('rare-entrada-desktop');
  const overview=await page.evaluate(()=>__rareQA.overview());assert(overview.startsWith('data:image/png;base64,'));
  const overviewBytes=Buffer.from(overview.split(',')[1],'base64');assert.deepEqual([overviewBytes.readUInt32BE(16),overviewBytes.readUInt32BE(20)],[3072,2304]);
  fs.writeFileSync(path.join(out,'rare-overview.png'),overviewBytes);
  await tour('desktop');

  // Follow the two sides of the central rock, both clearings and the old
  // crown. The palm return route is followed by the opposite depth-test route.
  results.exactRoutes=[];
  for(const [id,x,y]of [['west-trail',479,419],['east-trail',923,458],['west-clearing',300,493],['east-clearing',1156,494],['old-crown-behind',1159,219],['old-crown-front',1195,329],['south-palm-front',880,730],['south-palm-behind',880,665]]){
   phase='exact route '+id;
   const goal={x:Math.round(x*3072/paintedArt.width*100)/100,y:Math.round(y*2304/paintedArt.height*100)/100};
   const route=await page.evaluate(point=>__rareQA.walk(point,.1),goal);assertWalk(route,phase);
   assert(Math.hypot(route.hero.x-goal.x,route.hero.y-goal.y)<=.1,phase+' must reach the exact painted point without snapping its destination');
   if(results.exactRoutes.length)assert.deepEqual(route.before,results.exactRoutes.at(-1).hero,'exact routes must preserve continuous player movement');
   results.exactRoutes.push({id,source:{x,y},...route});
   if(id==='east-clearing'||id==='old-crown-front')await shot('rare-'+id);
  }

  phase='scenery depth';await readyHero('before depth');
  const depth=await page.evaluate(()=>__rareQA.depthFixture());assert(depth.pixels>40,'the painted silhouette must visibly cover the behind fixture');
  results.depth=depth;depth.frames=[];depth.routes=[];
  assert.equal(depth.type,'rare');assert.equal(depth.assetId,null);
  assert(depth.paintCalls.length&&depth.paintCalls.every(call=>call.newScene&&call.natural[0]===paintedArt.width&&call.natural[1]===paintedArt.height&&call.smooth&&call.quality==='high'),'occlusion must crop the new painting at full source detail');
  assert.equal(depth.emptyDraws,0,'the painting must not be redrawn when no actor is behind it');assert.equal(depth.frontDraws,0,'a front actor must not receive an opaque scenery redraw');
  for(const side of ['behind','front']){
   const route=await page.evaluate(point=>__rareQA.walk(point,.1),depth[side]);assertWalk(route,'depth '+side);
   assert(Math.hypot(route.hero.x-depth[side].x,route.hero.y-depth[side].y)<=.1,'depth route must reach the exact authored point');depth.routes.push({side,...route});
   await readyHero('depth '+side);
   const events=await page.evaluate(id=>__rareQA.depthOrder(id),depth.id),hero=events.findIndex(e=>e.kind==='hero'),scenery=events.findIndex(e=>e.kind==='scenery'&&e.id===depth.id);
   depth.frames.push({side,heroIndex:hero,sceneryIndex:scenery,scenery:events[scenery]});
   assert(hero>=0&&scenery>=0,'the real frame must process both the hero and scenery in depth order');
   assert(side==='behind'?hero<scenery:scenery<hero,'the real scenery queue must place the hero '+side+' the painted silhouette');
   if(side==='behind'){
    assert.equal(events[scenery].drawn,true,'the actual world frame must paint the silhouette over the hero behind it');
    assert(events[scenery].changedHeroPixels>40,'the actual painting pass must replace visible pixels in the hero body area: '+JSON.stringify(events[scenery]));depth.changedHeroPixels=events[scenery].changedHeroPixels;
   }
   await shot('rare-depth-'+side);
  }results.depth=depth;results.desktopReturn=await returnByClick('desktop');

  phase='normal combat';await travel();const opponent=await page.evaluate(()=>__rareQA.stageCombat());
  await page.waitForFunction(()=>__mareDiagnostics().lobby96.visualState==='ready');await shot('rare-combat');
  const cocoxPoint=await page.evaluate(id=>__rareQA.cocoxScreen(id),opponent);
  assert.equal(cocoxPoint.hitId,'worldCanvas','the Cocox body must be exposed for a real canvas click');
  await page.mouse.click(cocoxPoint.x,cocoxPoint.y);
  const clickedTarget=await page.evaluate(()=>__rareQA.world.target?.spawnId);
  assert.equal(clickedTarget,opponent,'clicking the visible Cocox must select its stable encounter through the real pointer handler');
  results.cocoxClick={...cocoxPoint,target:clickedTarget};
  const combat=await page.evaluate(()=>__rareQA.fight());assert(combat.kills>0&&combat.hunts===combat.kills,'combat must update both the general and Rare Island hunt ledgers');assert(combat.respawns[opponent]>0,'the defeated stable slot must retain its respawn deadline');results.combat={opponent,...combat};
  phase='save reload';const saved=await page.evaluate(()=>{const q=__rareQA;q.save();return {area:q.game.area,kills:q.game.stats.kills,huntKills:q.game.hunts.areas.rare.kills,respawns:{...q.game.hunts.areas.rare.respawns}};});
  await page.reload({waitUntil:'domcontentloaded'});await ready();
  const reloaded=await page.evaluate(()=>{const q=__rareQA;q.stop();return {area:q.game.area,kills:q.game.stats.kills,huntKills:q.game.hunts.areas.rare.kills,respawns:{...q.game.hunts.areas.rare.respawns}};});
  assert.deepEqual(reloaded,saved,'reload must retain the current area, kills and original slot deadlines');results.reload=true;

  phase='mobile DPR 2';const storageState=await context.storageState();await context.close();
  context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,storageState});page=await preparePage(context);
  await page.goto(runtimeUrl,{waitUntil:'domcontentloaded'});await ready();
  assert.equal(await page.evaluate(()=>devicePixelRatio),2,'mobile must run at actual DPR 2, not only a smaller desktop viewport');
  const mobileSave=await page.evaluate(()=>{const q=__rareQA;q.stop();return {area:q.game.area,kills:q.game.stats.kills,huntKills:q.game.hunts.areas.rare.kills,respawns:{...q.game.hunts.areas.rare.respawns}};});
  assert.deepEqual(mobileSave,reloaded,'the mobile context must receive the same area, progress and guard deadlines before travelling');results.mobileSave=true;
  phase='mobile catalog';await openMap();
  const bounds=await page.locator('#panelOverlay .dialog').boundingBox();assert(bounds&&bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=394&&bounds.y+bounds.height<=853,'the mobile catalog must fit inside the viewport');
  assert(await page.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'the mobile catalog must not overflow horizontally');await shot('rare-catalog-mobile');
  await page.locator('#closePanel').click();await travel();
  results.mobile=await page.evaluate(()=>{const image=MareRareAnimals.prepare(),canvas=document.getElementById('worldCanvas'),r=canvas.getBoundingClientRect();return {dpr:devicePixelRatio,backing:[canvas.width,canvas.height],css:[r.width,r.height],natural:[image.naturalWidth,image.naturalHeight],src:new URL(image.src).pathname,zoom:__mareDiagnostics().camera.zoom};});
  assert.deepEqual(results.mobile.natural,[paintedArt.width,paintedArt.height]);assert(results.mobile.src.endsWith('/'+paintedArt.file),'mobile must keep the complete HD source');
  assert.equal(results.mobile.zoom,1,'adding the painting must not force a new global zoom');
  assert(results.mobile.backing.every((v,i)=>Math.abs(v-results.mobile.css[i])<=1),'the established logical canvas scale stays unchanged at DPR 2');
  await shot('rare-entrada-mobile');
  const mobileShot=fs.readFileSync(path.join(out,'rare-entrada-mobile.png'));
  results.mobile.screenshot=[mobileShot.readUInt32BE(16),mobileShot.readUInt32BE(20)];
  assert.deepEqual(results.mobile.screenshot,[786,1704],'the mobile evidence must contain the actual DPR 2 screenshot');
  await tour('mobile');results.mobileReturn=await returnByClick('mobile');
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);results.viewports=['1366x768 @ DPR1','393x852 @ DPR2'];results.returnByClick=true;
  fs.writeFileSync(path.join(out,'rare-browser-results.json'),JSON.stringify({...results,errors,missing},null,2)+'\n');
  console.log(JSON.stringify({...results,errors,missing}));
 }catch(error){
  const player=page?await page.evaluate(()=>({hero:window.__rareQA?.world.hero,renderer:window.__mareDiagnostics?.().lobby96})).catch(()=>null):null;
  fs.writeFileSync(path.join(out,'failure-results.json'),JSON.stringify({...results,phase,message:error.message,player,errors,missing},null,2)+'\n');
  if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error({phase,errors,missing});throw error;
 }
 finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
