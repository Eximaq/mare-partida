'use strict';
// UI contract test only. Transactions/authorization are exercised by
// server-dungeons.test.mts. This fixture never contacts Supabase.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const forge=require('../forge-system.js'),catalog=require('../item-catalog.js').create({forge,prison:require('../prison-system.js'),haki:require('../haki-system.js'),akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')});
const chars=require('../character-system.js'),birth=require('../character-catalog.js').create({characters:chars});
const make=(def,id)=>forge.normalizeItem({def,id,level:1,plus:0,rarity:'common',locked:false,obtainedAt:1},catalog.items,()=>0);
const character={id:'11111111-1111-4111-8111-111111111111',name:'Navegante',classId:'sword',factionId:'pirate'};
const allocated={strength:0,dexterity:0,vitality:0,intelligence:0,spirit:0};
const original={catalogId:'original-game-v1',inventory:[make(8,'server-boots')],equipment:Object.fromEntries([...catalog.inventorySlotsLeft,...catalog.inventorySlotsRight].map(k=>[k,null])),potions:4,materials:3,forgeVersion:4,forgeSeq:0,forgeHistory:[]};
original.equipment.weapon=make(0,'server-weapon');original.equipment.coat=make(6,'server-coat');
const wire={state:{characterId:character.id,version:1,level:50,experience:'80',gold:'120'},originalInventory:original,inventory:{items:[],equipped:{weapon:null,armor:null}},itemCatalog:[],attributes:{allocated,available:5},progression:{xpIntoLevel:'0',xpForNextLevel:'80'},journey:{started:false},hunt:{status:'locked'},combat:{status:'locked',playerHp:65,playerMaxHp:65},combatPreview:{maxHp:65,attackMin:19,armor:4,cooldownMs:1860,total:{strength:15,dexterity:14,vitality:9,intelligence:6,spirit:6}}};
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
const H=require('../haki-system.js');wire.haki={state:wire.battle.haki,runtime:wire.battle.hakiRuntime};
const book=make(catalog.items.findIndex(d=>d.kind==='haki-book'),'qa-book');wire.originalInventory.inventory.push(book);
for(const branch of H.progression.ids)wire.originalInventory.inventory.push({...make(catalog.items.findIndex(d=>d.kind==='haki-fragment'&&d.branch===branch),'fragment-'+branch),qty:100});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH}),out=process.env.MARE_QA_DIR||'tmp/haki-online';fs.mkdirSync(out,{recursive:true});
 const context=await browser.newContext({viewport:{width:1366,height:900}}),p=await context.newPage(),errors=[],sent=[],receipts=new Set();
 const base=()=>({...wire.originalInventory,level:wire.state.level,has_haki_unlocked:wire.haki.state.unlocked,haki:wire.haki.state});
 try{
 p.on('pageerror',e=>errors.push(e.message));await context.addInitScript(()=>localStorage.setItem('mare-partida-save-v1','preserve-demo-haki'));
 await p.route('https://**/*',r=>r.abort());
 await p.route('**/v1/**',async route=>{
  const url=new URL(route.request().url());let body={};
  if(url.pathname==='/v1/me')body={character};else if(url.pathname==='/v1/auth/csrf')body={csrfToken:'local-fixture'};
  else if(url.pathname.endsWith('/game-catalog'))body=catalog;
  else if(url.pathname.endsWith('/online-state')){refreshFighter();wire.combatPreview.stats=H.stats(wire.combatPreview.stats,base(),wire.haki.runtime);body=wire;}
  else if(url.pathname.endsWith('/control')||url.pathname.endsWith('/renew'))body={epoch:1,token:'x'.repeat(43)};
  else if(url.pathname.endsWith('/commands')){
   const v=route.request().postDataJSON();sent.push(v);assert(['haki.unlock','haki.invest','haki.configure','haki.toggle','haki.cast','world.travel','world.return'].includes(v.action));
   if(!receipts.has(v.requestId)){
    assert.equal(v.expectedVersion,wire.state.version);let result;
    if(v.action==='haki.unlock'){assert.deepEqual(v.payload,{itemId:'qa-book'});result=H.unlock(base(),v.payload.itemId,catalog.items);assert(result.ok);}
    if(v.action==='haki.invest'){assert.deepEqual(Object.keys(v.payload).sort(),['expectedSeq','nodeId']);result=H.progression.invest(base(),v.payload.nodeId,v.payload.expectedSeq,catalog.items,()=>true);assert(result.ok);}
    if(v.action==='haki.configure'){const state=H.configure(base(),v.payload.branch,v.payload.enabled);assert(state);result={state};wire.haki.runtime.active=null;}
    if(result){wire.haki.state=result.state.haki;wire.originalInventory.inventory=result.state.inventory;wire.battle.haki=wire.haki.state;}
    if(v.action==='haki.toggle')assert(engine.hakiToggle(wire.battle,v.payload.branch).ok);
    if(v.action==='haki.cast'){assert.deepEqual(v.payload,{});assert(engine.hakiCast(wire.battle,{hero:wire.world.position,nav:maps.navigation(wire.world.mapId),now:Date.now()}).ok);}
    if(v.action==='world.travel'){assert.deepEqual(v.payload,{islandId:'dawn'});arrive('dawn','beach');engine.changeArea(wire.battle,'beach',Date.now(),()=>.5);}
    if(v.action==='world.return'){arrive('lobby',null);engine.changeArea(wire.battle,null,Date.now(),()=>.5);}
    wire.haki={state:wire.battle.haki,runtime:wire.battle.hakiRuntime};wire.state.version++;receipts.add(v.requestId);
   }
  }else throw Error('Unexpected route '+url.pathname);
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await p.route(process.env.MARE_TEST_URL,async route=>{const r=await route.fetch(),html=await r.text(),boot='<script defer src="/apps/account-client/game-session.js"></script><script defer src="/apps/account-client/game-ui.js"></script>';await route.fulfill({response:r,body:html.replace(/<script defer src="game\.js/,boot+'<script defer src="game.js')});});
 await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.MareGameSession?.controlled&&window.__mareDiagnostics?.().map.navigation.ready);
 await p.keyboard.press('i');await p.locator('[data-item="qa-book"]').click();await p.locator('[data-use-haki-book]').click();await p.locator('[data-confirm-accept]').click();await p.waitForFunction(()=>__mareDiagnostics().haki.unlocked);
 if(!await p.locator('.hm-node').count()){await p.keyboard.press('Escape');await p.locator('#characterMenuTrigger').click();await p.locator('[data-character-section="haki"]').click();}
 await p.waitForSelector('.hm-node');assert.equal(await p.locator('.hm-node').count(),16);assert(await p.locator('[data-haki-toggle=armament]').last().isDisabled());
 for(const node of H.progression.nodes){
  await p.locator('[data-haki-node="'+node.id+'"]').click();
  for(let i=0;i<node.max;i++){await p.locator('[data-haki-invest="'+node.id+'"]').click();await p.locator('[data-confirm-accept]').click();await p.waitForFunction(({id,n})=>__mareDiagnostics().haki.mastery.ranks[id]===n,{id:node.id,n:i+1});await p.waitForFunction(()=>!MareGameSession.busy&&!MareGameSession.pending);}
 }
 await p.screenshot({path:path.join(out,'haki-online-tree.png')});
 await p.setViewportSize({width:393,height:852});assert(await p.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+2));await p.screenshot({path:path.join(out,'haki-online-mobile.png')});await p.setViewportSize({width:1366,height:900});
 await p.locator('[data-haki-auto=armament]').check();await p.waitForFunction(()=>__mareDiagnostics().haki.auto==='armament');await p.reload();await p.waitForFunction(()=>MareGameSession?.controlled&&__mareDiagnostics?.().haki.mastery.completedVersions.conqueror===1);
 // Travel uses the public BFF intent; controls themselves are exercised through H/J/K.
 await p.evaluate(()=>MareGameSession.command('world.travel',{islandId:'dawn'}));await p.waitForFunction(()=>__mareDiagnostics().scene==='hunt'&&__mareDiagnostics().map.navigation.ready&&__mareDiagnostics().lobby96.worldVisual?.state==='ready');
 await p.keyboard.press('h');await p.waitForFunction(()=>__mareDiagnostics().haki.active==='armament');await p.keyboard.press('j');await p.waitForFunction(()=>__mareDiagnostics().haki.active==='observation');await p.keyboard.press('k');await p.waitForFunction(()=>__mareDiagnostics().haki.current===50);assert(await p.locator('#hakiKing').isDisabled());
 await p.screenshot({path:path.join(out,'haki-online-active.png')});const cd=wire.haki.state.kingReadyAt;
 await p.evaluate(()=>MareGameSession.command('world.return',{}));await p.waitForFunction(()=>__mareDiagnostics().scene==='lobby');assert.equal(wire.haki.state.kingReadyAt,cd);assert.equal(wire.haki.runtime.active,null);assert.equal(wire.haki.state.current,50);
 assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-haki');assert.deepEqual(errors,[]);assert.equal(sent.filter(v=>v.action==='haki.unlock').length,1);assert.equal(sent.filter(v=>v.action==='haki.invest').length,42);
 console.log('Online Haki passed: original book confirmation,16 nodes/42 graduations, persistence, auto preference, H/J/K, cooldown, desktop/mobile and demo save. BFF fixture only.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
