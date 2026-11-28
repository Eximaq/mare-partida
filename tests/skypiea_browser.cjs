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
 // Synchronous fixture steps move the hero before the animation frame catches
 // up. Settle the real camera before translating the upcoming pointer click.
 returnScreen(){camera.update(nameplateCameraFocus(),activeMap(),0,true,world.hero);presentWorld();const p=activeMap().returnPoint,r=canvas.getBoundingClientRect(),s=camera.worldToScreen(p.x,p.y);return {x:r.left+s.x*r.width/W,y:r.top+s.y*r.height/H};},
 approachReturn(){const r=activeMap().returnPoint,n=navigator();this.stop();const p=[[96,0],[0,96],[-96,0],[0,-96]].map(([dx,dy])=>({x:r.x+dx,y:r.y+dy})).find(p=>n.walkable(p.x,p.y)&&n.clear(p,r)&&n.path(world.hero,p).length);if(!p||!walkTo(p))throw Error('No walking route from the entrance to the return dais');return p;}
 };\n`+hook);

(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 let page,phase='boot';const errors=[],missing=[],results={destinations:[]};
 try{
  const context=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:1});page=await context.newPage();
  page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&/skypiea|satori|shura|gendatsu|ohm/.test(r.url()))missing.push({status:r.status(),url:r.url()});});
  await page.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source}));
  const ready=()=>page.waitForFunction(()=>window.__skyQA?.game&&__skyQA.writer.owner&&__skyQA.state()==='ready',null,{timeout:60000});
  const shot=async name=>{await page.mouse.move(page.viewportSize().width-1,1);await page.screenshot({path:path.join(out,name+'.png')});};
  const openMap=async()=>{await page.evaluate(()=>__skyQA.open('map'));await page.locator('[data-voyage-region=skypiea]').click();await page.waitForFunction(()=>[...document.querySelectorAll('[data-island] [data-location-art]')].every(im=>im.complete&&im.naturalWidth>0));const art=await page.evaluate(()=>({cards:[...document.querySelectorAll('[data-island] [data-location-art]')].map(im=>im.getAttribute('src')),backdrop:getComputedStyle(document.querySelector('.voyage-map')).backgroundImage,scene:MareSkypiea.data.groundUrl}));assert.equal(art.cards.length,4);assert(art.cards.every(src=>src===art.scene),'all four cards show the active map artwork');assert(art.backdrop.includes(art.scene),'region backdrop shows the active map artwork');};
  const travel=async id=>{await openMap();assert.equal(await page.locator('[data-island]').count(),4);await page.locator('[data-island="'+id+'"]').click();await page.locator('[data-travel-area="'+id+'"]').click();await page.waitForFunction(id=>__mareDiagnostics().map.id===id&&__skyQA.state()==='ready',id,{timeout:60000});};
  const returnThroughDais=async()=>{
   const approach=await page.evaluate(()=>{const q=__skyQA;q.arrival();const target=q.approachReturn();let steps=0;for(;steps<800&&Math.hypot(q.world.hero.x-target.x,q.world.hero.y-target.y)>3;steps++)q.step(.05);return {target,hero:{x:q.world.hero.x,y:q.world.hero.y},steps};});
   assert(Math.hypot(approach.hero.x-approach.target.x,approach.hero.y-approach.target.y)<=3,'the real movement loop must traverse the winged gate');
   const p=await page.evaluate(()=>__skyQA.returnScreen());
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
   assert.equal(state.id,id);assert.deepEqual(state.arrival,{x:534,y:2604},'real travel must arrive at the owner-marked entrance');assert.equal(state.mobs.length,6);assert(state.mobs.every(m=>m[0].startsWith(id+'-')&&m[1]===type&&m[2]===level));assert(state.routes);assert.equal(state.outside,false);
   if(id==='skypiea-01'){
    phase='scaled scene rendering';
    const pixels=await page.evaluate(()=>{
     const S=MareSkypiea,checks=[],iw=S.image.naturalWidth,ih=S.image.naturalHeight;
     // A fractional scale can place an output pixel centre exactly between
     // source texel centres. Either adjacent texel is a valid nearest sample.
     // Every other pixel must match its sole source texel exactly: no colour
     // tolerance, softened edges or general allowance for differences.
     const nearest=(v,limit)=>{const edge=Math.round(v);return (Math.abs(v-edge)<1e-8?[edge-1,edge]:[Math.floor(v)]).filter(n=>n>=0&&n<limit);};
     for(const [x,y]of [[470,2325],[480,2520],[2220,1350],[3450,900]]){
      const rendered=document.createElement('canvas'),original=document.createElement('canvas');rendered.width=180;rendered.height=120;
      const sx=Math.max(0,Math.floor(x*iw/S.data.width)-1),sy=Math.max(0,Math.floor(y*ih/S.data.height)-1);
      original.width=Math.min(iw-sx,Math.ceil((x+180)*iw/S.data.width)-sx+1);original.height=Math.min(ih-sy,Math.ceil((y+120)*ih/S.data.height)-sy+1);
      const a=rendered.getContext('2d'),b=original.getContext('2d');a.translate(-x,-y);S.ground(a,{x,y},180,120);
      b.drawImage(S.image,-sx,-sy); // Read native source pixels without scaling.
      const actual=a.getImageData(0,0,180,120).data,want=b.getImageData(0,0,original.width,original.height).data;
      let invalidSamples=0,tiePixels=0;
      for(let dy=0;dy<120;dy++)for(let dx=0;dx<180;dx++){
       const i=(dy*180+dx)*4,xs=nearest((x+dx+.5)*iw/S.data.width,iw),ys=nearest((y+dy+.5)*ih/S.data.height,ih);
       tiePixels+=Number(xs.length>1||ys.length>1);
       const matches=ys.some(py=>xs.some(px=>[0,1,2,3].every(c=>actual[i+c]===want[((py-sy)*original.width+px-sx)*4+c])));
       invalidSamples+=Number(!matches);
      }
      checks.push({x,y,invalidSamples,tiePixels});
     }return {natural:[S.image.naturalWidth,S.image.naturalHeight],declared:[S.data.imageWidth,S.data.imageHeight],zoom:__mareDiagnostics().camera.zoom,checks};
    });
    assert.deepEqual(pixels.natural,pixels.declared);assert(pixels.natural[0]>=3072&&pixels.natural[1]>=2048,'the browser must load the HD source');assert.equal(pixels.zoom,1,'inspect the map at 100% game zoom');assert(pixels.checks.every(c=>c.invalidSamples===0),JSON.stringify(pixels));results.render=pixels;
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
  await page.locator('[data-island=skypiea-04]').click();await page.locator('[data-travel-area=skypiea-04]').click();await page.waitForFunction(()=>__mareDiagnostics().map.id==='skypiea-04'&&__skyQA.state()==='ready');const mobileArrival=await page.evaluate(()=>{__skyQA.stop();return {x:__skyQA.world.hero.x,y:__skyQA.world.hero.y};});assert.deepEqual(mobileArrival,{x:534,y:2604});await shot('skypiea-new-arrival-mobile');
  phase='mobile return';await returnThroughDais();
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);results.viewports=['1366x768','393x852'];results.returnByClick=true;
  fs.writeFileSync(path.join(out,'skypiea-browser-results.json'),JSON.stringify({...results,errors,missing},null,2)+'\n');console.log(JSON.stringify({...results,errors,missing}));
 }catch(error){if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error({phase,errors,missing});throw error;}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
