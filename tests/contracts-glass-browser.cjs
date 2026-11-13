'use strict';
// Real contract board: inventory dimensions, period controls and professional ledger at standard device sizes.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');
const out = process.env.MARE_QA_DIR || 'tmp/contracts-glass';
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
    for(const [width,height] of sizes) {
      await page.mouse.move(0,0);await page.setViewportSize({width,height});await open('inventory');
      const box=await page.waitForFunction(()=>{const r=document.querySelector('.op-inventory-shell')?.getBoundingClientRect();return r?.width&&r?.height?r.toJSON():false;});
      const inventory=await box.jsonValue();await box.dispose();await open('contracts');
      const dialog=await page.locator('#panelOverlay > .dialog').boundingBox();
      assert(Math.abs(dialog.width-inventory.width)<2&&Math.abs(dialog.height-inventory.height)<2,'inventory frame parity '+width+' '+JSON.stringify({inventory,dialog}));
      for(const period of ['daily','weekly','journey','monthly']) {
        await page.locator('[data-contract-period='+period+']').click();
        await noOverflow();
        assert(await page.locator('#dialogBody').evaluate(e=>e.scrollHeight<=e.clientHeight+1),'outer body must not scroll '+width);
        assert(await page.locator('.contracts-list').evaluate(e=>e.clientHeight>=80),'readable list '+width);
        assert(await page.locator('#dialogBody button').evaluateAll(es=>es.every(e=>getComputedStyle(e).borderImageSource==='none')),'no legacy button textures');
        assert(await page.locator('.contract-tab').evaluateAll(es=>es.every(e=>parseFloat(getComputedStyle(e).borderTopWidth)<=1&&getComputedStyle(e).fontFamily.includes('Inter'))),'thin modern tabs');
        assert(await page.locator('.contract-state').evaluateAll(es=>es.every(e=>getComputedStyle(e).color!=='rgb(18, 83, 75)')),'readable status contrast');
        if(period==='journey')await page.screenshot({path:path.join(out,'contracts-'+width+'.png')});
      }
      // Exercise the actual professional renderer in the offline visual fixture; online bindings have their own suite.
      await page.evaluate(()=>{
        const board=document.querySelector('[data-contract-board]');board.classList.add('contracts-professional');
        board.querySelector('.contracts-footer').hidden=true;
        board.querySelector('.contracts-tabs').insertAdjacentHTML('beforeend','<button class="contract-tab ui-button" data-contract-period="professional" aria-pressed="true">PROFISSIONAIS</button>');
        board.querySelectorAll('[data-contract-period]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.contractPeriod==='professional')));
        board.querySelector('.contracts-list').innerHTML=MareCrewUI.contracts({profession:'navigator',week:{earnedXp:250,limit:1000,endAt:'2026-12-01',objectives:[{id:'donation',title:'Fundo de Opera\u00e7\u00f5es',description:'Doe Berry \u00e0 tesouraria da sua tripula\u00e7\u00e3o.',progress:3500,target:3500,xp:150,status:'complete'},{id:'hunt',title:'Ordem de Intercepta\u00e7\u00e3o',description:'Derrote monstros de n\u00edvel 18 em mapas de ca\u00e7a acess\u00edveis.',progress:54,target:8321,xp:250}]},history:[]});
      });
      await noOverflow();
      assert(await page.locator('.contracts-board').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'professional overflow '+width);
      assert(await page.locator('.crew-objective').evaluateAll(es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)),'professional cards fit '+width);
      await page.screenshot({path:path.join(out,'professional-'+width+'.png')});
    }
    assert.deepEqual(errors,[]);console.log('PASS contracts glass: inventory frame parity, all periods, professional cards, no clipped content in 8 viewports.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1);});
