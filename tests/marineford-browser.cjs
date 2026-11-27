'use strict';
// Browser smoke for the production entry point, using a detached canvas only.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport}),requests=[],failed=[];
   const relevant=/\/sprites-combat-v2\/(?:izo|jozu|little-oars-jr|onigumo|squard|vista)\//;
   page.on('request',r=>{if(relevant.test(r.url()))requests.push(r.url());});
   page.on('response',r=>{if(relevant.test(r.url())&&r.status()>=400)failed.push(r.url());});
   await page.goto(process.env.MARE_TEST_URL,{waitUntil:'load'});
   await page.waitForFunction(()=>window.MareMarinefordMonsters&&window.MareMarinefordSpriteData&&window.MareNewIslandArt&&window.MareSpriteCombatV2);
   assert.equal(requests.length,0,'Detached sprites must not load on world startup');
   const result=await page.evaluate(async()=>{
    const C=MareMarinefordMonsters,S=MareMarinefordSpriteData,R=MareSpriteCombatV2,A=MareNewIslandArt;
    if(!await Promise.all(Object.keys(S).map(id=>R.prepare(id))).then(v=>v.every(Boolean)))throw Error('Sprite decode failed');
    const canvas=document.createElement('canvas');canvas.width=480;canvas.height=360;
    const ctx=canvas.getContext('2d'),out={};
    function draw(m,t){
     ctx.clearRect(0,0,480,360);
     if(!A.monster(ctx,m,t))throw Error('Missing draw '+m.type);
     const rgba=ctx.getImageData(0,0,480,360).data;let top=360,bottom=-1,count=0;
     for(let i=3;i<rgba.length;i+=4)if(rgba[i]>=60){
      let y=Math.floor((i-3)/4/480);top=Math.min(top,y);bottom=Math.max(bottom,y);count++;
     }
     return [bottom-top+1,bottom,count];
    }
    for(const [id,entry] of Object.entries(S)){
     const m={type:id,x:240,y:282,hp:900,alive:true,engaged:true,emberFacing:'south'};
     const sizes=draw(m,0),counts=[];
     for(const [i,d] of ['south','north','east','west'].entries()){
      const t=i+1;m.emberFacing=d;
      m.moving=.5;counts.push(draw(m,t)[2]);m.moving=0;
      m.attackAnim=.2;counts.push(draw(m,t+.25)[2]);m.attackAnim=0;
      R.hurt(m,50,t+.5);counts.push(draw(m,t+.56)[2]);
     }
     const p=C.combatProfile(id);
     out[id]={sizes,target:entry.worldHeight,counts,level:p.level,xp:p.xp,nominal:p.nominalXP};
    }
    return out;
   });
   assert.equal(new Set(requests).size,96);assert.deepEqual(failed,[]);
   for(const {sizes:[h,foot,pixels],target,counts,xp} of Object.values(result)){
    assert(Math.abs(h-target)<=5,JSON.stringify({h,target}));assert(Math.abs(foot-285)<=4);assert(pixels>1000);
    assert(counts.every(n=>n>1000));assert.equal(xp,0);
   }
   assert.deepEqual(Object.fromEntries(Object.entries(result).map(([id,p])=>[id,[p.level,p.nominal]])),
    {squard:[151,46900],onigumo:[156,50200],jozu:[176,64700],vista:[171,60900],izo:[166,57200],'little-oars-jr':[161,53600]});
   console.log(JSON.stringify({viewport,resources:new Set(requests).size,result}));
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
