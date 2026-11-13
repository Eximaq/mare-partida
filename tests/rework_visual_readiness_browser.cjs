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
 const expectedActions=new Set(['idle','walk','attack','skill']);
 try{
  for(const gender of induceFailure?['masculino']:['masculino','feminino']){
   const context=await browser.newContext({viewport:{width:1440,height:960},recordVideo:process.env.MARE_RECORD_VIDEO==='1'?{dir:path.join(out,'video'),size:{width:960,height:640}}:undefined});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>{
    // Induce slow decode only for an archived PNG, without marking anything ready.
    const decode=HTMLImageElement.prototype.decode;
    window.__heldDecode={started:false,released:false};
    HTMLImageElement.prototype.decode=async function(){
     await decode.call(this);
     if(!this.src.startsWith('blob:')||window.__heldDecode.started)return;
     window.__heldDecode.started=true;
     await new Promise(resolve=>{window.__heldDecode.release=()=>{window.__heldDecode.released=true;resolve();};});
    };
   });
   await page.route('**/api/akuma/catalog',route=>route.fulfill({status:404,body:'{}'}));
   await page.route('**/__dev_version',route=>route.fulfill({body:'stable'}));
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
      read:()=>({visual:lobby96.worldVisual(),draws:[...draws],hero:{x:world.hero.x,y:world.hero.y},equipment:Object.fromEntries(Object.entries(game?.equipment||{}).map(([k,v])=>[k,v?.def??null]))}),
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
    await route.fulfill({response,body:source.replace(marker,instrumentation+marker)});
   });
   const missing='**/masculino-walk-east-body.png*';
   if(induceFailure)await page.route(missing,route=>route.fulfill({status:404,body:'Missing fixture PNG'}));
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
   await page.waitForFunction(()=>__preparationQA.read().visual?.state==='loading'&&__heldDecode.started,null,{timeout:60000});
   const blocked=await read();
   await page.keyboard.press('d');
   assert.deepEqual((await read()).hero,blocked.hero);
   assert.equal((await read()).draws.length,0);
   await page.evaluate(()=>__heldDecode.release());
   await page.waitForFunction(()=>['ready','failed'].includes(__preparationQA.read().visual?.state),null,{timeout:90000});
   const failure=induceFailure?(await read()).visual:null;
   if(induceFailure){
    assert.equal(failure.state,'failed');
    assert.match(failure.error,/masculino-walk-east-body[.]png/);
    assert.equal((await read()).draws.length,0);
    await page.unroute(missing);
    await page.locator('#retryPlayerVisual').click();
    await page.waitForFunction(()=>__preparationQA.read().visual?.state==='ready',null,{timeout:90000});
   }
   const starter=await read();
   assert.equal(starter.visual.state,'ready',starter.visual.error);
   assert.equal(starter.equipment.coat,6);
   assert.equal(starter.equipment.weapon,0);
   assert(starter.visual.coverage.every(p=>!p.omitted.length&&!p.unsupported.length));
   for(const action of expectedActions)assert.equal(starter.visual.coverage.filter(p=>p.action===action).length,4);
   await page.evaluate(()=>__preparationQA.lane());
   await page.waitForFunction(()=>__preparationQA.read().visual?.state==='ready',null,{timeout:90000});
   const before=await read();
   const walkCount=before.visual.coverage.find(p=>p.action==='walk'&&p.direction==='east').frames;
   const attackCount=before.visual.coverage.find(p=>p.action==='attack'&&p.direction==='east').frames;
   await page.keyboard.down('d');
   try{
    await page.waitForFunction(count=>new Set(__preparationQA.read().draws.filter(d=>d.action==='walk').map(d=>d.frame)).size===count,walkCount,{timeout:10000});
   }finally{await page.keyboard.up('d');}
   const pos=await page.evaluate(()=>__preparationQA.target()),canvas=page.locator('#worldCanvas'),size=await canvas.boundingBox();
   await canvas.click({position:{x:pos.x*size.width,y:pos.y*size.height}});
   await page.waitForFunction(count=>{
    const draws=__preparationQA.read().draws,first=draws.findIndex(d=>d.action==='attack');
    if(first<0)return false;
    const end=draws.findIndex((d,i)=>i>first&&(d.action!=='attack'||d.progress<draws[i-1].progress));
    return end>first;
   },attackCount,{timeout:15000}).catch(()=>{});
   const after=await read();
   assert(after.hero.x>before.hero.x);
   assert(after.draws.every(d=>Number.isFinite(d.readyAt)&&d.readyAt<=d.at&&d.state==='rendered'));
   assert.deepEqual(errors,[]);
   const walkClip=after.visual.coverage.find(p=>p.action==='walk'&&p.direction==='east');
   assert(walkClip.frames>=4);
   assert(after.draws.some(d=>d.action==='walk'&&d.weaponIds?.includes(0)));
   assert(after.draws.some(d=>d.action==='attack'&&d.weaponIds?.includes(0)));
   const first=after.draws.findIndex(d=>d.action==='attack'),end=after.draws.findIndex((d,i)=>i>first&&(d.action!=='attack'||d.progress<after.draws[i-1].progress));
   const attackFrames=[...new Set(after.draws.slice(first,end<0?undefined:end).map(d=>d.frame))];
   evidence.push({gender,failure,starter:starter.visual,base:after.visual,draws:after.draws,errors,firstAttack:{expected:attackCount,frames:attackFrames,result:attackFrames.length===attackCount?'PASSOU':'FALHOU'}});
   await fs.writeFile(path.join(out,'runtime.json'),JSON.stringify(evidence,null,2));
   await canvas.screenshot({path:path.join(out,gender+'.png')});
   await context.close();
   if(page.video())await page.video().saveAs(path.join(out,gender+'.webm'));
   console.log(gender+': first walk '+walkCount+'/'+walkCount+', first attack '+attackFrames.length+'/'+attackCount);
  }
  if(evidence.some(row=>row.firstAttack.result==='FALHOU'))throw Error('Primeiro ataque não apresentou todos os quadros: '+JSON.stringify(evidence.map(row=>[row.gender,row.firstAttack])));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
