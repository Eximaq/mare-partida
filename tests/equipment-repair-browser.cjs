'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');

async function initialize(page) {
  await page.route('**/api/akuma/catalog',route=>route.fulfill({status:404,body:'{}'}));
  await page.route('**/__dev_version',route=>route.fulfill({body:'stable'}));
  await page.route('**/game.js*',async route=>{
    const response=await route.fetch();
    const source=await response.text();
    const marker='  window.__mareDiagnostics=';
    assert.ok(source.includes(marker));
    const hook='  window.__repairQA={get game(){return game},defs:itemDefs,newItem,openPanel,save:saveGame};\n';
    await route.fulfill({response,body:source.replace(marker,hook+marker)});
  });
  await page.goto(process.env.MARE_TEST_URL);
  await page.waitForFunction(()=>window.__repairQA,null,{timeout:120000});
  await page.locator('#characterName').waitFor({state:'visible',timeout:120000});
  await page.locator('#characterName').fill('Nauta Reparo');
  await page.locator('#nextToClass').click();
  await page.locator('#nextToAppearance').click();
  await page.locator('#createCharacter').click();
  await page.locator('[data-confirm-accept]').click();
  await page.waitForFunction(()=>window.__repairQA.game);
}
async function verify(page,out,name){
  const info=await page.evaluate(()=>{
    const q=window.__repairQA,g=q.game;
    for(const item of Object.values(g.equipment))if(MareForge.hasDurability(item,q.defs))item.durability=MareForge.maxDurability;
    const pick=slot=>q.defs.find(d=>d.slot===slot&&!d.kind);
    const make=(slot,condition)=>({...q.newItem(pick(slot),40,false,'rare'),durability:condition,locked:true});
    const worn=g.equipment.coat=make('coat',50000),stashed=make('gloves',40000);
    worn.sockets=['pearl_vit_1',null];g.inventory.push(stashed);g.gold=100000;
    q.save();q.openPanel('forge');
    return {id:worn.id,bagId:stashed.id,quote:MareForge.repairPlan(g,'repairAll',null,q.defs).total};
  });
  await page.getByRole('tab',{name:'Reparar',exact:true}).click();
  await page.locator('[data-forge-item="'+info.id+'"]').click();
  assert.match(await page.getByRole('tabpanel').innerText(),/50% → 100%/);
  const pageWidth=page.viewportSize().width;
  assert.ok(await page.locator('#dialogBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  if(out)await page.screenshot({path:path.join(out,'reparar-'+name+'.png')});
  await page.locator('[data-forge-action="repairAll"]').click();
  const confirmation=page.getByRole('alertdialog');
  assert.match(await confirmation.innerText(),/1 equipamento/);
  assert.match(await confirmation.innerText(),new RegExp(info.quote.toLocaleString('pt-BR').replaceAll('.','\\.')));
  const accept=confirmation.locator('[data-confirm-accept]');
  const box=await accept.boundingBox();
  assert.ok(box&&box.x+box.width<=pageWidth+1&&box.y+box.height<=page.viewportSize().height+1);
  if(out&&name==='desktop')await page.screenshot({path:path.join(out,'confirmacao-reparo.png')});
  await accept.click();
  await page.waitForFunction(({bagId,quote})=>{
    const g=__repairQA.game;
    return g.gold===100000-quote&&g.equipment.coat.durability===100000&&g.inventory.find(i=>i.id===bagId).durability===40000;
  },info);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('mare-partida-save-v1')||'null'));
  assert.equal(saved?.equipment.coat.durability,100000);
  assert.equal(saved?.gold,100000-info.quote);
  await page.evaluate(()=>{
    const q=__repairQA;q.game.equipment.coat.durability=72000;q.openPanel('inventory');
  });
  await page.locator('[data-inv-slot="coat"]').focus();
  const tooltip=page.locator('#gameTooltip');
  await tooltip.waitFor({state:'visible'});
  assert.ok(await tooltip.evaluate(e=>{
    const line=e.querySelector('.equipment-durability');
    return line?.previousElementSibling?.matches('.equipment-pearls')&&line?.nextElementSibling?.matches('.game-tip-power');
  }));
  const tip=await tooltip.boundingBox();
  assert.ok(tip.x>=0&&tip.y>=0&&tip.x+tip.width<=pageWidth+1&&tip.y+tip.height<=page.viewportSize().height+1);
  assert.ok(await tooltip.evaluate(e=>e.scrollHeight<=e.clientHeight+1),'tooltip should fit without hiding the power or origin');
  if(out)await page.screenshot({path:path.join(out,'durabilidade-tooltip-'+name+'.png')});
}
(async()=>{
  const out=process.env.MARE_REPAIR_EVIDENCE;
  if(out)await fs.mkdir(out,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    page.on('pageerror',error=>console.error(error.message));
    await initialize(page);
    for(const [name,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]){
      await page.setViewportSize(viewport);
      await verify(page,out,name);
      console.log(name+': repair quote, atomic payment, tooltip order and viewport passed');
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
