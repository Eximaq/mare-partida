'use strict';
// Published-index regression: no image/index interception.
// Fixture supplies inventory and a clear lane. Equip, walk and attack use game controls.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
const url=process.env.MARE_TEST_URL,out=process.env.MARE_EVIDENCE_DIR;
(async()=>{await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH}),context=await browser.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage(),errors=[],evidence=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/game.js*',async route=>{
 const response=await route.fetch(),source=await response.text();
 assert(source.includes('  window.__mareDiagnostics='));
 const instrumentation=`
  window.__wardrobeQAFrames=[];
  const drawForWardrobeTest=lobby96.draw.bind(lobby96);
  lobby96.draw=function(ctx,player,options){
   const result=drawForWardrobeTest(ctx,player,options);
   if(options.consumer==='world'&&ctx.canvas.id==='worldCanvas'){
    const snapshot=lobby96.snapshot();
    const pose=snapshot.renderer==='native-hd'?snapshot.nativeHD?.last:snapshot.defaultHD?.last;
    window.__wardrobeQAWorld=pose;
    if(pose?.state==='rendered'&&pose.consumer==='world'&&pose.source&&
       !window.__wardrobeQAFrames.some(frame=>frame.source===pose.source&&frame.frame===pose.frame)){
     const {source,frame,action,direction,state}=pose;
     window.__wardrobeQAFrames.push({source,frame,action,direction,state});
    }
   }
   return result;
  };
  window.__wardrobeQA={
   seed(gender,items){
    game.appearance96={version:1,skinStyle:'natural',gender,hairStyle:'original',hairColor:'original',eyeStyle:'original',eyeColor:'original',skinColor:'original'};
    game.equipment={};game.inventory=items.map(id=>newItem(itemDefs[id],1,false));
    autoPlay=false;autoSkills=false;keys.clear();saveGame();renderPanel();updateUI();
   },
   read(){return {frames:window.__wardrobeQAFrames,hero:{x:world.hero.x,y:world.hero.y},world:window.__wardrobeQAWorld,equipment:Object.fromEntries(Object.entries(game.equipment).filter(([,v])=>v).map(([k,v])=>[k,v.def])),inventory:game.inventory.map(({id,def})=>({id,def})),screen:camera.worldToScreen(world.hero.x,world.hero.y)};},
   prepareWalk(direction){return lobby96.prepareVisual(game,{action:'walk',direction,consumer:'world'});},
   async clearLane(direction,combat=false,resetFrames=true){
    const [dx,dy]={south:[0,1],north:[0,-1],east:[1,0],west:[-1,0]}[direction].map(v=>v*(combat?65:210));
    if(resetFrames)window.__wardrobeQAFrames=[];cancelBasicAttack();if(scene!=='hunt')enterHunt();
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
     if(!combat)return;
     const target={...monsterTypes.cesar,id:'wardrobe-qa',type:'cesar',area:game.area,district:MareHunt.sectors(game.area)[0].id,level:1,alive:true,hp:100000,maxHP:100000,defense:0,magicDefense:0,x:x+dx,y:y+dy,anchorX:x+dx,anchorY:y+dy,attack:0,attackClock:1e9,speed:0,patrolClock:1e9,aggro:0,bob:0};
     world.mobs=[target];game.hp=getDerived().maxHP;
     return camera.worldToScreen(target.x,target.y);
    }
    throw Error('No clear walking lane');
   }
  };
 `;
 await route.fulfill({response,body:source.replace('  window.__mareDiagnostics=',instrumentation+'  window.__mareDiagnostics=')});
});
async function read(){return page.evaluate(()=>__wardrobeQA.read());}


const records=require('../tools/rework-modular-outfits-hd/index.json').records;
const cases=new Map();
for(const record of records){
 const {body,equipment}=record;
 if(![8,9].includes(equipment?.boots)&&![25,26].includes(equipment?.gloves))continue;
 const key=body+'-'+Object.entries(equipment).sort().map(([k,v])=>k+v).join('-');
 const entry=cases.get(key)||{key,body,equipment,records:[]};
 entry.records.push(record);cases.set(key,entry);
}
assert.equal(cases.size,10);
const directions=[['s','south'],['w','north'],['d','east'],['a','west']];
const actions=['idle','walk','attack-unarmed'];

async function observed(sources,action,direction,count=1,timeout=15000){
 return page.waitForFunction(({sources,action,direction,count})=>{
  const frames=__wardrobeQA.read().frames.filter(f=>sources.includes(f.source)&&f.direction===direction&&f.action===action);
  return new Set(frames.map(f=>f.frame)).size>=count&&frames;
 },{sources,action,direction,count},{timeout}).then(handle=>handle.jsonValue());
}
async function capture(key,action,direction){
 const {screen}=await read();
 const bounds=await page.locator('#worldCanvas').evaluate(c=>{
  const r=c.getBoundingClientRect();
  return {x:r.x,y:r.y,w:r.width,h:r.height,cw:c.width,ch:c.height};
 });
 const x=Math.round(bounds.x+screen.x*bounds.w/bounds.cw);
 const y=Math.round(bounds.y+screen.y*bounds.h/bounds.ch);
 const viewport=page.viewportSize();
 const left=Math.max(0,Math.min(x-88,viewport.width-176));
 const top=Math.max(0,Math.min(y-135,viewport.height-160));
 await page.screenshot({path:path.join(out,key+'-'+action+'-'+direction+'.png'),clip:{x:left,y:top,width:176,height:160}});
}
async function clickTarget(point){
 const canvas=page.locator('#worldCanvas'),bounds=await canvas.boundingBox();
 const size=await canvas.evaluate(c=>({width:c.width,height:c.height}));
 await canvas.click({position:{x:point.x*bounds.width/size.width,y:point.y*bounds.height/size.height}});
}
try {
 await page.goto(url,{waitUntil:'networkidle',timeout:120000});
 await page.waitForFunction(()=>!!window.__wardrobeQA,null,{timeout:60000});
 await page.locator('#characterName').fill('Traje QA');
 await page.locator('#characterName').press('Tab');
 await page.locator('#nextToClass').click();
 if(!await page.locator('#nextToAppearance').isVisible())await page.locator('#nextToClass').click({timeout:10000});
 await page.locator('#nextToAppearance').click();
 await page.locator('#createCharacter').click();
 await page.locator('[data-confirm-accept]').click();
 for(const {key,body,equipment,records} of cases.values()){
  const gender=body==='male'?'masculino':'feminino';
  await page.evaluate(({gender,items})=>__wardrobeQA.seed(gender,items),{gender,items:Object.values(equipment)});
  await page.locator('#mainMenu [data-panel=inventory]').click({timeout:60000});
  for(const {id} of (await read()).inventory){
   await page.locator('[data-item="'+id+'"]').click();
   await page.locator('[data-equip="'+id+'"]').click();
  }
  await page.locator('[data-close-panel]').click();
  const expected=Object.fromEntries(Object.entries(equipment).map(([k,v])=>[({torso:'coat',pants:'legs'})[k]||k,v]));
  assert.deepEqual((await read()).equipment,expected);
  const testCase={key,body,equipment,poses:[],failures:[]};
  evidence.push(testCase);
  for(const [keyCode,direction] of directions){
   const sources=action=>records.filter(r=>r.action===action&&r.direction===direction).map(r=>r.id);
   // Cold clips may finish loading after the hero reaches the end of the lane.
   // Repeat the same keyboard input on a fresh stretch while keeping frame evidence.
   for(let pass=0;pass<2;pass++){
    await page.evaluate(({direction,reset})=>__wardrobeQA.clearLane(direction,false,reset),{direction,reset:pass===0});
    if(pass===1)assert(await page.evaluate(d=>__wardrobeQA.prepareWalk(d),direction),'Unable to preload exact walking clip');
    const before=(await read()).hero;
    await page.keyboard.down(keyCode);
    try{
     const frames=await observed(sources('walk'),'walk',direction,2,3000);
     const after=(await read()).hero;
     const travel={south:after.y-before.y,north:before.y-after.y,east:after.x-before.x,west:before.x-after.x}[direction];
     assert(travel>5,'Expected movement in '+direction);
     testCase.poses.push({action:'walk',direction,frames,preloaded:pass===1});
     if(direction==='east')await capture(key,'walk',direction);
     break;
    }catch(error){
     if(error.name!=='TimeoutError'||pass===1){
      const {world,frames,hero}=await read();
      testCase.failures.push({action:'walk',direction,world,frames,hero,reason:error.message});
      break;
     }
    }finally{await page.keyboard.up(keyCode);}
   }
   try{
    const frames=await observed(sources('idle'),'idle',direction);
    testCase.poses.push({action:'idle',direction,frames});
    if(direction==='south')await capture(key,'idle',direction);
   }catch(error){testCase.failures.push({action:'idle',direction,world:(await read()).world,reason:error.message});}
   const target=await page.evaluate(d=>__wardrobeQA.clearLane(d,true),direction);
   await clickTarget(target);
   try{
    const frames=await observed(sources('attack-unarmed'),'attack-unarmed',direction,2);
    testCase.poses.push({action:'attack-unarmed',direction,frames});
    if(direction==='north')await capture(key,'attack',direction);
   }catch(error){testCase.failures.push({action:'attack-unarmed',direction,world:(await read()).world,reason:error.message});}
  }
  await fs.writeFile(path.join(out,'runtime.json'),JSON.stringify({evidence,errors},null,2));
  console.log(key,testCase.poses.length+'/'+(actions.length*directions.length),JSON.stringify(testCase.failures));
 }
 assert.deepEqual(errors,[]);
 assert.equal(evidence.flatMap(row=>row.failures).length,0);
}catch(error){
 await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({error:error.message,state:await read().catch(()=>null),evidence,errors},null,2));
 await page.screenshot({path:path.join(out,'failure.png')});
 throw error;
}finally{await context.close();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
