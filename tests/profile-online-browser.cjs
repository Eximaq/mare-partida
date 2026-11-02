'use strict';
// UI contract test only. Transactions/authorization are exercised by
// server-dungeons.test.mts. This fixture never contacts Supabase.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const forge=require('../forge-system.js'),catalog=require('../item-catalog.js').create({forge,prison:require('../prison-system.js'),haki:require('../haki-system.js'),akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')});
const chars=require('../character-system.js'),birth=require('../character-catalog.js').create({characters:chars});
const make=(def,id)=>forge.normalizeItem({def,id,level:1,plus:0,rarity:'common',locked:false,obtainedAt:1},catalog.items,()=>0);
let character={id:'11111111-1111-4111-8111-111111111111',name:'Navegante',classId:'sword',factionId:'pirate'};
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
const A=require('../character-appearance.js');wire.profile={rulesetId:'original-profile-v1',appearance:A.defaults,preferences:{hideItems:false,hideHeadgear:false,healThreshold:.7},createdAt:'2026-01-01T00:00:00Z',identity:{name:character.name,classId:character.classId,factionId:character.factionId}};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH}),out=process.env.MARE_QA_DIR||'tmp/profile-online';fs.mkdirSync(out,{recursive:true});
 const context=await browser.newContext({viewport:{width:1366,height:900}}),p=await context.newPage(),errors=[],sent=[];let created=false;
 try{
 p.on('pageerror',e=>errors.push(e.message));await context.addInitScript(()=>localStorage.setItem('mare-partida-save-v1','preserve-demo-profile'));
 await p.route('https://**/*',r=>r.abort());
 await p.route('**/v1/**',async route=>{
  const url=new URL(route.request().url());let body={};
  if(url.pathname==='/v1/me')body={character:created?character:null};
  else if(url.pathname==='/v1/auth/csrf')body={csrfToken:'fixture'};
  else if(url.pathname==='/v1/characters'){assert(!created);const v=route.request().postDataJSON();assert.deepEqual(Object.keys(v).sort(),['appearance','classId','factionId','name']);character={...character,name:v.name,classId:v.classId,factionId:v.factionId};wire.profile.appearance=v.appearance;wire.profile.identity={name:v.name,classId:v.classId,factionId:v.factionId};created=true;body=character;}
  else if(url.pathname.endsWith('/online-state'))body=wire;
  else if(url.pathname.endsWith('/control')||url.pathname.endsWith('/renew'))body={epoch:1,token:'x'.repeat(43)};
  else if(url.pathname.endsWith('/commands')){const v=route.request().postDataJSON();sent.push(v);assert.equal(v.expectedVersion,wire.state.version);assert(v.action.startsWith('profile.'));
   if(v.action==='profile.appearance')wire.profile.appearance=v.payload.appearance;
   if(v.action==='profile.preferences')Object.assign(wire.profile.preferences,v.payload);
   if(v.action==='profile.identity'){Object.assign(character,{name:v.payload.name,classId:v.payload.classId,factionId:v.payload.factionId});wire.profile.identity={name:character.name,classId:character.classId,factionId:character.factionId};wire.profile.appearance=v.payload.appearance;}
   wire.state.version++;
  }else throw Error('Unexpected route '+url.pathname);
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await p.route(process.env.MARE_TEST_URL,async route=>{const r=await route.fetch(),html=await r.text(),boot='<script defer src="/apps/account-client/game-session.js"></script><script defer src="/apps/account-client/game-ui.js"></script>';await route.fulfill({response:r,body:html.replace(/<script defer src="game\.js/,boot+'<script defer src="game.js')});});
 await p.goto(process.env.MARE_TEST_URL);await p.locator('#factionStep').waitFor({state:'visible'});await p.locator('#characterName').fill('Navegante');await p.locator('#nextToClass').click();await p.locator('#classStep [data-class=sword]').click();await p.locator('#nextToAppearance').click();await p.locator('#appearanceStep select[data-appearance=hairColor]').selectOption('blue');await p.screenshot({path:path.join(out,'creation-original.png')});await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();
 await p.waitForFunction(()=>window.MareGameSession?.controlled&&__mareDiagnostics().map.navigation.ready);assert.equal(wire.profile.appearance.hairColor,'blue');assert(await p.locator('#startOverlay').evaluate(e=>e.classList.contains('hidden')));
 await p.locator('#characterMenuTrigger').click();await p.locator('[data-character-section=status]').click();await p.getByRole('button',{name:'Personalizar aparência',exact:true}).click();await p.locator('#dialogBody select[data-appearance=hairColor]').selectOption('green');await p.locator('[data-appearance-apply]').click();await p.waitForFunction(()=>!MareGameSession.busy&&MareGameSession.data.online.profile.appearance.hairColor==='green');
 await p.reload();await p.waitForFunction(()=>window.MareGameSession?.controlled);assert.equal(await p.evaluate(()=>MareGameSession.data.online.profile.appearance.hairColor),'green');
 await p.keyboard.press('i');await p.locator('#invHideProfile').check();await p.waitForFunction(()=>!MareGameSession.busy&&MareGameSession.data.online.profile.preferences.hideItems);
 await p.keyboard.press('Escape');await p.locator('#captainMenuTrigger').click();await p.locator('[data-captain-section=myprofile]').click();assert.match(await p.locator('#dialogBody').textContent(),/Personagem salvo no servidor/);await p.screenshot({path:path.join(out,'profile-server.png')});
 await p.locator('[data-profile-tab=custom]').click();await p.locator('[data-profile-identity]').click();await p.locator('#characterName').fill('Novo Nome');await p.locator('#nextToClass').click();await p.locator('#nextToAppearance').click();await p.locator('#createCharacter').click();await Promise.all([p.waitForNavigation(),p.locator('[data-confirm-accept]').click()]);await p.waitForFunction(()=>window.MareGameSession?.controlled&&MareGameSession.data.character.name==='Novo Nome');
 assert.equal(sent.filter(v=>v.action==='profile.identity').length,1);assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),'preserve-demo-profile');assert.deepEqual(errors,[]);
 console.log('Original online creation, appearance persistence, preferences, profile and identity edit passed. Isolated BFF fixture; PostgreSQL tests cover persistence and authority.');
 }catch(e){await p.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error({pageErrors:errors,actions:sent.map(v=>v.action)});throw e;}finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
