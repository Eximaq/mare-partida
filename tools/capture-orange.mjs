import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_NODE_MODULES?path.join(process.env.PLAYWRIGHT_NODE_MODULES,'playwright'):'playwright');
const output=path.resolve('docs/evidence-orange-terrain-v2/ci');fs.mkdirSync(output,{recursive:true});
const base=process.env.ORANGE_BASE_SHA||'9529a4d',url=process.env.ORANGE_QA_URL||'http://127.0.0.1:8765/tools/orange-terrain-qa.html';
const baseline=new Map(['orange-terrain.js','orange-renderer.js'].map(file=>[file,execFileSync('git',['show',base+':'+file],{encoding:'utf8'})]));
const browser=await chromium.launch({headless:true}),results=[],captures={};
const views={rua:{x:640,y:672},praca:{x:864,y:864},cais:{x:0,y:1440},chunks:{x:960,y:960},cantos:{x:1280,y:128}};
try{
  for(const phase of ['before','after']){
   const context=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:1}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/__dev_version',r=>r.fulfill({body:'stable'}));await page.clock.install({time:1792500000000});
   await page.addInitScript('Math.random=(()=>{let x=42317;return()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296}})()');
   if(phase==='before')await page.route('**/*.js',route=>{const filename=new URL(route.request().url()).pathname.split('/').at(-1);return baseline.has(filename)?route.fulfill({body:baseline.get(filename),contentType:'application/javascript'}):route.continue();});
   await page.goto(new URL('../',url).href,{waitUntil:'load'});await page.waitForFunction(()=>typeof __mareDiagnostics==='function');await page.evaluate('MareOrangeRenderer.boot');
   await page.locator('#characterName').fill('Nauta terreno');await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();await page.clock.runFor(100);
   await page.locator('#devLauncher').click();await page.locator('[data-dev-enter]').click();await page.waitForURL('**/?dev=1');await page.waitForFunction(()=>window.__mareDiagnostics?.().dev.active);
   await page.locator('#devLauncher').click();await page.locator('#devLevel').fill('30');await page.locator('[data-dev-command=level]:not([data-value])').click();await page.locator('[data-dev-option=godMode]').check();await page.locator('[data-dev-travel=orange]').click();await page.evaluate('MareOrangeRenderer.boot');
   if(await page.evaluate('__mareDiagnostics().autoPlay'))await page.locator('#autoToggle').click();await page.clock.runFor(100);
   await page.evaluate(()=>{const e=document.createElement('canvas');e.id='scene';e.width=768;e.height=512;e.style.cssText='position:absolute;left:0;top:0;z-index:100000;image-rendering:pixelated';document.body.append(e)});
   for(const [view,camera]of Object.entries(views)){
    await page.evaluate(camera=>{const e=document.getElementById('scene');e.width=768;const c=e.getContext('2d');c.imageSmoothingEnabled=false;c.translate(-camera.x,-camera.y);MareOrangeRenderer.ground(c,camera,768,512,0,true);MareOrange.props.slice().sort((a,b)=>a.y-b.y).forEach(p=>MareOrangeRenderer.prop(c,p));},camera);
    captures[view]??={};captures[view][phase]=await page.locator('#scene').screenshot({path:path.join(output,view+'-'+phase+'.png')});results.push({phase,name:view,camera,renderer:await page.evaluate('MareOrangeRenderer.stats()')});
   }
   if(errors.length)throw Error(errors.join('\n'));
   await context.close();
  }
 for(const [view,images]of Object.entries(captures)){
  const comparison=await browser.newPage({viewport:{width:1536,height:550}});
  await comparison.setContent('<style>body{margin:0;background:#17282b;color:#f0dfb4;font:14px sans-serif}main{display:flex}img{display:block;image-rendering:pixelated}p{height:20px;margin:0}</style><main>'+['before','after'].map(phase=>'<section><p>'+phase+' · '+view+'</p><img width="768" height="512" src="data:image/png;base64,'+images[phase].toString('base64')+'"></section>').join('')+'</main>');
  await comparison.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await comparison.screenshot({path:path.join(output,view+'-comparison.png')});await comparison.close();
 }
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({baseline:base,visual_approval:'required; no pixel-change percentage is an artistic acceptance criterion',captures:results},null,2));
}finally{await browser.close();}
console.log('Before/after at identical world coordinates, actual baseline scripts, no JS errors. Artistic review required.');
