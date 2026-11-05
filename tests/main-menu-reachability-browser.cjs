'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.MARE_TEST_URL||'http://127.0.0.1:8160/');
 await page.locator('#characterName').fill('Menu Teste');await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();
 await page.waitForFunction(()=>window.__mareDiagnostics?.().lobby96.state==='ready');
 for(const width of [390,412,768,1024,1366]){
  await page.setViewportSize({width,height:844});
  for(const id of ['socialMenuTrigger','characterMenuTrigger','modesMenuTrigger','captainMenuTrigger']){
   const button=page.locator('#'+id),r=await button.boundingBox();assert(r&&r.x>=0&&r.x+r.width<=width+.1,JSON.stringify({id,width,r}));
   await button.click();assert.equal(await button.getAttribute('aria-expanded'),'true');await button.click();assert.equal(await button.getAttribute('aria-expanded'),'false');
  }
 }
 assert.deepEqual(errors,[]);console.log('Real clicks: Social, Character, Modes and Captain reachable at 390/412/768/1024/1366px');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
