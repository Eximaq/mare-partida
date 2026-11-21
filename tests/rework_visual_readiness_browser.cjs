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
   await page.route('**/game.js*',async route=>{
    const response=await route.fetch(),source=await response.text(),marker='  window.__mareDiagnostics=',renderer='  const lobby96=MarePaperDoll96Lobby.create';
    assert(source.includes(marker)&&source.includes(renderer));
    const fixture=`
     window.__poseLoad={held:false,released:false,rejectWalk:${induceFailure},failed:false};
     const createNative=MareReworkNativeHD.create;
     MareReworkNativeHD.create=(...args)=>{
      const instance=createNative(...args),prepare=instance.prepareConfiguration;
      instance.prepareConfiguration=async (poses,options)=>{
       const state=window.__poseLoad;
       if(poses[0].options.action==='idle'&&!state.held){
        state.held=true;
        await new Promise(resolve=>{state.release=()=>{state.released=true;resolve();};});
       }
       if(state.rejectWalk&&poses[0].options.action==='walk'&&!state.failed){
        state.failed=true;throw Error('Visual QA: temporary walk decode failure');
       }
       return prepare(poses,options);
      };
      return instance;
     };
    `;
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
        Object.assign(world.hero,{x,y});camera.update(world.hero,activeMap(),0,true);
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
    await route.fulfill({response,body:source.replace(renderer,fixture+renderer).replace(marker,instrumentation+marker)});
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
   await page.waitForFunction(()=>__poseLoad.held&&document.querySelector('#worldLoading').classList.contains('hidden'),null,{timeout:60000});
   assert.equal(await page.locator('#playerVisualStatus,#retryPlayerVisual').count(),0);
   const paused=await read();
   assert.equal(paused.draws.length,0);
   await page.waitForFunction(t=>__preparationQA.read().hero.time>t,paused.hero.time);
   await page.evaluate(()=>__preparationQA.lane());
   const before=await read();
   await page.keyboard.down('d');
   try{
    await page.waitForFunction(x=>__preparationQA.read().hero.x>x+10,before.hero.x,{timeout:15000});
    if(induceFailure){
     await page.waitForFunction(()=>__poseLoad.failed);
     await page.waitForFunction(()=>__preparationQA.read().visual?.state==='failed');
    }
    await page.evaluate(()=>__poseLoad.release());
    await page.waitForFunction(()=>__preparationQA.read().draws.some(row=>row.action==='walk'),null,{timeout:30000});
   }finally{await page.keyboard.up('d');}
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
