'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport}),requests=[],bad=[],errors=[];
   const ours=/\/(?:sprites-combat-v2\/daily-|vfx\/daily-sword-bosses\/)/;
   page.on('request',r=>{if(ours.test(r.url()))requests.push(r.url().split('?')[0]);});
   page.on('response',r=>{if(ours.test(r.url())&&r.status()>=400)bad.push(r.url());});
   page.on('pageerror',e=>errors.push(e.message));
   const url=new URL(process.env.MARE_TEST_URL);
   await page.goto(url.href,{waitUntil:'load'});assert.equal(requests.length,0);
   await page.goto(new URL('daily-sword-boss-preview.html',url).href,{waitUntil:'load'});
   const ready=()=>page.waitForFunction(()=>document.querySelector('#scene').dataset.ready==='true');
   await ready();
   const ids=await page.locator('#actor option').evaluateAll(nodes=>nodes.map(n=>n.value));assert.equal(ids.length,7);
   for(const id of ids){
    await page.selectOption('#actor',id);await ready();
    await page.selectOption('#action','special');await ready();
    const good=await page.evaluate(({id})=>{
     const P=MareDailySwordBossPreview,S=MareDailySwordBossArtData.specials[id];
     return ['south','north','east','west'].every(d=>{
      const f=P.sceneAt(id,d,S.releaseMs+S.travelMs+Math.floor(S.impactMs/2));
      return f.impact.length===(id==='daily-shiki'?3:1)&&f.impact.every(e=>e.frame===3);
     });
    },{id});assert(good,id);
    await page.waitForFunction(()=>document.querySelector('#scene').dataset.phase==='impact',{},{timeout:5000});
    for(const direction of ['north','east','west','south']){
     await page.selectOption('#direction',direction);await ready();
    }
    for(const action of ['walk','attack','hurt','idle']){
     await page.selectOption('#action',action);await ready();
    }
   }
   await page.click('#pause');assert.equal(await page.locator('#pause').getAttribute('aria-pressed'),'true');
   assert.equal(new Set(requests).size,150);assert.deepEqual(bad,[]);assert.deepEqual(errors,[]);
   console.log('PASS',viewport,new Set(requests).size);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
