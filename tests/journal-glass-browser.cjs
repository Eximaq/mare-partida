'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const out=process.env.MARE_QA_DIR||'tmp/journal-glass';fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try{
  const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace('  window.__mareDiagnostics=','  window.__journalQA={open:openPanel};window.__mareDiagnostics=');
  await p.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source}));
  const feed=Array.from({length:18},(_,i)=>({id:'qa-'+i,type:['event','update','notice'][i%3],date:'14/11/2026',title:'Publicação de teste '+i,summary:'Conteúdo de validação das categorias e da leitura em telas pequenas. '.repeat(3)}));
  await p.route('**/journal-feed.json',r=>r.fulfill({json:feed}));
  await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.__journalQA);
  await p.locator('#characterName').fill('Navegante');await p.locator('#nextToClass').click();await p.locator('#nextToAppearance').click();await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();
  for(const [width,height] of [[1920,1080],[1366,768],[1280,720],[1024,768],[768,1024],[390,844],[360,800],[844,390]]){
   await p.setViewportSize({width,height});await p.evaluate(()=>__journalQA.open('inventory'));
   const inventory=await(await p.waitForFunction(()=>{const r=document.querySelector('.op-inventory-shell')?.getBoundingClientRect();return r?.width&&r?.height?r.toJSON():false;})).jsonValue();
   await p.evaluate(()=>__journalQA.open('journal'));await p.waitForSelector('.captain-news-item');await p.evaluate(()=>document.fonts.ready);
   const panel=p.locator('#panelOverlay > .dialog'),r=await panel.boundingBox();
   assert(Math.abs(r.width-inventory.width)<2&&Math.abs(r.height-inventory.height)<2,'Journal matches inventory at '+width);
   assert(r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1);
   assert.equal(await panel.evaluate(e=>getComputedStyle(e).borderImageSource),'none');
   assert(await p.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1),'Only news scrolls at '+width);
   assert(await p.locator('.captain-morgan').evaluate(e=>e.complete&&e.naturalWidth>0),'Approved Morgan art loads');
   assert(await p.locator('.captain-news-item').evaluateAll(es=>es.every(e=>e.scrollHeight<=e.clientHeight+1)),'Each news card contains its complete text');
   for(const tab of ['event','update','notice','all']){
    await p.locator('[data-journal-tab='+tab+']').click();
    assert.equal(await p.locator('[data-journal-tab='+tab+']').getAttribute('aria-pressed'),'true');
    assert.equal(await p.locator('.captain-news-item').count(),tab==='all'?18:6);
   }
   await p.locator('.captain-news').evaluate(e=>{e.scrollTop=e.scrollHeight;});
   assert(await p.locator('.captain-news-item').last().isVisible());
   const last=await p.locator('.captain-news-item').last().boundingBox();assert(last.y+last.height<=r.y+r.height,'Last publication reachable');
   await p.locator('.captain-news').evaluate(e=>{e.scrollTop=0;});await p.mouse.move(1,1);
   await p.screenshot({path:path.join(out,'journal-'+width+'.png')});
  }
  assert.deepEqual(errors,[]);console.log('PASS journal glass: inventory dimensions, eight viewports, original art, all filters and contained news scrolling.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
