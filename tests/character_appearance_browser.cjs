'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
const origin=process.argv.find(s=>/^https?:/.test(s))||process.env.MARE_TEST_URL||'http://127.0.0.1:8159/';
const out=process.argv.find(s=>s.startsWith('--evidence='))?.slice(11);
async function settledPreview(p,direction){
 await p.waitForFunction(direction=>{
  const q=window.__appearanceQA,canvas=document.querySelector('#creationLookCanvas');if(!q||!canvas)return false;
  // Probe the requested preview synchronously, then inspect its source state.
  // The old status label becomes ready before asynchronous HD archives finish.
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
  const rendered=q.renderer.preview(ctx,{classId:'sword',equipment:{coat:{def:6}}},{action:'idle',direction,time:0,appearance:q.draft,consumer:'character-creation'});
  const s=q.renderer.snapshot(),a=s.defaultHD?.last?.state==='rendered'?s.defaultHD.last:s.nativeHD?.last;
  // Custom palettes outside exact HD coverage use the native96 compositor;
  // requiring an HD source here would reject the approved palette fallback.
  const sourceReady=a?.state==='rendered'?a.physicalScale>0&&a.physicalScale<=1&&a.direction===direction&&a.consumer==='character-creation':a?.state==='uncovered'&&s.renderer==='native96'&&s.state==='ready'&&!s.previewMessage&&!s.errors.length;
  return rendered&&sourceReady&&canvas.width===320&&canvas.height===256&&canvas.style.width===''&&canvas.style.height===''&&[...ctx.getImageData(0,0,canvas.width,canvas.height).data].some((v,i)=>i%4===3&&v);
 },direction,{timeout:120000});
}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{const p=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route(/\/game\.js(?:\?|$)/,async route=>{const response=await route.fetch();let s=await response.text();s=s.replace('  requestAnimationFrame(frame);','  window.__appearanceQA={get player(){return game},get draft(){return creationAppearanceDraft},renderer:lobby96,openCreation,openPanel,closePanel,getDerived,enterHunt,get scene(){return scene},get saveKey(){return STORAGE_KEY}};\n  requestAnimationFrame(frame);');await route.fulfill({response,body:s});});
await p.goto(origin);await p.waitForFunction(()=>window.__appearanceQA);await p.locator('#characterName').fill('Navegante');await p.locator('#nextToClass').click();await p.locator('#nextToAppearance').click({timeout:3000});assert(await p.locator('#appearanceStep').isVisible());assert.equal(await p.evaluate(()=>__appearanceQA.player),null);
assert(await p.locator('#creation-gender option[value=feminino]').isDisabled());
if(process.argv.includes('--equipment-preview')){
 const probe=async consumer=>p.evaluate(consumer=>{
  const q=__appearanceQA,player=q.player??{classId:'sword'};
  const appearance=q.player?.appearance96??q.draft;
  const args={action:'idle',direction:'south',appearance,consumer};
  const draw=equipment=>{
   const canvas=Object.assign(document.createElement('canvas'),{width:320,height:256});
   const rendered=q.renderer.preview(canvas.getContext('2d'),{...player,equipment},args);
   return rendered?canvas.toDataURL():null;
  };
  return [draw({}),draw({coat:{def:151},weapon:{def:0},head:{def:129},boots:{def:8}})];
 },consumer);
 const verify=async consumer=>{
  await p.waitForFunction(probe=>{const q=__appearanceQA;return !!q.renderer&&q.renderer.snapshot().state==='ready';});
  let results,deadline=Date.now()+90000;
  do{results=await probe(consumer);if(results.every(Boolean))break;await p.waitForTimeout(80);}while(Date.now()<deadline);
  assert(results.every(Boolean),consumer+' draws both requests');
  assert.equal(results[0],results[1],consumer+' uses the same bare body regardless of gear');
 };
 await verify('character-creation');
 await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();
 await p.waitForFunction(()=>__appearanceQA.player);
 const equipment=await p.evaluate(()=>__appearanceQA.player.equipment);
 await p.evaluate(()=>__appearanceQA.openPanel('character','appearance'));
 await verify('appearance-editor');
 assert.deepEqual(await p.evaluate(()=>__appearanceQA.player.equipment),equipment);
 console.log('Creation and appearance editor render the bare body and preserve saved equipment.');
 return;
}
if(process.argv.includes('--availability')){
 // This browser owns a disposable save. Exercise final validation as well as disabled controls.
 await p.evaluate(()=>{__appearanceQA.draft.gender='feminino';});
 await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();
 assert.equal(await p.evaluate(()=>__appearanceQA.player),null);
 await p.evaluate(()=>{__appearanceQA.draft.gender='masculino';});
 await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();
 await p.waitForFunction(()=>__appearanceQA.player?.appearance96?.gender==='masculino');
 const [key,legacy]=await p.evaluate(()=>[__appearanceQA.saveKey,JSON.parse(localStorage.getItem(__appearanceQA.saveKey))]);
 legacy.appearance96={...legacy.appearance96,gender:'feminino',eyeColor:'green',hairColor:'pink'};
 const preserved=[legacy.appearance96,legacy.equipment];
 // Seed at startup, after the previous document has performed its normal unload save.
 await p.addInitScript(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[key,legacy]);
 await p.reload();await p.waitForFunction(()=>window.__appearanceQA?.player?.appearance96.gender==='feminino');
 await p.evaluate(()=>__appearanceQA.openPanel('character','appearance'));
 assert(await p.locator('#profile-eyeColor').isDisabled());assert(await p.locator('[data-appearance-apply]').isDisabled());
 await p.locator('#profile-eyeColor').evaluate(el=>{el.value='brown';el.dispatchEvent(new Event('change',{bubbles:true}));});
 await p.locator('[data-appearance-apply]').evaluate(el=>{el.disabled=false;el.click();});
 assert.deepEqual(await p.evaluate(()=>[__appearanceQA.player.appearance96,__appearanceQA.player.equipment]),preserved);
 await p.evaluate(()=>{__appearanceQA.closePanel();__appearanceQA.enterHunt();});await p.waitForFunction(()=>__appearanceQA.scene==='hunt');
 assert.deepEqual(await p.evaluate(()=>__appearanceQA.player.appearance96),preserved[0]);assert.deepEqual(errors,[]);
 console.log('Criação feminina recusada, masculino criado, save feminino reaberto e caçada iniciada com aparência e equipamento preservados.');return;
}
const values={gender:'masculino',hairStyle:'hair-topknot',hairColor:'violet',eyeStyle:'face-almond',eyeColor:'green',skinColor:'ebony'};
for(const [key,value]of Object.entries(values))await p.locator('#creation-'+key).selectOption(value);
await p.waitForFunction(()=>document.querySelector('#creationLookState').textContent.includes('Prévia atualizada'));
await p.locator('#creation-gender').evaluate(el=>{el.value='feminino';el.dispatchEvent(new Event('change',{bubbles:true}));});
assert.equal(await p.locator('#creation-gender').inputValue(),'masculino');assert.equal(await p.evaluate(()=>__appearanceQA.draft.gender),'masculino');assert(await p.locator('[data-appearance-cycle="gender"][data-step="1"]').isDisabled());for(const color of ['blue','pink','green','blonde','violet'])await p.locator('[data-appearance-color="hairColor"][data-value="'+color+'"]').click();assert.equal(await p.locator('#creation-hairColor').inputValue(),'violet');await p.waitForFunction(()=>document.querySelector('#creationLookState').textContent.includes('Prévia atualizada'));
await settledPreview(p,'south');
const front=await p.locator('#creationLookCanvas').evaluate(c=>c.toDataURL());for(const dir of ['north','east','west','south']){await p.locator('[data-appearance-direction="'+dir+'"]').click();await p.waitForFunction(()=>document.querySelector('#creationLookState').textContent.includes('Prévia atualizada'));await settledPreview(p,dir);}assert(await p.locator('#creationLookCanvas').evaluate(c=>c.toDataURL())===front,'same direction must restore the same preview');
await p.locator('#backToClass').click();await p.locator('#backToFaction').click();await p.locator('#nextToClass').click();await p.locator('#nextToAppearance').click();assert.equal(await p.locator('#creation-gender').inputValue(),'masculino');assert.equal(await p.locator('#creation-hairStyle').inputValue(),'hair-topknot');
await p.locator('#createCharacter').click();assert(await p.locator('.confirmation-overlay').isVisible());assert.equal(await p.evaluate(()=>__appearanceQA.player),null);await p.locator('[data-confirm-cancel]').click();assert(await p.locator('#appearanceStep').isVisible());
if(out){await fs.mkdir(out,{recursive:true});await p.screenshot({path:path.join(out,'appearance-desktop.png')});}
await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();await p.waitForFunction(()=>__appearanceQA.player?.appearance96);const saved=await p.evaluate(()=>({look:__appearanceQA.player.appearance96,stats:__appearanceQA.getDerived(),classId:__appearanceQA.player.classId}));for(const [key,value]of Object.entries(values))assert.equal(saved.look[key],value);assert.equal(saved.classId,'sword');await p.reload();await p.waitForFunction(()=>window.__appearanceQA?.player);assert.deepEqual(await p.evaluate(()=>__appearanceQA.player.appearance96),saved.look);await p.evaluate(async()=>{await __appearanceQA.renderer.ready;await __appearanceQA.renderer.ensure(__appearanceQA.player);});assert.equal(await p.evaluate(()=>__appearanceQA.renderer.resolve(__appearanceQA.player).body),'masculino');const legacy=await p.evaluate(()=>{const old={...__appearanceQA.player};delete old.appearance96;const r=__appearanceQA.renderer.resolve(old);return {skin:r.look.skin,eye:r.look.eyeColor||'original',body:r.body};});assert.deepEqual(legacy,{skin:'original',eye:'original',body:'masculino'});
await p.evaluate(()=>__appearanceQA.openPanel('character','appearance'));await p.locator('#profile-hairColor').selectOption('silver');assert.equal(await p.evaluate(()=>__appearanceQA.player.appearance96.hairColor),'violet');await p.locator('[data-appearance-cancel]').click();assert.equal(await p.locator('#profile-hairColor').inputValue(),'violet');await p.locator('#profile-hairColor').selectOption('silver');await p.locator('[data-appearance-apply]').click();assert.equal(await p.evaluate(()=>__appearanceQA.player.appearance96.hairColor),'silver');assert.deepEqual(await p.evaluate(()=>__appearanceQA.getDerived()),saved.stats);await p.evaluate(()=>__appearanceQA.closePanel());await p.evaluate(()=>__appearanceQA.openCreation(true));await p.locator('#nextToClass').click();await p.locator('#nextToAppearance').click();await p.locator('#creation-eyeColor').selectOption('amber');assert.equal(await p.evaluate(()=>__appearanceQA.player.appearance96.eyeColor),'green');await p.locator('#createCharacter').click();await p.evaluate(()=>{window.__originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('simulated full')};});await p.locator('[data-confirm-accept]').click();assert(await p.locator('#appearanceStep').isVisible());assert.equal(await p.evaluate(()=>__appearanceQA.player.appearance96.eyeColor),'green');await p.evaluate(()=>{Storage.prototype.setItem=window.__originalSetItem;});
for(const [width,height]of [[1920,1080],[1366,768],[1280,720],[393,852],[320,568],[852,393]]){await p.setViewportSize({width,height});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow '+width);await p.locator('#createCharacter').scrollIntoViewIfNeeded();assert(await p.locator('#createCharacter').isVisible());if(out&&width===393)await p.screenshot({path:path.join(out,'appearance-mobile.png'),fullPage:true});}
assert.deepEqual(errors,[]);console.log('appearance creation, directions, draft navigation, confirmation, persistence, rollback and six viewports passed');}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
