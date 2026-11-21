'use strict';
// Real weekly UI with an isolated session boundary; server permissions/loot have separate tests.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const out=process.env.MARE_QA_DIR||'tmp/weekly-glass';
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const p=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('  window.__mareDiagnostics=','  window.__weeklyGlassQA={open:openPanel};window.__mareDiagnostics=');
 await p.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source}));
 await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.__weeklyGlassQA);
 await p.locator('#characterName').fill('Nauta');await p.locator('#nextToClass').click();await p.locator('#nextToAppearance').click();await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();
 await p.evaluate(()=>{
  const event={id:'ui-event',mode:'official',status:'active',members:3,maxPlayers:16,minLevel:50,version:1,endsAt:new Date(Date.now()+900000).toISOString()};
  const weekly={events:[event],serverNow:new Date().toISOString(),canManage:false,marinefordReady:true,lootRules:{rankBChance:.01,hakiChance:.01,armamentShare:.5}};
  const listeners=[];window.__weeklyFixture={weekly,event,sent:[],refresh:()=>listeners.forEach(f=>f())};
  window.MareGameSession={available:true,controlled:true,busy:false,pending:null,data:{online:{weeklyBoss:weekly}},subscribe:f=>{listeners.push(f);return()=>{};},read:async()=>{},command:async(action,payload)=>{
   __weeklyFixture.sent.push({action,payload});if(payload.op==='join')weekly.current={...event,boss:{hp:800,maxHp:1000}};if(payload.op==='leave')weekly.current=null;__weeklyFixture.refresh();
  }};
 });
 const open=async()=>{await p.locator('#modesMenuTrigger').click();await p.locator('#weeklyBossMenu').click();};
 for(const [width,height] of [[1920,1080],[1366,768],[1280,720],[1024,768],[768,1024],[390,844],[360,800],[844,390]]){
  await p.setViewportSize({width,height});await p.evaluate(()=>__weeklyGlassQA.open('inventory'));
  const inventory=await (await p.waitForFunction(()=>{const r=document.querySelector('.op-inventory-shell')?.getBoundingClientRect();return r?.width?r.toJSON():false;})).jsonValue();await p.keyboard.press('Escape');await open();
  const rect=await p.locator('#weeklyBossDialog').boundingBox();assert(rect.width<=inventory.width+2&&rect.height<=inventory.height+2,'Weekly stays within inventory limits at '+width);if(height>=720)assert(rect.height<550,'No empty fixed-height weekly panel '+JSON.stringify(rect));
  assert(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=width+1&&rect.y+rect.height<=height+1);
  assert.equal(await p.locator('#weeklyBossDialog').evaluate(e=>getComputedStyle(e).borderTopWidth),'1px');
  assert(await p.locator('#weeklyBossDialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1));
  assert(await p.locator('[data-weekly-op=join]').isEnabled());assert.equal(await p.locator('.weekly-admin').count(),0);
  await p.waitForFunction(()=>document.querySelector('[data-weekly-countdown]').textContent.startsWith('Encerra em'));
  await p.screenshot({path:path.join(out,'weekly-'+width+'.png')});await p.locator('[data-weekly-close]').click();
 }
 await open();await p.locator('[data-weekly-op=join]').click();await p.waitForFunction(()=>!document.querySelector('#weeklyBossDialog').open);assert.deepEqual(await p.evaluate(()=>__weeklyFixture.sent[0]),{action:'weeklyBoss.execute',payload:{op:'join',eventId:'ui-event'}});
 assert(await p.locator('#weeklyBossHUD').isVisible());await open();await p.locator('[data-weekly-op=leave]').click();await p.waitForFunction(()=>!__weeklyFixture.weekly.current);assert.deepEqual(await p.evaluate(()=>__weeklyFixture.sent[1]),{action:'weeklyBoss.execute',payload:{op:'leave'}});
 await p.evaluate(()=>{MareGameSession.busy=true;__weeklyFixture.refresh();});assert(await p.locator('[data-weekly-op=join]').isDisabled());
 await p.evaluate(()=>{MareGameSession.busy=false;__weeklyFixture.weekly.canManage=true;__weeklyFixture.weekly.marinefordReady=false;__weeklyFixture.refresh();});
 assert(await p.locator('[data-weekly-op=activate]').isDisabled());await p.locator('.weekly-admin summary').click();assert(await p.locator('#weeklyBossConfig').isVisible());assert.equal(await p.locator('.weekly-fields input').count(),20);
 await p.locator('input[name="profile.hp"]').fill('2000');await p.evaluate(()=>__weeklyFixture.refresh());assert.equal(await p.locator('input[name="profile.hp"]').inputValue(),'2000','Refresh preserves dirty configuration');
 await p.locator('[data-weekly-close]').click();assert.deepEqual(errors,[]);console.log('PASS weekly glass: eight sizes, live countdown, join/leave intents, busy gating, admin-only configuration and dirty-form preservation.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
