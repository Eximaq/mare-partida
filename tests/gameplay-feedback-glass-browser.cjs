'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const errors = [];
    const shot = async name => {
      if (process.env.MARE_QA_DIR) await page.screenshot({path:require('node:path').join(process.env.MARE_QA_DIR,name+'.png')});
    };
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/game.js*', async route => {
      const response = await route.fetch();
      const body = (await response.text()).replace('  window.__mareDiagnostics=',
        '  window.feedbackQA={toast,rewardNotice,enterHunt,returnLobby,spawnMob,presentWorld,newItem,defs:itemDefs,get game(){return game},get session(){return session}};window.__mareDiagnostics=');
      await route.fulfill({ response, body });
    });
    await page.goto(process.env.MARE_TEST_URL);
    await page.locator('#characterName').fill('Nauta');
    for (const step of ['#nextToClass','#nextToAppearance','#createCharacter','[data-confirm-accept]']) await page.locator(step).click();
    await page.locator('#startOverlay').waitFor({ state: 'hidden' });
    const material = selector => page.locator(selector).first().evaluate(el => getComputedStyle(el).backdropFilter);
    await page.evaluate(() => {
      feedbackQA.toast('Objetivo concluído', 'good');
      feedbackQA.rewardNotice({resource:{id:'pearl',name:'Pérola',quantity:2,rarity:'epic'}});
    });
    assert.equal(await material('#toastContainer .toast'), 'blur(8px)');
    const loot = page.locator('#lootNotices[data-visible] .reward-epic');
    await loot.waitFor();
    assert.match(await loot.innerText(), /Pérola/);
    assert.match(await loot.innerText(), /Épic/i);
    assert.equal(await material('#lootNotices .toast'), 'blur(8px)');

    assert.equal(await loot.evaluate(el=>getComputedStyle(el).borderLeftColor),'rgb(210, 153, 255)');
    await shot('saque');
    await page.evaluate(() => {
      const game=feedbackQA.game;
      const def=feedbackQA.defs.find(d=>d.slot==='weapon'&&d.type===game.classId&&!d.acquisitionBlocked);
      game.equipment.weapon=feedbackQA.newItem(def);
      game.inventory.push({...feedbackQA.newItem(def),id:'compare-qa',plus:2});
    });
    await page.keyboard.press('i');
    const item=page.locator('[data-item=compare-qa]');
    await item.hover();
    const comparison=page.locator('#gameTooltip .with-comparison');
    await comparison.waitFor();
    assert.equal(await comparison.locator('.game-tip-column').count(),2);
    await comparison.locator('.game-tip-score').waitFor();
    await shot('comparacao');
    await page.keyboard.press('Escape');
    for (const width of [1366, 768, 390]) {
      await page.setViewportSize({width,height:width===390?844:768});
      await page.locator('#modesMenuTrigger').click();
      const mode = page.locator('#modesQuickMenu [data-quick-mode=map]');
      const box = await mode.boundingBox();
      assert(box && box.height >= 44 && box.x >= 0 && box.x+box.width <= width);
      assert.equal(await mode.evaluate(el=>getComputedStyle(el,'::after').content),'""');
      await shot('modos-'+width);
      await mode.click();
      await page.locator('#panelOverlay[data-ui-panel=map]').waitFor();
      await page.keyboard.press('Escape');
    }
    await page.setViewportSize({width:1366,height:768});
    await page.evaluate(()=>feedbackQA.enterHunt());
    await page.waitForFunction(()=>document.querySelector('#worldLoading').dataset.state==='ready');
    await page.evaluate(()=>{feedbackQA.spawnMob(true);feedbackQA.session.respawn=4;feedbackQA.presentWorld();});
    const recovery = page.locator('#worldRecovery');
    await recovery.waitFor();
    assert.match(await recovery.innerText(), /[1-4]\s*s/i);
    assert.equal(await material('#worldRecovery > div'), 'blur(8px)');
    assert.equal(await material('#worldLoading > div'), 'blur(8px)');
    assert.equal(await material('#bossBanner'), 'blur(8px)');
    assert(await page.locator('#bossBanner').isVisible());
    await shot('alerta-e-contagem');
    assert.equal(await recovery.getAttribute('data-mode'),'respawn');
    await page.evaluate(()=>{
      const qa=feedbackQA, player=qa.game;
      player.zoanTransformed=true;
      player.equipment.akuma_no_mi={id:'qa-wolf',def:qa.defs.findIndex(d=>d.fruitId==='akuma_inu_wolf'),fruitId:'akuma_inu_wolf',plus:0,level:1};
      qa.session.respawn=5;
      qa.presentWorld();
    });
    assert.match(await recovery.innerText(), /Retornando ao porto/);
    assert.equal(await recovery.getAttribute('data-mode'),'return');
    await page.evaluate(()=>{feedbackQA.session.respawn=0;feedbackQA.presentWorld();});
    await recovery.waitFor({state:'hidden'});
    assert.equal(await material('#gameTooltip'), 'blur(8px)');
    assert.equal(await material('#partyCompact'), 'blur(8px)');
    assert.deepEqual(errors, []);
    console.log('Avisos, saque, modos, transições, alerta, dicas e grupo verificados.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
