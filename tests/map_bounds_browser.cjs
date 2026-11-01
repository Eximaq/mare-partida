'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.MARE_QA_DIR,errors=[],failed=[],requests=[];
let source=fs.readFileSync(path.join(root,'game.js'),'utf8');
const keyLine=source.split('\n').find(x=>x.includes('const mapKey=()=>'));
source=source.replace(keyLine,keyLine.replace('const mapKey=','const nativeMapKey=')+'\n  const mapKey=()=>window.__boundsQA?.forcedMap||nativeMapKey();');
source=source.replace('function tick(dt){','function tick(dt){if(window.__boundsQA?.paused)return;');
source=source.replace('  window.__mareDiagnostics=',"  window.__boundsQA={paused:true,forcedMap:null,get game(){return game},get camera(){return camera},get hero(){return world.hero},get zoom(){return worldZoom},open(id){this.forcedMap=id;scene=id==='lobby'?'lobby':'hunt';autoPlay=false;autoSkills=false;world.mobs=[];Object.assign(world.hero,worldMaps[id].spawn);resizeViewport();presentWorld();},state:mapArtState,resize:resizeViewport,draw:presentWorld};\n  window.__mareDiagnostics=");
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push(r.url()));page.on('request',r=>requests.push(r.url()));
 await page.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source}));
 await page.goto(process.env.MARE_TEST_URL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__boundsQA);
 await page.evaluate(()=>{window.__navSlices=[];const build=MareWorld.Navigation.prototype.buildRows;MareWorld.Navigation.prototype.buildRows=function(...args){const t=performance.now(),result=build.apply(this,args);__navSlices.push(performance.now()-t);return result;};});
 await page.locator('#characterName').fill('Map Bounds QA');await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();await page.waitForFunction(()=>!!__boundsQA.game);
 await page.waitForFunction(()=>__boundsQA.state()==='ready');assert.equal(await page.evaluate(()=>__mareDiagnostics().map.navigation.cached),1,'unused maps do not build navigation at startup');
 const ids=await page.evaluate(()=>Object.keys(MareWorld.maps));assert.equal(ids.length,18);const visits=[];
 for(const id of ids){
  await page.evaluate(id=>__boundsQA.open(id),id);await page.waitForFunction(()=>__boundsQA.state()==='ready',null,{timeout:20000});
  const result=await page.evaluate(()=>{const q=__boundsQA,c=q.camera,map=MareWorld.maps[q.forcedMap],coverage=MareWorld.coverageFor(map),before={x:q.hero.x,y:q.hero.y},times=[];
   for(const z of [.8,1,1.8]){q.zoom.set(z);q.resize();for(let i=0;i<40;i++){const t=performance.now();c.update(q.hero,map,.016,false);times.push(performance.now()-t);}}
   q.zoom.reset();q.resize();q.draw();const screen=c.worldToScreen(q.hero.x,q.hero.y);return {id:q.forcedMap,before,after:{x:q.hero.x,y:q.hero.y},visible:screen.x>=0&&screen.x<c.width&&screen.y>=0&&screen.y<c.height,coverage:coverage.snapshot(),maxCameraMs:Math.max(...times),masked:c.masked};});
  assert.deepEqual(result.after,result.before,id+' camera must not move the actor');assert(result.visible,id+' actor visible');assert(result.maxCameraMs<50,id+' bounded camera frame');visits.push(result);
  if(out&&['lobby','alabasta','impel-down','alubarna-01','rare','dawn'].includes(id))await page.screenshot({path:path.join(out,'bounds-'+id+'.png')});
 }
 for(const viewport of [{width:393,height:852},{width:2560,height:1080}]){await page.setViewportSize(viewport);await page.evaluate(()=>{__boundsQA.open('arlong');__boundsQA.zoom.set(.8);__boundsQA.resize();__boundsQA.draw();});if(out)await page.screenshot({path:path.join(out,'bounds-'+viewport.width+'.png')});}
 const warmRequests=requests.length;await page.evaluate(()=>__boundsQA.open('alabasta'));await page.waitForFunction(()=>__boundsQA.state()==='ready');assert.equal(requests.length,warmRequests,'warm terrain uses existing image/cache');
 const navSlices=await page.evaluate(()=>__navSlices);assert(Math.max(...navSlices)<50,'navigation rows stay bounded');
 const cache=await page.evaluate(()=>({dawn:MareDawnRenderer.stats(),ember:MareEmberRenderer.stats()}));assert(cache.dawn.chunks<=35);assert(cache.ember.chunks<=32);
 const cold=await browser.newPage({viewport:{width:1366,height:768}});let blockedRequests=0;
 await cold.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source}));
 await cold.route('**/assets/lobby-map.png*',async r=>{blockedRequests++;await new Promise(resolve=>setTimeout(resolve,1500));await r.fulfill({status:404,body:'fixture missing map'});});
 await cold.goto(process.env.MARE_TEST_URL,{waitUntil:'domcontentloaded'});await cold.waitForFunction(()=>!!window.__boundsQA);
 await cold.locator('#characterName').fill('Loading QA');await cold.locator('#nextToClass').click();await cold.locator('#nextToAppearance').click();await cold.locator('#createCharacter').click();await cold.locator('[data-confirm-accept]').click();await cold.waitForFunction(()=>!!__boundsQA.game);
 await cold.locator('#worldLoading').waitFor({state:'visible'});await cold.waitForFunction(()=>__boundsQA.state()==='failed');
 for(let i=0;i<100;i++)await cold.evaluate(()=>__boundsQA.draw());assert.equal(blockedRequests,1,'failed image is not retried every frame');assert.equal(await cold.locator('#worldLoading').getAttribute('data-state'),'failed');if(out)await cold.screenshot({path:path.join(out,'map-load-failure.png')});await cold.close();
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);if(out)fs.writeFileSync(path.join(out,'bounds-report.json'),JSON.stringify({visits,cache,maxNavRowMs:Math.max(...navSlices),requests:requests.length,errors,failed},null,2));console.log(JSON.stringify({maps:visits.length,maxCameraMs:Math.max(...visits.map(x=>x.maxCameraMs)),maxNavRowMs:Math.max(...navSlices),cache,errors,failed}));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
