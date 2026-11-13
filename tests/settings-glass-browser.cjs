'use strict';
// Settings share the inventory frame while every preference remains accessible.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');
const out = process.env.MARE_QA_DIR || 'tmp/settings-glass';
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
    await page.waitForFunction(()=>window.__characterGlassQA&&__mareDiagnostics().lobby96.state==='ready',null,{timeout:90000});
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
    await page.waitForFunction(()=>document.querySelectorAll('.toast').length===0);
    const state=()=>page.evaluate(()=>JSON.stringify({inventory:__characterGlassQA.game.inventory,equipment:__characterGlassQA.game.equipment,gold:__characterGlassQA.game.gold,attributes:__characterGlassQA.game.attributes}));
    const stable=await state();
    for(const [width,height] of sizes) {
      await page.mouse.move(0,0);await page.setViewportSize({width,height});await open('inventory');
      const box=await page.waitForFunction(()=>{const r=document.querySelector('.op-inventory-shell')?.getBoundingClientRect();return r?.width&&r?.height?r.toJSON():false;});
      const inventory=await box.jsonValue();await box.dispose();await open('settings');
      for(const section of ['general','audio','graphics','interface','accessibility','discord']) {
        await page.locator(section==='discord'?'[data-settings-tab=discord]':'[data-settings-card='+section+']').click();
        const rect=await page.locator('#panelOverlay > .dialog').boundingBox();
        assert(Math.abs(rect.width-inventory.width)<2&&Math.abs(rect.height-inventory.height)<2,'inventory frame '+width+' '+section+' '+JSON.stringify({rect,inventory}));
        await noOverflow();
        assert(await page.locator('#dialogBody').evaluate(e=>e.scrollHeight<=e.clientHeight+1),'scroll only inside options');
        assert.equal(await page.locator('.settings-nav svg').count(),6,'six crisp category SVGs');
        assert.equal(await page.locator('.settings-nav [aria-pressed=true]').count(),1,'one active category');
        assert(await page.locator('#dialogBody button').evaluateAll(es=>es.every(e=>getComputedStyle(e).borderImageSource==='none')),'no legacy textures');
        const pane=page.locator('.settings-content');
        assert(await pane.evaluate(e=>e.clientHeight>=130),'readable options area '+width);
        if(width>=768&&height>=700)assert(await pane.evaluate(e=>e.scrollHeight<=e.clientHeight+1),'no needless desktop/tablet scroll');
        if(section==='audio'||section==='general')await page.screenshot({path:path.join(out,'settings-'+section+'-'+width+'.png')});
        if(section==='audio') {
          await page.getByRole('slider',{name:'Volume dos efeitos'}).focus();await page.keyboard.press('ArrowRight');
          assert.equal(await page.getByRole('slider',{name:'Volume dos efeitos'}).evaluate(e=>e===document.activeElement),true,'keyboard focus remains on volume');
        }
      }
      await page.locator('[data-settings-card=accessibility]').click();await page.locator('[data-captain-larger]').check();
      const large=await page.locator('.captain-setting-line').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize));
      await page.locator('[data-captain-larger]').uncheck();
      assert(large>await page.locator('.captain-setting-line').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)),'large-text preference remains effective');
      await page.locator('[data-settings-tab=discord]').click();
      assert.equal(await page.getByRole('link',{name:'Entrar no Discord'}).getAttribute('href'),'https://discord.gg/uRnP79cp7h');
    }
    assert.equal(await state(),stable,'settings navigation leaves game state intact');
    assert.deepEqual(errors,[]);console.log('PASS settings glass: all six categories, inventory parity, SVGs, keyboard volume and large text in eight viewports.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1);});
