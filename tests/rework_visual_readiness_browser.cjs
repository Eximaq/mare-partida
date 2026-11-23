'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright');
const out=process.env.MARE_EVIDENCE_DIR;
const url=process.env.MARE_TEST_URL;
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 const evidence=[];
 const induceFailure=process.env.MARE_FAIL_VISUAL==='1';
 try{
  for(const gender of induceFailure?['masculino']:['masculino','feminino']){
   const context=await browser.newContext({viewport:{width:1440,height:960},recordVideo:process.env.MARE_RECORD_VIDEO==='1'?{dir:path.join(out,'video'),size:{width:960,height:640}}:undefined});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/api/akuma/catalog',route=>route.fulfill({status:404,body:'{}'}));
   await page.route('**/__dev_version',route=>route.fulfill({body:'stable'}));
   // Hold the actual map request. Inventory and creation previews prepare poses too.
   await page.addInitScript(failWalk=>{
    window.__poseLoad={held:false,released:false,rejectWalk:failWalk,failed:false};
    window.__holdWorldPose=async(key,action)=>{
     const state=window.__poseLoad;
     if(state.armed&&action==='idle'&&!state.held){
      state.held=true;state.heldKey=key;
      await new Promise(resolve=>{state.release=()=>{state.released=true;resolve();};});
     }
     if(state.held&&action==='walk'&&state.rejectWalk&&!state.failed){
      state.failed=true;state.failedKey=key;
      throw Error('Visual QA: temporary walk decode failure');
     }
    };
   },induceFailure);
   await page.route('**/paper-doll-96-lobby.js*',async route=>{
    const response=await route.fetch(),source=await response.text();
    const marker='bundle=await nativeHD.prepareConfiguration([pose],';
    assert.equal(source.split(marker).length,2,'exact map publication path');
    await route.fulfill({response,body:source.replace(marker,'await window.__holdWorldPose(entry.key,options.action);'+marker)});
   });
   await page.route('**/game.js*',async route=>{
    const response=await route.fetch(),source=await response.text(),marker='  window.__mareDiagnostics=';
    assert(source.includes(marker));
    const instrumentation=`
     const observedWorld=lobby96.draw.bind(lobby96);
     const draws=[];
     lobby96.draw=function(ctx,player,options){
      const result=observedWorld(ctx,player,options);
      if(result&&options.worldView&&ctx.canvas.id==='worldCanvas'){
       const visual=lobby96.worldVisual(),snapshot=lobby96.snapshot(),pose=snapshot.lastPose||snapshot.nativeHD.last;
       draws.push({at:performance.now(),readyAt:visual?.preparedAt,action:options.action,direction:options.direction,frame:pose?.frame,progress:options.progress,source:pose?.source,state:pose?.state,key:visual?.publishedKey,weaponIds:pose?.weaponIds});
      }
      return result;
     };
     window.__preparationQA={
      read:()=>({visual:lobby96.worldVisual(),draws:[...draws],hero:{x:world.hero.x,y:world.hero.y,time:world.time},targetHP:world.mobs[0]?.hp,equipment:Object.fromEntries(Object.entries(game?.equipment||{}).map(([k,v])=>[k,v?.def??null]))}),
      async lane(){
       enterHunt();autoPlay=false;autoSkills=false;keys.clear();world.spawnClock=1e9;world.mobs=[];
       while(mapArtState()!=='ready')await new Promise(resolve=>setTimeout(resolve,25));
       const nav=navigator();
       for(let y=192;y<nav.map.height-192;y+=16)for(let x=192;x<nav.map.width-300;x+=16){
        if(!nav.clear({x,y},{x:x+250,y}))continue;
        window.__poseLoad.armed=true;
        Object.assign(world.hero,{x,y,direction:'back'});camera.update(world.hero,activeMap(),0,true);
        world.mobs=[{...monsterTypes.cesar,id:'readiness-qa',type:'cesar',area:game.area,district:MareHunt.sectors(game.area)[0].id,level:1,alive:true,hp:100000,maxHP:100000,defense:0,magicDefense:0,x:x+175,y,anchorX:x+175,anchorY:y,attack:0,attackClock:1e9,speed:0,patrolClock:1e9,aggro:0,bob:0}];
        return;
       }
       throw Error('No walking lane');
      },
      target(){
       const target=world.mobs[0],point=camera.worldToScreen(target.x,target.y);
       return {x:point.x/W,y:point.y/H};
      }
     };
    `;
    await route.fulfill({response,body:source.replace(marker,instrumentation+marker)});
   });
   await page.goto(url,{waitUntil:'networkidle',timeout:90000});
   await page.locator('#characterName').fill('Visual QA');
   await page.locator('#characterName').press('Tab');
   await page.locator('#nextToClass').click();
   if(!await page.locator('#nextToAppearance').isVisible())await page.locator('#nextToClass').click();
   await page.locator('#classStep [data-class=sword]').click();
   await page.locator('#nextToAppearance').click();
   await page.locator('[data-appearance=gender]').first().selectOption(gender);
   await page.locator('#createCharacter').click();
   await page.locator('[data-confirm-accept]').click();
   const read=()=>page.evaluate(()=>__preparationQA.read());
   await page.locator('#gameLoading').waitFor({state:'hidden',timeout:90000});
   await page.evaluate(()=>__preparationQA.lane());
   await page.waitForFunction(()=>__poseLoad.held&&document.querySelector('#worldLoading').classList.contains('hidden'),null,{timeout:60000});
   assert.equal(await page.locator('#playerVisualStatus,#retryPlayerVisual').count(),0);
   const paused=await read();
   const heldKey=await page.evaluate(()=>__poseLoad.heldKey);
   assert.equal(paused.visual.key,heldKey);assert.equal(paused.visual.state,'loading');
   assert(!paused.draws.some(d=>d.key===heldKey),'An unfinished map pose was published');
   await page.waitForFunction(t=>__preparationQA.read().hero.time>t,paused.hero.time);
   const before=await read();
   let movementKey='d';
   await page.keyboard.down(movementKey);
   try{
    await page.waitForFunction(x=>__preparationQA.read().hero.x>x+10,before.hero.x,{timeout:15000});
    if(induceFailure){
     await page.waitForFunction(()=>__poseLoad.failed);
     await page.waitForFunction(()=>__preparationQA.read().visual?.state==='failed');
    }
    await page.evaluate(()=>__poseLoad.release());
    // A cold pose can take longer than one crossing. Continue walking
    // inside the measured clear lane so the actor still requests walk.
    const deadline=Date.now()+45000;
    const failedKey=await page.evaluate(()=>__poseLoad.failedKey);
    let seen=false;
    while(!seen&&Date.now()<deadline){
     await page.waitForFunction(({start,key,failedKey})=>{
      const q=__preparationQA.read();
      return q.draws.some(row=>row.action==='walk'&&(!failedKey||row.key===failedKey))||(key==='d'?q.hero.x>start+125:q.hero.x<start+25);
     },{start:before.hero.x,key:movementKey,failedKey},{timeout:Math.max(1,deadline-Date.now())});
     seen=(await read()).draws.some(row=>row.action==='walk'&&(!failedKey||row.key===failedKey));
     if(!seen){
      await page.keyboard.up(movementKey);
      movementKey=movementKey==='d'?'a':'d';
      await page.keyboard.down(movementKey);
     }
    }
    assert(seen,'An equipped walk pose must draw during continued player input');
   }finally{await page.keyboard.up(movementKey);}
   const pos=await page.evaluate(()=>__preparationQA.target()),canvas=page.locator('#worldCanvas'),size=await canvas.boundingBox();
   const hp=(await read()).targetHP;
   await canvas.click({position:{x:pos.x*size.width,y:pos.y*size.height}});
   await page.waitForFunction(value=>__preparationQA.read().targetHP<value,hp,{timeout:15000});
   const after=await read();
   assert(after.hero.x>before.hero.x);
   assert.equal(after.equipment.coat,6);
   assert.equal(after.equipment.weapon,0);
   assert(after.draws.every(d=>Number.isFinite(d.readyAt)&&d.readyAt<=d.at&&d.state==='rendered'));
   assert.deepEqual(errors,[]);
   evidence.push({gender,paused,before,after,errors,temporaryFailure:induceFailure});
   await fs.writeFile(path.join(out,'runtime.json'),JSON.stringify(evidence,null,2));
   await canvas.screenshot({path:path.join(out,gender+'.png')});
   await context.close();
   if(page.video())await page.video().saveAs(path.join(out,gender+'.webm'));
   console.log(gender+': map, simulation, movement and combat continue during visual preparation');
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
