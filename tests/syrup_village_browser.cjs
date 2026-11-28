'use strict';
// A real browser journey catches old layout packaging, replaced art, blocked
// village paths, incorrect scenery order and lost hunt progress. Fixtures are isolated.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const out=process.env.MARE_QA_DIR||path.join(root,'.maintenance-local/browser/syrup-village');
const originalArt=[
 {file:'assets/exported-maps/syrup/map.png',width:4544,height:4352,sha:'3188b90071a00b3132c7269cadb65d8a992950a7140f0d385bec44ea364b610a'},
 {file:'assets/new-islands/syrup-map.png',width:4160,height:3840,sha:'e4f8d714f4b9047727a483a5a6fef98736c9879498e118dac78a0c195332672a'},
 {file:'assets/ui/voyage-hd/syrup.png',width:320,height:180,sha:'0a0de02524f5b8466bc92407fc83411a2fda1dd6fc81bfab48408ce66b014cd4'}
];
const paintedArt={file:'assets/syrup-village/coastal-village/scene-hd.png',width:1448,height:1086,sha:'32528120a20ef291ad7e32498db928889fe1dbe68eab584eb7e6db1381050920'};
const districtIds=['entrada','vila-baixa','praça','bosque'];
const spawn={x:1504,y:1952},returnPoint={x:1504,y:2112,radius:48};
const checksum=bytes=>createHash('sha256').update(bytes).digest('hex');

function instrument(source){
 const marker='  window.__mareDiagnostics=',tick='function tickSimulation(dt){',hero='function drawHeroLayer(){';
 assert(source.includes(marker)&&source.includes(tick)&&source.includes(hero),'the served game must expose the established QA insertion points');
 source=source.replace(tick,tick+'if(window.__syrupQA?.paused&&!window.__syrupQA.stepping)return;');
 source=source.replace(hero,hero+"if(window.__syrupQA?.tracking)window.__syrupQA.events.push({kind:'hero'});");
 return source.replace(marker,`  window.__syrupQA={paused:true,stepping:false,tracking:false,events:[],
 get game(){return game},get world(){return world},get writer(){return saveWriter},
 get context(){return ctx},map:activeMap,nav:navigator,state:mapArtState,open:openPanel,save:saveGame,
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
 district(id){const p=MareMapExports.get('syrup').districts.find(d=>d.id===id);if(!p)throw Error('Missing district '+id);return this.walk({x:p.x,y:p.y});},
 approachReturn(){const r=activeMap().returnPoint,n=navigator();
  const p={x:r.x,y:r.y-96};
  if(!n.walkable(p.x,p.y)||!n.clear(p,r)||!n.path(world.hero,p).length)throw Error('No natural central walkway approach to the return marker');return this.walk(p);},
 returnScreen(){this.snap();const p=activeMap().returnPoint,r=canvas.getBoundingClientRect(),s=camera.worldToScreen(p.x,p.y);
  const x=r.left+s.x*r.width/W,y=r.top+s.y*r.height/H;return {x,y,hitId:document.elementFromPoint(x,y)?.id};},
 stageCombat(){this.stop();const m=world.mobs.find(m=>m.alive&&m.hp>0);if(!m)throw Error('No live Syrup opponent');
  const n=navigator(),p=[[-48,0],[48,0],[0,48],[0,-48]].map(([dx,dy])=>({x:m.x+dx,y:m.y+dy})).find(p=>n.walkable(p.x,p.y)&&n.clear(p,m));
  if(!p)throw Error('No walkable combat fixture');Object.assign(world.hero,p);m.attackClock=10;this.snap();return m.spawnId;},
 fight(){const kills=game.stats.kills,hunts=game.hunts.areas.syrup.kills;autoPlay=true;autoSkills=false;
  let steps=0;for(;steps<600&&game.stats.kills===kills;steps++)this.step(.05);
  this.stop();saveGame();return {steps,kills:game.stats.kills-kills,hunts:game.hunts.areas.syrup.kills-hunts,respawns:{...game.hunts.areas.syrup.respawns}};},
 depthFixture(){const n=navigator(),probe=document.createElement('canvas');probe.width=48;probe.height=120;const c=probe.getContext('2d');let paintCalls=[];
  const originalDraw=c.drawImage.bind(c);c.drawImage=function(image,...args){paintCalls.push({newScene:image===MareSyrup.prepare(),natural:[image.naturalWidth,image.naturalHeight],smooth:this.imageSmoothingEnabled,quality:this.imageSmoothingQuality});return originalDraw(image,...args);};
  const covered=(r,p)=>{paintCalls=[];c.clearRect(0,0,48,120);c.save();c.translate(24-p.x,112-p.y);MareWorldDepth.draw(c,r,[{...p,visualHeight:74,visualWidth:74}]);c.restore();
   const pixels=c.getImageData(12,32,24,68).data;let count=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)count++;return count;};
  for(const r of MareWorldDepth.regions('syrup').filter(r=>r.tall)){
   let behind=null,pixels=0;
   for(let y=r.base-8;y>Math.max(r.y+8,r.base-100)&&!behind;y-=8)for(let x=r.x+8;x<r.x+r.w-8&&!behind;x+=8){const p={x,y};
    if(n.walkable(x,y)&&MareWorld.occluded(p,[r],74,74)&&(pixels=covered(r,p))>40&&n.path(world.hero,p).length)behind=p;}
   if(!behind)continue;let front=null;
   for(let y=r.base+24;y<r.base+160&&!front;y+=8)for(let x=r.x-32;x<r.x+r.w+32&&!front;x+=8){const p={x,y};
    if(n.walkable(x,y)&&!MareWorld.occluded(p,[r],74,74)&&n.path(behind,p).length)front=p;}
   if(front){const behindCalls=paintCalls.slice();paintCalls=[];MareWorldDepth.draw(c,r,[]);const emptyDraws=paintCalls.length;
    paintCalls=[];MareWorldDepth.draw(c,r,[{...front,visualHeight:74,visualWidth:74}]);
    return {id:r.id,type:r.type,assetId:r.assetId||null,behind,front,pixels,paintCalls:behindCalls,emptyDraws,frontDraws:paintCalls.length};}
  }throw Error('No reachable behind/front scenery fixture in the new Syrup layout');},
 depthOrder(id){this.events=[];this.depthTarget=id;this.tracking=true;try{this.snap()}finally{this.tracking=false;this.depthTarget=null}return this.events;},
 overview(){this.stop();const previous={W,H,width:canvas.width,height:canvas.height,camera:{...camera}};
  try{canvas.width=W=activeMap().width;canvas.height=H=activeMap().height;ctx.imageSmoothingEnabled=false;
   camera.width=W;camera.height=H;camera.x=0;camera.y=0;drawWorld();return canvas.toDataURL('image/png');
  }finally{canvas.width=previous.width;canvas.height=previous.height;W=previous.W;H=previous.H;Object.assign(camera,previous.camera);ctx.imageSmoothingEnabled=false;this.snap();}}
 };
 const syrupDepthDraw=MareWorldDepth.draw;
 MareWorldDepth.draw=function(c,p,actors,...rest){const q=window.__syrupQA;
  const event=q.tracking&&c===q.context?{kind:'scenery',id:p.id,drawn:false}:null;if(event)q.events.push(event);
  let sample=null;
  if(event&&p.id===q.depthTarget){const s=camera.worldToScreen(world.hero.x,world.hero.y),size=Math.ceil(combatVisualHeight(world.hero));
   const x=Math.max(0,Math.floor(s.x-size/2)),y=Math.max(0,Math.floor(s.y-size)),w=Math.min(size,W-x),h=Math.min(size,H-y);
   if(w>0&&h>0){event.sample={x,y,w,h};sample={x,y,w,h,before:c.getImageData(x,y,w,h).data};}}
  const drawn=syrupDepthDraw.call(this,c,p,actors,...rest);if(event)event.drawn=!!drawn;
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
   next.on('response',r=>{if(r.status()>=400&&/syrup|map-depth\/objects|sprites-combat-v2\/(sham|buchi)|new-islands\/(sham|buchi)/.test(r.url()))missing.push({status:r.status(),url:r.url()});});
   // Read the actual served build; a stale dist must fail without borrowing checkout code.
   await next.route('**/game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:instrument(await response.text())});});
   return next;
  };
  let context=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:1});page=await preparePage(context);
  const ready=()=>page.waitForFunction(()=>window.__syrupQA?.game&&__syrupQA.writer.owner&&__syrupQA.state()==='ready',null,{timeout:60000});
  const readyHero=async label=>{
   const before=await page.evaluate(()=>{const v=__mareDiagnostics().lobby96.worldVisual;return {state:v?.state,displayed:v?.displayed||null,preparation:v?.preparation};});
   // The portrait's visualState can be ready before the world's required clips.
   // Let the real RAF and asset queue finish, and require an actual exact draw.
   await page.waitForFunction(()=>{__syrupQA.snap();const v=__mareDiagnostics().lobby96.worldVisual;return v?.state==='ready'&&v.displayed?.exact===true&&v.preparation?.essentialReady===true;},null,{timeout:90000,polling:'raf'});
   const after=await page.evaluate(()=>{const v=__mareDiagnostics().lobby96.worldVisual;return {state:v.state,displayed:v.displayed,preparation:v.preparation,firstDrawAt:v.firstDrawAt};});
   results.playerFrames.push({label,before,after});
  };
  const shot=async name=>{await readyHero(name);await page.mouse.move(page.viewportSize().width-1,1);await page.screenshot({path:path.join(out,name+'.png')});};
  const openMap=async()=>{
   await page.evaluate(()=>__syrupQA.open('map'));await page.locator('[data-voyage-region=east-blue]').click();
   await page.waitForFunction(()=>{const im=document.querySelector('[data-island=syrup] [data-location-art]');return im?.complete&&im.naturalWidth>0;});
   const cover=await page.locator('[data-island=syrup] [data-location-art]').getAttribute('src');
   assert(new URL(cover,page.url()).pathname.endsWith('/assets/ui/voyage-hd/syrup.png'),'the existing Syrup cover must remain selected');
  };
  const travel=async()=>{
   await openMap();await page.locator('[data-island=syrup]').click();await page.locator('[data-travel-area=syrup]').click();
   await page.waitForFunction(()=>__mareDiagnostics().map.id==='syrup'&&__syrupQA.state()==='ready',null,{timeout:60000});
   const selected=await page.evaluate(()=>new URL(MareMapExports.prepare('syrup').src).pathname);
   assert(selected.endsWith('/'+paintedArt.file),'catalog travel must select the new Syrup painting');
   const actual=await page.evaluate(()=>{const q=__syrupQA;q.stop();q.snap();return {x:q.world.hero.x,y:q.world.hero.y};});
   assert.deepEqual(actual,spawn,'catalog travel must arrive at the new southern entrance');
   await readyHero('arrival');
  };
  const tour=async label=>{
   const routes=[];for(const id of districtIds){phase=label+' sector '+id;const route=await page.evaluate(id=>__syrupQA.district(id),id);assertWalk(route,label+' '+id);routes.push({id,...route});if(id==='praça')await shot('syrup-praca-'+label);}
   results.journeys.push({viewport:label,routes});
  };
  const returnByClick=async label=>{
   phase=label+' return';const approach=await page.evaluate(()=>__syrupQA.approachReturn());assertWalk(approach,label+' return approach');
   const point=await page.evaluate(()=>__syrupQA.returnScreen()),viewport=page.viewportSize();
   assert(point.x>=0&&point.x<viewport.width&&point.y>=0&&point.y<viewport.height,'the real return marker must be visible for clicking');
   assert.equal(point.hitId,'worldCanvas',label+' return marker must be exposed on the canvas when approaching along the central walkway');
   await page.mouse.click(point.x,point.y);
   const returned=await page.evaluate(()=>{const q=__syrupQA;let steps=0;for(;steps<400&&__mareDiagnostics().map.id!=='lobby';steps++)q.step(.05,false);q.snap();return {map:__mareDiagnostics().map.id,steps};});
   assert.equal(returned.map,'lobby',label+' marker click must walk to the exit and return to the port');await ready();return {...returned,approach:{goal:approach.goal,hero:approach.hero},marker:point};
  };

  const runtimeUrl=process.env.MARE_TEST_URL||'http://127.0.0.1:8174/';
  await page.goto(runtimeUrl,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__syrupQA);
  await page.locator('#characterName').fill('Syrup QA');await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();await ready();
  phase='preserved artwork';results.originalArt=[];
  for(const asset of originalArt){
   assert.equal(checksum(fs.readFileSync(path.join(root,asset.file))),asset.sha,'original checkout art: '+asset.file);
   const response=await page.request.get(new URL(asset.file,page.url()).href);assert.equal(response.status(),200,asset.file+' must ship in the served build');
   assert.equal(checksum(await response.body()),asset.sha,'served image bytes: '+asset.file);
   const decoded=await page.evaluate(async file=>{const im=new Image();im.src=new URL(file,location.href).href;await im.decode();return {width:im.naturalWidth,height:im.naturalHeight};},asset.file);
   assert.deepEqual(decoded,{width:asset.width,height:asset.height},asset.file+' must decode at its original resolution');results.originalArt.push({...asset,...decoded});
  }
  phase='level gate';await page.evaluate(()=>{__syrupQA.stop();__syrupQA.fixture(20);});await openMap();await page.locator('[data-island=syrup]').click();
  assert(await page.locator('[data-travel-area=syrup]').isDisabled(),'level 20 must not enter Syrup');await page.locator('#closePanel').click();
  await page.evaluate(()=>__syrupQA.fixture(21));
  phase='desktop arrival';await travel();
  await page.waitForFunction(()=>['sham','buchi'].every(type=>MareSpriteCombatV2.status(type,'walk','south')==='ready'),null,{timeout:60000});
  phase='new HD painting';
  const newBytes=fs.readFileSync(path.join(root,paintedArt.file)),decodedSource=require('pngjs').PNG.sync.read(newBytes);
  assert.deepEqual([decodedSource.width,decodedSource.height],[paintedArt.width,paintedArt.height],'the original generated PNG retains its native resolution');
  assert.equal(checksum(newBytes),paintedArt.sha,'the complete generated painting must remain byte-identical');
  Object.assign(paintedArt,{pixels:checksum(decodedSource.data)});
  const newResponse=await page.request.get(new URL(paintedArt.file,page.url()).href);assert.equal(newResponse.status(),200,'the new painting must ship in dist');
  assert.equal(checksum(await newResponse.body()),checksum(newBytes),'the shipped painting must match the complete source instead of a thumbnail or downscale');
  const painting=await page.evaluate(async()=>{
   const image=MareSyrup.prepare(),canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
   const c=canvas.getContext('2d');c.drawImage(image,0,0);const pixels=c.getImageData(0,0,canvas.width,canvas.height).data;
   const hash=await crypto.subtle.digest('SHA-256',pixels),hex=Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
   return {src:new URL(image.src).pathname,natural:[image.naturalWidth,image.naturalHeight],declared:[MareSyrupLayout.imageWidth,MareSyrupLayout.imageHeight],pixels:hex,
    selected:MareMapExports.prepare('syrup')===image,mode:MareMapExports.get('syrup').spriteMode,
    regions:MareWorldDepth.regions('syrup').map(r=>({id:r.id,type:r.type,assetId:r.assetId||null}))};
  });
  assert(painting.src.endsWith('/'+paintedArt.file),'the active renderer must use the new HD scene');
  assert.deepEqual(painting.natural,[paintedArt.width,paintedArt.height]);assert.deepEqual(painting.declared,painting.natural);
  assert.equal(painting.pixels,paintedArt.pixels,'native decoded pixels remain identical to the generated source');
  assert.equal(painting.selected,true);assert.equal(painting.mode,'painted');
  assert(painting.regions.length&&painting.regions.every(r=>r.type==='syrup'&&!r.assetId),'painted silhouettes must not request or draw old object PNGs');results.painting=painting;
  phase='painting camera crops';
  const crops=await page.evaluate(()=>{
   const image=MareSyrup.prepare(),checks=[];
   for(const [x,y]of [[1420,1950],[1152,576],[1920,768]]){
    const actual=document.createElement('canvas'),expected=document.createElement('canvas');
    actual.width=expected.width=192;actual.height=expected.height=128;
    const a=actual.getContext('2d'),b=expected.getContext('2d'),draw=a.drawImage.bind(a),calls=[];
    a.drawImage=function(im,...args){calls.push({newScene:im===image,smooth:this.imageSmoothingEnabled,quality:this.imageSmoothingQuality});return draw(im,...args);};
    a.translate(-x,-y);MareSyrup.ground(a,{x,y},192,128);
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
  const layout=await page.evaluate(()=>{const q=__syrupQA,m=q.map(),d=MareMapExports.get('syrup');return {width:m.width,height:m.height,returnPoint:m.returnPoint,districts:d.districts.map(d=>d.id),mobs:q.world.mobs.map(m=>({id:m.spawnId,type:m.type,level:m.level,reachable:q.nav().path(q.world.hero,m).length>0})),outside:q.nav().walkable(8,8)};});
  assert.deepEqual([layout.width,layout.height],[3072,2304],'the active world dimensions remain independent from the native source image');
  assert.deepEqual({x:layout.returnPoint.x,y:layout.returnPoint.y,radius:layout.returnPoint.radius},returnPoint);
  assert.deepEqual(layout.districts,districtIds);assert.equal(layout.mobs.length,8);
  assert.deepEqual(layout.mobs.map(m=>m.id).sort(),districtIds.flatMap(id=>[0,1].map(n=>'syrup-'+id+'-'+n)).sort());
  assert(layout.mobs.every(m=>['sham','buchi'].includes(m.type)&&m.level===23&&m.reachable),'all eight Sham/Buchi encounters must remain reachable and level 23');assert.equal(layout.outside,false);results.layout=layout;
  await shot('syrup-entrada-desktop');
  const overview=await page.evaluate(()=>__syrupQA.overview());assert(overview.startsWith('data:image/png;base64,'));
  const overviewBytes=Buffer.from(overview.split(',')[1],'base64');assert.deepEqual([overviewBytes.readUInt32BE(16),overviewBytes.readUInt32BE(20)],[3072,2304]);
  fs.writeFileSync(path.join(out,'syrup-overview.png'),overviewBytes);
  await tour('desktop');

  // Exact painted points on both sides of the gate pillars and square oak
  // exercise the real navigation grid and continuous movement around their feet.
  results.sceneryPassages=[];
  for(const [id,x,behindY,frontY]of [['kaya-gate-west',692,287,351],['kaya-gate-east',903,287,351],['square-oak',953,464,545]]){
   assert(painting.regions.some(r=>r.id==='syrup-'+id),'the named scenery must exist for the passage probe');
   const passage={id,source:{behind:{x,y:behindY},front:{x,y:frontY}},routes:[]};
   for(const side of ['behind','front']){
    phase=id+' passage '+side;
    const source=passage.source[side],goal={x:Math.round(source.x*3072/1448*100)/100,y:Math.round(source.y*3072/1448*100)/100};
    const route=await page.evaluate(point=>__syrupQA.walk(point),goal);assertWalk(route,phase);
    if(side==='front')assert.deepEqual(route.before,passage.routes[0].hero,'scenery passage must continue from the walked behind position');
    passage.routes.push({side,...route});
   }
   results.sceneryPassages.push(passage);await shot('syrup-'+id+'-front');
  }

  // Free painted points close to solid feet must remain reachable even when
  // the goal shares a navigation cell with a collider. The final pier route
  // deliberately starts in the square, where the required detour is exposed.
  results.exactRoutes=[];
  for(const [id,x,y]of [['gate-west-inner',696,302],['gate-east-inner',903,302],['gate-west-leaf',759,313],['oak-east-roots',995,506],['south-east-tree',1340,551],['square-origin',737,466],['pier-from-square',740,990]]){
   phase='exact route '+id;
   const goal={x:Math.round(x*3072/1448*100)/100,y:Math.round(y*3072/1448*100)/100};
   const route=await page.evaluate(point=>__syrupQA.walk(point,.1),goal);assertWalk(route,phase);
   assert(Math.hypot(route.hero.x-goal.x,route.hero.y-goal.y)<=.1,phase+' must reach the exact authored point without snapping the destination');
   if(results.exactRoutes.length)assert.deepEqual(route.before,results.exactRoutes.at(-1).hero,'exact routes must keep continuous player movement');
   results.exactRoutes.push({id,source:{x,y},...route});
  }
  await shot('syrup-pier-from-square');

  phase='scenery depth';await readyHero('before depth');
  const depth=await page.evaluate(()=>__syrupQA.depthFixture());assert(depth.pixels>40,'the painted silhouette must visibly cover the behind fixture');
  results.depth=depth;depth.frames=[];
  assert.equal(depth.type,'syrup');assert.equal(depth.assetId,null);
  assert(depth.paintCalls.length&&depth.paintCalls.every(call=>call.newScene&&call.natural[0]===paintedArt.width&&call.natural[1]===paintedArt.height&&call.smooth&&call.quality==='high'),'occlusion must crop the new painting at full source detail');
  assert.equal(depth.emptyDraws,0,'the painting must not be redrawn when no actor is behind it');assert.equal(depth.frontDraws,0,'a front actor must not receive an opaque scenery redraw');
  for(const side of ['behind','front']){
   const route=await page.evaluate(point=>__syrupQA.walk(point),depth[side]);assertWalk(route,'depth '+side);
   await readyHero('depth '+side);
   const events=await page.evaluate(id=>__syrupQA.depthOrder(id),depth.id),hero=events.findIndex(e=>e.kind==='hero'),scenery=events.findIndex(e=>e.kind==='scenery'&&e.id===depth.id);
   depth.frames.push({side,heroIndex:hero,sceneryIndex:scenery,scenery:events[scenery]});
   assert(hero>=0&&scenery>=0,'the real frame must process both the hero and scenery in depth order');
   assert(side==='behind'?hero<scenery:scenery<hero,'the real scenery queue must place the hero '+side+' the painted silhouette');
   if(side==='behind'){
    assert.equal(events[scenery].drawn,true,'the actual world frame must paint the silhouette over the hero behind it');
    assert(events[scenery].changedHeroPixels>40,'the actual painting pass must replace visible pixels in the hero body area: '+JSON.stringify(events[scenery]));depth.changedHeroPixels=events[scenery].changedHeroPixels;
   }
   await shot('syrup-depth-'+side);
  }results.depth=depth;results.desktopReturn=await returnByClick('desktop');

  phase='normal combat';await travel();const opponent=await page.evaluate(()=>__syrupQA.stageCombat());
  await page.waitForFunction(()=>__mareDiagnostics().lobby96.visualState==='ready');await shot('syrup-combat');
  const combat=await page.evaluate(()=>__syrupQA.fight());assert(combat.kills>0&&combat.hunts===combat.kills,'combat must update both the general and Syrup hunt ledgers');assert(combat.respawns[opponent]>0,'the defeated stable slot must retain its respawn deadline');results.combat={opponent,...combat};
  phase='save reload';const saved=await page.evaluate(()=>{const q=__syrupQA;q.save();return {area:q.game.area,kills:q.game.stats.kills,huntKills:q.game.hunts.areas.syrup.kills,respawns:{...q.game.hunts.areas.syrup.respawns}};});
  await page.reload({waitUntil:'domcontentloaded'});await ready();
  const reloaded=await page.evaluate(()=>{const q=__syrupQA;q.stop();return {area:q.game.area,kills:q.game.stats.kills,huntKills:q.game.hunts.areas.syrup.kills,respawns:{...q.game.hunts.areas.syrup.respawns}};});
  assert.deepEqual(reloaded,saved,'reload must retain the current area, kills and original slot deadlines');results.reload=true;

  phase='mobile DPR 2';const storageState=await context.storageState();await context.close();
  context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,storageState});page=await preparePage(context);
  await page.goto(runtimeUrl,{waitUntil:'domcontentloaded'});await ready();
  assert.equal(await page.evaluate(()=>devicePixelRatio),2,'mobile must run at actual DPR 2, not only a smaller desktop viewport');
  const mobileSave=await page.evaluate(()=>{const q=__syrupQA;q.stop();return {area:q.game.area,kills:q.game.stats.kills,huntKills:q.game.hunts.areas.syrup.kills,respawns:{...q.game.hunts.areas.syrup.respawns}};});
  assert.deepEqual(mobileSave,reloaded,'the mobile context must receive the same area, progress and guard deadlines before travelling');results.mobileSave=true;
  phase='mobile catalog';await openMap();
  const bounds=await page.locator('#panelOverlay .dialog').boundingBox();assert(bounds&&bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=394&&bounds.y+bounds.height<=853,'the mobile catalog must fit inside the viewport');
  assert(await page.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'the mobile catalog must not overflow horizontally');await shot('syrup-catalog-mobile');
  await page.locator('#closePanel').click();await travel();
  results.mobile=await page.evaluate(()=>{const image=MareSyrup.prepare(),canvas=document.getElementById('worldCanvas'),r=canvas.getBoundingClientRect();return {dpr:devicePixelRatio,backing:[canvas.width,canvas.height],css:[r.width,r.height],natural:[image.naturalWidth,image.naturalHeight],src:new URL(image.src).pathname,zoom:__mareDiagnostics().camera.zoom};});
  assert.deepEqual(results.mobile.natural,[paintedArt.width,paintedArt.height]);assert(results.mobile.src.endsWith('/'+paintedArt.file),'mobile must keep the complete HD source');
  assert.equal(results.mobile.zoom,1,'adding the painting must not force a new global zoom');
  assert(results.mobile.backing.every((v,i)=>Math.abs(v-results.mobile.css[i])<=1),'the established logical canvas scale stays unchanged at DPR 2');
  await shot('syrup-entrada-mobile');
  const mobileShot=fs.readFileSync(path.join(out,'syrup-entrada-mobile.png'));
  results.mobile.screenshot=[mobileShot.readUInt32BE(16),mobileShot.readUInt32BE(20)];
  assert.deepEqual(results.mobile.screenshot,[786,1704],'the mobile evidence must contain the actual DPR 2 screenshot');
  await tour('mobile');results.mobileReturn=await returnByClick('mobile');
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);results.viewports=['1366x768 @ DPR1','393x852 @ DPR2'];results.returnByClick=true;
  fs.writeFileSync(path.join(out,'syrup-browser-results.json'),JSON.stringify({...results,errors,missing},null,2)+'\n');
  console.log(JSON.stringify({...results,errors,missing}));
 }catch(error){
  const player=page?await page.evaluate(()=>({hero:window.__syrupQA?.world.hero,renderer:window.__mareDiagnostics?.().lobby96})).catch(()=>null):null;
  fs.writeFileSync(path.join(out,'failure-results.json'),JSON.stringify({...results,phase,message:error.message,player,errors,missing},null,2)+'\n');
  if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error({phase,errors,missing});throw error;
 }
 finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
