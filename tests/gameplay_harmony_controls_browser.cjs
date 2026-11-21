'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const p=await b.newPage({viewport:{width:1672,height:941}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/game.js*',async r=>{const response=await r.fetch(),src=await response.text();await r.fulfill({response,body:src.replace('  window.__mareDiagnostics=','  window.__controlsQA={get game(){return game},get session(){return session},enter:enterHunt,update:updateUI,toggle:toggleFloating,log};window.__mareDiagnostics=')});});
 await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.__controlsQA);
 await p.locator('#characterName').fill('Navegante');await p.locator('#nextToClass').click();await p.locator('#nextToAppearance').click();await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();await p.waitForFunction(()=>__controlsQA.game);
 const music=p.locator('#mareMusicDock');
 assert.equal(await music.count(),1,'one desktop music disclosure');
 const trigger=music.locator('summary'),volume=music.getByRole('slider');
 assert(await trigger.isVisible() && await volume.isHidden());
 await trigger.focus();await p.keyboard.press('Enter');
 await volume.press('End');await volume.press('ArrowLeft');
 assert.equal(await p.evaluate(()=>MareAudio.getState().volume),.99);
 const enabled=music.getByRole('checkbox');
 await enabled.uncheck();assert(await p.evaluate(()=>MareAudio.getState().muted));
 await p.evaluate(()=>MareAudio.setMuted(false));assert(await enabled.isChecked());
 await p.keyboard.press('Escape');
 assert(await volume.isHidden() && await trigger.evaluate(el=>el===document.activeElement));
 await p.setViewportSize({width:390,height:844});assert(await music.isHidden());
 await p.setViewportSize({width:1672,height:941});
 for(const id of ['characterMenuTrigger','modesMenuTrigger','captainMenuTrigger']){
  await p.locator('#'+id).click();const visible=await p.evaluate(()=>['characterQuickMenu','modesQuickMenu','captainQuickMenu'].filter(id=>!document.getElementById(id).classList.contains('hidden')));assert.equal(visible.length,1);assert.equal(visible[0],id.replace('MenuTrigger','QuickMenu'));
 }
 await p.keyboard.press('Escape');
 await p.evaluate(()=>__controlsQA.toggle('chat',true));await p.locator('[data-chat-channel="notes"]').click();
 await p.locator('#chatInput').fill('Anotação de validação 123');await p.locator('#chatInput').press('Enter');
 assert.equal(await p.locator('#chatInput').inputValue(),'');assert((await p.locator('#gameLog').innerText()).includes('Anotação de validação 123'));
 assert(!await p.locator('#panelOverlay').isVisible(),'typing never opens a game shortcut');
 await p.locator('[data-chat-channel="system"]').click();
 assert(!(await p.locator('#gameLog').innerText()).includes('Anotação de validação 123'));
 await p.locator('[data-chat-channel="all"]').click();
 assert((await p.locator('#gameLog').innerText()).includes('Anotação de validação 123'));
 await p.evaluate(()=>__controlsQA.log('Mensagem de sistema para validação.'));
 assert((await p.locator('#gameLog').innerText()).includes('Mensagem de sistema para validação.'));
 await p.locator('#chatInput').blur();await p.keyboard.press('l');assert(!await p.locator('#floatingChat').isVisible());await p.keyboard.press('l');assert(await p.locator('#floatingChat').isVisible());
 assert.equal(await p.locator('#floatingExpedition .rates-card .micro-light').innerText(),'● NO PORTO');
 await p.evaluate(()=>__controlsQA.enter());await p.locator('#autoToggle').click();
 assert.equal(await p.locator('#expeditionState').innerText(),'EM PAUSA');assert.equal(await p.locator('#floatingExpedition .rates-card .micro-light').innerText(),'● EM PAUSA');
 await p.evaluate(()=>{const q=__controlsQA;q.session.elapsed=19;q.session.xp=100;q.session.gold=50;q.update();});
 assert.equal(await p.locator('#huntXpRate').innerText(),'Calculando…');
 assert.equal(await p.locator('#xpPerHour').innerText(),'—');assert.equal(await p.locator('#goldPerHour').innerText(),'—');
 await p.evaluate(()=>{const q=__controlsQA;q.session.elapsed=21;q.update();});
 assert.match(await p.locator('#huntXpRate').innerText(),/^[0-9.]+/);
 assert.notEqual(await p.locator('#xpPerHour').innerText(),'—');assert.notEqual(await p.locator('#goldPerHour').innerText(),'—');
 await p.locator('#autoToggle').click();assert.equal(await p.locator('#floatingExpedition .rates-card .micro-light').innerText(),'● AO VIVO');
 await p.locator('#journeyToggle').click();assert(await p.locator('#floatingExpedition').isVisible());await p.locator('#floatingExpedition [data-close-window]').click();assert(await p.locator('#floatingExpedition').isHidden());
 // Main #312/#315 replaced the rope/expedition textures with the shared glass HUD.
 // Keep checking the actual material rather than accepting any empty border.
 for(const selector of ['#huntXpTracker','#floatingExpedition','.action-panel','#returnLobby']){
  const material=await p.locator(selector).evaluate(e=>{const s=getComputedStyle(e);return{border:s.borderImageSource,background:s.backgroundColor,blur:s.backdropFilter,radius:s.borderRadius,width:s.borderTopWidth};});
  assert.equal(material.border,'none',`${selector}: current glass surface has no legacy texture`);
  assert.equal(material.background,'rgba(20, 22, 25, 0.85)',`${selector}: shared glass background`);
  assert.equal(material.blur,'blur(8px)',`${selector}: shared glass blur`);
  assert.equal(material.radius,'12px');assert.equal(material.width,'1px');
 }
 const portButton=p.getByRole('button',{name:'Voltar ao porto',exact:true});
 await p.evaluate(()=>__controlsQA.toggle('chat',false));
 for(const [width,height] of [[1366,768],[768,1024],[390,844],[320,568],[844,390]]){
  await p.setViewportSize({width,height});
  const box=await portButton.boundingBox();
  assert(box && box.height>=44 && box.width<170,'compact return button with a full touch target at '+width);
  assert(box.x>=0 && box.y>=0 && box.x+box.width<=width && box.y+box.height<=height,'return button within screen');
  for(const selector of ['.action-panel','#chatCornerToggle']){
   const other=await p.locator(selector).boundingBox();
   if(other)assert(box.x+box.width<=other.x || other.x+other.width<=box.x || box.y+box.height<=other.y || other.y+other.height<=box.y,'return button clears '+selector+' at '+width);
  }
 }
 await portButton.focus();
 await p.keyboard.press('Enter');
 await p.locator('body.scene-lobby').waitFor();
 assert(await portButton.isHidden(),'return control disappears in port');
 const mapButton=p.getByRole('button',{name:'Abrir mapa',exact:true});
 for(const [width,height] of [[1366,768],[768,1024],[390,844],[320,568]]){
  await p.setViewportSize({width,height});
  for(const open of [true,false]){
   await p.evaluate(value=>__controlsQA.toggle('chat',value),open);
   await p.waitForFunction(open=>{
    const anchor=document.getElementById(open?'floatingChat':'chatCornerToggle').getBoundingClientRect();
    const button=document.querySelector('.location-heading').getBoundingClientRect();
    return Math.abs(button.left-anchor.left)<=1 && Math.abs(button.bottom-anchor.top)<=1;
   },open);
   const hit=await mapButton.boundingBox();
   const label=mapButton.locator('.location-plaque');
   assert.equal(await label.evaluate(el=>getComputedStyle(el).backdropFilter),'blur(8px)','glass location plaque');
   assert(hit.height>=44 && (await label.boundingBox()).height<44,'slim label and full touch target');
  }
 }
 await mapButton.focus();
 await p.keyboard.press('Enter');
 await p.locator('#panelOverlay[data-ui-panel="map"]').waitFor();
 assert.deepEqual(errors,[]);console.log('Gameplay controls: exclusive menus, local notes, keyboard typing guards, chat shortcut, rates threshold, real activity state, minimization and shared material passed.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
