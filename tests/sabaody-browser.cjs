'use strict';
// Static-client verification. The actors below never appear in a world or save.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport}),requests=[],failures=[];
   const sprite=/\/sprites-combat-v2\/(?:kuma|kizaru|pacifista|urouge|urouge-ampliado|hawkins|hawkins-palha|x-drake|x-drake-zoan)\//;
   page.on('request',r=>{if(sprite.test(r.url()))requests.push(r.url());});
   page.on('response',r=>{if(sprite.test(r.url())&&r.status()>=400)failures.push(r.url());});
   await page.goto(process.env.MARE_TEST_URL,{waitUntil:'load'});
   await page.waitForFunction(()=>window.MareSabaodyMonsters&&window.MareSabaodySpriteData&&window.MareNewIslandArt&&window.MareSpriteCombatV2);
   assert.equal(requests.length,0,'unassigned art must not preload');
   const result=await page.evaluate(async()=>{
    const C=MareSabaodyMonsters,S=MareSabaodySpriteData,R=MareSpriteCombatV2,A=MareNewIslandArt;
    if(!await Promise.all(Object.keys(S).map(id=>R.prepare(id))).then(v=>v.every(Boolean)))throw Error('Sprite decode failed');
    const canvas=document.createElement('canvas');canvas.width=420;canvas.height=340;
    const ctx=canvas.getContext('2d');
    function measured(read){
     ctx.clearRect(0,0,420,340);if(!read())throw Error('Missing render');
     const rgba=ctx.getImageData(0,0,420,340).data;let top=340,bottom=-1,count=0;
     for(let i=3;i<rgba.length;i+=4)if(rgba[i]>=60){
      let y=Math.floor((i-3)/4/420);top=Math.min(top,y);bottom=Math.max(bottom,y);count++;
     }
     return [bottom-top+1,bottom,count];
    }
    const sizes={};
    for(const [key,entry] of Object.entries(S)){
     sizes[key]=[...measured(()=>R.draw(ctx,key,210,285,{height:R.monsterHeight(key),direction:'south'})),entry.worldHeight];
    }
    const actor=id=>({type:id,x:210,y:282,hp:900,alive:true,engaged:true,emberFacing:'north'});
    const m=actor('x-drake'),draw=(m,t)=>measured(()=>A.monster(ctx,m,t));
    const start=draw(m,1);
    R.hurt(m,30,2);const hurt=draw(m,2.06),transformed=draw(m,2.19);
    m.attackAnim=.2;const attack=draw(m,2.22);
    m.attackAnim=0;m.engaged=false;const reset=draw(m,2.3),control=draw(actor('x-drake'),2.3);
    const alternatives={};
    for(const k of ['urouge','hawkins']){
     const x=actor(k),before=draw(x,1);
     if(!C.setPreparedForm(x,true))throw Error('Selector rejected '+k);
     const after=draw(x,1);alternatives[k]=[before[0],after[0]];
    }
    return {sizes,start,hurt,transformed,attack,reset,control,alternatives,
     profiles:Object.keys(C.catalog).map(k=>{const p=C.combatProfile(k);return [p.level,p.xp,p.nominalXP??null];})};
   });
   assert.equal(new Set(requests).size,144);assert.deepEqual(failures,[]);
   for(const [h,foot,pixels,target] of Object.values(result.sizes)){
    assert(Math.abs(h-target)<=7,JSON.stringify({h,target}));assert(Math.abs(foot-285)<=5);assert(pixels>1000);
   }
   assert(result.hurt[2]>1000&&result.attack[2]>1000);
   assert(result.transformed[0]>result.start[0]+20);
   assert.deepEqual(result.reset,result.control);
   for(const [a,b] of Object.values(result.alternatives))assert(b>a+15);
   assert.deepEqual(result.profiles,[[110,0,null],[120,0,null],[131,0,34800],[136,0,37600],[141,0,40600],[146,0,43700]]);
   console.log(JSON.stringify({viewport,resources:new Set(requests).size,result}));
   await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
