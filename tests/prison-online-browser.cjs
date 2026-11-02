'use strict';
// UI contract test only. Transactions/authorization are exercised by
// server-prison.test.mts. This fixture never contacts Supabase.
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
const engine=require('../world-battle.cjs');wire.battle=engine.create(null,wire.combatPreview.stats,Date.now(),()=>.5);arrive('lobby',null);
const T=require('../talent-system.js');wire.talents={rulesetId:'original-talents-v1',revision:0,earned:2,spent:0,available:2,build:T.empty()};
const P=require('../prison-system.js');wire.prison=P.migrate({}).impelDown;wire.prison.cleared=4;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH}),out=process.env.MARE_QA_DIR||'tmp/prison-online';fs.mkdirSync(out,{recursive:true});
 const context=await browser.newContext({viewport:{width:1366,height:900}}),p=await context.newPage(),errors=[],sent=[],receipts=new Set();
 const journal=async()=>{if(await p.locator('#panelOverlay').isVisible())await p.keyboard.press('Escape');await p.locator('.bottom-nav [data-panel=modes]').click();await p.locator('[data-quick-mode=prison]').click();};
 try{
  p.on('pageerror',e=>errors.push(e.message));await context.addInitScript(()=>localStorage.setItem('mare-partida-save-v1','preserve-demo-prison'));
  await p.route('https://**/*',r=>r.abort());
  await p.route('**/v1/**',async route=>{
   const url=new URL(route.request().url());let body={};
   if(url.pathname==='/v1/me')body={character};
   else if(url.pathname==='/v1/auth/csrf')body={csrfToken:'local-fixture'};
   else if(url.pathname.endsWith('/online-state'))body=wire;
   else if(url.pathname.endsWith('/control')||url.pathname.endsWith('/renew'))body={epoch:1,token:'x'.repeat(43)};
   else if(url.pathname.endsWith('/commands')){
    const v=route.request().postDataJSON();sent.push(v);assert(['prison.prepare','prison.enter','world.return','items.open-box'].includes(v.action));
    if(!receipts.has(v.requestId)){
     assert.equal(v.expectedVersion,wire.state.version);
     if(v.action==='prison.prepare'){assert.deepEqual(v.payload,{floor:5});const r=P.prepareEncounter({impelDown:wire.prison},5,engine.prisonCatalog,()=>0);assert(r.ok);wire.prison=r.state.impelDown;wire.prison.encounter.spawnId='22222222-2222-4222-8222-222222222222';}
     if(v.action==='prison.enter'){assert.deepEqual(v.payload,{floor:5});arrive('impel-down','impel-down');engine.enterPrison(wire.battle,P.resolveEncounter(wire.prison.encounter,engine.prisonCatalog),wire.combatPreview.stats,wire.world.position,{id:wire.prison.encounter.spawnId});}
     if(v.action==='world.return'){assert.deepEqual(v.payload,{});arrive('lobby',null);engine.changeArea(wire.battle,null,Date.now(),()=>0);}
     if(v.action==='items.open-box'){assert.deepEqual(v.payload,{itemId:'impel-milestone-5'});const r=P.openBox(wire.originalInventory,v.payload.itemId,catalog.items,()=>0,1);assert(r.ok);wire.originalInventory.inventory=r.state.inventory;}
     wire.state.version++;receipts.add(v.requestId);
    }
   }else throw Error('Unexpected route '+url.pathname);
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await p.route(process.env.MARE_TEST_URL,async route=>{const r=await route.fetch(),html=await r.text(),boot='<script defer src="/apps/account-client/game-session.js"></script><script defer src="/apps/account-client/game-ui.js"></script>';await route.fulfill({response:r,body:html.replace(/<script defer src="game\.js/,boot+'<script defer src="game.js')});});
  await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.MareGameSession?.controlled&&window.__mareDiagnostics?.().map.navigation.ready);await journal();
  await p.waitForFunction(()=>MareGameSession.data.online.prison.encounter&&!MareGameSession.busy);assert.equal(sent.length,1);await p.locator('[data-prison-enter]').click();
  await p.waitForFunction(()=>MareGameSession.data.online.world.mapId==='impel-down'&&window.__mareDiagnostics?.().map.navigation.ready&&!MareGameSession.busy);
  assert.equal(await p.evaluate(()=>__mareDiagnostics().map.id),'impel-down');assert.equal(await p.evaluate(()=>__mareDiagnostics().alive),1);assert.match(await p.locator('#locationName').textContent(),/Impel Down/);
  await p.waitForFunction(()=>MareImpel.image.complete&&MareImpel.image.naturalWidth>0);await p.screenshot({path:path.join(out,'prison-online-arena.png')});
  await p.reload();await p.waitForFunction(()=>window.MareGameSession?.controlled&&window.__mareDiagnostics?.().map.navigation.ready);assert.equal(sent.length,2);assert.equal(wire.battle.mobs.length,1);
  await journal();await p.screenshot({path:path.join(out,'prison-online-journal.png')});await p.setViewportSize({width:393,height:852});await p.screenshot({path:path.join(out,'prison-online-mobile.png')});assert(await p.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  const victory=P.completeFloor({...wire.originalInventory,impelDown:wire.prison},5,true,catalog.items);assert(victory.ok);wire.prison=victory.state.impelDown;wire.originalInventory.inventory=victory.state.inventory.map(i=>({...i,obtainedAt:i.obtainedAt??1}));wire.battle.mobs[0].hp=0;wire.battle.mobs[0].alive=false;wire.state.version++;
  await p.evaluate(()=>MareGameSession.read());await p.keyboard.press('Escape');await p.setViewportSize({width:1366,height:900});await p.locator('#returnLobby').click();await p.waitForFunction(()=>MareGameSession.data.online.world.mapId==='lobby'&&!MareGameSession.busy);
  await p.keyboard.press('i');await p.locator('[data-item="impel-milestone-5"]').click();await p.locator('[data-open-pearl-box]').click();await p.locator('[data-confirm-accept]').click();await p.waitForFunction(()=>MareGameSession.data.online.originalInventory.inventory.some(i=>i.id==='pearl-from-impel-milestone-5')&&!MareGameSession.busy);
  assert.equal(sent.filter(v=>v.action==='items.open-box').length,1);assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-prison');assert.deepEqual(errors,[]);
  console.log('Online prison UI passed: original journal/map/monster, prepared identity, reload, desktop/mobile, milestone box confirmation and preserved demo save. BFF responses were fixtures; SQL/worker are tested separately.');
 }catch(e){await p.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error({pageErrors:errors,actions:sent.map(v=>v.action)});throw e;}finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
