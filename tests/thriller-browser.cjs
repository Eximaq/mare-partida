'use strict';
// Local Pages smoke test; never activates gameplay, attaches a map, or adds saves.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport}),requests=[],failures=[];
   const sprite=/\/sprites-combat-v2\/(?:absalom|perona|ryuma|oars|gecko-moria)\//;
   page.on('request',r=>{if(sprite.test(r.url()))requests.push(r.url());});
   page.on('response',r=>{if(sprite.test(r.url())&&r.status()>=400)failures.push(r.url());});
   await page.goto(process.env.MARE_TEST_URL,{waitUntil:'load'});
   await page.waitForFunction(()=>window.MareThrillerMonsters&&window.MareThrillerSpriteData&&window.MareNewIslandArt&&window.MareSpriteCombatV2);
   assert.equal(requests.length,0,'unassigned assets are loaded on demand only');
   const result=await page.evaluate(async()=>{
    const T=MareThrillerMonsters,S=MareThrillerSpriteData,R=MareSpriteCombatV2;
    if(!await Promise.all(Object.keys(S).map(id=>R.prepare(id))).then(v=>v.every(Boolean)))throw Error('Sprite decode failed');
    const canvas=document.createElement('canvas');canvas.width=480;canvas.height=330;
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
    const actors={};
    for(const [id,entry] of Object.entries(S)){
     const actor={type:id,x:240,y:276,emberFacing:'south',alive:true,hp:900};
     const p=T.combatProfile(id);
     ctx.clearRect(0,0,480,330);
     if(!MareNewIslandArt.monster(ctx,actor,0))throw Error(id+' not accepted by normal monster renderer');
     const a=ctx.getImageData(0,0,480,330).data;
     let top=330,bottom=-1;
     for(let i=3;i<a.length;i+=4)if(a[i]>=60){let y=Math.floor((i-3)/4/480);top=Math.min(top,y);bottom=Math.max(bottom,y);}
     actor.emberFacing='north';actor.moving=1;
     if(!MareNewIslandArt.monster(ctx,actor,.2))throw Error('walk failed');
     actor.moving=0;actor.attackAnim=.2;
     if(!MareNewIslandArt.monster(ctx,actor,.3))throw Error('attack failed');
     actor.attackAnim=0;R.hurt(actor,1,.4);
     if(!MareNewIslandArt.monster(ctx,actor,.42))throw Error('hurt failed');
     actors[id]={height:bottom-top+1,bottom,target:entry.worldHeight,level:p.level,xp:p.xp,nominal:p.nominalXP??null};
    }
    return actors;
   });
   assert.equal(new Set(requests).size,80);assert.deepEqual(failures,[]);
   for(const actor of Object.values(result)){
    assert(Math.abs(actor.height-actor.target)<=4,JSON.stringify(actor));
    assert(Math.abs(actor.bottom-279)<=4,JSON.stringify(actor));
    assert.equal(actor.xp,0);
   }
   assert.deepEqual(Object.values(result).map(p=>[p.level,p.nominal]),[[114,26000],[118,28000],[122,30000],[127,32600],[110,null]]);
   console.log(JSON.stringify({viewport,result,resources:new Set(requests).size}));
   await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
