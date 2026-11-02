'use strict';
// UI contract test only. Transactions/authorization are exercised by
// server-achievements.test.mts. This fixture never contacts Supabase.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const forge=require('../forge-system.js'),catalog=require('../item-catalog.js').create({forge,prison:require('../prison-system.js'),haki:require('../haki-system.js'),akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')});
const chars=require('../character-system.js'),birth=require('../character-catalog.js').create({characters:chars});
const make=(def,id)=>forge.normalizeItem({def,id,level:1,plus:0,rarity:'common',locked:false,obtainedAt:1},catalog.items,()=>0);
const character={id:'11111111-1111-4111-8111-111111111111',name:'Navegante',classId:'sword',factionId:'pirate'};
const allocated={strength:0,dexterity:0,vitality:0,intelligence:0,spirit:0};
const original={catalogId:'original-game-v1',inventory:[make(8,'server-boots')],equipment:Object.fromEntries([...catalog.inventorySlotsLeft,...catalog.inventorySlotsRight].map(k=>[k,null])),potions:4,materials:3,forgeVersion:4,forgeSeq:0,forgeHistory:[]};
original.equipment.weapon=make(0,'server-weapon');original.equipment.coat=make(6,'server-coat');
const wire={state:{characterId:character.id,version:1,level:5,experience:'80',gold:'120'},originalInventory:original,inventory:{items:[],equipped:{weapon:null,armor:null}},itemCatalog:[],attributes:{allocated,available:5},progression:{xpIntoLevel:'0',xpForNextLevel:'80'},journey:{started:false},hunt:{status:'locked'},combat:{status:'locked',playerHp:65,playerMaxHp:65},combatPreview:{maxHp:65,attackMin:19,armor:4,cooldownMs:1860,total:{strength:15,dexterity:14,vitality:9,intelligence:6,spirit:6}}};
function refreshFighter(){
 const stats=chars.derive({classId:'sword',level:wire.state.level,attributes:wire.attributes.allocated},birth.classes.sword,birth.factions.pirate,forge.aggregate(wire.originalInventory.equipment,catalog.items));
 wire.combatPreview={rulesetId:'original-character-v1',stats,maxHp:stats.maxHP};
}
refreshFighter();
const maps=require('../world-catalog.cjs').load();
function arrive(mapId,area){wire.world={rulesetId:'original-world-v1',rulesHash:maps.rulesHash,mapId,area,position:{...maps.maps[mapId].spawn},path:[],speed:162.2,direction:'front',serverNow:new Date().toISOString(),motionUntil:new Date().toISOString()};}
arrive('lobby',null);
const engine=require('../world-battle.cjs');wire.battle=engine.create(null,wire.combatPreview.stats,Date.now(),()=>.5);arrive('lobby',null);
const T=require('../talent-system.js');wire.talents={rulesetId:'original-talents-v1',revision:0,earned:5,spent:0,available:5,build:T.empty()};
const A=require('../achievement-system.js');
function refreshAchievements(){const claimed=wire.achievements?.claimed||[],records={coins:120,peakPower:150,islands:[]},g={level:5,achievements:{claimed,records}};wire.achievements={rulesetId:'original-achievements-v1',claimed,records,kills:0,bonus:A.bonus(g),entries:A.list(g,{})};}
refreshAchievements();
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH}),out=process.env.MARE_QA_DIR||'tmp/achievements-online';fs.mkdirSync(out,{recursive:true});
 const context=await browser.newContext({viewport:{width:1366,height:900}}),p=await context.newPage(),errors=[],sent=[],receipts=new Set();let lost=false;
 const section=async name=>{if(await p.locator('#panelOverlay').isVisible())await p.keyboard.press('Escape');await p.locator('.bottom-nav [data-panel=character]').click();await p.locator('[data-character-section='+name+']').click();};
 try{
  p.on('pageerror',e=>errors.push(e.message));await context.addInitScript(()=>localStorage.setItem('mare-partida-save-v1','preserve-demo-achievements'));
  await p.route('https://**/*',r=>r.abort());
  await p.route('**/v1/**',async route=>{
   const url=new URL(route.request().url());let body={};
   if(url.pathname==='/v1/me')body={character};
   else if(url.pathname==='/v1/auth/csrf')body={csrfToken:'local-fixture'};
   else if(url.pathname.endsWith('/online-state'))body=wire;
   else if(url.pathname.endsWith('/control')||url.pathname.endsWith('/renew'))body={epoch:1,token:'x'.repeat(43)};
   else if(url.pathname.endsWith('/commands')){
    const v=route.request().postDataJSON();sent.push(v);assert(['achievement.claim','talents.commit','talents.reset'].includes(v.action));
    if(!receipts.has(v.requestId)){
     assert.equal(v.expectedVersion,wire.state.version);
     if(v.action==='achievement.claim'){
      assert.deepEqual(v.payload,{achievementId:'level-0'});assert.equal(wire.achievements.bonus,0);wire.achievements.claimed.push('level-0');refreshAchievements();wire.talents.earned=6;wire.talents.available=6;
     }else{
      assert.deepEqual(Object.keys(v.payload),v.action==='talents.commit'?['build']:[]);
      const build=v.action==='talents.reset'?T.empty():v.payload.build;assert.equal(T.validate('sword',build,6,wire.talents.build),'');
      const spent=T.spent(build);Object.assign(wire.talents,{build,spent,available:6-spent});
     }
     wire.talents.revision++;wire.state.version++;receipts.add(v.requestId);
    }
    if(v.action==='achievement.claim'&&!lost){lost=true;return route.abort('connectionreset');}
   }else throw Error('Unexpected route '+url.pathname);
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await p.route(process.env.MARE_TEST_URL,async route=>{const r=await route.fetch(),html=await r.text(),boot='<script defer src="/apps/account-client/game-session.js"></script><script defer src="/apps/account-client/game-ui.js"></script>';await route.fulfill({response:r,body:html.replace(/<script defer src="game\.js/,boot+'<script defer src="game.js')});});
  await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.MareGameSession?.controlled&&window.__mareDiagnostics?.().map.navigation.ready);await section('achievements');
  assert.equal(await p.locator('[data-achievement-id]').count(),31);assert.equal(await p.locator('[data-achievement-id][data-state=unavailable]').count(),13);
  assert.equal(await p.locator('[data-achievement-id=kills-0] [data-achievement-claim]').count(),0);
  assert.equal(await p.locator('[data-achievement-total]').textContent(),'1 / 18');
  await p.locator('[data-achievement-claim="level-0"]').click();await p.waitForFunction(()=>MareGameSession.pending&&!MareGameSession.busy);assert.equal(receipts.size,1);
  const requestId=sent.at(-1).requestId;await p.reload();await p.waitForFunction(()=>window.MareGameSession?.controlled&&window.__mareDiagnostics?.().map.navigation.ready);await section('achievements');
  await p.locator('[data-online-action="resume"]').click();await p.waitForFunction(()=>!MareGameSession.pending&&!MareGameSession.busy);assert.equal(sent.at(-1).requestId,requestId);assert.equal(receipts.size,1);
  assert.equal(await p.locator('[data-achievement-points]').textContent(),'1 PT');assert.equal(await p.locator('[data-achievement-id=level-0]').getAttribute('data-state'),'claimed');
  await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:path.join(out,'achievements-online-desktop.png')});
  await p.setViewportSize({width:393,height:852});await p.screenshot({path:path.join(out,'achievements-online-mobile.png')});assert(await p.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  await p.setViewportSize({width:1366,height:900});await section('talents');await p.waitForSelector('[data-talent-select="sword-0-0"]');
  for(let n=0;n<6;n++)await p.locator('[data-talent-select="sword-0-0"]').click();assert.equal(sent.length,2);
  await p.locator('[data-talent-confirm]').click();await p.locator('[data-confirm-accept]').click();await p.waitForFunction(()=>MareGameSession.data.online.talents.spent===6&&!MareGameSession.busy);assert.equal(wire.talents.available,0);
  await p.locator('[data-talent-reset]').click();await p.locator('[data-confirm-accept]').click();await p.waitForFunction(()=>MareGameSession.data.online.talents.spent===0&&!MareGameSession.busy);assert.equal(wire.talents.available,6);assert.equal(wire.achievements.bonus,1);
  assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-achievements');assert.deepEqual(errors,[]);
  console.log('Online achievement UI passed: original journal, 18 authoritative/13 gated, one-time claim, lost-response replay after reload, additional talent point spent/reset, desktop/mobile and demo save preservation.');
 }catch(e){await p.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error({pageErrors:errors,actions:sent.map(v=>v.action)});throw e;}finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
