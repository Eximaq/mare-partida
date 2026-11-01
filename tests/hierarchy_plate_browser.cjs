'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const out=process.env.MARE_QA_DIR||path.join(require('node:os').tmpdir(),'mare-hierarchy-plates');
const slots={pirate:[61,70],marine:[65.5,88],revolutionary:[65,74],government:[82.5,86]};
(async()=>{fs.mkdirSync(out,{recursive:true});const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const p=await b.newPage({viewport:{width:1920,height:1080}}),errors=[];p.on('pageerror',e=>{errors.push(e.message);console.error(e.stack)});p.on('requestfailed',r=>console.error('Load failed:',r.url(),r.failure()?.errorText));
 const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
 await p.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source.replace('  window.__mareDiagnostics=','  window.__plateQA={get game(){return game},open:openPanel,close:closePanel,hide:()=>gameTooltip.hide()};window.__mareDiagnostics=')}));
 await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.__plateQA&&window.__mareDiagnostics().lobby96.state==='ready'&&typeof MareCombatVfx!=='undefined');
 await p.locator('#characterName').fill('Nauta dos Mares');await p.locator('#nextToClass').click();await p.locator('#nextToAppearance').click();await p.waitForFunction(()=>document.querySelector('#creationLookState').textContent.includes('Prévia atualizada'));await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();await p.waitForFunction(()=>__plateQA.game);
 await p.evaluate(()=>__plateQA.open('character','hierarchy'));await p.evaluate(()=>document.fonts.ready);
 const original=await p.evaluate(()=>JSON.stringify({f:__plateQA.game.factionId,t:__plateQA.game.hierarchyTier})),records=[];
 for(const width of [1920,1366,1280,1024,393,320]){
  await p.setViewportSize({width,height:width<760?852:1080});
  for(const faction of Object.keys(slots)){
   await p.locator('[data-hierarchy-faction='+faction+']').click();
   for(let tier=1;tier<=8;tier++){
    await p.locator('[data-hierarchy-tier-select]').selectOption(String(tier));
    const rows=await p.locator('.hierarchy-title-plate').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect(),a=e.querySelector('.rank-insignia').getBoundingClientRect(),text=e.querySelector('strong').getBoundingClientRect();return {f:e.dataset.faction,art:e.querySelector('[data-rank-art]').dataset.rankArt,x:r.x,y:r.y,w:r.width,h:r.height,cx:a.x+a.width/2,cy:a.y+a.height/2,mark:a.width,right:a.right,text:text.x,textHeight:text.height};}));
    for(const row of rows){const [x,size]=slots[faction];assert(Math.abs(row.cx-(row.x+row.w*x/480))<.6,JSON.stringify(row));assert(Math.abs(row.cy-(row.y+row.h/2))<.6);assert(Math.abs(row.mark-row.w*size/480)<.6);assert(row.right<=row.text+1,'Insignia must not overlap the title');assert(row.textHeight<=row.w*.17+1,'Title remains within the painted plaque: '+JSON.stringify(row));records.push({width,tier,...row});}
    if(width===1920&&[1,5,8].includes(tier)){await p.mouse.move(1,1);await p.evaluate(()=>__plateQA.hide());await p.screenshot({path:path.join(out,faction+'-'+tier+'.png')});}
   }
  }
 }
 assert.equal(await p.evaluate(()=>JSON.stringify({f:__plateQA.game.factionId,t:__plateQA.game.hierarchyTier})),original,'Consultation must not change faction or rank');
 // Same component in the promotion dialog: all 32 variants, including long names.
 await p.setViewportSize({width:1600,height:1100});
 await p.evaluate(()=>{__plateQA.close();const host=document.createElement('section');host.id='plateContact';host.style.cssText='position:fixed;inset:0;z-index:99999;background:#17100b;padding:20px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;color:#ffe2a6';host.innerHTML=Object.keys(MareHierarchyUI.factions).map(f=>'<div><h2>'+MareHierarchyUI.factions[f].name+'</h2>'+Array.from({length:8},(_,i)=>MareHierarchyUI.plate(f,i+1)).join('')+'</div>').join('');document.querySelector('#app').append(host);});
 await p.screenshot({path:path.join(out,'all-32-plates.png')});
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'geometry.json'),JSON.stringify(records,null,2));console.log('Hierarchy plates: four factions × eight tiers × six viewports, art socket centers, title separation and read-only consultation passed.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
