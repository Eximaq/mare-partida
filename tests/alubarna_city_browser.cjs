'use strict';
// Focused browser smoke for five Alubarna destinations, the HD painting,
// real navigation, concave gate occlusion and isolated combat/save fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const out=process.env.MARE_QA_DIR||path.join(root,'.maintenance-local/browser/alubarna-city');
const originalArt=[
 {
  "file": "assets/alubarna/map.png",
  "width": 6592,
  "height": 5248,
  "sha": "1a071df25670275b22ef0f8c99056e3cf1d628a289408cb00b4504c5440a9fb5"
 },
 {
  "file": "assets/ui/voyage-hd/alubarna-01.png",
  "width": 320,
  "height": 180,
  "sha": "d7829e6a938792d86b18ef285448f36aea09141cd1f623c64d0cf1dcb4d9f706"
 },
 {
  "file": "assets/ui/voyage-hd/alubarna-02.png",
  "width": 320,
  "height": 180,
  "sha": "eaceadb0309a5e5127e85b5d4263573ffdf583a1221438dd0b6f124027b1f26f"
 },
 {
  "file": "assets/ui/voyage-hd/alubarna-03.png",
  "width": 320,
  "height": 180,
  "sha": "9b990a248332b570d26b6d17df3f5a577cd16f2e7b65573e149e98757b5688dc"
 },
 {
  "file": "assets/ui/voyage-hd/alubarna-04.png",
  "width": 320,
  "height": 180,
  "sha": "959612d16dfa10c251cbabccf834ec2caf66f25069e8e32f0cafb180834cd2f0"
 },
 {
  "file": "assets/ui/voyage-hd/alubarna-05.png",
  "width": 320,
  "height": 180,
  "sha": "a9e73d1aff6c517fca3c07bab8f387087d28b1e42ecd8b890061e5ca64a7f963"
 }
];
const districtIds=['entrada','mercado','praca','bairro','palacio'];
const destinations=[
 ['alubarna-01',50,'puppu',53],['alubarna-02',55,'valentine',58],
 ['alubarna-03',60,'merry',63],['alubarna-04',65,'doublefinger',68],['alubarna-05',70,'mr1',75]
];
// Literal expectations from the independently reviewed original painting,
// not from the navigation mask under test.
const reviewedScene={
 ready:true,
 paintedArt:{file:'assets/alubarna-city/royal-capital/scene-hd.png',width:1448,height:1086,sha:'0f790a1381b0fe18cb7c8d8ed85f4722d81cc66892b68cbe26ddd177ba1bff63'},
 worldSize:{width:3072,height:2304},spawn:{x:1536,y:1536},returnPoint:{x:1536,y:2112,radius:48},
 landmarkProbes:[['palace-stairs',724,340],['palace-landing',724,295],['northeast-stairs',1192,215],['northeast-landing',1230,150]],
 solidProbes:[['west-palace-garden',540,360],['clock-tower-foot',1320,697],['west-market',155,550],
  ['west-gate-pier',650,875],['east-gate-pier',800,875],['outside-desert',40,1030]],
 cameraCrops:[[1088,448],[1024,1408],[2304,384]],
 depthSpec:{id:'alubarna-city-south-arch',behind:{x:724,y:800},front:{x:724,y:960},opening:{x:724,y:875}},
 returnApproach:{desktop:{x:0,y:-100},mobile:{x:0,y:-100}}
};
const {paintedArt,worldSize,spawn,returnPoint,landmarkProbes,solidProbes,cameraCrops,depthSpec,returnApproach}=reviewedScene;
const checksum=bytes=>createHash('sha256').update(bytes).digest('hex');

function instrument(source){
 const marker='  window.__mareDiagnostics=',tick='function tickSimulation(dt){',hero='function drawHeroLayer(){';
 assert(source.includes(marker)&&source.includes(tick)&&source.includes(hero),'the served game must expose the established QA insertion points');
 source=source.replace(tick,tick+'if(window.__alubarnaCityQA?.paused&&!window.__alubarnaCityQA.stepping)return;');
 source=source.replace(hero,hero+"if(window.__alubarnaCityQA?.tracking)window.__alubarnaCityQA.events.push({kind:'hero'});");
 return source.replace(marker,`  window.__alubarnaCityQA={paused:true,stepping:false,tracking:false,events:[],
 sourcePoint(x,y){return {x:Math.round(x*${worldSize.width}/${paintedArt.width}*100)/100,y:Math.round(y*${worldSize.height}/${paintedArt.height}*100)/100};},
 get game(){return game},get world(){return world},get writer(){return saveWriter},
 get context(){return ctx},map:activeMap,nav:navigator,state:mapArtState,open:openPanel,save:saveGame,
 stop(){autoPlay=false;autoSkills=false;travelPath=[];world.target=null;},
 fixture(level){game.level=level;Object.assign(game.attributes,{strength:50000,vitality:50000});
  game.equipment.weapon ||= newItem(itemDefs[starterWeapon(game.classId)]);
  game.equipment.weapon.baseStats={...game.equipment.weapon.baseStats,attack:10000000};
  game.hp=getDerived().maxHP;game.energy=getDerived().maxEnergy;saveGame();updateUI();},
 step(dt,render=true){this.stepping=true;try{tick(dt)}finally{this.stepping=false}if(render)presentWorld();},
 snap(){camera.update(nameplateCameraFocus(),activeMap(),0,true,world.hero);presentWorld();},
 walk(goal,tolerance=2){this.stop();const before={x:world.hero.x,y:world.hero.y};
  if(!walkTo(goal))throw Error('No real walking route to '+JSON.stringify(goal));
  let steps=0,walkable=true,travelled=0,maxStep=0,last={...before};const moveSpeed=getDerived().moveSpeed;
  for(;steps<2200&&Math.hypot(world.hero.x-goal.x,world.hero.y-goal.y)>tolerance;steps++){
   this.step(.05,false);walkable&&=navigator().walkable(world.hero.x,world.hero.y);
   const moved=Math.hypot(world.hero.x-last.x,world.hero.y-last.y);travelled+=moved;maxStep=Math.max(maxStep,moved);last={x:world.hero.x,y:world.hero.y};
  }this.snap();return {before,goal,steps,walkable,travelled,maxStep,moveSpeed,hero:{x:world.hero.x,y:world.hero.y}};},
 district(id){const p=MareMapExports.get(__alubarnaCityQA.game.area).districts.find(d=>d.id===id);if(!p)throw Error('Missing district '+id);return this.walk({x:p.x,y:p.y});},
 approachReturn(){const r=activeMap().returnPoint,n=navigator();
  const offsets=${JSON.stringify(returnApproach)},offset=offsets[W<768?'mobile':'desktop'];
  const p={x:r.x+offset.x,y:r.y+offset.y};
  if(!n.walkable(p.x,p.y)||!n.clear(p,r)||!n.path(world.hero,p).length)throw Error('No natural central walkway approach to the return marker');return this.walk(p);},
 returnScreen(){this.snap();const p=activeMap().returnPoint,r=canvas.getBoundingClientRect(),s=camera.worldToScreen(p.x,p.y);
  const x=r.left+s.x*r.width/W,y=r.top+s.y*r.height/H,hit=document.elementFromPoint(x,y),bounds=hit?.getBoundingClientRect();
  return {x,y,hitId:hit?.id,hitTag:hit?.tagName,hitClass:hit?.getAttribute('class'),hitText:hit?.textContent?.trim().slice(0,120),hitBounds:bounds&&{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height}};},
 stageCombat(){this.stop();const m=world.mobs.find(m=>m.alive&&m.hp>0);if(!m)throw Error('No live Alubarna opponent');
  const n=navigator(),p=[[-48,0],[48,0],[0,48],[0,-48]].map(([dx,dy])=>({x:m.x+dx,y:m.y+dy})).find(p=>n.walkable(p.x,p.y)&&n.clear(p,m));
  if(!p)throw Error('No walkable combat fixture');this.walk(p);m.attackClock=10;this.snap();return m.spawnId;},
 progress(){const hunt=game.hunts.areas[game.area];return {area:game.area,level:game.level,kills:game.stats.kills,huntKills:hunt.kills,
  xp:game.xp,gold:game.gold,xpEarned:game.stats.xpEarned,goldEarned:game.stats.goldEarned,potions:game.potions,materials:game.materials,
  inventoryIds:game.inventory.map(item=>item.id).sort(),bosses:hunt.bosses,firstRewardClaimed:hunt.firstRewardClaimed,respawns:{...hunt.respawns}};},
 fight(){const kills=game.stats.kills,hunts=game.hunts.areas[game.area].kills,xp=game.stats.xpEarned,gold=game.stats.goldEarned;autoPlay=true;autoSkills=false;
  let steps=0;for(;steps<600&&game.stats.kills===kills;steps++)this.step(.05);
  this.stop();saveGame();return {steps,kills:game.stats.kills-kills,hunts:game.hunts.areas[game.area].kills-hunts,
   xp:game.stats.xpEarned-xp,gold:game.stats.goldEarned-gold,bosses:game.hunts.areas[game.area].bosses,firstRewardClaimed:game.hunts.areas[game.area].firstRewardClaimed,
   respawns:{...game.hunts.areas[game.area].respawns}};},
 depthFixture(){const n=navigator(),spec=${JSON.stringify(depthSpec)},r=MareWorldDepth.regions(__alubarnaCityQA.game.area).find(r=>r.id===spec.id);
  if(!r?.tall)throw Error('The authored city gate must provide a depth region');
  const point=(x,y)=>this.sourcePoint(x,y);
  const behind=point(spec.behind.x,spec.behind.y),front=point(spec.front.x,spec.front.y),opening=point(spec.opening.x,spec.opening.y);
  if(!n.walkable(behind.x,behind.y)||!n.walkable(front.x,front.y)||!n.walkable(opening.x,opening.y)||!n.path(world.hero,behind).length||!n.path(behind,front).length)throw Error('Both sides and the opening of the city gate must be reachable');
  if(!MareWorld.occluded(behind,[r],74,74)||MareWorld.occluded(front,[r],74,74))throw Error('The city gate must distinguish behind and front positions');
  const probe=document.createElement('canvas');probe.width=48;probe.height=120;const c=probe.getContext('2d');let paintCalls=[];
  const originalDraw=c.drawImage.bind(c);c.drawImage=function(image,...args){paintCalls.push({newScene:image===MareAlubarnaCity.prepare(),natural:[image.naturalWidth,image.naturalHeight],smooth:this.imageSmoothingEnabled});return originalDraw(image,...args);};
  c.save();c.translate(24-behind.x,112-behind.y);MareWorldDepth.draw(c,r,[{...behind,visualHeight:74,visualWidth:74}]);c.restore();
  const data=c.getImageData(12,32,24,68).data;let pixels=0;for(let i=3;i<data.length;i+=4)if(data[i]>0)pixels++;
  const behindCalls=paintCalls.slice();paintCalls=[];MareWorldDepth.draw(c,r,[]);const emptyDraws=paintCalls.length;
  paintCalls=[];MareWorldDepth.draw(c,r,[{...front,visualHeight:74,visualWidth:74}]);const frontDraws=paintCalls.length;
  c.clearRect(0,0,48,120);c.save();c.translate(24-opening.x,112-opening.y);
  MareWorldDepth.draw(c,r,[{...opening,visualHeight:74,visualWidth:74}]);c.restore();
  const openData=c.getImageData(12,32,24,68).data;let openingPixels=0;for(let i=3;i<openData.length;i+=4)if(openData[i]>0)openingPixels++;
  return {id:r.id,type:r.type,assetId:r.assetId||null,source:{behind:spec.behind,front:spec.front,opening:spec.opening},behind,front,opening,pixels,openingPixels,paintCalls:behindCalls,emptyDraws,frontDraws};},
 depthOrder(id){this.events=[];this.depthTarget=id;this.tracking=true;try{this.snap()}finally{this.tracking=false;this.depthTarget=null}return this.events;},
 overview(){this.stop();const previous={W,H,width:canvas.width,height:canvas.height,camera:{...camera}};
  try{canvas.width=W=activeMap().width;canvas.height=H=activeMap().height;ctx.imageSmoothingEnabled=false;
   camera.width=W;camera.height=H;camera.x=0;camera.y=0;drawWorld();return canvas.toDataURL('image/png');
  }finally{canvas.width=previous.width;canvas.height=previous.height;W=previous.W;H=previous.H;Object.assign(camera,previous.camera);ctx.imageSmoothingEnabled=false;this.snap();}}
 };
 const alubarnaDepthDraw=MareWorldDepth.draw;
 MareWorldDepth.draw=function(c,p,actors,...rest){const q=window.__alubarnaCityQA;
  const event=q.tracking&&c===q.context?{kind:'scenery',id:p.id,drawn:false}:null;if(event)q.events.push(event);
  let sample=null;
  if(event&&p.id===q.depthTarget){const s=camera.worldToScreen(world.hero.x,world.hero.y),size=Math.ceil(combatVisualHeight(world.hero));
   const x=Math.max(0,Math.floor(s.x-size/2)),y=Math.max(0,Math.floor(s.y-size)),w=Math.min(size,W-x),h=Math.min(size,H-y);
   if(w>0&&h>0){event.sample={x,y,w,h};sample={x,y,w,h,before:c.getImageData(x,y,w,h).data};}}
  const drawn=alubarnaDepthDraw.call(this,c,p,actors,...rest);if(event)event.drawn=!!drawn;
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
 assert(reviewedScene.ready,'The Alubarna painting and independent navigation probes must be reviewed before browser QA');
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 let page,phase='boot';const errors=[],missing=[],results={viewports:[],destinations:[],journeys:[],playerFrames:[]};
 try{
  const preparePage=async context=>{
   const next=await context.newPage();next.setDefaultTimeout(30000);next.on('pageerror',e=>errors.push(e.message));
   next.on('response',r=>{if(r.status()>=400&&/alubarna|map-depth\/objects|puppu|valentine|merry|doublefinger|mr1/.test(r.url()))missing.push({status:r.status(),url:r.url()});});
   // Read the actual served build; a stale dist must fail without borrowing checkout code.
   await next.route('**/game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:instrument(await response.text())});});
   return next;
  };
  let context=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:1});page=await preparePage(context);
  const ready=()=>page.waitForFunction(()=>window.__alubarnaCityQA?.game&&__alubarnaCityQA.writer.owner&&__alubarnaCityQA.state()==='ready',null,{timeout:60000});
  const readyHero=async label=>{
   const before=await page.evaluate(()=>{const v=__mareDiagnostics().lobby96.worldVisual;return {state:v?.state,displayed:v?.displayed||null,preparation:v?.preparation};});
   // The portrait's visualState can be ready before the world's required clips.
   // Let the real RAF and asset queue finish, and require an actual exact draw.
   await page.waitForFunction(()=>{__alubarnaCityQA.snap();const v=__mareDiagnostics().lobby96.worldVisual;return v?.state==='ready'&&v.displayed?.exact===true&&v.preparation?.essentialReady===true;},null,{timeout:90000,polling:'raf'});
   const after=await page.evaluate(()=>{const v=__mareDiagnostics().lobby96.worldVisual;return {state:v.state,displayed:v.displayed,preparation:v.preparation,firstDrawAt:v.firstDrawAt};});
   results.playerFrames.push({label,before,after});
  };
  const shot=async name=>{await readyHero(name);await page.mouse.move(page.viewportSize().width-1,1);await page.screenshot({path:path.join(out,name+'.png')});};
  const openMap=async(id='alubarna-01')=>{
   await page.evaluate(()=>__alubarnaCityQA.open('map'));await page.locator('[data-voyage-region=alabasta]').click();
   await page.waitForFunction(id=>{const im=document.querySelector('[data-island="'+id+'"] [data-location-art]');return im?.complete&&im.naturalWidth>0;},id);
   const cover=await page.locator('[data-island="'+id+'"] [data-location-art]').getAttribute('src');
   assert(new URL(cover,page.url()).pathname.endsWith('/assets/ui/voyage-hd/'+id+'.png'),'the existing Alubarna cover must remain selected: '+id);
  };
  const travel=async(id='alubarna-01')=>{
   await openMap(id);await page.locator('[data-island="'+id+'"]').click();await page.locator('[data-travel-area="'+id+'"]').click();
   await page.waitForFunction(id=>__mareDiagnostics().map.id===id&&__alubarnaCityQA.state()==='ready',id,{timeout:60000});
   const selected=await page.evaluate(()=>new URL(MareMapExports.prepare(__alubarnaCityQA.game.area).src).pathname);
   assert(selected.endsWith('/'+paintedArt.file),'catalog travel must select the new Alubarna painting');
   const actual=await page.evaluate(()=>{const q=__alubarnaCityQA;q.stop();q.snap();return {x:q.world.hero.x,y:q.world.hero.y};});
   assert.deepEqual(actual,spawn,'catalog travel must arrive at the authored city entrance');
   await readyHero(id+' arrival');
  };
  const tour=async label=>{
   const routes=[];for(const id of districtIds){phase=label+' sector '+id;const route=await page.evaluate(id=>__alubarnaCityQA.district(id),id);assertWalk(route,label+' '+id);routes.push({id,...route});}
   results.journeys.push({viewport:label,routes});
  };
  const returnByClick=async label=>{
   phase=label+' return';const approach=await page.evaluate(()=>__alubarnaCityQA.approachReturn());assertWalk(approach,label+' return approach');
   const point=await page.evaluate(()=>__alubarnaCityQA.returnScreen()),viewport=page.viewportSize();
   (results.returnProbes||=[]).push({label,point,approach});
   assert(point.x>=0&&point.x<viewport.width&&point.y>=0&&point.y<viewport.height,'the real return marker must be visible for clicking');
   assert.equal(point.hitId,'worldCanvas',label+' return marker must be exposed on the canvas when approaching along the authored return path');
   await page.mouse.click(point.x,point.y);
   const returned=await page.evaluate(()=>{const q=__alubarnaCityQA;let steps=0;for(;steps<400&&__mareDiagnostics().map.id!=='lobby';steps++)q.step(.05,false);q.snap();return {map:__mareDiagnostics().map.id,steps};});
   assert.equal(returned.map,'lobby',label+' marker click must walk to the exit and return to the port');await ready();return {...returned,approach:{goal:approach.goal,hero:approach.hero},marker:point};
  };

  const runtimeUrl=process.env.MARE_TEST_URL||'http://127.0.0.1:8185/';
  await page.goto(runtimeUrl,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__alubarnaCityQA);
  await page.locator('#characterName').fill('Alubarna QA');await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();await ready();
  phase='preserved artwork';results.originalArt=[];
  for(const asset of originalArt){
   assert.equal(checksum(fs.readFileSync(path.join(root,asset.file))),asset.sha,'original checkout art: '+asset.file);
   const response=await page.request.get(new URL(asset.file,page.url()).href);assert.equal(response.status(),200,asset.file+' must ship in the served build');
   assert.equal(checksum(await response.body()),asset.sha,'served image bytes: '+asset.file);
   const decoded=await page.evaluate(async file=>{const im=new Image();im.src=new URL(file,location.href).href;await im.decode();return {width:im.naturalWidth,height:im.naturalHeight};},asset.file);
   assert.deepEqual(decoded,{width:asset.width,height:asset.height},asset.file+' must decode at its original resolution');results.originalArt.push({...asset,...decoded});
  }
  for(const [id,min,type,level]of destinations){
   phase=id+' level gate';await page.evaluate(min=>{__alubarnaCityQA.stop();__alubarnaCityQA.fixture(min-1);},min);
   await openMap(id);await page.locator('[data-island="'+id+'"]').click();
   assert(await page.locator('[data-travel-area="'+id+'"]').isDisabled(),'level '+(min-1)+' must not enter '+id);
   await page.locator('#closePanel').click();await page.evaluate(min=>__alubarnaCityQA.fixture(min),min);
   await travel(id);await page.waitForFunction(type=>MareSpriteCombatV2.status(type,'idle','south')==='ready',type,{timeout:60000});
   const actual=await page.evaluate(()=>{const q=__alubarnaCityQA,m=q.map(),d=MareMapExports.get(q.game.area);return {id:m.id,width:m.width,height:m.height,returnPoint:m.returnPoint,districts:d.districts.map(d=>d.id),mobs:q.world.mobs.map(m=>({id:m.spawnId,type:m.type,level:m.level,reachable:q.nav().path(q.world.hero,m).length>0}))};});
   assert.equal(actual.id,id);assert.deepEqual([actual.width,actual.height],[worldSize.width,worldSize.height]);
   assert.deepEqual({x:actual.returnPoint.x,y:actual.returnPoint.y,radius:actual.returnPoint.radius},returnPoint);
   assert.deepEqual(actual.districts,districtIds);assert.equal(actual.mobs.length,10);
   assert.deepEqual(actual.mobs.map(m=>m.id).sort(),districtIds.flatMap((sector,i)=>[id+'-'+sector+'-'+i*2,id+'-'+sector+'-'+(i*2+1)]).sort());
   assert(actual.mobs.every(m=>m.type===type&&m.level===level&&m.reachable),'all ten encounters must retain their type, level and reachable independent IDs: '+id);
   results.destinations.push({min,type,level,...actual});
  }
  await page.evaluate(()=>__alubarnaCityQA.fixture(70));await travel();
  phase='new HD painting';
  const newBytes=fs.readFileSync(path.join(root,paintedArt.file)),decodedSource=require('pngjs').PNG.sync.read(newBytes);
  assert.deepEqual([decodedSource.width,decodedSource.height],[paintedArt.width,paintedArt.height],'the original generated PNG retains its native resolution');
  assert.equal(checksum(newBytes),paintedArt.sha,'the complete generated painting must remain byte-identical');
  Object.assign(paintedArt,{pixels:checksum(decodedSource.data)});
  const newResponse=await page.request.get(new URL(paintedArt.file,page.url()).href);assert.equal(newResponse.status(),200,'the new painting must ship in dist');
  assert.equal(checksum(await newResponse.body()),checksum(newBytes),'the shipped painting must match the complete source instead of a thumbnail or downscale');
  const painting=await page.evaluate(async()=>{
   const image=MareAlubarnaCity.prepare(),canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
   const c=canvas.getContext('2d');c.drawImage(image,0,0);const pixels=c.getImageData(0,0,canvas.width,canvas.height).data;
   const hash=await crypto.subtle.digest('SHA-256',pixels),hex=Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
   return {src:new URL(image.src).pathname,natural:[image.naturalWidth,image.naturalHeight],declared:[MareAlubarnaCityLayout.imageWidth,MareAlubarnaCityLayout.imageHeight],pixels:hex,
    selected:MareMapExports.prepare(__alubarnaCityQA.game.area)===image,mode:MareMapExports.get(__alubarnaCityQA.game.area).spriteMode,
    regions:MareWorldDepth.regions(__alubarnaCityQA.game.area).map(r=>({id:r.id,type:r.type,assetId:r.assetId||null}))};
  });
  assert(painting.src.endsWith('/'+paintedArt.file),'the active renderer must use the new HD scene');
  assert.deepEqual(painting.natural,[paintedArt.width,paintedArt.height]);assert.deepEqual(painting.declared,painting.natural);
  assert.equal(painting.pixels,paintedArt.pixels,'native decoded pixels remain identical to the generated source');
  assert.equal(painting.selected,true);assert.equal(painting.mode,'painted');
  assert(painting.regions.length&&painting.regions.every(r=>r.type==='alubarna-city'&&!r.assetId),'painted silhouettes must not request or draw old object PNGs');results.painting=painting;
  phase='painting camera crops';
  const crops=await page.evaluate(({worldSize,cameraCrops})=>{
   const image=MareAlubarnaCity.prepare(),checks=[];
   for(const [x,y]of cameraCrops){
    const actual=document.createElement('canvas'),expected=document.createElement('canvas');
    actual.width=expected.width=192;actual.height=expected.height=128;
    const a=actual.getContext('2d'),b=expected.getContext('2d'),draw=a.drawImage.bind(a),calls=[];
    a.drawImage=function(im,...args){calls.push({newScene:im===image,smooth:this.imageSmoothingEnabled,quality:this.imageSmoothingQuality});return draw(im,...args);};
    a.translate(-x,-y);MareAlubarnaCity.ground(a,{x,y},192,128);
    // Independent reference: place the entire source at world size, without
    // reusing the renderer's crop calculation or drawing an intermediate bitmap.
    b.imageSmoothingEnabled=false;
    b.drawImage(image,0,0,image.naturalWidth,image.naturalHeight,-x,-y,worldSize.width,worldSize.height);
    const have=a.getImageData(4,4,184,120).data,want=b.getImageData(4,4,184,120).data;
    let difference=0,badChannels=0,maxDifference=0,opaque=0;
    for(let i=0;i<have.length;i++){
     if(i%4===3){opaque+=Number(have[i]===255);continue;}
     const delta=Math.abs(have[i]-want[i]);difference+=delta;badChannels+=Number(delta>3);maxDifference=Math.max(maxDifference,delta);
    }
    checks.push({x,y,calls,opaque,pixels:have.length/4,meanDifference:difference/(have.length*.75),badFraction:badChannels/(have.length*.75),maxDifference});
   }
   return checks;
  },{worldSize,cameraCrops});
  for(const crop of crops){
   assert(crop.calls.length&&crop.calls.every(call=>call.newScene&&call.smooth===false),'actual camera crops must use the new scene with nearest-neighbor pixels');
   assert.equal(crop.opaque,crop.pixels,'camera crop must completely paint the viewport');
   assert(crop.meanDifference<.25&&crop.badFraction<.01,'camera crop must match the complete source at world scale: '+JSON.stringify(crop));
  }results.paintingCrops=crops;
  results.solidProbes=await page.evaluate(probes=>probes.map(([id,x,y])=>{const point=__alubarnaCityQA.sourcePoint(x,y);return {id,source:{x,y},point,walkable:__alubarnaCityQA.nav().walkable(point.x,point.y)};}),solidProbes);
  for(const probe of results.solidProbes)assert.equal(probe.walkable,false,'painted terrain and scenery must block walking: '+probe.id);
  await shot('alubarna-entrada-desktop');
  const overview=await page.evaluate(()=>__alubarnaCityQA.overview());assert(overview.startsWith('data:image/png;base64,'));
  const overviewBytes=Buffer.from(overview.split(',')[1],'base64');assert.deepEqual([overviewBytes.readUInt32BE(16),overviewBytes.readUInt32BE(20)],[worldSize.width,worldSize.height]);
  fs.writeFileSync(path.join(out,'alubarna-overview.png'),overviewBytes);
  await tour('desktop');

  // Independently reviewed painted landmarks exercise city routes and
  // boundaries without changing navigation or moving the hero by assignment.
  results.exactRoutes=[];
  assert(landmarkProbes.length>=2,'painted city landmarks must be reviewed before accepting this scene');
  for(const [id,x,y]of landmarkProbes){
   phase='exact route '+id;
   const goal={x:Math.round(x*worldSize.width/paintedArt.width*100)/100,y:Math.round(y*worldSize.height/paintedArt.height*100)/100};
   const route=await page.evaluate(point=>__alubarnaCityQA.walk(point,.1),goal);assertWalk(route,phase);
   assert(Math.hypot(route.hero.x-goal.x,route.hero.y-goal.y)<=.1,phase+' reaches the exact painted point');
   if(results.exactRoutes.length)assert.deepEqual(route.before,results.exactRoutes.at(-1).hero,'the probe continues from the preceding walked position');
   results.exactRoutes.push({id,source:{x,y},...route});
  }
  phase='scenery depth';await readyHero('before depth');
  const depth=await page.evaluate(()=>__alubarnaCityQA.depthFixture());assert(depth.pixels>40,'the painted silhouette must visibly cover the behind fixture');
  results.depth=depth;depth.frames=[];
  assert.equal(depth.type,'alubarna-city');assert.equal(depth.assetId,null);
  assert(depth.paintCalls.length&&depth.paintCalls.every(call=>call.newScene&&call.natural[0]===paintedArt.width&&call.natural[1]===paintedArt.height&&call.smooth===false),'occlusion must crop the new painting at full source detail');
  assert.equal(depth.emptyDraws,0,'the painting must not be redrawn when no actor is behind it');assert.equal(depth.frontDraws,0,'a front actor must not receive an opaque scenery redraw');
  assert.equal(depth.openingPixels,0,'the concave mask must preserve the visible opening instead of drawing an opaque rectangle over the actor');
  for(const side of ['behind','front']){
   const route=await page.evaluate(point=>__alubarnaCityQA.walk(point),depth[side]);assertWalk(route,'depth '+side);
   await readyHero('depth '+side);
   const events=await page.evaluate(id=>__alubarnaCityQA.depthOrder(id),depth.id),hero=events.findIndex(e=>e.kind==='hero'),scenery=events.findIndex(e=>e.kind==='scenery'&&e.id===depth.id);
   depth.frames.push({side,heroIndex:hero,sceneryIndex:scenery,scenery:events[scenery]});
   assert(hero>=0&&scenery>=0,'the real frame must process both the hero and scenery in depth order');
   assert(side==='behind'?hero<scenery:scenery<hero,'the real scenery queue must place the hero '+side+' the painted silhouette');
   if(side==='behind'){
    assert.equal(events[scenery].drawn,true,'the actual world frame must paint the silhouette over the hero behind it');
    assert(events[scenery].changedHeroPixels>40,'the actual painting pass must replace visible pixels in the hero body area: '+JSON.stringify(events[scenery]));depth.changedHeroPixels=events[scenery].changedHeroPixels;
   }
   if(side==='behind')await shot('alubarna-depth-'+side);
  }
  assertWalk(await page.evaluate(point=>__alubarnaCityQA.walk(point),depth.opening),'walk back into the arch opening');
  results.depth=depth;results.desktopReturn=await returnByClick('desktop');

  phase='normal combat';await travel();const opponent=await page.evaluate(()=>__alubarnaCityQA.stageCombat());
  await page.waitForFunction(()=>__mareDiagnostics().lobby96.visualState==='ready');
  const combat=await page.evaluate(()=>__alubarnaCityQA.fight());assert(combat.kills>0&&combat.hunts===combat.kills,'combat must update both the general and Alubarna hunt ledgers');assert(combat.respawns[opponent]>0,'the defeated stable slot must retain its respawn deadline');assert(combat.xp>0&&combat.gold>0,'a real Puppu defeat must award XP and Berry');assert.equal(combat.bosses,0);assert.equal(combat.firstRewardClaimed,false,'a common city encounter must not grant a boss first-victory reward');results.combat={opponent,...combat};
  phase='save reload';const saved=await page.evaluate(()=>{const q=__alubarnaCityQA;q.save();return q.progress();});
  await page.reload({waitUntil:'domcontentloaded'});await ready();
  const reloaded=await page.evaluate(()=>{const q=__alubarnaCityQA;q.stop();return q.progress();});
  assert.deepEqual(reloaded,saved,'reload must retain the area, XP, Berry, loot, kills and original slot deadlines');results.reload=true;

  phase='mobile DPR 2';const storageState=await context.storageState();await context.close();
  context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,storageState});page=await preparePage(context);
  await page.goto(runtimeUrl,{waitUntil:'domcontentloaded'});await ready();
  assert.equal(await page.evaluate(()=>devicePixelRatio),2,'mobile must run at actual DPR 2, not only a smaller desktop viewport');
  const mobileSave=await page.evaluate(()=>{const q=__alubarnaCityQA;q.stop();return q.progress();});
  assert.deepEqual(mobileSave,reloaded,'the mobile context must receive the same area, progress and encounter deadlines before travelling');results.mobileSave=true;
  phase='mobile catalog';await openMap();
  const bounds=await page.locator('#panelOverlay .dialog').boundingBox();assert(bounds&&bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=394&&bounds.y+bounds.height<=853,'the mobile catalog must fit inside the viewport');
  assert(await page.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'the mobile catalog must not overflow horizontally');
  await page.locator('#closePanel').click();await travel();
  results.mobile=await page.evaluate(()=>{const image=MareAlubarnaCity.prepare(),canvas=document.getElementById('worldCanvas'),r=canvas.getBoundingClientRect();return {dpr:devicePixelRatio,backing:[canvas.width,canvas.height],css:[r.width,r.height],natural:[image.naturalWidth,image.naturalHeight],src:new URL(image.src).pathname,zoom:__mareDiagnostics().camera.zoom};});
  assert.deepEqual(results.mobile.natural,[paintedArt.width,paintedArt.height]);assert(results.mobile.src.endsWith('/'+paintedArt.file),'mobile must keep the complete HD source');
  assert.equal(results.mobile.zoom,1,'adding the painting must not force a new global zoom');
  assert(results.mobile.backing.every((v,i)=>Math.abs(v-results.mobile.css[i])<=1),'the established logical canvas scale stays unchanged at DPR 2');
  await shot('alubarna-entrada-mobile');
  const mobileShot=fs.readFileSync(path.join(out,'alubarna-entrada-mobile.png'));
  results.mobile.screenshot=[mobileShot.readUInt32BE(16),mobileShot.readUInt32BE(20)];
  assert.deepEqual(results.mobile.screenshot,[786,1704],'the mobile evidence must contain the actual DPR 2 screenshot');
  await tour('mobile');results.mobileLandmarks=[];
  for(const [id,x,y]of [['palace-stairs',724,340],['northeast-stairs',1192,215],['gate-opening',724,875]]){
   const route=await page.evaluate(([x,y])=>__alubarnaCityQA.walk(__alubarnaCityQA.sourcePoint(x,y)),[x,y]);
   assertWalk(route,'mobile '+id);results.mobileLandmarks.push({id,...route});
  }
  results.mobileReturn=await returnByClick('mobile');
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);results.viewports=['1366x768 @ DPR1','393x852 @ DPR2'];results.returnByClick=true;
  fs.writeFileSync(path.join(out,'alubarna-browser-results.json'),JSON.stringify({...results,errors,missing},null,2)+'\n');
  console.log(JSON.stringify({viewports:results.viewports,journeys:results.journeys.map(j=>({viewport:j.viewport,routes:j.routes.length})),painting:results.painting.natural,depthPixels:results.depth.changedHeroPixels,combat:results.combat,reload:results.reload,returnByClick:results.returnByClick,errors,missing}));
 }catch(error){
  const player=page?await page.evaluate(()=>({hero:window.__alubarnaCityQA?.world.hero,renderer:window.__mareDiagnostics?.().lobby96})).catch(()=>null):null;
  fs.writeFileSync(path.join(out,'failure-results.json'),JSON.stringify({...results,phase,message:error.message,player,errors,missing},null,2)+'\n');
  if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error({phase,errors,missing});throw error;
 }
 finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
