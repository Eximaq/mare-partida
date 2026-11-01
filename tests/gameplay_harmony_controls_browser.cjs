'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const p=await b.newPage({viewport:{width:1672,height:941}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/game.js*',async r=>{const response=await r.fetch(),src=await response.text();await r.fulfill({response,body:src.replace('  window.__mareDiagnostics=','  window.__controlsQA={get game(){return game},get session(){return session},enter:enterHunt,update:updateUI,toggle:toggleFloating,log};window.__mareDiagnostics=')});});
 await p.goto(process.env.MARE_TEST_URL);await p.waitForFunction(()=>window.__controlsQA);
 await p.locator('#characterName').fill('Navegante');await p.locator('#nextToClass').click();await p.locator('#nextToAppearance').click();await p.locator('#createCharacter').click();await p.locator('[data-confirm-accept]').click();await p.waitForFunction(()=>__controlsQA.game);
 for(const id of ['characterMenuTrigger','modesMenuTrigger','captainMenuTrigger']){
  await p.locator('#'+id).click();const visible=await p.evaluate(()=>['characterQuickMenu','modesQuickMenu','captainQuickMenu'].filter(id=>!document.getElementById(id).classList.contains('hidden')));assert.equal(visible.length,1);assert.equal(visible[0],id.replace('MenuTrigger','QuickMenu'));
 }
 await p.keyboard.press('Escape');
 await p.evaluate(()=>__controlsQA.toggle('chat',true));await p.locator('[data-chat-channel="notes"]').click();
 await p.locator('#chatInput').fill('Anotação de validação 123');await p.locator('#chatInput').press('Enter');
 assert.equal(await p.locator('#chatInput').inputValue(),'');assert((await p.locator('#gameLog').innerText()).includes('Anotação de validação 123'));
 assert(!await p.locator('#panelOverlay').isVisible(),'typing never opens a game shortcut');
 await p.locator('[data-chat-channel="all"]').click();
 await p.evaluate(()=>__controlsQA.log('Mensagem de sistema para validação.'));
 assert((await p.locator('#gameLog').innerText()).includes('Mensagem de sistema para validação.'));
 await p.locator('#chatInput').blur();await p.keyboard.press('l');assert(!await p.locator('#floatingChat').isVisible());await p.keyboard.press('l');assert(await p.locator('#floatingChat').isVisible());
 assert.equal(await p.locator('#floatingExpedition .rates-card .micro-light').innerText(),'● NO PORTO');
 await p.evaluate(()=>__controlsQA.enter());await p.locator('#autoToggle').click();
 assert.equal(await p.locator('#expeditionState').innerText(),'EM PAUSA');assert.equal(await p.locator('#floatingExpedition .rates-card .micro-light').innerText(),'● EM PAUSA');
 await p.evaluate(()=>{const q=__controlsQA;q.session.elapsed=19;q.session.xp=100;q.session.gold=50;q.update();});
 assert.equal(await p.locator('#xpPerHour').innerText(),'—');assert.equal(await p.locator('#goldPerHour').innerText(),'—');
 await p.evaluate(()=>{const q=__controlsQA;q.session.elapsed=21;q.update();});
 assert.notEqual(await p.locator('#xpPerHour').innerText(),'—');assert.notEqual(await p.locator('#goldPerHour').innerText(),'—');
 await p.locator('#autoToggle').click();assert.equal(await p.locator('#floatingExpedition .rates-card .micro-light').innerText(),'● AO VIVO');
 await p.locator('#journeyToggle').click();assert(await p.locator('#journeyHud').evaluate(e=>e.classList.contains('collapsed')));await p.locator('#journeyToggle').click();assert(!await p.locator('#journeyHud').evaluate(e=>e.classList.contains('collapsed')));
 const surfaces=await p.evaluate(()=>['#mainMenu','#floatingChat','#floatingExpedition','#journeyHud','.action-panel','#enterHunt'].map(s=>[s,getComputedStyle(document.querySelector(s)).backgroundImage]));
 for(const [s,bg]of surfaces)assert(bg.includes('workshop-surface.png'),s+' reuses the approved material');
 assert.deepEqual(errors,[]);console.log('Gameplay controls: exclusive menus, local notes, keyboard typing guards, chat shortcut, rates threshold, real activity state, minimization and shared material passed.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
