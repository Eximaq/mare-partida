'use strict';
// Published-index regression: no image/index interception.
// Fixture sets a disposable character appearance and positions it on a clear map lane.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
const url=process.env.MARE_TEST_URL,out=process.env.MARE_EVIDENCE_DIR;
(async()=>{await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH}),context=await browser.newContext({viewport:{width:1600,height:1000},recordVideo:{dir:path.join(out,'video'),size:{width:1280,height:800}}}),page=await context.newPage(),errors=[],evidence=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/game.js*',async route=>{
 const response=await route.fetch(),source=await response.text();
 assert(source.includes('  window.__mareDiagnostics='));
 const instrumentation=`
  window.__skinWalkFrames=[];
  const drawForSkinTest=lobby96.draw.bind(lobby96);
  lobby96.draw=function(ctx,player,options){
   const result=drawForSkinTest(ctx,player,options);
   if(options.consumer==='world'&&ctx.canvas.id==='worldCanvas'){
    const snapshot=lobby96.snapshot();
    const pose=snapshot.renderer==='native-hd'?snapshot.nativeHD?.last:snapshot.defaultHD?.last;
    window.__skinWalkWorld=pose;
    if(pose?.state==='rendered'&&pose.consumer==='world'&&pose.action==='walk'&&pose.source?.includes(':dark:')&&
       !window.__skinWalkFrames.some(frame=>frame.source===pose.source&&frame.frame===pose.frame)){
     const {source,frame,action,direction,state}=pose;
     window.__skinWalkFrames.push({source,frame,action,direction,state});
    }
   }
   return result;
  };
  window.__skinWalkQA={
   seed(gender){
    game.appearance96={version:1,skinStyle:'natural',gender,hairStyle:'original',hairColor:'original',eyeStyle:'original',eyeColor:'original',skinColor:'dark'};
    game.equipment={};game.inventory=[];
    autoPlay=false;autoSkills=false;keys.clear();saveGame();renderPanel();updateUI();
   },
   read(){return {frames:window.__skinWalkFrames,hero:{x:world.hero.x,y:world.hero.y},world:window.__skinWalkWorld};},
   async clearLane(direction){
    const [dx,dy]={south:[0,180],north:[0,-180],east:[180,0],west:[-180,0]}[direction];
    window.__skinWalkFrames=[];cancelBasicAttack();enterHunt();
    autoPlay=false;autoSkills=false;keys.clear();
    const deadline=performance.now()+90000;
    while(mapArtState()!=='ready'){
     if(performance.now()>deadline)throw Error('Map did not become ready');
     await new Promise(resolve=>setTimeout(resolve,50));
    }
    world.spawnClock=1e9;world.mobs=[];world.target=null;
    const nav=navigator();
    for(let y=192;y<nav.map.height-192;y+=16)for(let x=192;x<nav.map.width-192;x+=16){
     if(!nav.clear({x,y},{x:x+dx,y:y+dy})||!nav.clear({x,y},{x:x-dx,y:y-dy}))continue;
     Object.assign(world.hero,{x,y});
     camera.update(world.hero,activeMap(),0,true);
     return;
    }
    throw Error('No clear walking lane');
   }
  };
 `;
 await route.fulfill({response,body:source.replace('  window.__mareDiagnostics=',instrumentation+'  window.__mareDiagnostics=')});
});
async function read(){return page.evaluate(()=>__skinWalkQA.read());}

try {
 await page.goto(url,{waitUntil:'networkidle',timeout:120000});
 await page.waitForFunction(()=>!!window.__skinWalkQA,null,{timeout:60000});
 await page.locator('#characterName').fill('Pele QA');
 await page.locator('#nextToClass').click();
 await page.locator('#nextToAppearance').click();
 await page.locator('#createCharacter').click();
 await page.locator('[data-confirm-accept]').click();
 for(const gender of ['masculino','feminino']){
  await page.evaluate(gender=>{__skinWalkQA.seed(gender);window.__skinWalkFrames=[];},gender);
  for(const [key,direction] of [['s','south'],['w','north'],['d','east'],['a','west']]){
   await page.evaluate(async direction=>{await __skinWalkQA.clearLane(direction);},direction);
   await page.waitForFunction(()=>__skinWalkQA.read().world?.state==='rendered',null,{timeout:45000});
   const before=await read();
   await page.keyboard.down(key);
   try{
    await page.waitForFunction(direction=>__skinWalkQA.read().frames.filter(f=>f.direction===direction).length>=2,direction,{timeout:20000});
    await page.screenshot({path:path.join(out,gender+'-'+direction+'.png')});
   }finally{await page.keyboard.up(key);}
   const after=await read();
   assert(Math.hypot(after.hero.x-before.hero.x,after.hero.y-before.hero.y)>5);
   evidence.push({gender,direction,frames:after.frames.filter(f=>f.direction===direction)});
  }
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'runtime.json'),JSON.stringify({evidence,errors},null,2));
 console.log('PASS both bodies, dark skin while walking in all four directions');
}catch(e){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({error:e.message,state:await read().catch(()=>null),errors},null,2));await page.screenshot({path:path.join(out,'failure.png')});throw e;}finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
