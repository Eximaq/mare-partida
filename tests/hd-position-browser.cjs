'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const url=process.env.MARE_TEST_URL,dir=process.env.MARE_EVIDENCE_DIR;
if(!url||!dir)throw Error('Set MARE_TEST_URL and MARE_EVIDENCE_DIR');
(async()=>{
 await fs.mkdir(dir,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:780},acceptDownloads:true});
  await context.addInitScript(()=>{
   const paint=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
    if(this.canvas.id==='figure'&&image.getContext)window.__benchImage=image;
    return paint.call(this,image,...args);
   };
   window.__fingerprint=async c=>{
    if(!c?.width||!c?.height)return null;
    const {data}=c.getContext('2d').getImageData(0,0,c.width,c.height);
    const hash=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(hash)].join(',');
   };
  });
  const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(new URL('bancada-hd.html',url).href);await p.waitForFunction(()=>window.__benchImage&&document.querySelector('#part').value==='*');
  assert.equal(await p.locator('#catalog button').count(),92);
  const pixels=()=>p.evaluate(()=>__fingerprint(window.__benchImage));
  const waitPixels=async(expected,equal=true)=>{
   const until=Date.now()+60000;
   while(Date.now()<until){
    const hash=await pixels();if(hash&&(hash===expected)===equal)return hash;
    await new Promise(resolve=>setTimeout(resolve,60));
   }
   throw Error('A prévia não atingiu os pixels esperados. '+await p.locator('#status').innerText());
  };
  const initial=await waitPixels(null,false);
  await p.locator('[data-move="1,0"]').click();await waitPixels(initial,false);
  const edited=await pixels();
  await p.locator('#undo').click();await waitPixels(initial);
  await p.locator('#redo').click();await waitPixels(edited);
  await p.locator('#before').check();await waitPixels(initial);
  await p.locator('#before').uncheck();
  await p.locator('#slot').selectOption('coat');await p.locator('#direction').selectOption('east');
  await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('east')&&document.querySelector('#part').value==='*');
  await p.locator('#scope').selectOption('phase');await p.locator('[data-move="0,-1"]').click();
  const download=p.waitForEvent('download');await p.locator('#export').click();
  const file=await (await download).path(),manifest=JSON.parse(await fs.readFile(file,'utf8'));
  assert.equal(manifest.records.length,2);const boots=manifest.records.find(r=>r.item===148),coat=manifest.records.find(r=>r.item===6);
  assert.equal(boots.direction,'south');assert.deepEqual(boots.cycle,[1,0]);
  assert.equal(coat.direction,'east');assert.deepEqual(coat.cycle,[0,0]);assert.deepEqual(coat.phases,{'0':[0,-1]});
  await p.reload();await p.waitForFunction(()=>document.querySelector('#part').value==='*'&&document.querySelector('#x').value==='1');await waitPixels(edited);
  assert.equal(await p.locator('#x').inputValue(),'1');
  const persisted=await p.evaluate(()=>JSON.parse(localStorage.getItem('kaizoku-hd-position-draft-v1')));assert.deepEqual(persisted,manifest);
  await p.locator('#reset').click();await p.locator('#file').setInputFiles(file);
  await waitPixels(edited);
  assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('kaizoku-hd-position-draft-v1'))),manifest);
  const altered=structuredClone(manifest);altered.records[0].source='0'.repeat(64);
  await p.locator('#file').setInputFiles({name:'incompativel.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(altered))});
  await p.waitForFunction(()=>document.querySelector('#status').dataset.error==='true');
  assert.equal(await pixels(),edited);
  await p.locator('#direction').selectOption('east');await p.locator('#direction').selectOption('west');
  await p.locator('#direction').selectOption('south');await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('south'));await waitPixels(edited);
  await p.screenshot({path:path.join(dir,'bancada-desktop.png')});
  await p.setViewportSize({width:390,height:844});await p.screenshot({path:path.join(dir,'bancada-celular.png')});
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const map=await context.newPage();map.on('pageerror',e=>errors.push(e.message));
  await map.route('**/hd-position-approved.json',r=>r.fulfill({json:manifest}));
  await map.route('**/game.js*',async route=>{
   const response=await route.fetch(),s=await response.text(),marker='  window.__mareDiagnostics=';
   assert(s.includes(marker));
   const hook=`window.__testPositionHunt=()=>{game.classId='sword';game.appearance96=MareCharacterAppearance.normalize({});game.equipment={coat:newItem(itemDefs[6],1,false),boots:newItem(itemDefs[148],1,false)};game.preferences={...game.preferences,hideHeadgear:false};enterHunt();autoPlay=false;autoSkills=false;world.hero.direction='south';};
    const draw=lobby96.draw.bind(lobby96);
    lobby96.draw=(ctx,p,o)=>{if(o.scene!=='hunt'||ctx.canvas.id!=='worldCanvas'||o.action!=='idle'||o.direction!=='south')return draw(ctx,p,o);
     const before=ctx.drawImage;let image;ctx.drawImage=function(im,...args){image=im;return before.call(ctx,im,...args);};
     try{const ok=draw(ctx,p,o);if(ok&&image&&lobby96.worldVisual()?.coverage?.[0]?.slotRoutes?.boots?.item===148)window.__mapImage=image;return ok;}finally{ctx.drawImage=before;}
    };\n`;
   await route.fulfill({response,body:s.replace(marker,()=>hook+marker)});
  });
  await map.goto(url);await map.locator('#characterName').waitFor({state:'visible',timeout:180000});
  await map.locator('#characterName').fill('Bancada QA');await map.locator('#characterName').press('Tab');await map.locator('#nextToClass').click();
  if(!await map.locator('#nextToAppearance').isVisible())await map.locator('#nextToClass').click();
  await map.locator('#nextToAppearance').click();await map.locator('#createCharacter').click();await map.locator('[data-confirm-accept]').click();
  await map.evaluate(()=>__testPositionHunt());await map.waitForFunction(()=>window.__mapImage,null,{timeout:90000});
  assert.equal(await map.evaluate(()=>__fingerprint(__mapImage)),edited);
  await map.screenshot({path:path.join(dir,'mapa-ajustado.png')});assert.deepEqual(errors,[]);
  console.log('92 itens no catálogo; edição, comparação, arquivo, histórico, rascunho, troca de direção, celular e igualdade RGBA na caçada.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
