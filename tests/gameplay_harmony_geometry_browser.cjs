'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),{chromium}=require('playwright');
const sizes=[[1672,941],[1920,1080],[1366,768],[1280,720],[1024,768],[760,900],[393,852],[320,568],[844,390]];
const selectors=['#mainMenu','.action-panel','#floatingChat','#floatingExpedition','#journeyHud','#chatCornerToggle','#enterHunt','#returnLobby','#huntRoute','#expeditionMini','#huntXpTracker','#characterQuickMenu','#modesQuickMenu','#captainQuickMenu'];
const base=process.env.MARE_HARMONY_BASE||'d87f40d';
const previous=file=>cp.execFileSync('git',['show',base+':'+file],{encoding:'utf8'});
const hook='  window.__harmonyQA={get game(){return game},get session(){return session},get world(){return world},toggle:toggleFloating,update:updateUI,enter:enterHunt,leave:returnLobby,log,defs:itemDefs,newItem,syncVfx:syncFruitVfx,pause(){autoPlay=false;updateUI();}};window.__mareDiagnostics=';
(async()=>{const out=process.env.MARE_QA_DIR||'tmp/creation-harmony';fs.mkdirSync(out,{recursive:true});const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 async function capture(old){
  const context=await b.newContext({viewport:{width:1672,height:941}}),p=await context.newPage(),records={};
  if(old)await p.route(process.env.MARE_TEST_URL,route=>route.fulfill({contentType:'text/html',body:previous('index.html')}));
  // A historical HTML/game pair must use its matching Haki module contract.
  // The old HTML predates haki-progression.js; mixing it with the new system prevents boot.
  if(old)for(const file of ['haki-system.js','haki-ui.js','haki-art.js'])await p.route('**/'+file+'*',route=>route.fulfill({contentType:'application/javascript',body:previous(file)}));
  await p.route('**/game.js*',async route=>{const response=await route.fetch(),src=old?previous('game.js'):await response.text();await route.fulfill({response,body:src.replace('  window.__mareDiagnostics=',hook)});});
  await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.__harmonyQA);await p.locator('#characterName').fill('Navegante');await p.locator('#nextToClass').click();await p.locator('#nextToAppearance').click();await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();await p.waitForFunction(()=>__harmonyQA.game);
  await p.evaluate(()=>{const g=__harmonyQA.game;g.level=43;g.stats.kills=2057;g.stats.damage=1365479;g.stats.boss=50;__harmonyQA.update();});
  async function rect(key){
   await p.waitForTimeout(220);
   records[key]=await p.evaluate(selectors=>Object.fromEntries(selectors.map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect(),c=getComputedStyle(e);return [s,{x:r.x,y:r.y,w:r.width,h:r.height,visible:c.display!=='none'&&c.visibility!=='hidden'&&r.width>0&&r.height>0}]})),selectors);
  }
  for(const [w,h]of sizes){
   await p.setViewportSize({width:w,height:h});await p.evaluate(()=>{__harmonyQA.toggle('chat',false);__harmonyQA.toggle('expedition',false);document.querySelector('#journeyHud').classList.remove('collapsed');});await rect(w+'x'+h+'/closed');
   await p.evaluate(()=>__harmonyQA.toggle('chat',true));await rect(w+'x'+h+'/chat');
   if(!old&&w===1672)await p.screenshot({path:path.join(out,'gameplay-chat.png')});
   await p.evaluate(()=>__harmonyQA.toggle('chat',false));await p.evaluate(()=>__harmonyQA.toggle('expedition',true));await rect(w+'x'+h+'/expedition');
   if(!old&&w===1672)await p.screenshot({path:path.join(out,'gameplay-expedition.png')});
   await p.evaluate(()=>__harmonyQA.toggle('expedition',false));
   for(const id of ['characterMenuTrigger','modesMenuTrigger','captainMenuTrigger']){
    await p.locator('#'+id).click();await rect(w+'x'+h+'/'+id);
    const open=await p.locator('.quick-menu:not(.hidden)').count();assert(open<=1,'exclusive quick menus');
    if(!old&&w===1672)await p.screenshot({path:path.join(out,'gameplay-'+id+'.png')});
    await p.locator('#'+id).click();
   }
   await p.locator('#journeyToggle').click();await rect(w+'x'+h+'/journey-collapsed');await p.locator('#journeyToggle').click();
  }
  await p.evaluate(()=>__harmonyQA.enter());
  for(const [w,h]of sizes){await p.setViewportSize({width:w,height:h});await rect(w+'x'+h+'/hunt-two-skills');}
  await p.evaluate(()=>{const q=__harmonyQA;const def=q.defs.find(x=>x.fruitId==='akuma_mera_mera');if(!def)throw Error('Mera fixture not found');q.game.equipment.akuma_no_mi=q.newItem(def);q.syncVfx();q.update();});
  assert(await p.locator('#skill3').isVisible(),'Rank S third slot');
  for(const [w,h]of sizes){await p.setViewportSize({width:w,height:h});await rect(w+'x'+h+'/hunt-three-skills');}
  await p.evaluate(()=>__harmonyQA.pause());await rect('hunt-paused');
  if(!old){await p.setViewportSize({width:1672,height:941});await p.screenshot({path:path.join(out,'gameplay-hunt-three-skills.png')});}
  await context.close();return records;
 }
 const old=await capture(true),now=await capture(false),diffs=[];
 for(const[k,rows]of Object.entries(now))for(const[s,r]of Object.entries(rows))for(const prop of ['x','y','w','h','visible']){
  const expected=old[k][s][prop],actual=r[prop];
  if(typeof actual==='boolean'?actual!==expected:Math.abs(actual-expected)>.1)diffs.push({state:k,selector:s,prop,before:expected,after:actual});
 }
 fs.writeFileSync(path.join(out,'geometry-comparison.json'),JSON.stringify({base,states:Object.keys(now).length,diffs},null,2));
 assert.deepEqual(diffs,[],'gameplay outer geometry changed');console.log('Gameplay geometry: '+Object.keys(now).length+' states x '+selectors.length+' surfaces, 9 viewports, lobby/hunt/2-3 slots/paused passed.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
