'use strict';
// UI contract test only. Transactions/authorization are exercised by
// server-contracts.test.mts. This fixture never contacts Supabase.
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
const engine=require('../world-battle.cjs');wire.battle=engine.create('beach',wire.combatPreview.stats,Date.now(),()=>.5);arrive('dawn','beach');
const contracts=require('../contract-system.js');wire.contracts={rulesetId:contracts.rulesetId,progress:Object.fromEntries(contracts.quests.map(q=>[q.id,q.id==='crab'?5:q.id==='bandit'?5:0])),claimed:[]};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH}),out=process.env.MARE_QA_DIR||'tmp/contracts-online';fs.mkdirSync(out,{recursive:true});
 const context=await browser.newContext({viewport:{width:1366,height:900}}),p=await context.newPage(),errors=[],sent=[],receipts=new Set();let lost=false;
 try{
  p.on('pageerror',e=>errors.push(e.message));await context.addInitScript(()=>localStorage.setItem('mare-partida-save-v1','preserve-demo-contracts'));
  await p.route('https://**/*',r=>r.abort());
  await p.route('**/v1/**',async route=>{
   const url=new URL(route.request().url());let body={};
   if(url.pathname==='/v1/me')body={character};
   else if(url.pathname==='/v1/auth/csrf')body={csrfToken:'local-fixture'};
   else if(url.pathname.endsWith('/online-state'))body=wire;
   else if(url.pathname.endsWith('/control')||url.pathname.endsWith('/renew'))body={epoch:1,token:'x'.repeat(43)};
   else if(url.pathname.endsWith('/commands')){
    const v=route.request().postDataJSON();sent.push(v);assert.equal(v.action,'contract.claim');assert.deepEqual(Object.keys(v.payload),['contractId']);
    if(v.payload.contractId==='daily-reward'){assert(contracts.dailyComplete(wire.contracts.daily));wire.contracts.daily.claimed=true;wire.state.version++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({})});}
    const q=contracts.quests.find(q=>q.id===v.payload.contractId);assert(q);
    if(!receipts.has(v.requestId)){
     assert.equal(v.expectedVersion,wire.state.version);assert.equal(wire.contracts.progress[q.id],q.target);assert(!wire.contracts.claimed.includes(q.id));
     wire.contracts.claimed.push(q.id);wire.state.gold=String(BigInt(wire.state.gold)+BigInt(q.gold));wire.state.experience=String(BigInt(wire.state.experience)+BigInt(q.xp));wire.progression.xpIntoLevel=String(BigInt(wire.progression.xpIntoLevel)+BigInt(q.xp));wire.state.version++;receipts.add(v.requestId);
    }
    if(q.id==='bandit'&&!lost){lost=true;return route.abort('connectionreset');}
   }else throw Error('Unexpected route '+url.pathname);
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await p.route(process.env.MARE_TEST_URL,async route=>{const r=await route.fetch(),html=await r.text(),boot='<script defer src="/apps/account-client/game-session.js"></script><script defer src="/apps/account-client/game-ui.js"></script>';await route.fulfill({response:r,body:html.replace(/<script defer src="game\.js/,boot+'<script defer src="game.js')});});
  await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.MareGameSession?.controlled&&window.__mareDiagnostics?.().map.navigation.ready);
  await p.keyboard.press('c');await p.waitForSelector('[data-contract-board]');await p.locator('[data-contract-period="journey"]').click();assert.equal(await p.locator('[data-contract-id]').count(),10);
  assert.equal(await p.locator('[data-contract-id="crab"] [data-contract-count]').innerText(),'5 / 6');assert.equal(await p.locator('[data-contract-id="crab"] [data-claim]').count(),0);
  for(const period of ['daily','weekly','monthly']){await p.locator(`[data-contract-period="${period}"]`).click();assert.equal(await p.locator('[data-contract-id]').count(),0);assert.equal(await p.locator('[data-contract-total]').innerText(),'0 / 0');}
  await p.locator('[data-contract-period="journey"]').click();
  wire.contracts.progress.crab=6;wire.state.version++;await p.evaluate(()=>MareGameSession.read(true));
  await p.locator('[data-contract-id="crab"] [data-claim]').click();await p.waitForFunction(()=>MareGameSession.data.online.contracts.claimed.includes('crab')&&!MareGameSession.busy);
  assert.equal(await p.locator('[data-contract-id="crab"]').getAttribute('data-state'),'claimed');assert.equal(wire.state.gold,'205');assert.equal(sent.length,1);
  await p.locator('[data-contract-id="bandit"] [data-claim]').click();await p.waitForFunction(()=>MareGameSession.pending&&!MareGameSession.busy);assert.equal(wire.state.gold,'330');assert.equal(receipts.size,2);
  const lostRequest=sent.at(-1).requestId;await p.reload();await p.waitForFunction(()=>window.MareGameSession?.controlled&&window.__mareDiagnostics?.().map.navigation.ready);await p.keyboard.press('c');
  await p.locator('[data-online-action="resume"]').click();await p.waitForFunction(()=>!MareGameSession.pending&&!MareGameSession.busy);
  await p.locator('[data-contract-period="journey"]').click();assert.equal(sent.at(-1).requestId,lostRequest);assert.equal(wire.state.gold,'330');assert.equal(receipts.size,2);assert.equal(await p.locator('[data-contract-id="bandit"]').getAttribute('data-state'),'claimed');
  const daily=contracts.daily({cycle:Date.now(),level:2,classId:'sword'});wire.contracts.daily={...daily,objectives:daily.objectives.map(q=>({...q,current:q.target}))};wire.state.version++;
  await p.evaluate(()=>MareGameSession.read(true));await p.locator('[data-contract-period="daily"]').click();await p.waitForSelector('[data-contract-id="daily-combat"]');
  const boost=p.locator('.contracts-final img');assert.equal(await boost.evaluate(i=>i.decode().then(()=>i.naturalWidth)),128);
  await p.locator('[data-claim="daily-reward"]').click();await p.waitForFunction(()=>MareGameSession.data.online.contracts.daily?.claimed&&!MareGameSession.busy);
  assert.equal(await p.locator('[data-claim="daily-reward"]').count(),0);
  await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:path.join(out,'contracts-online-desktop.png')});
  await p.setViewportSize({width:393,height:852});await p.screenshot({path:path.join(out,'contracts-online-mobile.png')});
  assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-contracts');assert.deepEqual(errors,[]);
  console.log('Original contracts UI: legacy objectives, new daily cycle and PixelLab icon, server counters, single rewards, lost-response replay after reload, mobile and demo save isolation passed.');
 }catch(e){await p.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error({pageErrors:errors,actions:sent.map(v=>v.action)});throw e;}finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
