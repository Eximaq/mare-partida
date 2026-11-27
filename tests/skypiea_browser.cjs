'use strict';
// Isolated browser fixtures exercise the real travel, movement, combat and save paths.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const out=process.env.MARE_QA_DIR||path.join(root,'.maintenance-local/browser/skypiea');
const cases=[['skypiea-01','satori',77],['skypiea-02','shura',84],['skypiea-03','gendatsu',88],['skypiea-04','ohm',95]];
let source=fs.readFileSync(path.join(root,'game.js'),'utf8');
const hook='  window.__mareDiagnostics=',tick='function tickSimulation(dt){';
assert(source.includes(hook)&&source.includes(tick),'established browser test hooks must exist');
source=source.replace(tick,tick+'if(window.__skyQA?.paused&&!window.__skyQA.stepping)return;');
source=source.replace(hook,`  window.__skyQA={paused:true,stepping:false,
 get game(){return game},get world(){return world},get writer(){return saveWriter},
 open:openPanel,save:saveGame,nav:navigator,state:mapArtState,
 stop(){autoPlay=false;autoSkills=false;travelPath=[];world.target=null;},
 start(){autoPlay=true;autoSkills=false;},
 fixture(level){game.level=level;Object.assign(game.attributes,{strength:50000,vitality:50000});
  game.equipment.weapon ||= newItem(itemDefs[starterWeapon(game.classId)]);
  game.equipment.weapon.baseStats={...game.equipment.weapon.baseStats,attack:10000000};
  game.hp=getDerived().maxHP;game.energy=getDerived().maxEnergy;saveGame();updateUI();},
 step(dt){this.stepping=true;try{tickSimulation(dt)}finally{this.stepping=false}presentWorld();},
 stage(){this.stop();const m=world.mobs.find(m=>m.alive&&m.hp>0);if(!m)throw Error('No live test opponent');
  const n=navigator(),p=[[-48,0],[48,0],[0,48],[0,-48]].map(([dx,dy])=>({x:m.x+dx,y:m.y+dy})).find(p=>n.walkable(p.x,p.y)&&n.clear(p,m));
  if(!p)throw Error('No adjacent walkable encounter position');Object.assign(world.hero,p);m.attackClock=10;
  camera.update(world.hero,activeMap(),0,true);presentWorld();},
 arrival(){this.stop();Object.assign(world.hero,activeMap().spawn);camera.update(world.hero,activeMap(),0,true);presentWorld();},
 returnScreen(){const p=activeMap().returnPoint,r=canvas.getBoundingClientRect(),s=camera.worldToScreen(p.x,p.y);return {x:r.left+s.x*r.width/W,y:r.top+s.y*r.height/H};},
 approachReturn(){const r=activeMap().returnPoint,n=navigator();this.stop();const p=[[96,0],[0,96],[-96,0],[0,-96]].map(([dx,dy])=>({x:r.x+dx,y:r.y+dy})).find(p=>n.walkable(p.x,p.y)&&n.clear(p,r));if(!p)throw Error('No clear mobile approach to return dais');Object.assign(world.hero,p);camera.update(world.hero,activeMap(),0,true);presentWorld();}
 };\n`+hook);

(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 let page,phase='boot';const errors=[],missing=[],results={destinations:[]};
 try{
  const context=await browser.newContext({viewport:{width:1366,height:768}});page=await context.newPage();
  page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&/skypiea|satori|shura|gendatsu|ohm/.test(r.url()))missing.push({status:r.status(),url:r.url()});});
  await page.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source}));
  const ready=()=>page.waitForFunction(()=>window.__skyQA?.game&&__skyQA.writer.owner&&__skyQA.state()==='ready',null,{timeout:60000});
  const shot=async name=>{await page.mouse.move(page.viewportSize().width-1,1);await page.screenshot({path:path.join(out,name+'.png')});};
  const openMap=async()=>{await page.evaluate(()=>__skyQA.open('map'));await page.locator('[data-voyage-region=skypiea]').click();await page.waitForFunction(()=>[...document.querySelectorAll('[data-island] [data-location-art]')].every(im=>im.complete&&im.naturalWidth>0));const art=await page.evaluate(()=>({cards:[...document.querySelectorAll('[data-island] [data-location-art]')].map(im=>im.getAttribute('src')),backdrop:getComputedStyle(document.querySelector('.voyage-map')).backgroundImage,scene:MareSkypiea.data.groundUrl}));assert.equal(art.cards.length,4);assert(art.cards.every(src=>src===art.scene),'all four cards show the active map artwork');assert(art.backdrop.includes(art.scene),'region backdrop shows the active map artwork');};
  const travel=async id=>{await openMap();assert.equal(await page.locator('[data-island]').count(),4);await page.locator('[data-island="'+id+'"]').click();await page.locator('[data-travel-area="'+id+'"]').click();await page.waitForFunction(id=>__mareDiagnostics().map.id===id&&__skyQA.state()==='ready',id,{timeout:60000});};
  const returnThroughDais=async()=>{
   await page.evaluate(()=>__skyQA.arrival());if(page.viewportSize().width<640)await page.evaluate(()=>__skyQA.approachReturn());const p=await page.evaluate(()=>__skyQA.returnScreen());
   await page.mouse.click(p.x,p.y);
   const returned=await page.evaluate(()=>{const q=__skyQA;for(let i=0;i<400&&__mareDiagnostics().map.id!=='lobby';i++)q.step(.05);return __mareDiagnostics().map.id;});
   assert.equal(returned,'lobby','clicking the dais must walk to it and return to the port');await ready();
  };
  await page.goto(process.env.MARE_TEST_URL||'http://127.0.0.1:8174/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__skyQA);
  await page.locator('#characterName').fill('Sky QA');await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();await ready();
  await openMap();await page.locator('[data-island=skypiea-01]').click();assert(await page.locator('[data-travel-area=skypiea-01]').isDisabled());await page.locator('#closePanel').click();
  await page.evaluate(()=>{__skyQA.stop();__skyQA.fixture(95);});
  for(const [id,type,level]of cases){
   phase='travel '+id;await travel(id);
   await page.waitForFunction(type=>MareSpriteCombatV2.status(type,'walk','south')==='ready',type,{timeout:60000});
   const state=await page.evaluate(()=>{const q=__skyQA;q.stop();return {id:__mareDiagnostics().map.id,arrival:{x:q.world.hero.x,y:q.world.hero.y},mobs:q.world.mobs.map(m=>[m.spawnId,m.type,m.level]),routes:q.world.mobs.every(m=>q.nav().path(q.world.hero,m).length>0),outside:q.nav().walkable(64,64)};});
   assert.equal(state.id,id);assert.deepEqual(state.arrival,{x:1296,y:2190});assert.equal(state.mobs.length,6);assert(state.mobs.every(m=>m[0].startsWith(id+'-')&&m[1]===type&&m[2]===level));assert(state.routes);assert.equal(state.outside,false);
   if(id==='skypiea-01'){
    phase='scaled scene rendering';
    const pixels=await page.evaluate(()=>{
     const S=MareSkypiea,checks=[];
     for(const [x,y]of [[1170,2100],[2220,1350],[3450,900]]){
      const rendered=document.createElement('canvas'),expected=document.createElement('canvas');rendered.width=expected.width=180;rendered.height=expected.height=120;
      const a=rendered.getContext('2d'),b=expected.getContext('2d');a.translate(-x,-y);S.ground(a,{x,y},180,120);
      b.imageSmoothingEnabled=false;b.drawImage(S.image,x/3,y/3,60,40,0,0,180,120);
      const actual=a.getImageData(0,0,180,120).data,want=b.getImageData(0,0,180,120).data;
      let different=0;for(let i=0;i<actual.length;i++)different+=Number(actual[i]!==want[i]);checks.push({x,y,different});
     }return {natural:[S.image.naturalWidth,S.image.naturalHeight],checks};
    });
    assert.deepEqual(pixels.natural,[1536,1024]);assert(pixels.checks.every(c=>c.different===0),JSON.stringify(pixels));results.render=pixels;
    await shot('skypiea-new-arrival-desktop');
   }
   phase='combat '+id;await page.evaluate(()=>__skyQA.stage());await page.waitForFunction(()=>__mareDiagnostics().lobby96.visualState==='ready');await shot(id+'-combat');
   const combat=await page.evaluate(()=>{const q=__skyQA,before=q.game.stats.kills;q.start();let steps=0;for(;steps<600&&q.game.stats.kills===before;steps++)q.step(.05);q.stop();q.save();return {steps,kills:q.game.stats.kills-before};});assert(combat.kills>0,id+' must finish a normal combat');
   results.destinations.push({id,type,level,combat});
   if(id!=='skypiea-04'){phase='return '+id;await returnThroughDais();}
  }
  phase='save reload';
  const saved=await page.evaluate(()=>{__skyQA.save();return {area:__skyQA.game.area,kills:__skyQA.game.stats.kills,respawns:{...__skyQA.game.hunts.areas[__skyQA.game.area].respawns}};});
  await page.reload({waitUntil:'domcontentloaded'});await ready();
  const reloaded=await page.evaluate(()=>{__skyQA.stop();return {area:__skyQA.game.area,kills:__skyQA.game.stats.kills,respawns:{...__skyQA.game.hunts.areas[__skyQA.game.area].respawns},walkable:__skyQA.nav().walkable(__skyQA.world.hero.x,__skyQA.world.hero.y)};});
  assert.equal(reloaded.area,saved.area);assert.equal(reloaded.kills,saved.kills);assert.deepEqual(reloaded.respawns,saved.respawns);assert(reloaded.walkable);results.reload=true;
  phase='mobile';await page.setViewportSize({width:393,height:852});await openMap();
  const bounds=await page.locator('#panelOverlay .dialog').boundingBox();assert(bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=394&&bounds.y+bounds.height<=853);assert(await page.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await shot('skypiea-new-mobile-tabs');
  await page.locator('[data-island=skypiea-04]').click();await page.locator('[data-travel-area=skypiea-04]').click();await page.waitForFunction(()=>__mareDiagnostics().map.id==='skypiea-04'&&__skyQA.state()==='ready');await page.evaluate(()=>__skyQA.arrival());await shot('skypiea-new-arrival-mobile');
  phase='mobile return';await returnThroughDais();
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);results.viewports=['1366x768','393x852'];results.returnByClick=true;
  fs.writeFileSync(path.join(out,'skypiea-browser-results.json'),JSON.stringify({...results,errors,missing},null,2)+'\n');console.log(JSON.stringify({...results,errors,missing}));
 }catch(error){if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error({phase,errors,missing});throw error;}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
