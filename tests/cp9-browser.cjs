'use strict';
// Verification only: synthetic actors are drawn on detached canvases, never spawned.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const URL=process.env.MARE_TEST_URL;
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport}),requests=[],failures=[];
  page.on('request',r=>{if(/\/sprites-combat-v2\/(?:fukurou|kalifa|blueno|jabra|rob-lucci|kaku)(?:-zoan)?\//.test(r.url()))requests.push(r.url());});
  page.on('response',r=>{if(r.status()>=400&&requests.includes(r.url()))failures.push(r.url());});
  await page.goto(URL,{waitUntil:'load'});
  await page.waitForFunction(()=>window.MareCp9Monsters&&window.MareNewIslandArt&&window.MareSpriteCombatV2);
  assert.equal(requests.length,0,'unassigned assets must not preload in the running game');
  const result=await page.evaluate(async()=>{
   const R=MareSpriteCombatV2,C=MareCp9Monsters,S=MareCp9SpriteData;
   if(!await Promise.all(Object.keys(S).map(k=>R.prepare(k))).then(v=>v.every(Boolean)))throw Error('Failed to decode a CP9 resource');
   const canvas=document.createElement('canvas');canvas.width=320;canvas.height=220;
   const ctx=canvas.getContext('2d');
   const measure=()=>{
    const p=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let top=220,bottom=-1,amount=0;
    for(let i=3;i<p.length;i+=4)if(p[i]>=32){const y=Math.floor((i-3)/4/320);top=Math.min(top,y);bottom=Math.max(bottom,y);amount++;}
    return {top,bottom,height:bottom-top+1,amount};
   };
   const sizes=Object.fromEntries(Object.entries(S).map(([k,e])=>{
    ctx.clearRect(0,0,320,220);
    if(!R.draw(ctx,k,160,180,{direction:'south',height:R.monsterHeight(k),time:0}))throw Error('Could not render '+k);
    return [k,{...measure(),target:e.worldHeight}];
   }));
   const flow={};
   for(const k of Object.keys(C.catalog).filter(k=>C.catalog[k].hybridSprite)){
    const actor={type:k,x:160,y:180,emberFacing:'north',alive:true,hp:900,engaged:true};
    const r=(time,m=actor)=>{ctx.clearRect(0,0,320,220);if(!MareNewIslandArt.monster(ctx,m,time))throw Error('Not integrated in normal monster renderer');return measure();};
    const base=r(1);
    R.hurt(actor,25,2);const hurt=r(2.08),hybrid=r(2.19);
    actor.attackAnim=.2;const attack=r(2.22);
    actor.attackAnim=0;actor.engaged=false;const reset=r(2.3),control=r(2.3,{...actor});
    flow[k]={base,hurt,hybrid,attack,reset,control};
   }
   return {sizes,flow};
  });
  assert.equal(new Set(requests).size,132);assert.deepEqual(failures,[]);
  for(const s of Object.values(result.sizes)){assert(s.amount>1000);assert(Math.abs(s.height-s.target)<=2,JSON.stringify(s));assert(Math.abs(s.bottom-180)<=2,JSON.stringify(s));}
  for(const f of Object.values(result.flow)){assert(f.hurt.amount>1000&&f.attack.amount>1000);assert(f.hybrid.height>f.base.height);assert.deepEqual(f.reset,f.control);}
  console.log(JSON.stringify({viewport,resources:new Set(requests).size,sizes:result.sizes,hybridActors:Object.keys(result.flow)}));
  await page.close();
 }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
