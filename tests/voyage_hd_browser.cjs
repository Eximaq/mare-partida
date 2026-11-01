'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('function worldChange(area){','function worldChange(area){window.__voyageTravelCalls=(window.__voyageTravelCalls||0)+1;');const hook="  window.__impelQA={get preparedDraft(){return prisonPreparedDraft?.enemy},get game(){return game},set game(v){game=v},get world(){return world},get session(){return session},get run(){return typeof impelRun==='undefined'?null:impelRun},tick,step:tickSimulation,pause(){autoPlay=false;autoSkills=false},resume(){autoPlay=true},persist:persistImpelVictory,enter:enterImpelDown,claim:claimImpelMilestone,stats:getDerived,damage:outputDamage,nav:navigator,exit:returnLobby};window.__mareDiagnostics=";await page.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source.replace('  window.__mareDiagnostics=',hook)}));await page.goto(process.env.MARE_TEST_URL||'http://127.0.0.1:8152/?dev=1');await page.waitForFunction(()=>window.__impelQA);await page.locator('#characterName').fill('Impel QA');await page.locator('#nextToClass').click();await page.locator('#classStep').waitFor({state:'visible'});await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();await page.waitForFunction(()=>__impelQA.game);await page.evaluate(()=>{const q=__impelQA;q.game.level=99;q.game.attributes.strength=400;q.game.hp=q.stats().maxHP;q.game.impelDown={version:1,cleared:0,claimed:[],options:{autoAdvance:false,pauseBeforeBoss:true}};});
await page.waitForTimeout(1400);await page.setViewportSize({width:1672,height:990});
const open=async(kind)=>{await page.evaluate(()=>{if(__mareDiagnostics().map.id!=='lobby')__impelQA.exit();});await page.keyboard.press('m');await page.locator('[data-quick-mode='+kind+']').click();};
const map=async(region='east-blue')=>{await open('map');if(region!=='east-blue')await page.locator('[data-voyage-region='+region+']').click();};
const catalog=await page.evaluate(()=>({regions:MareArchipelago.regions,islands:MareArchipelago.islands}));
await map();
for(const region of catalog.regions){
 await page.locator('[data-voyage-region='+region.id+']').click();
 const list=catalog.islands.filter(i=>i.region===region.id);
 assert.equal(await page.locator('[data-island]').count(),list.length);
 for(const i of list){
  await page.locator('[data-island="'+i.id+'"]').click();
  await page.waitForFunction(()=>document.querySelector('.voyage-adversary .expedition-monster')?.dataset.state==='available');
  if(i.id==='conchas')assert.equal(await page.evaluate(()=>MarePixelMapRenderer.stats().conchas.loaded),false,'inspection must not load the full combat map');
  assert.equal(await page.locator('#dungeonName').textContent(),i.name);
  assert.equal(await page.locator('.dungeon-range strong').textContent(),i.recommended[0]===i.recommended[1]?String(i.recommended[0]):i.recommended.join('–'));
  assert((await page.locator('.voyage-adversary').textContent()).includes(i.monster.name));
  assert.equal(await page.evaluate(()=>__impelQA.game.area),'beach','inspection never travels');
  assert.equal(await page.locator('.dungeon-details .voyage-location').getAttribute('src'),'assets/ui/voyage-hd/'+i.id+'.png');
 }
}
await page.evaluate(()=>__impelQA.game.level=1);
await page.locator('[data-voyage-region=east-blue]').click();await page.locator('[data-island=conchas]').click();
assert(await page.locator('[data-travel-island]').isDisabled());
await page.locator('[data-travel-island]').dispatchEvent('click');
assert.equal(await page.evaluate(()=>__impelQA.game.area),'beach');
await page.evaluate(()=>__impelQA.game.level=99);
for(const i of catalog.islands){
 await map(i.region);await page.locator('[data-island="'+i.id+'"]').click();
 if(i.id==='dawn'){await page.locator('[data-travel-island]').evaluate(b=>{b.dispatchEvent(new MouseEvent('click',{bubbles:true}));b.dispatchEvent(new MouseEvent('click',{bubbles:true}));});assert.equal(await page.evaluate(()=>window.__voyageTravelCalls),1,'duplicate click only travels once');}else await page.locator('[data-travel-island]').click();
 assert.equal(await page.evaluate(()=>__impelQA.game.area),i.area);
 assert(await page.locator('#panelOverlay').evaluate(e=>e.classList.contains('hidden')));
 await page.evaluate(()=>__impelQA.pause());
}
await map();await page.waitForTimeout(3700);
for(const [width,height]of [[1920,1080],[1672,990],[1366,768],[1280,720],[393,851]]){
 await page.setViewportSize({width,height});
 for(const region of ['east-blue','alabasta','skypiea']){
  await page.locator('[data-voyage-region='+region+']').click();
  if(region!=='skypiea')await page.locator('[data-island]').first().click();
  await page.waitForTimeout(250);
  const layout=await page.evaluate(()=>{
   const root=document.querySelector('#dialogBody'),all=[...root.querySelectorAll('[data-island]')],plaque=root.querySelector('.voyage-region-plaque').getBoundingClientRect();
   const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}};
   const rs=all.map(rect),overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2;
   return {overflow:root.scrollWidth>root.clientWidth+1,collisions:rs.flatMap((r,n)=>rs.slice(n+1).filter(s=>overlap(r,s))).length,plaque:rs.some(r=>overlap(r,plaque)),broken:[...root.querySelectorAll('img')].filter(e=>e.complete&&!e.naturalWidth).map(e=>e.src)};
  });
  if(region!=='skypiea'&&width>700){const b=await page.locator('[data-travel-island]').boundingBox();const p=await page.locator('.dungeon-details').boundingBox();assert(b.y+b.height<=p.y+p.height+1,'travel stays inside details at '+width);}
  assert(!layout.overflow,region+' horizontal overflow at '+width);
  assert.equal(layout.collisions,0,region+' overlapping cards at '+width);
  assert(!layout.plaque,region+' title covers cards at '+width);
  assert.deepEqual(layout.broken,[]);
  await page.screenshot({path:process.env.MARE_QA_DIR+'/'+region+'-'+width+'.png'});
 }
}
await page.setViewportSize({width:1672,height:990});
await open('prison');await page.waitForFunction(()=>document.querySelector('.prison-hero-monster')?.dataset.state==='available');
const identity=await page.evaluate(()=>__impelQA.game.impelDown.encounter);
assert(identity?.type);
const name=await page.locator('.prison-enemy-caption strong').textContent();
await page.locator('#closePanel').click();await page.keyboard.press('m');await page.locator('[data-quick-mode=prison]').click();
assert.deepEqual(await page.evaluate(()=>__impelQA.game.impelDown.encounter),identity);
await page.reload();await page.waitForFunction(()=>window.__impelQA?.game);await page.waitForTimeout(600);
await page.keyboard.press('m');await page.locator('[data-quick-mode=prison]').click();
assert.deepEqual(await page.evaluate(()=>__impelQA.game.impelDown.encounter),identity);
assert.equal(await page.locator('.prison-enemy-caption strong').textContent(),name);
await page.locator('[data-prison-enter]').click();await page.evaluate(()=>__impelQA.pause());
const faced=await page.evaluate(()=>({token:__impelQA.run.enemy.token,type:__impelQA.world.mobs[0].type,name:__impelQA.world.mobs[0].name}));
assert.equal(faced.token,identity.token);assert.equal(faced.type,identity.type);assert.equal(faced.name,name);
await page.keyboard.press('m');await page.locator('[data-quick-mode=prison]').click();await page.locator('[data-prison-continue]').click();assert(await page.locator('#panelOverlay').evaluate(e=>e.classList.contains('hidden')));assert.equal(await page.evaluate(()=>__impelQA.run.enemy.token),identity.token);

await page.evaluate(()=>{const q=__impelQA;q.exit();q.game.impelDown.cleared=0;q.game.impelDown.encounter={floor:1,type:'cesar',token:'impel-1-cesar-qa'};});
await page.keyboard.press('m');await page.locator('[data-quick-mode=prison]').click();
await page.waitForFunction(()=>document.querySelector('.prison-hero-monster')?.dataset.state==='available');
await page.evaluate(()=>{
 const original=MareEmberRenderer.monster;window.__cesarPrisonDraws=0;
 MareEmberRenderer.monster=function(c,m,t){if(m.type==='cesar'&&__mareDiagnostics().map.id==='impel-down')window.__cesarPrisonDraws++;return original(c,m,t);};
});
await page.locator('[data-prison-enter]').click();await page.evaluate(()=>{const q=__impelQA;q.pause();q.world.mobs[0].x=q.world.hero.x+100;q.world.mobs[0].y=q.world.hero.y;});
await page.waitForFunction(()=>window.__cesarPrisonDraws>0);
assert.equal(await page.evaluate(()=>__impelQA.run.enemy.type),'cesar');

// Real boss and historical floor states use controlled isolated data.
await page.evaluate(()=>{const q=__impelQA;q.exit();q.game.impelDown.cleared=4;delete q.game.impelDown.encounter;});
await page.keyboard.press('m');await page.locator('[data-quick-mode=prison]').click();
await page.waitForFunction(()=>document.querySelector('.prison-hero-monster')?.dataset.state==='available');
assert.equal(await page.evaluate(()=>__impelQA.game.impelDown.encounter.type),'boss');
assert(await page.locator('[data-prison-floor="6"]').isDisabled());
await page.screenshot({path:process.env.MARE_QA_DIR+'/prison-boss.png'});
await page.locator('[data-prison-floor="1"]').click();assert(await page.locator('[data-prison-enter]').isDisabled());
assert((await page.locator('.prison-enemy-caption').textContent()).includes('desconhecido'));
await page.screenshot({path:process.env.MARE_QA_DIR+'/prison-completed.png'});
await page.locator('[data-prison-floor="5"]').click();
for(const [width,height]of [[1920,1080],[1672,990],[1366,768],[1280,720],[393,851]]){
 await page.setViewportSize({width,height});await page.waitForTimeout(100);
 assert(await page.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'prison overflow at '+width);if(width>1050){const b=await page.locator('[data-prison-enter]').boundingBox();const p=await page.locator('.prison-information').boundingBox();assert(b.y+b.height<=p.y+p.height+1,'entry stays inside details at '+width);}
 await page.screenshot({path:process.env.MARE_QA_DIR+'/prison-'+width+'.png'});
}
// Failed preparation preserves resources and the same unsaved roll; retry is atomic.
await page.evaluate(()=>{const q=__impelQA;q.exit();q.game.impelDown.cleared=8;delete q.game.impelDown.encounter;window.__originalStorage=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('QA offline storage')};});
await page.keyboard.press('m');await page.locator('[data-quick-mode=prison]').click();
assert(await page.locator('[data-prison-prepare]').isVisible());
assert.equal(await page.evaluate(()=>__impelQA.run),null);const unsaved=await page.evaluate(()=>__impelQA.preparedDraft);await page.locator('#closePanel').click();await page.keyboard.press('m');await page.locator('[data-quick-mode=prison]').click();assert.deepEqual(await page.evaluate(()=>__impelQA.preparedDraft),unsaved);
await page.evaluate(()=>Storage.prototype.setItem=window.__originalStorage);
await page.locator('[data-prison-prepare]').click();
assert(await page.locator('[data-prison-enter]').isEnabled());
assert.equal(await page.evaluate(()=>__impelQA.game.impelDown.cleared),8);assert.equal(await page.evaluate(()=>__impelQA.game.impelDown.encounter.token),unsaved.token);
await page.setViewportSize({width:1672,height:990});
await page.screenshot({path:process.env.MARE_QA_DIR+'/prison-available.png'});
assert.deepEqual(errors,[]);
console.log('Voyage HD: all 14 destinations and travel gates, 3 regions, 5 sizes, no overlapping cards, official sprites, persistent preview/battle identity, boss/locked/completed and storage retry passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
