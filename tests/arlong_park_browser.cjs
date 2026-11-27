'use strict';
// A real browser journey catches old layout packaging, replaced art, blocked
// streets, incorrect scenery order and lost hunt progress. Fixtures are isolated.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const out=process.env.MARE_QA_DIR||path.join(root,'.maintenance-local/browser/arlong');
const originalArt=[
 {file:'assets/exported-maps/arlong/map.png',width:2560,height:2368,sha:'f82ac9e049a0ed3609e3d185b05625f1ae0f26068a5f510254e4997f28f0acc9'},
 {file:'assets/new-islands/arlong-map.png',width:2560,height:2432,sha:'59263b8f8f44de57950baad679c42ed158420ab1c1010abc8bf8c5d990ad53c1'},
 {file:'assets/ui/voyage-hd/arlong.png',width:320,height:180,sha:'300a96d20f2144be2be564940df6da51d8d24cea2d3237bd575704263eab2f59'},
 {file:'assets/ui/boss-dungeons/portraits/arlong.png',width:1254,height:1254,sha:'846957452d310a5919c1c190b2036c8f7fb7932448cf102740294f4121261c9a'}
];
const paintedArt={file:'assets/arlong-park/shark-palace/scene-hd.png',width:1448,height:1086,sha:'7c46e80612a0ab93293285e5ee63cc1576640d9254bbbafee408c7a5ffb310df'};
const districtIds=['entrada','ala-oeste','ala-leste','palacio'];
const spawn={x:1536,y:2080},returnPoint={x:1536,y:2208,radius:48};
const checksum=bytes=>createHash('sha256').update(bytes).digest('hex');

function instrument(source){
 const marker='  window.__mareDiagnostics=',tick='function tickSimulation(dt){',hero='function drawHeroLayer(){';
 assert(source.includes(marker)&&source.includes(tick)&&source.includes(hero),'the served game must expose the established QA insertion points');
 source=source.replace(tick,tick+'if(window.__arlongQA?.paused&&!window.__arlongQA.stepping)return;');
 source=source.replace(hero,hero+"if(window.__arlongQA?.tracking)window.__arlongQA.events.push({kind:'hero'});");
 return source.replace(marker,`  window.__arlongQA={paused:true,stepping:false,tracking:false,events:[],
 get game(){return game},get world(){return world},get writer(){return saveWriter},
 get context(){return ctx},map:activeMap,nav:navigator,state:mapArtState,open:openPanel,save:saveGame,
 stop(){autoPlay=false;autoSkills=false;travelPath=[];world.target=null;},
 fixture(level){game.level=level;Object.assign(game.attributes,{strength:50000,vitality:50000});
  game.equipment.weapon ||= newItem(itemDefs[starterWeapon(game.classId)]);
  game.equipment.weapon.baseStats={...game.equipment.weapon.baseStats,attack:10000000};
  game.hp=getDerived().maxHP;game.energy=getDerived().maxEnergy;saveGame();updateUI();},
 step(dt,render=true){this.stepping=true;try{tickSimulation(dt)}finally{this.stepping=false}if(render)presentWorld();},
 snap(){camera.update(nameplateCameraFocus(),activeMap(),0,true,world.hero);presentWorld();},
 walk(goal){this.stop();const before={x:world.hero.x,y:world.hero.y};
  if(!walkTo(goal))throw Error('No real walking route to '+JSON.stringify(goal));
  let steps=0,walkable=true,travelled=0,maxStep=0,last={...before};const moveSpeed=getDerived().moveSpeed;
  for(;steps<2200&&Math.hypot(world.hero.x-goal.x,world.hero.y-goal.y)>2;steps++){
   this.step(.05,false);walkable&&=navigator().walkable(world.hero.x,world.hero.y);
   const moved=Math.hypot(world.hero.x-last.x,world.hero.y-last.y);travelled+=moved;maxStep=Math.max(maxStep,moved);last={x:world.hero.x,y:world.hero.y};
  }this.snap();return {before,goal,steps,walkable,travelled,maxStep,moveSpeed,hero:{x:world.hero.x,y:world.hero.y}};},
 district(id){const p=MareMapExports.get('arlong').districts.find(d=>d.id===id);if(!p)throw Error('Missing district '+id);return this.walk({x:p.x,y:p.y});},
 approachReturn(){const r=activeMap().returnPoint,n=navigator();
  const p=[[96,0],[-96,0],[0,-96],[0,96]].map(([dx,dy])=>({x:r.x+dx,y:r.y+dy})).find(p=>n.walkable(p.x,p.y)&&n.clear(p,r)&&n.path(world.hero,p).length);
  if(!p)throw Error('No accessible return marker approach');return this.walk(p);},
 returnScreen(){this.snap();const p=activeMap().returnPoint,r=canvas.getBoundingClientRect(),s=camera.worldToScreen(p.x,p.y);
  return {x:r.left+s.x*r.width/W,y:r.top+s.y*r.height/H};},
 stageCombat(){this.stop();const m=world.mobs.find(m=>m.alive&&m.hp>0);if(!m)throw Error('No live Arlong opponent');
  const n=navigator(),p=[[-48,0],[48,0],[0,48],[0,-48]].map(([dx,dy])=>({x:m.x+dx,y:m.y+dy})).find(p=>n.walkable(p.x,p.y)&&n.clear(p,m));
  if(!p)throw Error('No walkable combat fixture');Object.assign(world.hero,p);m.attackClock=10;this.snap();return m.spawnId;},
 fight(){const kills=game.stats.kills,hunts=game.hunts.areas.arlong.kills;autoPlay=true;autoSkills=false;
  let steps=0;for(;steps<600&&game.stats.kills===kills;steps++)this.step(.05);
  this.stop();saveGame();return {steps,kills:game.stats.kills-kills,hunts:game.hunts.areas.arlong.kills-hunts,respawns:{...game.hunts.areas.arlong.respawns}};},
 depthFixture(){const n=navigator(),probe=document.createElement('canvas');probe.width=48;probe.height=120;const c=probe.getContext('2d');let paintCalls=[];
  const originalDraw=c.drawImage.bind(c);c.drawImage=function(image,...args){paintCalls.push({newScene:image===MareArlong.prepare(),natural:[image.naturalWidth,image.naturalHeight],smooth:this.imageSmoothingEnabled,quality:this.imageSmoothingQuality});return originalDraw(image,...args);};
  const covered=(r,p)=>{paintCalls=[];c.clearRect(0,0,48,120);c.save();c.translate(24-p.x,112-p.y);MareWorldDepth.draw(c,r,[{...p,visualHeight:74,visualWidth:74}]);c.restore();
   const pixels=c.getImageData(12,32,24,68).data;let count=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)count++;return count;};
  for(const r of MareWorldDepth.regions('arlong').filter(r=>r.tall)){
   let behind=null,pixels=0;
   for(let y=r.base-8;y>Math.max(r.y+8,r.base-100)&&!behind;y-=8)for(let x=r.x+8;x<r.x+r.w-8&&!behind;x+=8){const p={x,y};
    if(n.walkable(x,y)&&MareWorld.occluded(p,[r],74,74)&&(pixels=covered(r,p))>40&&n.path(world.hero,p).length)behind=p;}
   if(!behind)continue;let front=null;
   for(let y=r.base+24;y<r.base+160&&!front;y+=8)for(let x=r.x-32;x<r.x+r.w+32&&!front;x+=8){const p={x,y};
    if(n.walkable(x,y)&&!MareWorld.occluded(p,[r],74,74)&&n.path(behind,p).length)front=p;}
   if(front){const behindCalls=paintCalls.slice();paintCalls=[];MareWorldDepth.draw(c,r,[]);const emptyDraws=paintCalls.length;
    paintCalls=[];MareWorldDepth.draw(c,r,[{...front,visualHeight:74,visualWidth:74}]);
    return {id:r.id,type:r.type,assetId:r.assetId||null,behind,front,pixels,paintCalls:behindCalls,emptyDraws,frontDraws:paintCalls.length};}
  }throw Error('No reachable behind/front scenery fixture in the new Arlong layout');},
 depthOrder(id){this.events=[];this.depthTarget=id;this.tracking=true;try{this.snap()}finally{this.tracking=false;this.depthTarget=null}return this.events;},
 overview(){this.stop();const previous={W,H,width:canvas.width,height:canvas.height,camera:{...camera}};
  try{canvas.width=W=activeMap().width;canvas.height=H=activeMap().height;ctx.imageSmoothingEnabled=false;
   camera.width=W;camera.height=H;camera.x=0;camera.y=0;drawWorld();return canvas.toDataURL('image/png');
  }finally{canvas.width=previous.width;canvas.height=previous.height;W=previous.W;H=previous.H;Object.assign(camera,previous.camera);ctx.imageSmoothingEnabled=false;this.snap();}}
 };
 const arlongDepthDraw=MareWorldDepth.draw;
 MareWorldDepth.draw=function(c,p,actors,...rest){const q=window.__arlongQA;
  const event=q.tracking&&c===q.context?{kind:'scenery',id:p.id,drawn:false}:null;if(event)q.events.push(event);
  let sample=null;
  if(event&&p.id===q.depthTarget){const s=camera.worldToScreen(world.hero.x,world.hero.y),size=Math.ceil(combatVisualHeight(world.hero));
   const x=Math.max(0,Math.floor(s.x-size/2)),y=Math.max(0,Math.floor(s.y-size)),w=Math.min(size,W-x),h=Math.min(size,H-y);
   if(w>0&&h>0){event.sample={x,y,w,h};sample={x,y,w,h,before:c.getImageData(x,y,w,h).data};}}
  const drawn=arlongDepthDraw.call(this,c,p,actors,...rest);if(event)event.drawn=!!drawn;
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
   next.on('response',r=>{if(r.status()>=400&&/arlong|map-depth\/objects|sprites-combat-v2\/(kuroobi|chew)|new-islands\/(kuroobi|chew)/.test(r.url()))missing.push({status:r.status(),url:r.url()});});
   // Read the actual served build; a stale dist must fail without borrowing checkout code.
   await next.route('**/game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:instrument(await response.text())});});
   return next;
  };
  let context=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:1});page=await preparePage(context);
  const ready=()=>page.waitForFunction(()=>window.__arlongQA?.game&&__arlongQA.writer.owner&&__arlongQA.state()==='ready',null,{timeout:60000});
  const readyHero=async label=>{
   const before=await page.evaluate(()=>{const v=__mareDiagnostics().lobby96.worldVisual;return {state:v?.state,displayed:v?.displayed||null,preparation:v?.preparation};});
   // The portrait's visualState can be ready before the world's required clips.
   // Let the real RAF and asset queue finish, and require an actual exact draw.
   await page.waitForFunction(()=>{__arlongQA.snap();const v=__mareDiagnostics().lobby96.worldVisual;return v?.state==='ready'&&v.displayed?.exact===true&&v.preparation?.essentialReady===true;},null,{timeout:90000,polling:'raf'});
   const after=await page.evaluate(()=>{const v=__mareDiagnostics().lobby96.worldVisual;return {state:v.state,displayed:v.displayed,preparation:v.preparation,firstDrawAt:v.firstDrawAt};});
   results.playerFrames.push({label,before,after});
  };
  const shot=async name=>{await readyHero(name);await page.mouse.move(page.viewportSize().width-1,1);await page.screenshot({path:path.join(out,name+'.png')});};
  const openMap=async()=>{
   await page.evaluate(()=>__arlongQA.open('map'));await page.locator('[data-voyage-region=east-blue]').click();
   await page.waitForFunction(()=>{const im=document.querySelector('[data-island=arlong] [data-location-art]');return im?.complete&&im.naturalWidth>0;});
   const cover=await page.locator('[data-island=arlong] [data-location-art]').getAttribute('src');
   assert(new URL(cover,page.url()).pathname.endsWith('/assets/ui/voyage-hd/arlong.png'),'the existing Arlong cover must remain selected');
  };
  const travel=async()=>{
   await openMap();await page.locator('[data-island=arlong]').click();await page.locator('[data-travel-area=arlong]').click();
   await page.waitForFunction(()=>__mareDiagnostics().map.id==='arlong'&&__arlongQA.state()==='ready',null,{timeout:60000});
   const selected=await page.evaluate(()=>new URL(MareMapExports.prepare('arlong').src).pathname);
   assert(selected.endsWith('/'+paintedArt.file),'catalog travel must select the new Arlong Park painting');
   const actual=await page.evaluate(()=>{const q=__arlongQA;q.stop();q.snap();return {x:q.world.hero.x,y:q.world.hero.y};});
   assert.deepEqual(actual,spawn,'catalog travel must arrive at the new southern entrance');
   await readyHero('arrival');
  };
  const tour=async label=>{
   const routes=[];for(const id of districtIds){phase=label+' sector '+id;const route=await page.evaluate(id=>__arlongQA.district(id),id);assertWalk(route,label+' '+id);routes.push({id,...route});if(id==='palacio')await shot('arlong-park-palacio-'+label);}
   results.journeys.push({viewport:label,routes});
  };
  const returnByClick=async label=>{
   phase=label+' return';const approach=await page.evaluate(()=>__arlongQA.approachReturn());assertWalk(approach,label+' return approach');
   const point=await page.evaluate(()=>__arlongQA.returnScreen()),viewport=page.viewportSize();
   assert(point.x>=0&&point.x<viewport.width&&point.y>=0&&point.y<viewport.height,'the real return marker must be visible for clicking');
   await page.mouse.click(point.x,point.y);
   const returned=await page.evaluate(()=>{const q=__arlongQA;let steps=0;for(;steps<400&&__mareDiagnostics().map.id!=='lobby';steps++)q.step(.05,false);q.snap();return {map:__mareDiagnostics().map.id,steps};});
   assert.equal(returned.map,'lobby',label+' marker click must walk to the exit and return to the port');await ready();return returned;
  };

  const runtimeUrl=process.env.MARE_TEST_URL||'http://127.0.0.1:8174/';
  await page.goto(runtimeUrl,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__arlongQA);
  await page.locator('#characterName').fill('Arlong QA');await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();await ready();
  phase='preserved artwork';results.originalArt=[];
  for(const asset of originalArt){
   assert.equal(checksum(fs.readFileSync(path.join(root,asset.file))),asset.sha,'original checkout art: '+asset.file);
   const response=await page.request.get(new URL(asset.file,page.url()).href);assert.equal(response.status(),200,asset.file+' must ship in the served build');
   assert.equal(checksum(await response.body()),asset.sha,'served image bytes: '+asset.file);
   const decoded=await page.evaluate(async file=>{const im=new Image();im.src=new URL(file,location.href).href;await im.decode();return {width:im.naturalWidth,height:im.naturalHeight};},asset.file);
   assert.deepEqual(decoded,{width:asset.width,height:asset.height},asset.file+' must decode at its original resolution');results.originalArt.push({...asset,...decoded});
  }
  phase='level gate';await page.evaluate(()=>{__arlongQA.stop();__arlongQA.fixture(30);});await openMap();await page.locator('[data-island=arlong]').click();
  assert(await page.locator('[data-travel-area=arlong]').isDisabled(),'level 30 must not enter Arlong');await page.locator('#closePanel').click();
  await page.evaluate(()=>__arlongQA.fixture(31));
  phase='desktop arrival';await travel();
  await page.waitForFunction(()=>['kuroobi','chew'].every(type=>MareSpriteCombatV2.status(type,'walk','south')==='ready'),null,{timeout:60000});
  phase='new HD painting';
  const newBytes=fs.readFileSync(path.join(root,paintedArt.file)),decodedSource=require('pngjs').PNG.sync.read(newBytes);
  assert.deepEqual([decodedSource.width,decodedSource.height],[paintedArt.width,paintedArt.height],'the original generated PNG retains its native resolution');
  assert.equal(checksum(newBytes),paintedArt.sha,'the complete generated painting must remain byte-identical');
  Object.assign(paintedArt,{pixels:checksum(decodedSource.data)});
  const newResponse=await page.request.get(new URL(paintedArt.file,page.url()).href);assert.equal(newResponse.status(),200,'the new painting must ship in dist');
  assert.equal(checksum(await newResponse.body()),checksum(newBytes),'the shipped painting must match the complete source instead of a thumbnail or downscale');
  const painting=await page.evaluate(async()=>{
   const image=MareArlong.prepare(),canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
   const c=canvas.getContext('2d');c.drawImage(image,0,0);const pixels=c.getImageData(0,0,canvas.width,canvas.height).data;
   const hash=await crypto.subtle.digest('SHA-256',pixels),hex=Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
   return {src:new URL(image.src).pathname,natural:[image.naturalWidth,image.naturalHeight],declared:[MareArlongLayout.imageWidth,MareArlongLayout.imageHeight],pixels:hex,
    selected:MareMapExports.prepare('arlong')===image,mode:MareMapExports.get('arlong').spriteMode,
    regions:MareWorldDepth.regions('arlong').map(r=>({id:r.id,type:r.type,assetId:r.assetId||null}))};
  });
  assert(painting.src.endsWith('/'+paintedArt.file),'the active renderer must use the new HD scene');
  assert.deepEqual(painting.natural,[paintedArt.width,paintedArt.height]);assert.deepEqual(painting.declared,painting.natural);
  assert.equal(painting.pixels,paintedArt.pixels,'native decoded pixels remain identical to the generated source');
  assert.equal(painting.selected,true);assert.equal(painting.mode,'painted');
  assert(painting.regions.length&&painting.regions.every(r=>r.type==='arlong'&&!r.assetId),'painted silhouettes must not request or draw old object PNGs');results.painting=painting;
  phase='painting camera crops';
  const crops=await page.evaluate(()=>{
   const image=MareArlong.prepare(),checks=[];
   for(const [x,y]of [[1420,1950],[1152,576],[1920,768]]){
    const actual=document.createElement('canvas'),expected=document.createElement('canvas');
    actual.width=expected.width=192;actual.height=expected.height=128;
    const a=actual.getContext('2d'),b=expected.getContext('2d'),draw=a.drawImage.bind(a),calls=[];
    a.drawImage=function(im,...args){calls.push({newScene:im===image,smooth:this.imageSmoothingEnabled,quality:this.imageSmoothingQuality});return draw(im,...args);};
    a.translate(-x,-y);MareArlong.ground(a,{x,y},192,128);
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
  const layout=await page.evaluate(()=>{const q=__arlongQA,m=q.map(),d=MareMapExports.get('arlong');return {width:m.width,height:m.height,returnPoint:m.returnPoint,districts:d.districts.map(d=>d.id),mobs:q.world.mobs.map(m=>({id:m.spawnId,type:m.type,level:m.level,reachable:q.nav().path(q.world.hero,m).length>0})),outside:q.nav().walkable(8,8)};});
  assert.deepEqual([layout.width,layout.height],[3072,2304],'the active world dimensions remain independent from the native source image');
  assert.deepEqual({x:layout.returnPoint.x,y:layout.returnPoint.y,radius:layout.returnPoint.radius},returnPoint);
  assert.deepEqual(layout.districts,districtIds);assert.equal(layout.mobs.length,8);
  assert.deepEqual(layout.mobs.map(m=>m.id).sort(),districtIds.flatMap(id=>[0,1].map(n=>'arlong-'+id+'-'+n)).sort());
  assert(layout.mobs.every(m=>['kuroobi','chew'].includes(m.type)&&m.level===33&&m.reachable),'all eight Kuroobi/Chew encounters must remain reachable and level 33');assert.equal(layout.outside,false);results.layout=layout;
  await shot('arlong-park-entrada-desktop');
  const overview=await page.evaluate(()=>__arlongQA.overview());assert(overview.startsWith('data:image/png;base64,'));
  const overviewBytes=Buffer.from(overview.split(',')[1],'base64');assert.deepEqual([overviewBytes.readUInt32BE(16),overviewBytes.readUInt32BE(20)],[3072,2304]);
  fs.writeFileSync(path.join(out,'arlong-park-overview.png'),overviewBytes);
  await tour('desktop');

  phase='scenery depth';await readyHero('before depth');
  const depth=await page.evaluate(()=>__arlongQA.depthFixture());assert(depth.pixels>40,'the painted silhouette must visibly cover the behind fixture');
  results.depth=depth;depth.frames=[];
  assert.equal(depth.type,'arlong');assert.equal(depth.assetId,null);
  assert(depth.paintCalls.length&&depth.paintCalls.every(call=>call.newScene&&call.natural[0]===paintedArt.width&&call.natural[1]===paintedArt.height&&call.smooth&&call.quality==='high'),'occlusion must crop the new painting at full source detail');
  assert.equal(depth.emptyDraws,0,'the painting must not be redrawn when no actor is behind it');assert.equal(depth.frontDraws,0,'a front actor must not receive an opaque scenery redraw');
  for(const side of ['behind','front']){
   const route=await page.evaluate(point=>__arlongQA.walk(point),depth[side]);assertWalk(route,'depth '+side);
   await readyHero('depth '+side);
   const events=await page.evaluate(id=>__arlongQA.depthOrder(id),depth.id),hero=events.findIndex(e=>e.kind==='hero'),scenery=events.findIndex(e=>e.kind==='scenery'&&e.id===depth.id);
   depth.frames.push({side,heroIndex:hero,sceneryIndex:scenery,scenery:events[scenery]});
   assert(hero>=0&&scenery>=0,'the real frame must process both the hero and scenery in depth order');
   assert(side==='behind'?hero<scenery:scenery<hero,'the real scenery queue must place the hero '+side+' the painted silhouette');
   if(side==='behind'){
    assert.equal(events[scenery].drawn,true,'the actual world frame must paint the silhouette over the hero behind it');
    assert(events[scenery].changedHeroPixels>40,'the actual painting pass must replace visible pixels in the hero body area: '+JSON.stringify(events[scenery]));depth.changedHeroPixels=events[scenery].changedHeroPixels;
   }
   await shot('arlong-park-depth-'+side);
  }results.depth=depth;results.desktopReturn=await returnByClick('desktop');

  phase='normal combat';await travel();const opponent=await page.evaluate(()=>__arlongQA.stageCombat());
  await page.waitForFunction(()=>__mareDiagnostics().lobby96.visualState==='ready');await shot('arlong-park-combat');
  const combat=await page.evaluate(()=>__arlongQA.fight());assert(combat.kills>0&&combat.hunts===combat.kills,'combat must update both the general and Arlong hunt ledgers');assert(combat.respawns[opponent]>0,'the defeated stable slot must retain its respawn deadline');results.combat={opponent,...combat};
  phase='save reload';const saved=await page.evaluate(()=>{const q=__arlongQA;q.save();return {area:q.game.area,kills:q.game.stats.kills,huntKills:q.game.hunts.areas.arlong.kills,respawns:{...q.game.hunts.areas.arlong.respawns}};});
  await page.reload({waitUntil:'domcontentloaded'});await ready();
  const reloaded=await page.evaluate(()=>{const q=__arlongQA;q.stop();return {area:q.game.area,kills:q.game.stats.kills,huntKills:q.game.hunts.areas.arlong.kills,respawns:{...q.game.hunts.areas.arlong.respawns}};});
  assert.deepEqual(reloaded,saved,'reload must retain the current area, kills and original slot deadlines');results.reload=true;

  phase='mobile DPR 2';const storageState=await context.storageState();await context.close();
  context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,storageState});page=await preparePage(context);
  await page.goto(runtimeUrl,{waitUntil:'domcontentloaded'});await ready();
  assert.equal(await page.evaluate(()=>devicePixelRatio),2,'mobile must run at actual DPR 2, not only a smaller desktop viewport');
  const mobileSave=await page.evaluate(()=>{const q=__arlongQA;q.stop();return {area:q.game.area,kills:q.game.stats.kills,huntKills:q.game.hunts.areas.arlong.kills,respawns:{...q.game.hunts.areas.arlong.respawns}};});
  assert.deepEqual(mobileSave,reloaded,'the mobile context must receive the same area, progress and guard deadlines before travelling');results.mobileSave=true;
  phase='mobile catalog';await openMap();
  const bounds=await page.locator('#panelOverlay .dialog').boundingBox();assert(bounds&&bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=394&&bounds.y+bounds.height<=853,'the mobile catalog must fit inside the viewport');
  assert(await page.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'the mobile catalog must not overflow horizontally');await shot('arlong-park-catalog-mobile');
  await page.locator('#closePanel').click();await travel();
  results.mobile=await page.evaluate(()=>{const image=MareArlong.prepare(),canvas=document.getElementById('worldCanvas'),r=canvas.getBoundingClientRect();return {dpr:devicePixelRatio,backing:[canvas.width,canvas.height],css:[r.width,r.height],natural:[image.naturalWidth,image.naturalHeight],src:new URL(image.src).pathname,zoom:__mareDiagnostics().camera.zoom};});
  assert.deepEqual(results.mobile.natural,[paintedArt.width,paintedArt.height]);assert(results.mobile.src.endsWith('/'+paintedArt.file),'mobile must keep the complete HD source');
  assert.equal(results.mobile.zoom,1,'adding the painting must not force a new global zoom');
  assert(results.mobile.backing.every((v,i)=>Math.abs(v-results.mobile.css[i])<=1),'the established logical canvas scale stays unchanged at DPR 2');
  await shot('arlong-park-entrada-mobile');
  const mobileShot=fs.readFileSync(path.join(out,'arlong-park-entrada-mobile.png'));
  results.mobile.screenshot=[mobileShot.readUInt32BE(16),mobileShot.readUInt32BE(20)];
  assert.deepEqual(results.mobile.screenshot,[786,1704],'the mobile evidence must contain the actual DPR 2 screenshot');
  await tour('mobile');results.mobileReturn=await returnByClick('mobile');
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);results.viewports=['1366x768 @ DPR1','393x852 @ DPR2'];results.returnByClick=true;
  fs.writeFileSync(path.join(out,'arlong-park-browser-results.json'),JSON.stringify({...results,errors,missing},null,2)+'\n');
  console.log(JSON.stringify({...results,errors,missing}));
 }catch(error){
  const player=page?await page.evaluate(()=>({hero:window.__arlongQA?.world.hero,renderer:window.__mareDiagnostics?.().lobby96})).catch(()=>null):null;
  fs.writeFileSync(path.join(out,'failure-results.json'),JSON.stringify({...results,phase,message:error.message,player,errors,missing},null,2)+'\n');
  if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error({phase,errors,missing});throw error;
 }
 finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
