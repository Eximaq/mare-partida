'use strict';
/* Real Chromium acceptance for the shared character studio, isolated from user saves. */
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
const out=process.env.STUDIO_EVIDENCE||'tmp/character-hd';
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try{
 const p=await browser.newPage({viewport:{width:1448,height:1086}}),errors=[],missing=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&r.url().includes('/character-studio/'))missing.push(r.url());});
 await p.route(/\/game\.js(?:\?|$)/,async route=>{const response=await route.fetch();let s=await response.text();s=s.replace('  requestAnimationFrame(frame);','  window.__studioQA={get player(){return game},renderer:lobby96,openCreation,openPanel,closePanel,getDerived,level(n){game.level=n;},class(id){game.classId=id;updateUI();renderPanel();}};\n  requestAnimationFrame(frame);');await route.fulfill({response,body:s});});

 async function auditSymbols(selector){
  const results=await p.locator(selector).evaluateAll(async imgs=>Promise.all(imgs.map(async img=>{
   await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;
   let clear=0,edge=0,green=0,opaque=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4,a=pixels[i+3];if(!a)clear++;else{opaque++;if(x<2||y<2||x>=c.width-2||y>=c.height-2)edge++;if(a>240&&pixels[i+1]>pixels[i]*1.3&&pixels[i+1]>pixels[i+2]*1.05)green++;}}
   const st=getComputedStyle(img);return {src:img.getAttribute('src'),width:c.width,height:c.height,clear:clear/(c.width*c.height),edge,green,opaque,background:st.backgroundColor,image:st.backgroundImage,shadow:st.boxShadow};
  })));
  for(const r of results){assert.equal(r.width,64,r.src);assert.equal(r.height,64,r.src);assert(r.clear>.2&&r.clear<.95,'real transparent isolated symbol '+JSON.stringify(r));assert.equal(r.edge,0,'clear safe margin '+r.src);assert.equal(r.background,'rgba(0, 0, 0, 0)');assert.equal(r.image,'none');assert.equal(r.shadow,'none');if(r.src.split('?')[0].endsWith('/dexterity.png'))assert(r.green>30,'legitimate green boot must remain opaque');}
  return results;
 }
 async function checkSelectorAlignment(){
  const boxes=await p.locator('.studio-appearance .appearance-selector').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.left,right:r.right};}));
  assert.equal(boxes.length,7);
  assert(Math.max(...boxes.map(b=>b.x))-Math.min(...boxes.map(b=>b.x))<1.5,'alternate selector left alignment');
  assert(Math.max(...boxes.map(b=>b.right))-Math.min(...boxes.map(b=>b.right))<1.5,'alternate selector right alignment');
  const swatches=await p.locator('.appearance-swatch').evaluateAll(els=>els.map(e=>{const key=e.dataset.appearanceColor,value=e.dataset.value,table={hairColor:MareCharacterAppearance.hairs,eyeColor:MareCharacterAppearance.eyes,skinColor:MareCharacterAppearance.skins}[key];return e.style.getPropertyValue('--swatch')===table[value].ramp[3];}));
  assert(swatches.every(Boolean),'selectable palette values must remain unchanged');
 }

 await p.goto(process.env.MARE_TEST_URL||'http://127.0.0.1:8159/');
 await p.waitForFunction(()=>window.__studioQA);
 await p.locator('#characterName').fill('Papacapim');
 for(const faction of ['pirate','marine','revolutionary','government']){
  await p.locator('[data-faction="'+faction+'"]').click();await p.locator('#nextToClass').click();await p.locator('#nextToAppearance').click();
  assert(await p.locator('.studio-look-controls h2').textContent()!=='');
  const expected={pirate:'Pirata',marine:'Marinha',revolutionary:'Revolucionário',government:'Governo Mundial'}[faction];
  assert((await p.locator('.studio-look-controls h2').textContent()).includes(expected));
  assert.equal(await p.locator('.studio-faction').getAttribute('src'),'assets/ui/faction-emblems/'+faction+'.png');
  await p.locator('#backToClass').click();await p.locator('#backToFaction').click();
 }
 await p.locator('[data-faction=pirate]').click();await p.locator('#nextToClass').click();await p.locator('#nextToAppearance').click();
 await p.waitForFunction(()=>document.querySelector('#creationLookState').textContent.includes('Prévia atualizada'));
 await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:path.join(out,'appearance-creation.png')});await p.locator('.creation-progress').screenshot({path:path.join(out,'appearance-steps.png')});
 assert.equal(await p.locator('.creation-progress>.step').count(),3);assert.equal(await p.locator('.creation-progress>.progress-rule').count(),2);
 const rails=await p.locator('.creation-progress .step').evaluateAll(els=>els.map(e=>({height:e.getBoundingClientRect().height,background:getComputedStyle(e).backgroundImage,current:e.getAttribute('aria-current')})));assert(rails.every(r=>r.background==='none'));assert.equal(rails.filter(r=>r.current==='step').length,1);
 for(const width of [393,320]){await p.setViewportSize({width,height:852});await checkSelectorAlignment();const nodes=await p.locator('.creation-progress>.step').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom};}));assert(Math.max(...nodes.map(n=>n.y))-Math.min(...nodes.map(n=>n.y))<2,'progress steps share one row');assert(nodes[0].right<nodes[1].x&&nodes[1].right<nodes[2].x,'progress steps never overlap');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.locator('.creation-dialog').evaluate(e=>e.scrollTop=0);await p.screenshot({path:path.join(out,'appearance-creation-'+width+'.png')});}
 await p.setViewportSize({width:1448,height:1086});
 await auditSymbols('.studio-control-icon,.studio-step-icon');await checkSelectorAlignment();
 const sharedCreation=await p.locator('.studio-appearance').evaluate(e=>[...e.querySelectorAll('[data-appearance]')].map(n=>n.dataset.appearance));
 await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();await p.waitForFunction(()=>__studioQA.player);
 await p.evaluate(()=>{__studioQA.level(6);__studioQA.openPanel('character','status');});
 await p.waitForTimeout(300);
await auditSymbols('.attribute-row>.studio-icon,.studio-derived-groups h4 img');await p.screenshot({path:path.join(out,'character-unspent.png')});
 const before=await p.evaluate(()=>({attrs:{...__studioQA.player.attributes},stats:__studioQA.getDerived()}));
 await p.locator('[data-attribute-quantity="5"]').click();await p.locator('[data-attribute-add=strength]').click();
 assert.equal(await p.locator('#pointsAvailable').innerText(),'20');
 assert.deepEqual(await p.evaluate(()=>__studioQA.player.attributes),before.attrs);
 assert.deepEqual(await p.evaluate(()=>__studioQA.getDerived()),before.stats);
 await p.locator('[data-attribute-remove=strength]').click();assert.equal(await p.locator('#pointsAvailable').innerText(),'25');
 await p.locator('[data-attribute-add=strength]').click();await p.locator('#resetAttributeDraft').click();assert.equal(await p.locator('#pointsAvailable').innerText(),'25');
 await p.locator('[data-attribute-add=strength]').click();await p.locator('#cancelAttributes').click();await p.evaluate(()=>__studioQA.openPanel('character','status'));assert.equal(await p.locator('#pointsAvailable').innerText(),'25');
 await p.locator('[data-attribute-quantity=max]').click();await p.locator('[data-attribute-add=strength]').click();assert.equal(await p.locator('#pointsAvailable').innerText(),'0');
 await p.locator('#confirmAttributes').click();assert.equal(await p.evaluate(()=>__studioQA.player.attributes.strength),25);
 assert((await p.evaluate(()=>__studioQA.getDerived().physical))>before.stats.physical);
 await p.reload();await p.waitForFunction(()=>window.__studioQA?.player);assert.equal(await p.evaluate(()=>__studioQA.player.attributes.strength),25);
 await p.waitForTimeout(6500);
 await p.evaluate(()=>__studioQA.openPanel('character','status'));
 await p.locator('.character-allocation .studio-help').first().focus();assert(await p.locator('#gameTooltip').isVisible());
 await p.screenshot({path:path.join(out,'character-help.png')});
 await p.keyboard.press('Escape');assert(!(await p.locator('#gameTooltip').isVisible()));assert(await p.locator('#panelOverlay').isVisible());
 await p.locator('.character-derived .studio-help').first().click();assert(await p.locator('#gameTooltip').isVisible());
 await p.locator('.studio-subnav span').click();assert(!(await p.locator('#gameTooltip').isVisible()));
 for(const id of ['sword','brawler','gunner','rogue','cyborg','strategist','healer']){
  await p.evaluate(id=>__studioQA.class(id),id);
  await p.waitForFunction(()=>[...document.querySelectorAll('.studio-skills img')].every(img=>img.complete&&img.naturalWidth>0));
  const images=await p.locator('.studio-skills img').evaluateAll(imgs=>imgs.map(img=>({src:img.getAttribute('src'),width:img.naturalWidth})));
  assert.equal(images.length,2);
  assert(images.every(img=>img.src.includes('/'+id+'-')));
  assert.equal(await p.locator('#skill1Icon img').getAttribute('src'),'assets/ui/character-studio/skills/'+id+'-1.png');
  assert.equal(await p.locator('#skill2Icon img').getAttribute('src'),'assets/ui/character-studio/skills/'+id+'-2.png');
  assert.equal(await p.locator('[data-derived=maxHP]').count(),1);
  assert.equal(await p.locator('#healThreshold').count(),id==='healer'?1:0);
  await p.screenshot({path:path.join(out,'character-'+id+'.png')});
 }
 await p.evaluate(()=>__studioQA.class('sword'));
 for(const [width,height]of [[1920,1080],[1448,1086],[1366,768],[1280,720],[393,852],[320,568],[852,393]]){
  await p.setViewportSize({width,height});
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert(await p.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'status horizontal overflow '+width);
  await p.locator('#cancelAttributes').scrollIntoViewIfNeeded();assert(await p.locator('#cancelAttributes').isVisible());
  if(width===1366||width===393)await p.screenshot({path:path.join(out,'character-'+width+'.png')});
 }
 await p.setViewportSize({width:1448,height:1086});
 await p.evaluate(()=>__studioQA.openPanel('character','appearance'));
 assert.deepEqual(await p.locator('.studio-appearance').evaluate(e=>[...e.querySelectorAll('[data-appearance]')].map(n=>n.dataset.appearance)),sharedCreation);
 assert((await p.locator('#profile-hairColor').evaluate(e=>getComputedStyle(e).backgroundImage)).includes('workshop-surface.png'));
await auditSymbols('.studio-control-icon');await checkSelectorAlignment();
 const cosmeticsBefore=await p.evaluate(()=>JSON.stringify(__studioQA.player.appearance96));
 await p.locator('#profile-gender').selectOption('feminino');await p.locator('#profile-hairStyle').selectOption('hair-topknot');
 await p.locator('[data-appearance-color=hairColor][data-value=violet]').click();
 await p.locator('#profile-skinColor').selectOption('ebony');
 assert.equal(await p.evaluate(()=>JSON.stringify(__studioQA.player.appearance96)),cosmeticsBefore);
 for(const dir of ['north','south','east','west']){
  await p.locator('[data-appearance-direction='+dir+']').click();
  await p.waitForFunction(()=>document.querySelector('#profileAppearanceState').textContent.includes('Prévia atualizada'));
  assert((await p.locator('[data-appearance-direction='+dir+']').evaluate(e=>getComputedStyle(e).borderImageSource)).includes('primary.png'),'selected direction must have its gold active artwork');
  assert(await p.locator('#profileAppearanceCanvas').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0)));
 }
 await p.screenshot({path:path.join(out,'appearance-editor.png')});
 await p.locator('[data-appearance-cancel]').click();assert.equal(await p.locator('#profile-hairColor').inputValue(),'black');
 await p.locator('#profile-hairColor').selectOption('violet');await p.locator('[data-appearance-apply]').click();assert.equal(await p.evaluate(()=>__studioQA.player.appearance96.hairColor),'violet');
 for(const [width,height]of [[1366,768],[1280,720],[393,852],[320,568],[852,393]]){
  await p.setViewportSize({width,height});
  assert(await p.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'editor horizontal overflow '+width);
  await checkSelectorAlignment();await p.locator('[data-appearance-apply]').scrollIntoViewIfNeeded();assert(await p.locator('[data-appearance-apply]').isVisible());
  if(width===393)await p.screenshot({path:path.join(out,'appearance-editor-mobile.png')});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 console.log('Character studio: 4 factions, 7 classes and HUD icons, transactional allocation, keyboard/click help, shared appearance, 4 directions, persistence and 7 viewports passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
