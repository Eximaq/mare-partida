'use strict';
// Isolated game session: window parity, reachable controls and transactional attributes.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');
const out = process.env.MARE_QA_DIR || 'tmp/character-glass';
const sizes = [[1920,1080],[1366,768],[1280,720],[1024,768],[768,1024],[390,844],[360,800],[844,390]];
(async () => {
  await fs.mkdir(out, {recursive:true});
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
  try {
    const page = await browser.newPage({viewport:{width:1366,height:768}}), errors=[];
    page.on('pageerror', e=>errors.push(e.message));
    await page.route('**/api/akuma/catalog', r=>r.fulfill({status:404,body:'{}'}));
    await page.route('**/__dev_version', r=>r.fulfill({body:'stable'}));
    await page.route('**/game.js*', async route => {
      const response=await route.fetch();
      await route.fulfill({response, body:(await response.text()).replace('  window.__mareDiagnostics=',
        '  window.__characterGlassQA={get game(){return game},openPanel,render:renderPanel,refresh:updateUI,stats:getDerived};\n  window.__mareDiagnostics=')});
    });
    await page.goto(process.env.MARE_TEST_URL || 'http://127.0.0.1:8179/');
    await page.waitForFunction(()=>window.__characterGlassQA);
    await page.locator('#characterName').fill('Nauta Vidro');
    await page.locator('#nextToClass').click();
    await page.locator('#nextToAppearance').click();
    await page.locator('#createCharacter').click();
    await page.locator('[data-confirm-accept]').click();
    await page.waitForFunction(()=>__characterGlassQA.game);
    await page.evaluate(()=>{const q=__characterGlassQA;q.game.level=6;q.game.attributePoints=25;q.refresh();});
    const open=section=>page.evaluate(section=>__characterGlassQA.openPanel(section, 'status'),section);
    async function selectSection(id) {
      const tabs=page.locator('.studio-panel-switch');
      if(await tabs.isVisible()) await tabs.locator('label[for=studio-view-'+id+']').click();
    }
    async function noOverflow() {
      assert(await page.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'no horizontal overflow');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page overflow');
    }
    for(const [width,height] of sizes) {
      await page.setViewportSize({width,height});
      await open('inventory');
      await page.locator('.op-inventory-shell').waitFor({state:'visible'});
      const inventory=await page.locator('.op-inventory-shell').boundingBox();
      await open('character');
      await page.evaluate(()=>document.fonts.ready);
      const character=await page.locator('#panelOverlay > .dialog').boundingBox();
      await page.screenshot({path:path.join(out,'character-'+width+'x'+height+'.png')});
      console.log(JSON.stringify({width,height,inventory,character}));
      assert(Math.abs(character.width-inventory.width)<2,'character width matches inventory at '+width);
      assert(Math.abs(character.height-inventory.height)<2,'character height matches inventory at '+width);
      for(const section of ['identity','allocation','combat']) {
        await selectSection(section);
        await noOverflow();
        if(height>=720) {
          assert(await page.locator('#dialogBody').evaluate(e=>e.scrollHeight<=e.clientHeight+1),'default content fits without scrolling: '+section+' '+width);
          const cards=await page.locator('.studio-card:visible').evaluateAll(els=>els.map(e=>({name:e.className,extra:e.scrollHeight-e.clientHeight})));
          assert(cards.every(c=>c.extra<=1),'cards fit without scrolling: '+width+' '+JSON.stringify(cards));
        }
      }
      await selectSection('allocation');
      await page.locator('#confirmAttributes').scrollIntoViewIfNeeded();
      assert(await page.locator('#cancelAttributes').isVisible());
      await page.locator('#dialogBody').evaluate(e=>e.scrollTop=0);
      if(width===390) await page.screenshot({path:path.join(out,'attributes-mobile.png')});
    }
    await page.setViewportSize({width:1366,height:768});
    await open('character');
    const before=await page.evaluate(()=>({attributes:{...__characterGlassQA.game.attributes},stats:__characterGlassQA.stats()}));
    await page.locator('[data-attribute-quantity="5"]').click();
    await page.locator('[data-attribute-add=strength]').click();
    assert.equal(await page.locator('#pointsAvailable').innerText(),'20');
    assert.deepEqual(await page.evaluate(()=>__characterGlassQA.game.attributes),before.attributes);
    assert.deepEqual(await page.evaluate(()=>__characterGlassQA.stats()),before.stats);
    await page.locator('[data-attribute-remove=strength]').click();
    assert.equal(await page.locator('#pointsAvailable').innerText(),'25');
    await page.locator('[data-attribute-add=strength]').click();
    await page.locator('#resetAttributeDraft').click();
    assert.equal(await page.locator('#pointsAvailable').innerText(),'25');
    await page.locator('[data-attribute-add=strength]').click();
    await page.locator('#cancelAttributes').click();
    await open('character');
    assert.equal(await page.locator('#pointsAvailable').innerText(),'25');
    // Expanding optional build settings must keep all controls and survive a redraw.
    await page.locator('.attribute-build summary').click();
    await page.locator('#attributeBuildProfile').selectOption('sword');
    assert(await page.locator('.attribute-build').evaluate(e=>e.open),'build settings stay open after choosing a profile');
    await page.locator('[data-build-preview]').click();
    assert.deepEqual(await page.evaluate(()=>__characterGlassQA.game.attributes),before.attributes);
    assert.equal(await page.locator('#pointsAvailable').innerText(),'0');
    await page.locator('#resetAttributeDraft').click();
    await page.locator('.attribute-build summary').click();
    await page.locator('[data-attribute-quantity=max]').click();
    await page.locator('[data-attribute-add=strength]').click();
    await page.locator('#confirmAttributes').click();
    assert.equal(await page.evaluate(()=>__characterGlassQA.game.attributes.strength),25);
    await page.reload();await page.waitForFunction(()=>__characterGlassQA.game);
    assert.equal(await page.evaluate(()=>__characterGlassQA.game.attributes.strength),25,'allocation persists');
    await open('character');
    await page.locator('.character-allocation .studio-help').first().focus();
    assert(await page.locator('#gameTooltip').isVisible());
    await page.keyboard.press('Escape');
    assert(await page.locator('#panelOverlay').isVisible());
    for(const id of ['sword','brawler','gunner','rogue','cyborg','strategist','healer']) {
      await page.evaluate(id=>{const q=__characterGlassQA;q.game.classId=id;q.render();},id);
      assert.equal(await page.locator('.studio-skills article').count(),2);
      assert.equal(await page.locator('#healThreshold').count(),id==='healer'?1:0);
      await noOverflow();
      assert(await page.locator('#dialogBody').evaluate(e=>e.scrollHeight<=e.clientHeight+1),'all class content fits: '+id);
    }
    await page.setViewportSize({width:390,height:844});
    await selectSection('allocation');
    await page.locator('#healThreshold').selectOption('0.8');
    assert.equal(await page.evaluate(()=>__characterGlassQA.game.preferences.healThreshold),.8);
    await selectSection('combat');
    assert(await page.locator('[data-derived=regenBuff]').isVisible());
    await page.locator('#studio-view-combat').focus();await page.keyboard.press('ArrowLeft');
    assert(await page.locator('#studio-view-allocation').isChecked());
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.studio-dock').evaluate(e=>e.getAnimations({subtree:true}).length),0);
    await page.setViewportSize({width:1366,height:768});
    await page.locator('[data-character-section=appearance]').click();
    const appearanceBefore=await page.evaluate(()=>JSON.stringify(__characterGlassQA.game.appearance96));
    await page.locator('#profile-hairColor').selectOption('violet');
    assert.equal(await page.evaluate(()=>JSON.stringify(__characterGlassQA.game.appearance96)),appearanceBefore,'appearance remains a draft');
    for(const direction of ['north','south','east','west']) {
      await page.locator('[data-appearance-direction='+direction+']').click();
      await page.waitForFunction(d=>document.querySelector('[data-appearance-direction='+d+']').getAttribute('aria-pressed')==='true',direction);
    }
    await page.locator('[data-appearance-cancel]').click();
    assert.equal(await page.evaluate(()=>JSON.stringify(__characterGlassQA.game.appearance96)),appearanceBefore);
    await page.locator('#profile-hairColor').selectOption('violet');
    await page.locator('[data-appearance-apply]').click();
    assert.equal(await page.evaluate(()=>__characterGlassQA.game.appearance96.hairColor),'violet');
    for(const [width,height] of [[1366,768],[768,1024],[390,844]]) {
      await page.setViewportSize({width,height});
      await noOverflow();
      await page.locator('[data-appearance-apply]').scrollIntoViewIfNeeded();
      assert(await page.locator('[data-appearance-apply]').isVisible());
      await page.locator('#dialogBody').evaluate(e=>e.scrollTop=0);
      const preview=await page.locator('#profileAppearanceCanvas').boundingBox();
      const harbor=await page.locator('.studio-harbor').boundingBox();
      assert(preview.width<=harbor.width+1&&preview.height<=harbor.height+1,'appearance sprite fits preview without cropping at '+width);
      await page.screenshot({path:path.join(out,'appearance-'+width+'.png')});
    }
    assert.deepEqual(errors,[]);
    console.log('PASS character glass: inventory size parity in 8 viewports, 7 classes, build/manual allocation, cancellation, persistence, keyboard, reduced motion.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1);});
