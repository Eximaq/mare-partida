'use strict';
// UI contract test only. Transactions/authorization are exercised by
// server-fruits.test.mts. This fixture never contacts Supabase.
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
const A=require('../akuma-system.js'),fruit=A.byId('akuma_inu_wolf'),def=catalog.items.findIndex(d=>d.fruitId===fruit.id);
original.equipment.akuma_no_mi={id:'server-fruit',def,type:'akuma_no_mi',fruitId:fruit.id,level:1,plus:0,rarity:fruit.rank,locked:false};
wire.fruits={rulesetId:'original-fruits-v1',registered:[]};wire.battle.fruit={id:fruit.id,transformed:true,cooldowns:{},effects:{},advanced:null,time:Date.now()};
arrive('dawn','beach');wire.battle.area='beach';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH}),out=process.env.MARE_QA_DIR||'tmp/fruit-online';fs.mkdirSync(out,{recursive:true});
 const context=await browser.newContext({viewport:{width:1366,height:900}}),p=await context.newPage(),errors=[],sent=[],legacy=[];
 try{
 p.on('pageerror',e=>errors.push(e.message));await context.addInitScript(()=>localStorage.setItem('mare-partida-save-v1','preserve-demo-fruits'));
 await p.route('https://**/*',r=>r.abort());await p.route('**/api/akuma/**',r=>{legacy.push(r.request().url());return r.abort();});
 await p.route('**/v1/**',async route=>{
  const url=new URL(route.request().url());let body={};
  if(url.pathname==='/v1/me')body={character};else if(url.pathname==='/v1/auth/csrf')body={csrfToken:'local-fixture'};
  else if(url.pathname.endsWith('/game-catalog'))body=catalog;
  else if(url.pathname.endsWith('/online-state'))body=wire;
  else if(url.pathname.endsWith('/control')||url.pathname.endsWith('/renew'))body={epoch:1,token:'x'.repeat(43)};
  else if(url.pathname.endsWith('/commands')){
   const v=route.request().postDataJSON();sent.push(v);assert.equal(v.expectedVersion,wire.state.version);
   if(v.action==='fruit.register'){assert.deepEqual(v.payload,{itemId:'server-fruit'});wire.fruits.registered=[fruit.id];}
   else if(v.action==='fruit.transform'){assert.deepEqual(v.payload,{enabled:!wire.battle.fruit.transformed});wire.battle.fruit.transformed=v.payload.enabled;}
   else if(v.action==='fruit.cast'){assert.deepEqual(v.payload,{key:'2'});wire.battle.fruit.time=Date.now();wire.battle.fruit.effects.wolfUntil=Date.now()/1000+6;wire.battle.fruit.cooldowns[fruit.id+':2']=Date.now()+24000;}
   else throw Error('Unexpected command '+v.action);wire.state.version++;
  }else throw Error('Unexpected route '+url.pathname);
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await p.route(process.env.MARE_TEST_URL,async route=>{const r=await route.fetch(),html=await r.text(),boot='<script defer src="/apps/account-client/game-session.js"></script><script defer src="/apps/account-client/game-ui.js"></script>';await route.fulfill({response:r,body:html.replace(/<script defer src="game\.js/,boot+'<script defer src="game.js')});});
 await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.MareGameSession?.controlled&&window.__mareDiagnostics?.().map.navigation.ready);
 async function open(){await p.locator('#characterMenuTrigger').click();await p.locator('[data-character-section="akuma"]').click();await p.waitForSelector('[data-compendium-query]');await p.locator('[data-compendium-query]').fill('Lobo');await p.locator('[data-compendium-fruit="akuma_inu_wolf"]').click();}
 await open();await p.locator('[data-fruit-register="akuma_inu_wolf"]').click();await p.waitForFunction(()=>MareGameSession.data.online.fruits.registered.length===1&&!MareGameSession.busy);assert.equal(original.equipment.akuma_no_mi.id,'server-fruit');assert.equal(wire.state.gold,'120');
 await p.screenshot({path:path.join(out,'fruit-compendium.png')});await p.locator('#closePanel').click();await p.locator('#zoanTransform').click();await p.waitForFunction(()=>!MareGameSession.data.online.battle.fruit.transformed&&!MareGameSession.busy);await p.locator('#zoanTransform').click();await p.waitForFunction(()=>MareGameSession.data.online.battle.fruit.transformed&&!MareGameSession.busy);
 await p.locator('#skill2').click();await p.waitForFunction(()=>MareGameSession.data.online.battle.fruit.effects.wolfUntil&&!MareGameSession.busy);await p.screenshot({path:path.join(out,'fruit-combat.png')});
 await p.reload();await p.waitForFunction(()=>MareGameSession?.controlled);await open();assert(await p.locator('[data-fruit-register="akuma_inu_wolf"]').isDisabled());await p.setViewportSize({width:393,height:852});await p.screenshot({path:path.join(out,'fruit-mobile.png')});assert(await p.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+2));
 await p.locator('#closePanel').click();await p.setViewportSize({width:1366,height:900});
 for(const f of A.catalog)for(const skill of A.activeSkills(f.id)){
  const def=catalog.items.findIndex(d=>d.fruitId===f.id);original.equipment.akuma_no_mi={id:'server-fruit',def,type:'akuma_no_mi',fruitId:f.id,level:1,plus:0,rarity:A.rarityFor(f),locked:false};refreshFighter();
  const base=wire.combatPreview.stats;let now=Date.now();const b=engine.create('beach',base,now,()=>.5),hero={...wire.world.position,direction:'right'},m=b.mobs[0];Object.assign(m,{x:hero.x+20,y:hero.y,anchorX:hero.x+20,anchorY:hero.y,hp:100000,maxHP:100000,speed:0,attack:0});b.mobs=[m];b.targetId=m.id;b.energy=1000;b.autoSkills=false;
  const c={hero,nav:maps.navigation('dawn'),stats:base,baseStats:base,fruitId:f.id,classId:'sword',factionId:'pirate',now,rng:()=>.5};if(A.isZoan(f))engine.fruitTransform(b,true,c);
  if(f.id==='akuma_kuku_kuku'){m.alive=false;m.hp=0;m.corpseUntil=now+12000;}
  if(f.id==='akuma_hoya_hoya'&&skill.key==='2'){assert(engine.fruitCast(b,'1',c));now+=600;engine.step(b,{...c,now,dt:.05});}
  // Human casts have a real wind-up; dependent skills wait for the confirmed release/recovery.
  assert(engine.fruitCast(b,skill.key,{...c,now:now+51}),f.id+skill.key);engine.step(b,{...c,now:now+101,dt:.05});wire.battle=b;
  await p.evaluate(()=>MareGameSession.load());await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.deepEqual(errors,[],f.id+skill.key);
 }
 assert.equal(sent.length,4);assert.deepEqual(legacy,[]);assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-fruits');console.log('Fruit UI passed: owned compendium, original transform/skill controls, persisted cooldown and registration, mobile, no legacy API or save writes. BFF fixture; no provider calls.');
 }catch(e){console.error({errors,diagnostic:await p.evaluate(()=>({online:!!window.MareGameSession,controlled:window.MareGameSession?.controlled,map:window.__mareDiagnostics?.().map,body:document.body.innerText.slice(0,1000)}))});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
