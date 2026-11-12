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
const wire={state:{characterId:character.id,version:1,level:20,experience:'80',gold:'120'},originalInventory:original,inventory:{items:[],equipped:{weapon:null,armor:null}},itemCatalog:[],attributes:{allocated,available:5},progression:{xpIntoLevel:'0',xpForNextLevel:'80'},journey:{started:false},hunt:{status:'locked'},combat:{status:'locked',playerHp:65,playerMaxHp:65},combatPreview:{maxHp:65,attackMin:19,armor:4,cooldownMs:1860,total:{strength:15,dexterity:14,vitality:9,intelligence:6,spirit:6}}};
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
const D=require('../boss-dungeon-system.js'),chest=maps.maps['quest-dungeons'].interactions[0];wire.dungeons=D.migrate({characterId:character.id}).bossDungeons;wire.dungeonGoldEarned=10000;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH}),out=process.env.MARE_QA_DIR||'tmp/dungeons-online';fs.mkdirSync(out,{recursive:true});
 const context=await browser.newContext({viewport:{width:1366,height:900}}),p=await context.newPage(),errors=[],sent=[],receipts=new Set();
 const journal=async()=>{if(await p.locator('#panelOverlay').isVisible())await p.keyboard.press('Escape');await p.locator('#modesMenuTrigger').click();await p.locator('[data-quick-mode=dungeons]').click();};
 const base=()=>({...wire.originalInventory,characterId:character.id,level:wire.state.level,gold:0,xp:0,bossDungeons:wire.dungeons,stats:{goldEarned:wire.dungeonGoldEarned}});
 try{
  p.on('pageerror',e=>errors.push(e.message));await context.addInitScript(()=>localStorage.setItem('mare-partida-save-v1','preserve-demo-dungeons'));
  await p.route('https://**/*',r=>r.abort());
  await p.route('**/v1/**',async route=>{
   const url=new URL(route.request().url());let body={};
   if(url.pathname==='/v1/me')body={character};else if(url.pathname==='/v1/auth/csrf')body={csrfToken:'local-fixture'};
   else if(url.pathname.endsWith('/online-state'))body=wire;
   else if(url.pathname.endsWith('/control')||url.pathname.endsWith('/renew'))body={epoch:1,token:'x'.repeat(43)};
   else if(url.pathname.endsWith('/commands')){
    const v=route.request().postDataJSON();sent.push(v);assert(['dungeon.enter','dungeon.claim','dungeon.craft','dungeon.acknowledge','world.return'].includes(v.action));
    if(!receipts.has(v.requestId)){
     assert.equal(v.expectedVersion,wire.state.version);
     if(v.action==='dungeon.enter'){
      assert.deepEqual(Object.keys(v.payload),['dungeonId']);const r=D.begin(base(),v.payload.dungeonId,'33333333-3333-4333-8333-333333333333');assert(r.ok);r.record.spawnId='22222222-2222-4222-8222-222222222222';wire.dungeons=r.state.bossDungeons;
      arrive('quest-dungeons','quest-dungeons');engine.enterDungeon(wire.battle,v.payload.dungeonId,r.record,wire.combatPreview.stats,wire.world.position);
     }
     if(v.action==='world.return'){assert.deepEqual(v.payload,{});arrive('lobby',null);engine.changeArea(wire.battle,null,Date.now(),()=>0);}
     if(v.action==='dungeon.claim'){
      assert.deepEqual(v.payload,{dungeonId:wire.battle.dungeon.id});const r=D.claim(base(),v.payload.dungeonId,{runId:wire.battle.dungeon.record.runId,position:wire.world.position,chest,defs:catalog.items,applyXP:()=>{},commit:()=>true});assert(r.ok);wire.dungeons=r.state.bossDungeons;wire.originalInventory.inventory=r.state.inventory;wire.state.gold=String(BigInt(wire.state.gold)+BigInt(r.reward.berry));
     }
     if(v.action==='dungeon.craft'){assert.deepEqual(v.payload,{expectedSeq:wire.dungeons.seq,rank:'E'});const r=D.craft(base(),{expectedSeq:v.payload.expectedSeq,defs:catalog.items,catalog:require('../akuma-system.js').catalog,random:()=>0,commit:()=>true});assert(r.ok);wire.dungeons=r.state.bossDungeons;wire.originalInventory.inventory=r.state.inventory;}
     if(v.action==='dungeon.acknowledge'){assert.deepEqual(v.payload,{itemId:wire.dungeons.reveal.itemId});const r=D.acknowledge(base(),v.payload.itemId,()=>true);assert(r.ok);wire.dungeons=r.state.bossDungeons;}
     wire.state.version++;receipts.add(v.requestId);
    }
   }else throw Error('Unexpected route '+url.pathname);
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await p.route(process.env.MARE_TEST_URL,async route=>{const r=await route.fetch(),html=await r.text(),boot='<script defer src="/apps/account-client/game-session.js"></script><script defer src="/apps/account-client/game-ui.js"></script>';await route.fulfill({response:r,body:html.replace(/<script defer src="game\.js/,boot+'<script defer src="game.js')});});
  await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.MareGameSession?.controlled&&window.__mareDiagnostics?.().map.navigation.ready);
  for(const id of ['alvida','morgan']){
   await journal();await p.locator('[data-dungeon-select="'+id+'"]').click();assert.match(await p.locator('.dungeon-rewards').textContent(),/100 Berry/);await p.screenshot({path:path.join(out,'dungeons-journal-'+id+'.png')});
   await p.setViewportSize({width:393,height:852});assert(await p.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await p.screenshot({path:path.join(out,'dungeons-mobile-'+id+'.png')});await p.setViewportSize({width:1366,height:900});
   await p.locator('[data-dungeon-enter="'+id+'"]').click();await p.waitForFunction(()=>MareGameSession.data.online.world.mapId==='quest-dungeons'&&__mareDiagnostics().map.navigation.ready&&!MareGameSession.busy&&document.querySelector('#worldLoading').dataset.state==='ready');assert.equal(await p.evaluate(()=>__mareDiagnostics().alive),1);
   await p.screenshot({path:path.join(out,'dungeons-arena-'+id+'.png')});await p.reload();await p.waitForFunction(()=>window.MareGameSession?.controlled&&__mareDiagnostics().map.id==='quest-dungeons'&&document.querySelector('#worldLoading').dataset.state==='ready');assert.equal(sent.filter(v=>v.action==='dungeon.enter'&&v.payload.dungeonId===id).length,1);
   const r=D.defeat(base(),id,wire.battle.dungeon.record,n=>Math.round(80*Math.pow(n,1.5)));assert(r.ok);wire.dungeons=r.state.bossDungeons;wire.battle.dungeon.record=r.record;wire.battle.mobs=[];wire.battle.auto=false;wire.world.position={x:chest.x,y:chest.y+56};wire.state.version++;
   await p.evaluate(()=>MareGameSession.read());await p.waitForFunction(y=>Math.abs(__mareDiagnostics().hero.y-y)<1,chest.y+56);
   // A snapshot teleports the fixture hero; the original camera follows smoothly.
   // Wait for its rendered transform to settle before choosing a screen point.
   await p.evaluate(()=>new Promise(resolve=>{let last='',stable=0;function frame(){const c=__mareDiagnostics().camera,key=[Math.round(c.x),Math.round(c.y),c.width,c.height].join(':');stable=key===last?stable+1:0;last=key;if(stable>=8)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);}));
   const point=await p.evaluate(c=>{const d=__mareDiagnostics(),r=document.querySelector('canvas#worldCanvas').getBoundingClientRect();return {x:r.x+(c.x-Math.round(d.camera.x))*r.width/d.camera.width,y:r.y+(c.y-Math.round(d.camera.y))*r.height/d.camera.height};},{x:chest.bounds.x+chest.bounds.w/2,y:chest.bounds.y+chest.bounds.h/2});
   await p.mouse.click(point.x,point.y);await p.waitForFunction(id=>MareGameSession.data.online.dungeons.records[id].phase==='claimed'&&!MareGameSession.busy,id);
   await p.locator('#returnLobby').click();await p.waitForFunction(()=>MareGameSession.data.online.world.mapId==='lobby'&&!MareGameSession.busy);
  }
  await p.keyboard.press('i');const fragment=wire.originalInventory.inventory.find(i=>i.materialId==='akuma_fragment_e');assert.equal(fragment.quantity,10);await p.locator('[data-item="'+fragment.id+'"]').click();await p.locator('[data-form-akuma]').click();await p.locator('[data-confirm-accept]').click();await p.locator('[data-akuma-reveal-continue]').waitFor();await p.screenshot({path:path.join(out,'dungeons-formed-fruit.png')});await p.locator('[data-akuma-reveal-continue]').click();await p.waitForFunction(()=>!MareGameSession.data.online.dungeons.reveal&&!MareGameSession.busy);
  assert.equal(sent.filter(v=>v.action==='dungeon.claim').length,2);assert.equal(sent.filter(v=>v.action==='dungeon.craft').length,1);assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-dungeons');assert.deepEqual(errors,[]);
  console.log('Online dungeons UI passed: original desktop/mobile panels, two bosses/maps, reload, chest click, bound fragments, confirmation/craft/reveal and demo preservation. BFF fixture; worker and transactions tested separately.');
 }catch(e){await p.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error({pageErrors:errors,actions:sent.map(v=>v.action)});throw e;}finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
