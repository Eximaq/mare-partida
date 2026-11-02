'use strict';
// UI contract test only. Transactions/authorization are exercised by
// server-talents.test.mts. This fixture never contacts Supabase.
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
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH}),out=process.env.MARE_QA_DIR||'tmp/talents-online';fs.mkdirSync(out,{recursive:true});
 const context=await browser.newContext({viewport:{width:1366,height:900}}),p=await context.newPage(),errors=[],sent=[],receipts=new Set();let lost=false;
 const tree=async()=>{await p.locator('.bottom-nav [data-panel=character]').click();await p.locator('[data-character-section=talents]').click();await p.waitForSelector('[data-talent-select]');};
 const confirm=async()=>{await p.locator('[data-talent-confirm]').click();await p.locator('[data-confirm-accept]').click();};
 const node=()=>p.locator('[data-talent-select="sword-0-0"]');
 try{
  p.on('pageerror',e=>errors.push(e.message));await context.addInitScript(()=>localStorage.setItem('mare-partida-save-v1','preserve-demo-talents'));
  await p.route('https://**/*',r=>r.abort());
  await p.route('**/v1/**',async route=>{
   const url=new URL(route.request().url());let body={};
   if(url.pathname==='/v1/me')body={character};
   else if(url.pathname==='/v1/auth/csrf')body={csrfToken:'local-fixture'};
   else if(url.pathname.endsWith('/online-state'))body=wire;
   else if(url.pathname.endsWith('/control')||url.pathname.endsWith('/renew'))body={epoch:1,token:'x'.repeat(43)};
   else if(url.pathname.endsWith('/commands')){
    const v=route.request().postDataJSON();sent.push(v);assert(['talents.commit','talents.reset'].includes(v.action));
    assert.deepEqual(Object.keys(v.payload),v.action==='talents.commit'?['build']:[]);
    if(!receipts.has(v.requestId)){
     assert.equal(v.expectedVersion,wire.state.version);
     const build=v.action==='talents.reset'?T.empty():v.payload.build;assert.equal(T.validate('sword',build,2,wire.talents.build),'');
     const spent=T.spent(build);Object.assign(wire.talents,{build,spent,available:2-spent,revision:wire.talents.revision+1});
     refreshFighter();const base=wire.combatPreview.stats;wire.combatPreview.baseStats=base;wire.combatPreview.stats=T.applyStats(base,{classId:'sword',level:2,talentBuilds:{sword:build}});
     wire.state.version++;receipts.add(v.requestId);
    }
    if(wire.talents.spent===2&&!lost){lost=true;return route.abort('connectionreset');}
   }else throw Error('Unexpected route '+url.pathname);
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await p.route(process.env.MARE_TEST_URL,async route=>{const r=await route.fetch(),html=await r.text(),boot='<script defer src="/apps/account-client/game-session.js"></script><script defer src="/apps/account-client/game-ui.js"></script>';await route.fulfill({response:r,body:html.replace(/<script defer src="game\.js/,boot+'<script defer src="game.js')});});
  await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.MareGameSession?.controlled&&window.__mareDiagnostics?.().map.navigation.ready);await tree();
  assert.equal(await p.locator('[data-talent-select]').count(),21);await node().click();assert.equal(sent.length,0);assert.equal(wire.talents.spent,0);
  await confirm();await p.waitForFunction(()=>MareGameSession.data.online.talents.spent===1&&!MareGameSession.busy);assert.equal(sent.length,1);
  await node().click();await confirm();await p.waitForFunction(()=>MareGameSession.pending&&!MareGameSession.busy);assert.equal(receipts.size,2);
  const requestId=sent.at(-1).requestId;await p.reload();await p.waitForFunction(()=>window.MareGameSession?.controlled&&window.__mareDiagnostics?.().map.navigation.ready);await tree();
  await p.locator('[data-online-action="resume"]').click();await p.waitForFunction(()=>!MareGameSession.pending&&!MareGameSession.busy);assert.equal(sent.at(-1).requestId,requestId);assert.equal(receipts.size,2);assert.equal(wire.talents.spent,2);
  await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:path.join(out,'talents-online-desktop.png')});
  await p.setViewportSize({width:393,height:852});await p.locator('[data-tree-zoom=fit]').click();await p.screenshot({path:path.join(out,'talents-online-mobile.png')});
  assert(await p.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  await p.locator('[data-talent-reset]').click();await p.locator('[data-confirm-accept]').click();await p.waitForFunction(()=>MareGameSession.data.online.talents.spent===0&&!MareGameSession.busy);
  assert.equal(receipts.size,3);assert.equal(wire.talents.available,2);assert.equal(wire.state.gold,'120');
  assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-talents');assert.deepEqual(errors,[]);
  console.log('Online talent UI passed: original tree, preview isolation, server confirmation, lost-response replay after reload, port reset, responsive layout and demo save preservation.');
 }catch(e){await p.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error({pageErrors:errors,actions:sent.map(v=>v.action)});throw e;}finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
