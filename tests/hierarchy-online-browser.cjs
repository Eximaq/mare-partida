'use strict';
// UI contract test only. Transactions/authorization are exercised by
// server-hierarchy.test.mts. This fixture never contacts Supabase.
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
const H=require('../hierarchy-system.js');wire.hierarchy={rulesetId:'original-hierarchy-v1',tier:1,title:H.title('pirate',1),power:wire.combatPreview.stats.power,next:H.next(1,50)};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH}),out=process.env.MARE_QA_DIR||'tmp/hierarchy-online';fs.mkdirSync(out,{recursive:true});
 const context=await browser.newContext({viewport:{width:1366,height:900}}),p=await context.newPage(),errors=[],sent=[],legacy=[];
 try{
 p.on('pageerror',e=>errors.push(e.message));await context.addInitScript(()=>localStorage.setItem('mare-partida-save-v1','preserve-demo-hierarchy'));
 await p.route('https://**/*',r=>r.abort());await p.route('**/api/hierarchy/**',r=>{legacy.push(r.request().url());return r.abort();});
 await p.route('**/v1/**',async route=>{
  const url=new URL(route.request().url());let body={};
  if(url.pathname==='/v1/me')body={character};else if(url.pathname==='/v1/auth/csrf')body={csrfToken:'local-fixture'};
  else if(url.pathname.endsWith('/game-catalog'))body=catalog;
  else if(url.pathname.endsWith('/online-state'))body=wire;
  else if(url.pathname.endsWith('/control')||url.pathname.endsWith('/renew'))body={epoch:1,token:'x'.repeat(43)};
  else if(url.pathname==='/v1/hierarchy/ranking'){
   const faction=url.searchParams.get('faction');body={faction,leaderboard:[{player_id:character.id,name:character.name,faction:'pirate',class_id:'sword',tier:wire.hierarchy.tier,rank_title:wire.hierarchy.title,level:50,power:999,portrait:''}].filter(v=>!faction||v.faction===faction)};
  }else if(url.pathname.endsWith('/commands')){
   const v=route.request().postDataJSON();sent.push(v);assert.equal(v.action,'hierarchy.promote');assert.deepEqual(v.payload,{expectedTier:wire.hierarchy.tier});assert.equal(v.expectedVersion,wire.state.version);
   wire.hierarchy.tier++;wire.hierarchy.title=H.title('pirate',wire.hierarchy.tier);wire.hierarchy.next=H.next(wire.hierarchy.tier,50);wire.state.version++;
  }else throw Error('Unexpected route '+url.pathname);
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await p.route(process.env.MARE_TEST_URL,async route=>{const r=await route.fetch(),html=await r.text(),boot='<script defer src="/apps/account-client/game-session.js"></script><script defer src="/apps/account-client/game-ui.js"></script>';await route.fulfill({response:r,body:html.replace(/<script defer src="game\.js/,boot+'<script defer src="game.js')});});
 await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.MareGameSession?.controlled&&window.__mareDiagnostics?.().map.navigation.ready);
 async function open(){await p.locator('#characterMenuTrigger').click();await p.locator('[data-character-section="hierarchy"]').click();await p.waitForSelector('[data-hierarchy-promote]');}
 await open();await p.locator('[data-hierarchy-promote]').click();await p.locator('[data-confirm-accept]').click();await p.waitForFunction(()=>MareGameSession.data.online.hierarchy.tier===2&&!MareGameSession.busy);await p.waitForFunction(()=>document.querySelector('[data-hierarchy-promote]')&&!document.querySelector('[data-hierarchy-promote]').disabled);
 await p.screenshot({path:path.join(out,'hierarchy-online.png')});
 await p.locator('[data-hierarchy-faction="marine"]').click();assert(await p.locator('[data-hierarchy-promote]').isDisabled());await p.locator('[data-hierarchy-tier-select]').selectOption('8');assert((await p.locator('#dialogBody').innerText()).includes('Almirante de Frota'));
 await p.locator('[data-hierarchy-faction="pirate"]').click();await p.setViewportSize({width:393,height:852});assert(await p.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+2));await p.screenshot({path:path.join(out,'hierarchy-online-mobile.png')});
 await p.reload();await p.waitForFunction(()=>MareGameSession?.controlled&&MareGameSession.data.online.hierarchy.tier===2);await open();await p.locator('[data-hierarchy-promote]').click();await p.locator('[data-confirm-accept]').click();await p.waitForFunction(()=>MareGameSession.data.online.hierarchy.tier===3&&!MareGameSession.busy);assert(await p.locator('[data-hierarchy-promote]').isDisabled());
 assert.equal(sent.length,2);assert.deepEqual(legacy,[]);assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-hierarchy');console.log('Hierarchy UI passed: original promotion, faction/tier navigation, ranking, reload, level gate, mobile and untouched demo. BFF fixture; no provider calls.');
 }catch(e){console.error({errors,diagnostic:await p.evaluate(()=>({online:!!window.MareGameSession,controlled:window.MareGameSession?.controlled,map:window.__mareDiagnostics?.().map,body:document.body.innerText.slice(0,1000)}))});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
