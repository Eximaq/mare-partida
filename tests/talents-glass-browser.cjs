'use strict';
// Isolated game session: window parity, reachable controls and transactional attributes.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');
const out = process.env.MARE_QA_DIR || 'tmp/talents-glass';
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
    async function noOverflow() {
      assert(await page.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'no horizontal overflow');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page overflow');
    }
    for(const [width,height] of sizes) {
      await page.mouse.move(0,0);
      await page.setViewportSize({width,height});
      await open('inventory');
      const box=await page.waitForFunction(()=>{const r=document.querySelector('.op-inventory-shell')?.getBoundingClientRect();return r?.width&&r?.height?r.toJSON():false;});
      const inventory=await box.jsonValue();await box.dispose();
      await page.evaluate(()=>__characterGlassQA.openPanel('character','talents'));
      await page.waitForFunction(()=>document.querySelector('.talent-tree-surface')?.dataset.iconsReady==='true');
      const dialog=await page.locator('#panelOverlay > .dialog').boundingBox();
      assert(Math.abs(dialog.width-inventory.width)<2&&Math.abs(dialog.height-inventory.height)<2,'inventory frame parity '+width+' '+JSON.stringify({inventory,dialog}));
      await noOverflow();
      assert(await page.locator('#dialogBody').evaluate(e=>e.scrollHeight<=e.clientHeight+1));
      assert.equal(await page.locator('[data-talent-select]').count(),21);
      assert.equal(await page.locator('#panelOverlay > .dialog').evaluate(e=>getComputedStyle(e).borderImageSource),'none');
      await page.locator('[data-tree-zoom=fit]').click();
      const node=page.locator('[data-talent-select=sword-0-0]');await node.focus();await node.click({modifiers:['Shift']});
      assert(await page.locator('.talent-inspector').isVisible());
      assert(await page.locator('[data-talent-confirm]').isVisible());
      await page.screenshot({path:path.join(out,'talents-'+width+'.png')});
      if(width<=760){await page.locator('[data-talent-return]').click();assert(await page.locator('.talent-tree-panel').isVisible());}
    }
    assert.deepEqual(errors,[]);console.log('PASS talents glass: inventory dimensions in 8 viewports, icons, selection, mobile navigation, no overflow.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1);});
