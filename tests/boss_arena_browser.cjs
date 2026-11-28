'use strict';
// Exercise the served build; QA instrumentation exists only in this isolated
// browser response. Movement, damage, pending victory and claims use real code.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.MARE_QA_DIR||path.join(root,'.maintenance-local/browser/boss-arena');
const sourceFile='assets/quest-dungeons/boss-arena/scene-hd.png';
const sourceArtSha='2cf6960aacd51640e1a6bc1850d68b77fd92cd0ac48609883c156ac8346d3945';
const chestSprite='assets/map-depth/objects/export-0c9aababd1dd8d975621951c.png';
const chestId='40420c70-1e86-493e-a829-79b42d260c18',chestVisualId='1cb97a09-0a88-4167-9627-1fd4b1e6ca0b';
const worldSize={width:3072,height:2304},nativeSize={width:1448,height:1086};
const spawn={x:1536,y:1824},enemySpawn={x:1536,y:1152};
const chestSpec={id:chestId,x:1536,y:640,radius:90,bounds:{x:1463,y:484,w:160,h:128}};
const catalogIds=['alvida','morgan','buggy','kuro','krieg','arlong','smoker','wapol','crocodile','rob-lucci','gecko-moria','kuma','kizaru','hancock','magellan','ace','aokiji','akainu'];
const oldAssets=[
 ['assets/quest-dungeons/map.png','dbef178013dab0369ac9bea943a3b77558159bd4cbe6f831661fa1bda357bd33'],
 ['assets/exported-maps/quest-dungeons/map.png','c1a872f259ef5b529705667740dfa26d1cd301971dbc3fbf8aada108c8e721f2'],
 [chestSprite,'0c9aababd1dd8d975621951c49314f8796b75a0d00248e4b4368620ac7718e8c']
];
// Literal source-pixel probes reviewed separately from the mask implementation.
const floorProbes=[['west-flank',300,530],['east-flank',1150,530],['north-floor',724,340],['south-floor',724,790]];
const blockedProbes=[['west-water',65,575],['east-water',1382,575],['north-portcullis',724,175],
 ['west-bastion',475,220],['west-brazier',130,550],['southeast-brazier',1221,787],
 ['southwest-gate-pier',480,1030],['southeast-gate-pier',976,1030]];
const checksum=b=>createHash('sha256').update(b).digest('hex');

function instrument(source){
 const marker='  window.__mareDiagnostics=',tick='function tickSimulation(dt){',hero='function drawHeroLayer(){';
 assert(source.includes(marker)&&source.includes(tick)&&source.includes(hero),'served game exposes established QA insertion points');
 source=source.replace(tick,tick+'if(window.__arenaQA?.paused&&!window.__arenaQA.stepping)return;');
 source=source.replace(hero,hero+"if(window.__arenaQA?.tracking)window.__arenaQA.events.push({kind:'hero'});");
 const damage='function outputDamage(m,amount,crit=false,visual={},wear=null){';
 assert(source.includes(damage),'real damage insertion point');
 source=source.replace(damage,damage+'if(window.__arenaQA?.fighting)window.__arenaQA.damageCalls++;');
 return source.replace(marker,`  window.__arenaQA={paused:true,stepping:false,tracking:false,fighting:false,damageCalls:0,events:[],draws:[],
 get game(){return game},get world(){return world},get writer(){return saveWriter},get run(){return dungeonRun},get context(){return ctx},
 map:activeMap,nav:navigator,state:mapArtState,open:openPanel,save:saveGame,claim:claimDungeonChest,
 sourcePoint(x,y){return {x:Math.round(x*3072/1448*100)/100,y:Math.round(y*2304/1086*100)/100};},
 stop(){autoPlay=false;autoSkills=false;travelPath=[];world.target=null;},
 fixture(level=180){this.stop();game.level=level;Object.assign(game.attributes,{strength:50000,vitality:50000});
  game.equipment.weapon ||= newItem(itemDefs[starterWeapon(game.classId)]);
  game.equipment.weapon.baseStats={...game.equipment.weapon.baseStats,attack:10000000};
  game.stats.goldEarned=Math.max(50000,game.stats.goldEarned||0);game.hp=getDerived().maxHP;game.energy=getDerived().maxEnergy;saveGame();updateUI();},
 step(dt,render=true){this.stepping=true;try{tick(dt)}finally{this.stepping=false}if(render)presentWorld();},
 snap(){camera.update(nameplateCameraFocus(),activeMap(),0,true,world.hero);presentWorld();},
 walk(goal,tolerance=2){this.stop();const before={x:world.hero.x,y:world.hero.y};
  if(!walkTo(goal))throw Error('No real walking route to '+JSON.stringify(goal));
  let steps=0,walkable=true,travelled=0,maxStep=0,last={...before};const moveSpeed=getDerived().moveSpeed;
  for(;steps<2200&&Math.hypot(world.hero.x-goal.x,world.hero.y-goal.y)>tolerance;steps++){
   this.step(.05,false);walkable&&=navigator().walkable(world.hero.x,world.hero.y);
   const moved=Math.hypot(world.hero.x-last.x,world.hero.y-last.y);travelled+=moved;maxStep=Math.max(maxStep,moved);last={x:world.hero.x,y:world.hero.y};
  }this.snap();return {before,goal,steps,walkable,travelled,maxStep,moveSpeed,hero:{x:world.hero.x,y:world.hero.y}};},
 progress(){return JSON.parse(JSON.stringify({characterId:game.characterId,level:game.level,xp:game.xp,gold:game.gold,
  inventory:game.inventory,bossDungeons:game.bossDungeons,xpEarned:game.stats.xpEarned,goldEarned:game.stats.goldEarned}));},
 fight(){this.stop();const id=dungeonRun.id,beforeHP=world.mobs[0]?.hp;this.damageCalls=0;this.fighting=true;autoPlay=true;
  let steps=0;try{for(;steps<1600&&MareBossDungeons.status(game,id)==='running';steps++)this.step(.05);}
  finally{this.fighting=false;this.stop();}saveGame();this.snap();
  return {id,beforeHP,steps,damageCalls:this.damageCalls,status:MareBossDungeons.status(game,id),record:JSON.parse(JSON.stringify(game.bossDungeons.records[id]))};},
 chestScreen(){this.snap();const b=MareQuestDungeonWorld.chest.bounds,r=canvas.getBoundingClientRect(),points=[];
  for(const [fx,fy]of [[.3,.85],[.5,.85],[.7,.85],[.3,.6],[.7,.6],[.5,.4]]){
   const worldPoint={x:b.x+b.w*fx,y:b.y+b.h*fy},s=camera.worldToScreen(worldPoint.x,worldPoint.y);
   const x=r.left+s.x*r.width/W,y=r.top+s.y*r.height/H,hit=document.elementFromPoint(x,y);
   points.push({x,y,worldPoint,hitId:hit?.id,hitTag:hit?.tagName});
  }return {points,point:points.find(p=>p.hitId==='worldCanvas')||null};},
 frame(depthId){this.events=[];this.draws=[];this.depthTarget=depthId;this.tracking=true;try{this.snap()}finally{this.tracking=false;this.depthTarget=null}return {events:this.events,draws:this.draws};},
 overview(){this.stop();const previous={W,H,width:canvas.width,height:canvas.height,camera:{...camera}};
  try{canvas.width=W=activeMap().width;canvas.height=H=activeMap().height;ctx.imageSmoothingEnabled=false;camera.width=W;camera.height=H;camera.x=0;camera.y=0;drawWorld();return canvas.toDataURL('image/png');}
  finally{canvas.width=previous.width;canvas.height=previous.height;W=previous.W;H=previous.H;Object.assign(camera,previous.camera);ctx.imageSmoothingEnabled=false;this.snap();}}
 };
 const arenaDrawImage=ctx.drawImage.bind(ctx);ctx.drawImage=function(im,...args){const q=window.__arenaQA;if(q.tracking)q.draws.push({src:im.src||null,natural:[im.naturalWidth||im.width,im.naturalHeight||im.height],smooth:this.imageSmoothingEnabled});return arenaDrawImage(im,...args);};
 const arenaDepthDraw=MareWorldDepth.draw;MareWorldDepth.draw=function(c,p,actors,...rest){const q=window.__arenaQA;
  const event=q.tracking&&c===ctx?{kind:'scenery',id:p.id,type:p.type,drawn:false}:null;if(event)q.events.push(event);
  let sample=null;
  if(event&&p.id===q.depthTarget){const s=camera.worldToScreen(world.hero.x,world.hero.y),size=Math.ceil(combatVisualHeight(world.hero));
   const x=Math.max(0,Math.floor(s.x-size/2)),y=Math.max(0,Math.floor(s.y-size)),w=Math.min(size,W-x),h=Math.min(size,H-y);
   if(w>0&&h>0)sample={x,y,w,h,before:c.getImageData(x,y,w,h).data};}
  const drawn=arenaDepthDraw.call(this,c,p,actors,...rest);if(event)event.drawn=!!drawn;
  if(sample){const after=c.getImageData(sample.x,sample.y,sample.w,sample.h).data;let changed=0;
   for(let i=0;i<after.length;i+=4)if([0,1,2].some(channel=>Math.abs(after[i+channel]-sample.before[i+channel])>3))changed++;
   event.changedHeroPixels=changed;}
  return drawn;
 };
`+marker);
}

function assertWalk(route,label){
 assert(route.steps<2200,label+' finishes through the real movement loop');
 assert(route.walkable,label+' retains a walkable footprint every step');
 assert(Math.hypot(route.hero.x-route.goal.x,route.hero.y-route.goal.y)<=2,label+' reaches its destination');
 assert(route.maxStep<=route.moveSpeed*.05+1,label+' respects the actual character speed');
 assert(route.travelled+2>=Math.hypot(route.before.x-route.goal.x,route.before.y-route.goal.y),label+' travels instead of teleporting');
}

(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 let page,phase='boot';const errors=[],missing=[],results={entries:[],routes:[],viewports:[],playerFrames:[],chestFrames:[]};
 try{
  const preparePage=async context=>{
   const p=await context.newPage();p.setDefaultTimeout(30000);p.on('pageerror',e=>errors.push(e.message));
   p.on('response',r=>{if(r.status()>=400&&/quest-dungeons|boss-arena|map-depth\/objects|dungeon-/.test(r.url()))missing.push({status:r.status(),url:r.url()});});
   await p.route('**/game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:instrument(await response.text())});});return p;
  };
  let context=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:1});page=await preparePage(context);
  const ready=()=>page.waitForFunction(()=>window.__arenaQA?.game&&__arenaQA.writer.owner&&__arenaQA.state()==='ready',null,{timeout:60000});
  const readyHero=async label=>{
   await page.waitForFunction(()=>{__arenaQA.snap();const v=__mareDiagnostics().lobby96.worldVisual;return v?.state==='ready'&&v.displayed?.exact===true&&v.preparation?.essentialReady===true;},null,{timeout:90000,polling:'raf'});
   const frame=await page.evaluate(()=>{const v=__mareDiagnostics().lobby96.worldVisual;return {state:v.state,displayed:v.displayed,essentialReady:v.preparation.essentialReady};});results.playerFrames.push({label,...frame});
  };
  const shot=async name=>{await readyHero(name);await page.mouse.move(page.viewportSize().width-1,1);await page.screenshot({path:path.join(out,name+'.png')});};
  const enter=async(id,{resume=false}={})=>{
   phase='enter '+id;await page.evaluate(()=>__arenaQA.open('dungeons'));await page.locator('[data-dungeon-select="'+id+'"]').click();
   await page.locator('[data-dungeon-enter="'+id+'"]').click();
   await page.waitForFunction(id=>__arenaQA.run?.id===id&&__arenaQA.state()==='ready',id,{timeout:60000});
   const actual=await page.evaluate(()=>{const q=__arenaQA;q.stop();q.snap();const s=MareMapExports.get('quest-dungeons'),m=q.map();return {map:m.id,width:m.width,height:m.height,groundUrl:s.groundUrl,spawn:{x:q.world.hero.x,y:q.world.hero.y},enemySpawn:MareQuestDungeonWorld.enemySpawn,chest:MareQuestDungeonWorld.chest,returnPoint:m.returnPoint||null,mobs:q.world.mobs.map(x=>({type:x.type,id:x.dungeonId,level:x.level,x:x.x,y:x.y}))};});
   assert.equal(actual.groundUrl,sourceFile,'the actual served dungeon must select the new HD arena');
   assert.equal(actual.map,'quest-dungeons');assert.deepEqual([actual.width,actual.height],[worldSize.width,worldSize.height]);
   assert.deepEqual(actual.spawn,spawn);assert.deepEqual(actual.enemySpawn,enemySpawn);assert.deepEqual(actual.chest,chestSpec);assert.equal(actual.returnPoint,null);
   assert.equal(actual.mobs.length,resume?0:1,'pending victory resumes without another boss');
   if(!resume){assert.equal(actual.mobs[0].id,id);assert.equal(actual.mobs[0].type,'dungeon-'+id);assert.deepEqual({x:actual.mobs[0].x,y:actual.mobs[0].y},enemySpawn);}
   return actual;
  };
  const walkSource=async(label,x,y)=>{phase=label;const route=await page.evaluate(([x,y])=>__arenaQA.walk(__arenaQA.sourcePoint(x,y)),[x,y]);assertWalk(route,label);results.routes.push({label,...route});return route;};
  const walkWorld=async(label,goal)=>{phase=label;const route=await page.evaluate(goal=>__arenaQA.walk(goal),goal);assertWalk(route,label);results.routes.push({label,...route});return route;};
  const chestFrame=async label=>{
   await readyHero(label);const actual=await page.evaluate(()=>__arenaQA.frame());
   assert(actual.draws.some(x=>x.src&&new URL(x.src).pathname.endsWith('/'+chestSprite)),label+' renders the preserved independent chest sprite');
   results.chestFrames.push({label,draws:actual.draws.filter(x=>x.src&&new URL(x.src).pathname.endsWith('/'+chestSprite)),events:actual.events.filter(e=>e.id===chestVisualId)});
  };
  const claimByClick=async label=>{
   await walkWorld(label+' chest approach',{x:1536,y:660});await readyHero(label+' chest');await chestFrame(label+' pending chest');
   const before=await page.evaluate(()=>__arenaQA.progress()),screen=await page.evaluate(()=>__arenaQA.chestScreen());
   assert(screen.point,'the visible chest has an exposed canvas hit target: '+JSON.stringify(screen));
   await page.mouse.click(screen.point.x,screen.point.y);
   const returned=await page.evaluate(()=>{const q=__arenaQA;let steps=0;for(;steps<400&&__mareDiagnostics().map.id!=='lobby';steps++)q.step(.05,false);q.snap();return {map:__mareDiagnostics().map.id,steps};});
   assert.equal(returned.map,'lobby','canvas chest claim returns directly to the port');await ready();
   const after=await page.evaluate(()=>__arenaQA.progress());
   const id=before.bossDungeons.records.alvida?.phase==='pending'?'alvida':'morgan';
   assert.equal(after.bossDungeons.records[id].phase,'claimed');
   await page.evaluate(()=>{__arenaQA.claim();__arenaQA.claim();});
   assert.deepEqual(await page.evaluate(()=>__arenaQA.progress()),after,'claiming twice cannot duplicate a reward');
   await page.evaluate(()=>__arenaQA.open('dungeons'));await page.locator('[data-dungeon-select="'+id+'"]').click();
   assert(await page.locator('[data-dungeon-enter="'+id+'"]').isDisabled(),'the claimed dungeon cannot be entered again');await page.locator('#closePanel').click();
   return {id,screen,returned,phase:after.bossDungeons.records[id].phase,berry:after.gold-before.gold,items:after.inventory.length-before.inventory.length,doubleClaimBlocked:true};
  };
  const runtimeUrl=process.env.MARE_TEST_URL||'http://127.0.0.1:8185/';
  await page.goto(runtimeUrl,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__arenaQA);
  await page.locator('#characterName').fill('Arena QA');await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();await ready();
  await page.evaluate(()=>{__arenaQA.fixture();__arenaQA.open('dungeons');});
  assert.deepEqual(await page.locator('[data-dungeon-select]').evaluateAll(es=>es.map(e=>e.dataset.dungeonSelect)),catalogIds,'all 18 destinations remain available in the real catalog');
  await page.locator('#closePanel').click();
  for(const id of catalogIds){results.entries.push({id,...await enter(id)});await page.locator('#returnLobby').click();await page.waitForFunction(()=>__mareDiagnostics().map.id==='lobby');}
  await enter('alvida');await readyHero('desktop arrival');

  phase='native painting and preserved artifacts';results.art=[];
  for(const [file,sha]of oldAssets){assert.equal(checksum(fs.readFileSync(path.join(root,file))),sha,'preserved checkout artifact: '+file);const response=await page.request.get(new URL(file,page.url()).href);assert.equal(response.status(),200);assert.equal(checksum(await response.body()),sha,'preserved published artifact: '+file);results.art.push({file,sha});}
  const sourceBytes=fs.readFileSync(path.join(root,sourceFile)),sourcePng=require('pngjs').PNG.sync.read(sourceBytes),sourceSha=checksum(sourceBytes);
  assert.equal(sourceSha,sourceArtSha,'the integrated PNG remains identical to the generated arena');
  assert.deepEqual([sourcePng.width,sourcePng.height],[nativeSize.width,nativeSize.height]);
  const response=await page.request.get(new URL(sourceFile,page.url()).href);assert.equal(response.status(),200);assert.equal(checksum(await response.body()),sourceSha,'served PNG must be byte-identical to source');
  results.painting=await page.evaluate(async()=>{const im=MareBossArena.prepare(),c=document.createElement('canvas');await im.decode();c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext('2d');x.drawImage(im,0,0);const pixels=x.getImageData(0,0,c.width,c.height).data,hash=await crypto.subtle.digest('SHA-256',pixels);return {src:new URL(im.src).pathname,natural:[im.naturalWidth,im.naturalHeight],declared:[MareBossArenaLayout.imageWidth,MareBossArenaLayout.imageHeight],pixels:Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join(''),regions:MareWorldDepth.regions('quest-dungeons').map(r=>({id:r.id,type:r.type,spriteUrl:r.spriteUrl||null}))};});
  assert.deepEqual(results.painting.natural,[1448,1086]);assert.deepEqual(results.painting.declared,[1448,1086]);assert.equal(results.painting.pixels,checksum(sourcePng.data));
  assert(results.painting.src.endsWith('/'+sourceFile));results.painting.sha=sourceSha;
  assert(results.painting.regions.length&&results.painting.regions.every(r=>r.type==='boss-arena'),'painted depth uses the new arena renderer');
  assert.equal(results.painting.regions.find(r=>r.id===chestVisualId)?.spriteUrl,chestSprite,'reward chest retains a separate sprite');
  results.crops=await page.evaluate(()=>{
   const image=MareBossArena.prepare(),checks=[];
   for(const [x,y]of [[1088,448],[1024,1408],[2048,896]]){
    const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=192;a.height=b.height=128;
    const ac=a.getContext('2d'),bc=b.getContext('2d'),original=ac.drawImage.bind(ac),calls=[];
    ac.drawImage=function(im,...args){calls.push({sameSource:im===image,smooth:this.imageSmoothingEnabled});return original(im,...args);};
    ac.translate(-x,-y);MareBossArena.ground(ac,{x,y},192,128);bc.imageSmoothingEnabled=false;bc.drawImage(image,0,0,image.naturalWidth,image.naturalHeight,-x,-y,3072,2304);
    const have=ac.getImageData(4,4,184,120).data,want=bc.getImageData(4,4,184,120).data;let difference=0,opaque=0;
    for(let i=0;i<have.length;i++)if(i%4===3)opaque+=Number(have[i]===255);else difference+=Math.abs(have[i]-want[i]);
    checks.push({x,y,calls,difference,opaque,pixels:have.length/4});
   }return checks;
  });
  for(const crop of results.crops){assert(crop.calls.length&&crop.calls.every(c=>c.sameSource&&!c.smooth));assert.equal(crop.opaque,crop.pixels);assert.equal(crop.difference,0,'camera crop matches the full native source at world scale');}
  results.blocked=await page.evaluate(probes=>probes.map(([id,x,y])=>{const p=__arenaQA.sourcePoint(x,y);return {id,walkable:__arenaQA.nav().walkable(p.x,p.y)};}),blockedProbes);
  assert(results.blocked.every(p=>!p.walkable),'water, walls and brazier bases must stop movement');
  await shot('boss-arena-arrival-desktop');
  fs.writeFileSync(path.join(out,'boss-arena-overview.png'),Buffer.from((await page.evaluate(()=>__arenaQA.overview())).split(',')[1],'base64'));
  await walkWorld('locked chest approach',{x:1536,y:660});await chestFrame('locked chest');
  const lockedBefore=await page.evaluate(()=>__arenaQA.progress()),lockedScreen=await page.evaluate(()=>__arenaQA.chestScreen());
  assert(lockedScreen.point,'the locked chest remains visibly rendered and clickable');
  await page.mouse.click(lockedScreen.point.x,lockedScreen.point.y);
  assert.deepEqual(await page.evaluate(()=>__arenaQA.progress()),lockedBefore,'the chest cannot grant a reward before the boss is defeated');
  results.lockedChest={visible:true,claimBlocked:true,screen:lockedScreen.point};
  for(const [id,x,y]of floorProbes)await walkSource('desktop '+id,x,y);
  results.depth=[];
  for(const [id,x,y]of [['boss-arena-west-brazier',140,520],['boss-arena-southwest-gate-pier',480,875]]){
   await walkSource('depth '+id,x,y);await readyHero(id);
   const frame=await page.evaluate(id=>__arenaQA.frame(id),id),heroIndex=frame.events.findIndex(e=>e.kind==='hero'),sceneryIndex=frame.events.findIndex(e=>e.id===id),scenery=frame.events[sceneryIndex];
   assert(heroIndex>=0&&sceneryIndex>heroIndex&&scenery.drawn,'painted structure occludes a hero walking behind it: '+id);
   assert(scenery.changedHeroPixels>10,'painted depth replaces visible body pixels: '+id);
   assert(frame.draws.some(d=>d.src&&new URL(d.src).pathname.endsWith('/'+sourceFile)&&d.smooth===false),'depth retains native painting detail');
   results.depth.push({id,heroIndex,sceneryIndex,...scenery});
  }
  await walkWorld('desktop boss approach',enemySpawn);await shot('boss-arena-combat');
  phase='real Alvida combat';const combat=await page.evaluate(()=>__arenaQA.fight());assert.equal(combat.status,'pending');assert(combat.damageCalls>0&&combat.steps>0&&combat.steps<1600,'victory must result from normal simulated attacks');results.combat=combat;
  await walkWorld('desktop reward approach',{x:1536,y:660});await chestFrame('desktop pending');await shot('boss-arena-chest');
  phase='pending victory reload';const saved=await page.evaluate(()=>{__arenaQA.save();return __arenaQA.progress();});
  await page.reload({waitUntil:'domcontentloaded'});await ready();
  assert.deepEqual(await page.evaluate(()=>__arenaQA.progress()),saved,'pending victory and rewards survive reload');results.reloadPending=true;
  await enter('alvida',{resume:true});results.desktopClaim=await claimByClick('desktop');

  phase='mobile DPR 2';const storageState=await context.storageState();await context.close();
  context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,storageState});page=await preparePage(context);
  await page.goto(runtimeUrl,{waitUntil:'domcontentloaded'});await ready();assert.equal(await page.evaluate(()=>devicePixelRatio),2);
  assert.equal(await page.evaluate(()=>MareBossDungeons.status(__arenaQA.game,'alvida')),'claimed');
  await page.evaluate(()=>__arenaQA.fixture());await enter('morgan');await readyHero('mobile arrival');await shot('boss-arena-arrival-mobile');
  const mobilePng=fs.readFileSync(path.join(out,'boss-arena-arrival-mobile.png'));assert.deepEqual([mobilePng.readUInt32BE(16),mobilePng.readUInt32BE(20)],[786,1704]);
  for(const [id,x,y]of floorProbes)await walkSource('mobile '+id,x,y);
  phase='real Morgan combat';results.mobileCombat=await page.evaluate(()=>__arenaQA.fight());assert.equal(results.mobileCombat.status,'pending');assert(results.mobileCombat.damageCalls>0);
  results.mobileClaim=await claimByClick('mobile');results.viewports=['1366x768 @ DPR1','393x852 @ DPR2'];
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);results.errors=errors;results.missing=missing;
  fs.writeFileSync(path.join(out,'boss-arena-browser-results.json'),JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify({entries:results.entries.length,viewports:results.viewports,painting:results.painting.natural,realDamageCalls:[results.combat.damageCalls,results.mobileCombat.damageCalls],reloadPending:results.reloadPending,desktopClaim:results.desktopClaim,mobileClaim:results.mobileClaim,errors,missing}));
 }catch(error){
  const state=page?await page.evaluate(()=>({map:window.__mareDiagnostics?.().map,hero:window.__arenaQA?.world.hero,run:window.__arenaQA?.run,player:window.__mareDiagnostics?.().lobby96})).catch(()=>null):null;
  fs.writeFileSync(path.join(out,'failure-results.json'),JSON.stringify({...results,phase,message:error.message,state,errors,missing},null,2)+'\n');
  if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error({phase,errors,missing});throw error;
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
