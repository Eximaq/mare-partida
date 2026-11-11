'use strict';
// UI contract test only. PostgreSQL transactions/authorization are exercised by
// server-world.test.mts. This fixture never contacts Supabase.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const forge=require('../forge-system.js'),catalog=require('../item-catalog.js').create({forge,prison:require('../prison-system.js'),haki:require('../haki-system.js'),akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')});
const chars=require('../character-system.js'),birth=require('../character-catalog.js').create({characters:chars});
const make=(def,id)=>forge.normalizeItem({def,id,level:1,plus:0,rarity:'common',locked:false,obtainedAt:1},catalog.items,()=>0);
const character={id:'11111111-1111-4111-8111-111111111111',name:'Navegante',classId:'sword',factionId:'pirate'};
const allocated={strength:0,dexterity:0,vitality:0,intelligence:0,spirit:0};
const original={catalogId:'original-game-v1',inventory:[make(8,'server-boots')],equipment:Object.fromEntries([...catalog.inventorySlotsLeft,...catalog.inventorySlotsRight].map(k=>[k,null])),potions:4,materials:3,forgeVersion:4,forgeSeq:0,forgeHistory:[]};
original.equipment.weapon=make(0,'server-weapon');original.equipment.coat=make(6,'server-coat');
const wire={state:{characterId:character.id,version:1,level:2,experience:'80',gold:'120'},originalInventory:original,inventory:{items:[],equipped:{weapon:null,armor:null}},itemCatalog:[],attributes:{allocated,available:5},progression:{xpIntoLevel:'0',xpForNextLevel:'80'},journey:{started:false},hunt:{status:'locked'},combat:{status:'locked',playerHp:65,playerMaxHp:65},combatPreview:{maxHp:65,attackMin:19,armor:4,cooldownMs:1860,total:{strength:15,dexterity:14,vitality:9,intelligence:6,spirit:6}}};
function refreshFighter(){
 const stats=chars.derive({classId:'sword',level:wire.state.level,attributes:wire.attributes.allocated},birth.classes.sword,birth.factions.pirate,forge.aggregate(wire.originalInventory.equipment,catalog.items));
 wire.combatPreview={rulesetId:'original-character-v1',stats,maxHp:stats.maxHP};
}
refreshFighter();
const maps=require('../world-catalog.cjs').load();
function arrive(mapId,area){wire.world={rulesetId:'original-world-v1',rulesHash:maps.rulesHash,mapId,area,position:{...maps.maps[mapId].spawn},path:[],speed:162.2,direction:'front',serverNow:new Date().toISOString(),motionUntil:new Date().toISOString()};}
arrive('lobby',null);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 const out=process.env.MARE_QA_DIR||'tmp/online-world';fs.mkdirSync(out,{recursive:true});
 const context=await browser.newContext({viewport:{width:1366,height:768}}),p=await context.newPage(),errors=[],commands=[];
 let holdSnapshot=false,releaseSnapshot;
 async function testMovementWhileReconciling(mapId){
  const {spawn}=maps.maps[mapId];
  const click=async(dx,dy)=>{
   const target=await p.locator('#worldCanvas').evaluate((canvas,{x,y})=>{
    const box=canvas.getBoundingClientRect(),{camera}=__mareDiagnostics();
    return {x:box.x+(x-Math.round(camera.x))*box.width/camera.width,y:box.y+(y-Math.round(camera.y))*box.height/camera.height};
   },{x:spawn.x+dx,y:spawn.y+dy});
   await p.mouse.click(target.x,target.y);
  };
  await p.waitForFunction(()=>!MareGameSession.busy);
  const start=commands.length,deadline=Date.now()+5000;
  holdSnapshot=true;
  const commandResponse=p.waitForResponse(response=>response.url().endsWith('/commands')&&response.request().method()==='POST');
  const firstClick=performance.now();
  await click(78,0);
  const response=await commandResponse;
  const responseAt=performance.now();
  assert.equal(response.status(),200);
  while(!releaseSnapshot&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,10));
  assert(releaseSnapshot,`${mapId}: first command must reach its full state read`);
  try{
   await p.waitForFunction(x=>__mareDiagnostics().hero.x>x+1,spawn.x,{timeout:3000});
   const visibleAt=performance.now();
   console.log(`${mapId} fixture: click to POST ${Math.round(commandStarted-firstClick)} ms, POST to response ${Math.round(responseAt-commandStarted)} ms, click to first step ${Math.round(visibleAt-firstClick)} ms`);
   await click(30,45);
   await click(-58,30);
   assert.equal(commands.length,start+1,`${mapId}: no concurrent movement POST`);
  }finally{
   releaseSnapshot();
   releaseSnapshot=undefined;
  }
  await p.waitForFunction(()=>!MareGameSession.busy);
  assert.equal(commands.length,start+2,`${mapId}: the latest click must be sent after reconciliation`);
  assert.equal(commands[start+1].action,'world.move');
  assert(Math.abs(commands[start+1].payload.x-(spawn.x-58))<3,`${mapId}: intermediate click must not be sent`);
 }
 let commandStarted=0;
 try{
  p.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(()=>{localStorage.setItem('mare-partida-save-v1','preserve-demo-byte-for-byte');});
  await p.route('https://**/*',route=>route.abort());
  await p.route('**/v1/**',async route=>{
   const pathname=new URL(route.request().url()).pathname;let body={};
   if(pathname==='/v1/me')body={character};
   else if(pathname==='/v1/auth/csrf')body={csrfToken:'local-fixture'};
   else if(pathname.endsWith('/online-state')){
    if(holdSnapshot&&commands.at(-1)?.action==='world.move'){
     holdSnapshot=false;
     await new Promise(resolve=>{releaseSnapshot=resolve;});
    }
    body=wire;
   }
   else if(pathname.endsWith('/control')||pathname.endsWith('/renew'))body={epoch:1,token:'x'.repeat(43)};
   else if(pathname.endsWith('/commands')){
    commandStarted=performance.now();
    const v=route.request().postDataJSON();commands.push(v);assert.equal(v.expectedVersion,wire.state.version);
    if(v.action==='world.move'){
     assert.deepEqual(Object.keys(v.payload).sort(),['x','y']);const nav=maps.navigation(wire.world.mapId);wire.world.path=nav.path(wire.world.position,v.payload);assert(wire.world.path.length);
     wire.world.serverNow=new Date().toISOString();wire.world.motionUntil=new Date(Date.now()+10000).toISOString();
    }else if(v.action==='world.travel'){assert.deepEqual(v.payload,{islandId:'dawn'});arrive('dawn','beach');}
    else if(v.action==='world.return')arrive('lobby',null);
    else if(v.action==='world.stop'){wire.world.path=[];}
    else throw Error('Unexpected intent '+v.action);
    wire.state.version++;
    body={requestId:v.requestId,action:v.action,state:wire.state,world:wire.world};
   }else throw Error('Unexpected API '+pathname);
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await p.route(process.env.MARE_TEST_URL,async route=>{
   const r=await route.fetch(),html=await r.text();const boot='<script defer src="/apps/account-client/game-session.js"></script><script defer src="/apps/account-client/game-ui.js"></script>';
   await route.fulfill({response:r,body:html.replace(/<script defer src="game\.js/,boot+'<script defer src="game.js')});
  });
  await p.goto(process.env.MARE_TEST_URL);
  await p.waitForFunction(()=>window.MareGameSession?.controlled&&window.__mareDiagnostics?.().map.navigation.ready);
  assert.equal(await p.evaluate(()=>__mareDiagnostics().map.id),'lobby');
  const initial=await p.evaluate(()=>({x:__mareDiagnostics().hero.x,y:__mareDiagnostics().hero.y}));assert.deepEqual(initial,{x:1504,y:1568});
  await testMovementWhileReconciling('lobby');
  // Physical keyboard drives the shipped input path, not a test-only command.
  await p.keyboard.down('w');await p.waitForFunction(()=>__mareDiagnostics().hero.y<1558);await p.keyboard.up('w');
  await p.waitForFunction(()=>!MareGameSession.busy);assert(commands.some(c=>c.action==='world.move'));assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-byte-for-byte');
  await p.locator('.location-heading').click();await p.waitForSelector('[data-island="dawn"]');await p.locator('[data-island="dawn"]').click();
  await p.locator('[data-travel-island="dawn"]').click();
  await p.waitForFunction(()=>__mareDiagnostics().map.id==='dawn'&&__mareDiagnostics().map.navigation.ready);
  assert.equal(await p.locator('#panelOverlay').isHidden(),true);assert(commands.some(c=>c.action==='world.travel'));
  await testMovementWhileReconciling('dawn');
  await p.locator('#journeyToggle').click();await p.locator('#huntRoute').click();await p.waitForSelector('[data-online-action="journey.begin"]');await p.keyboard.press('Escape');
  await p.waitForFunction(()=>__mareDiagnostics().lobby96.visualState==='ready',null,{timeout:90000});await p.evaluate(()=>document.fonts.ready);
  await p.screenshot({path:path.join(out,'online-world-dawn.png')});
  wire.combat={...wire.combat,status:'lost',encounterId:'22222222-2222-4222-8222-222222222222',enemyName:'Saqueador',enemyHp:10,enemyMaxHp:36,worldMapId:'dawn',enemyPosition:{x:982,y:1608}};
  await p.reload();await p.waitForFunction(()=>window.__mareDiagnostics?.().map.id==='dawn');assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-byte-for-byte');assert.equal(await p.evaluate(()=>__mareDiagnostics().alive),0,'historical defeated encounter must not respawn as a live enemy');
  await p.locator('#returnLobby').click();await p.waitForFunction(()=>__mareDiagnostics().map.id==='lobby');
  await p.setViewportSize({width:393,height:852});await p.waitForFunction(()=>__mareDiagnostics().map.navigation.ready&&__mareDiagnostics().lobby96.visualState==='ready',null,{timeout:90000});await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:path.join(out,'online-world-mobile.png')});
  assert.deepEqual(errors,[]);console.log('Original online world: keyboard intent, server route, original voyage panel, travel, reload, return and demo isolation passed.');
 }catch(error){await p.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error({pageErrors:errors,dialog:await p.locator('#dialogBody').innerText().catch(()=>''),commands:commands.map(v=>v.action)});throw error;}finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
