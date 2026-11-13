'use strict';
// Real game layout: both progression windows must match the inventory frame without clipping controls.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');
const out = process.env.MARE_QA_DIR || 'tmp/progression-glass';
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
        '  window.__characterGlassQA={get game(){return game},openPanel,render:renderPanel,refresh:updateUI,stats:getDerived,make:newItem};\n  window.__mareDiagnostics=')});
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
    await page.evaluate(()=>{const q=__characterGlassQA;q.game.level=50;q.game.stats.kills=2040;q.game.stats.goldEarned=100000;q.refresh();});
    await page.evaluate(()=>{const q=__characterGlassQA;q.game.inventory.push({...q.make(MareHaki.book),id:'glass-haki-book'});q.refresh();});
    await open('inventory');await page.locator('[data-item=glass-haki-book]').click();await page.locator('[data-use-haki-book]').click();await page.locator('[data-confirm-accept]').click();
    await page.waitForFunction(()=>document.querySelectorAll('.toast').length===0);
    for(const [width,height] of sizes) {
      await page.mouse.move(0,0);await page.setViewportSize({width,height});await open('inventory');
      await page.locator('.op-inventory-shell').evaluate(async e=>{await Promise.all(e.getAnimations({subtree:true}).filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})));});
      const box=await page.waitForFunction(()=>{const r=document.querySelector('.op-inventory-shell')?.getBoundingClientRect();return r?.width&&r?.height?r.toJSON():false;});
      const inventory=await box.jsonValue();await box.dispose();
      for(const panel of ['achievements','haki']) {
        await page.evaluate(p=>p==='haki'?__characterGlassQA.openPanel('haki'):__characterGlassQA.openPanel('character',p),panel);
        const dialog=await page.locator('#panelOverlay > .dialog').boundingBox();
        assert(Math.abs(dialog.width-inventory.width)<2&&Math.abs(dialog.height-inventory.height)<2,panel+' inventory frame parity '+width+' '+JSON.stringify({inventory,dialog}));
        await noOverflow();
        assert(await page.locator('#dialogBody').evaluate(e=>e.scrollHeight<=e.clientHeight+1),panel+' outer body must not scroll '+width);
        assert.equal(await page.locator('#panelOverlay > .dialog').evaluate(e=>getComputedStyle(e).borderImageSource),'none');
        if(panel==='achievements') {
          const total=await page.locator('[data-achievement-total]').textContent();
          await page.locator('[data-achievement-category=kills]').click();
          assert.equal(await page.locator('[data-achievement-total]').textContent(),total);
          await page.locator('[data-achievement-category=all]').click();
          assert(await page.locator('.achievement-list').evaluate(e=>e.clientHeight>80&&e.scrollWidth<=e.clientWidth+1),'readable list '+width);
          assert(await page.locator('.achievement-entry').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return [...e.children].every(c=>{const s=c.getBoundingClientRect();return s.right<=r.right+1&&s.bottom<=r.bottom+1;});})),'cards fit '+width);
        } else {
          assert.equal(await page.locator('.hm-node').count(),16);
          await page.locator('[data-haki-node=coating]').click();
          assert(await page.locator('[data-haki-invest=coating]').isVisible());
          if(width<=760) {await page.locator('[data-haki-back-tree]').click();assert(await page.locator('.hm-tree').isVisible());}
        }
        assert(await page.locator('#dialogBody button').evaluateAll(es=>es.every(e=>getComputedStyle(e).borderImageSource==='none')),'no legacy button textures '+panel);
        await page.screenshot({path:path.join(out,panel+'-'+width+'.png')});
      }
    }
    assert.deepEqual(errors,[]);console.log('PASS progression glass: both frames match inventory in 8 viewports; filters, Haki nodes and mobile navigation; no clipped cards or outer scrolling.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1);});
