'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const out=process.env.MARE_QA_DIR||'tmp/creation-harmony';
const hook='  window.__creationQA={get game(){return game},classes,factions,create:openCreation,update:updateUI};window.__mareDiagnostics=';
(async()=>{fs.mkdirSync(out,{recursive:true});const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const p=await b.newPage({viewport:{width:1672,height:941}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));const classRequests=[];p.on('request',r=>{if(/creation-hd\/class-/.test(r.url()))classRequests.push(r.url());});
 await p.route('**/game.js*',async r=>{const response=await r.fetch(),source=await response.text();assert(source.includes('  window.__mareDiagnostics='));await r.fulfill({response,body:source.replace('  window.__mareDiagnostics=',hook)});});
 await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.__creationQA);
 await p.evaluate(()=>document.fonts.ready);
 const factions=['revolutionary','pirate','marine','government'],classes=['sword','brawler','gunner','rogue','cyborg','strategist','healer'];
 assert.deepEqual(await p.locator('#factionStep [data-faction]').evaluateAll(es=>es.map(e=>e.dataset.faction)),factions);
 await p.locator('#characterName').fill('Navegante');
 for(const id of factions){
  await p.locator('#factionStep [data-faction="'+id+'"]').click();
  const result=await p.evaluate(id=>{const f=__creationQA.factions[id],card=document.querySelector('#factionStep [data-faction="'+id+'"]'),summary=document.querySelector('#creationFactionSummary');return {name:f.name,bonus:f.bonus,card:card.innerText,summary:summary.innerText,selected:card.getAttribute('aria-pressed')};},id);
  assert(result.card.includes(result.name)&&result.summary.includes(result.name));assert(result.card.includes(result.bonus)&&result.summary.includes(result.bonus));assert.equal(result.selected,'true');
 }
 await p.locator('#factionStep [data-faction="pirate"]').click();
 await p.locator('#factionStep img').evaluateAll(es=>Promise.all(es.map(e=>e.decode())));
 await p.screenshot({path:path.join(out,'creation-faction.png')});
 assert.equal(classRequests.length,0,'no class illustrations loaded before the class step');await p.locator('#nextToClass').click();assert(classRequests.every(u=>u.includes('class-sword.png')),'only selected class art loads initially');
 for(const id of classes){
  await p.locator('#classStep [data-class="'+id+'"]').click();
  assert.equal(await p.locator('#classStep [aria-pressed="true"]').count(),1);
  const got=await p.evaluate(id=>{
   const detail=document.querySelector('[data-selected-class]'),tree=MareTalents.getTree(id);
   return {id:detail.dataset.selectedClass,name:detail.querySelector('h2').textContent,expected:__creationQA.classes[id].name,
    birth:Object.fromEntries([...detail.querySelectorAll('[data-birth-attribute]')].map(e=>[e.dataset.birthAttribute,Number(e.textContent)])),expectedBirth:MareCharacters.birth[id],
    talents:[...detail.querySelectorAll('[data-creation-talent]')].map(e=>e.dataset.creationTalent),expectedTalents:[...tree.keystones,...tree.ultimates].map(n=>n.id),
    helps:[...detail.querySelectorAll('[data-studio-help]')].map(e=>e.dataset.helpText)};
  },id);
  assert.equal(got.id,id);assert.equal(got.name,got.expected);assert.deepEqual(got.birth,got.expectedBirth);assert.deepEqual(got.talents,got.expectedTalents);assert(got.helps.every(x=>x.includes('PT')));
  await p.locator('.creation-class-illustration img').evaluate(e=>e.decode());
  assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),null,'preview does not save');
  if(['sword','gunner','healer'].includes(id)){await p.locator('[data-creation-talent] img').evaluateAll(es=>Promise.all(es.map(e=>e.decode())));await p.screenshot({path:path.join(out,'creation-class-'+id+'.png')});}
 }
 // Rapid changes must render the final selection without stale art or stats.
 await p.evaluate(()=>{for(const id of ['sword','rogue','gunner','healer','strategist'])document.querySelector('#classStep [data-class="'+id+'"]').click();});
 assert.equal(await p.locator('[data-selected-class]').getAttribute('data-selected-class'),'strategist');
 await p.locator('[data-creation-talent]').first().click();assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),null);
 await p.locator('#classStep [data-class="sword"]').click();await p.locator('#nextToAppearance').click();
 assert(await p.locator('#creationAppearanceStudio').isVisible());
 const controls=await p.locator('#creationAppearanceStudio').evaluate(e=>e.innerHTML);
 assert(controls.includes('data-appearance'),'shared appearance component');await p.locator('#creationAppearanceStudio [data-appearance=gender]').selectOption('feminino');const hair=await p.locator('#creationAppearanceStudio [data-appearance=hairStyle] option').nth(2).getAttribute('value');await p.locator('#creationAppearanceStudio [data-appearance=hairStyle]').selectOption(hair);
 await p.locator('#backToClass').click();await p.locator('#nextToAppearance').click();assert.equal(await p.locator('#creationAppearanceStudio [data-appearance=gender]').inputValue(),'feminino');assert.equal(await p.locator('#creationAppearanceStudio [data-appearance=hairStyle]').inputValue(),hair);await p.locator('#backToClass').click();assert.equal(await p.locator('[data-selected-class]').getAttribute('data-selected-class'),'sword');
 await p.locator('#backToFaction').click();assert.equal(await p.locator('#characterName').inputValue(),'Navegante');assert.equal(await p.locator('[data-faction="pirate"]').getAttribute('aria-pressed'),'true');
 for(const [width,height]of [[1920,1080],[1366,768],[1280,720],[1024,768],[760,900],[393,852],[320,568],[844,390]]){
  await p.setViewportSize({width,height});
  for(const step of ['faction','class']){
   if(step==='class')await p.locator('#nextToClass').click();
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow '+width+'/'+step);
   const overflow=await p.locator(step==='class'?'.creation-class-layout':'.faction-choices').evaluate(e=>e.scrollWidth>e.clientWidth+1);
   assert(!overflow,'selection overflow '+width+'/'+step);
   if(width===393)await p.screenshot({path:path.join(out,'creation-'+step+'-mobile.png')});
  }
  await p.locator('#backToFaction').click();
 }
 await p.setViewportSize({width:1672,height:941});await p.locator('#nextToClass').click();await p.locator('#nextToAppearance').click();
 await p.locator('#createCharacter').click();assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),null,'confirmation required');
 await p.locator('[data-confirm-accept]').click();await p.waitForFunction(()=>__creationQA.game);
 const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('mare-partida-save-v1')));assert.equal(saved.name,'Navegante');assert.equal(saved.classId,'sword');assert.equal(saved.factionId,'pirate');assert.equal(saved.appearance96.gender,'feminino');assert.equal(saved.appearance96.hairStyle,hair);assert(!saved.talents?.keystone&&!saved.talents?.ultimate);
 await p.reload();await p.waitForFunction(()=>__creationQA.game);assert.equal(await p.evaluate(()=>__creationQA.game.name),'Navegante');
 // Editing preview must keep the original save intact until final confirmation.
 const original=await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1'));
 await p.evaluate(()=>__creationQA.create(true));await p.locator('[data-faction="marine"]').click();await p.locator('#nextToClass').click();await p.locator('[data-class="healer"]').click();
 assert.equal(await p.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),original);
 assert.deepEqual(errors,[]);console.log('Creation browser: 7 classes, 42 specials, 4 factions, 9 viewports, draft navigation, confirmation and reload passed.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
