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
const engine=require('../world-battle.cjs');wire.battle=engine.create('beach',wire.combatPreview.stats,Date.now(),()=>.5);arrive('dawn','beach');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH}),out=process.env.MARE_QA_DIR||'tmp/online-battle';fs.mkdirSync(out,{recursive:true});
 let motionReply=false,holdMotion=false;const heldReplies=[];
 const context=await browser.newContext({viewport:{width:1366,height:768}}),p=await context.newPage(),errors=[],commands=[];
 try{
  p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>{if(new URL(r.url()).pathname.endsWith('.js'))console.error('Script request failed: '+new URL(r.url()).pathname+' '+r.failure()?.errorText);});p.on('response',r=>{if(r.status()>=400&&new URL(r.url()).pathname.endsWith('.js'))console.error('Script HTTP '+r.status()+': '+new URL(r.url()).pathname);});await context.addInitScript(()=>localStorage.setItem('mare-partida-save-v1','preserve-demo-byte-for-byte'));
  await p.route('https://**/*',r=>r.abort());
  await p.route('**/v1/**',async route=>{
   const url=new URL(route.request().url());let body={};
   if(url.pathname==='/v1/me')body={character};
   else if(url.pathname==='/v1/auth/csrf')body={csrfToken:'local-fixture'};
   else if(url.pathname.endsWith('/online-state')){
    if(holdMotion&&motionReply)await new Promise(resolve=>heldReplies.push(resolve));
    if(holdMotion)motionReply=true;
    body=wire;
   }
   else if(url.pathname.endsWith('/control')||url.pathname.endsWith('/renew'))body={epoch:1,token:'x'.repeat(43)};
   else if(url.pathname.endsWith('/commands')){
    const v=route.request().postDataJSON();commands.push(v);assert.equal(v.expectedVersion,wire.state.version);
    if(v.action==='battle.auto'){assert.deepEqual(Object.keys(v.payload),['enabled']);wire.battle.auto=v.payload.enabled;}
    else if(v.action==='battle.skill'){assert.deepEqual(v.payload,{index:0});wire.battle.energy-=17;wire.battle.cooldowns[0]=7;}
    else if(v.action==='world.return'){arrive('lobby',null);engine.changeArea(wire.battle,null,Date.now(),()=>.5);}
    else throw Error('Unexpected intent '+v.action);
    wire.state.version++;
   }else throw Error('Unexpected route '+url.pathname);
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await p.route(process.env.MARE_TEST_URL,async route=>{const r=await route.fetch(),html=await r.text(),boot='<script defer src="/apps/account-client/game-session.js"></script><script defer src="/apps/account-client/game-ui.js"></script>';await route.fulfill({response:r,body:html.replace(/<script defer src="game\.js/,boot+'<script defer src="game.js')});});
  await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.MareGameSession?.controlled&&window.__mareDiagnostics?.().map.navigation.ready);
  assert.equal(await p.evaluate(()=>__mareDiagnostics().alive),14,'original mobs must be drawn from the server snapshot');
  const hp=wire.battle.mobs[0].hp;await p.locator('#autoToggle').click();await p.waitForFunction(()=>__mareDiagnostics().autoPlay);
  assert(commands.some(v=>v.action==='battle.auto'));await p.waitForTimeout(800);assert.equal(wire.battle.mobs[0].hp,hp,'browser cannot deal local damage');
  await p.locator('#skill1').click();await p.waitForFunction(()=>MareGameSession.data.online.battle.cooldowns[0]===7);assert(commands.some(v=>v.action==='battle.skill'));
  wire.battle.hp=77;wire.battle.mobs[0].hp-=12;wire.battle.events=[{seq:1,type:'damage',id:wire.battle.mobs[0].id,amount:12}];wire.battle.seq=1;
  await p.waitForFunction(()=>__mareDiagnostics().hp===77);assert.equal(await p.evaluate(()=>__mareDiagnostics().mobs[0].hp),hp-12);
  // Deliver one new combat sample, then hold later replies to measure the
  // shipped renderer between polls. This is a UI fixture, not provider evidence.
  await p.waitForTimeout(1100);
  wire.world.position.x+=60;wire.battle.mobs[0].x+=60;
  wire.world.serverNow=new Date().toISOString();wire.world.motionUntil=wire.world.serverNow;
  holdMotion=true;const epoch=wire.world.serverNow;
  await p.waitForFunction(epoch=>MareGameSession.data.online.world.serverNow===epoch,epoch);
  const motion=await p.evaluate(async()=>{
   const rows=[],start=performance.now();
   await new Promise(resolve=>{function frame(t){const d=__mareDiagnostics();rows.push({t:t-start,hero:d.hero.x,mob:d.mobs[0].x});if(t-start<680)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
   return rows;
  });
  holdMotion=false;for(const release of heldReplies)release();
  const middle=motion.find(s=>s.t>=320),late=motion.find(s=>s.t>=600);
  assert(middle&&late,'capture middle and end of a combat snapshot interval');
  assert(late.hero-middle.hero>1,'auto hero must keep moving after the first 200ms');
  assert(late.mob-middle.mob>1,'monster must keep moving after the first 180ms');
  assert(late.hero<=wire.world.position.x&&late.mob<=wire.battle.mobs[0].x,'visuals never extrapolate past confirmed combat points');
  assert.equal(wire.battle.mobs[0].hp,hp-12,'smoothing cannot apply local damage');
  await p.locator('#huntRoute').click();await p.waitForSelector('[data-hunt-sector]');assert.equal(await p.locator('[data-online-action="journey.begin"]').count(),0);await p.keyboard.press('Escape');
  await p.waitForFunction(()=>__mareDiagnostics().lobby96.visualState==='ready',null,{timeout:90000});await p.screenshot({path:path.join(out,'original-online-monsters.png')});
  await p.reload();await p.waitForFunction(()=>window.__mareDiagnostics?.().alive===14);assert.equal(await p.evaluate(()=>__mareDiagnostics().hp),77);
  await p.setViewportSize({width:393,height:852});await p.waitForFunction(()=>__mareDiagnostics().lobby96.visualState==='ready',null,{timeout:90000});await p.screenshot({path:path.join(out,'original-online-monsters-mobile.png')});
  assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-byte-for-byte');assert.deepEqual(errors,[]);
  console.log('Original online mobs, auto and skill intents, authoritative HP, continuous sampled combat, native hunt route, reload, mobile and demo preservation passed.');
 }catch(e){await p.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error({pageErrors:errors,commands:commands.map(v=>v.action)});throw e;}finally{holdMotion=false;for(const release of heldReplies)release();await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
