'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),C=require('../combat-animation');
const {make,cv}=require('./rework-integration-support.cjs');
test('four sword and orb profiles visually sample actual contact without changing controller impact cooldown or unlock',async()=>{
 const world=make();await world.ready;
 for(const item of [67,70,17,122]){console.log('clock start',item,Math.round(process.memoryUsage().rss/1048576));
  const p={classId:[17,122].includes(item)?'strategist':'sword',appearance96:{gender:'male',hairStyle:'original',hairColor:'brown',eyeStyle:'original',eyeColor:'brown',skinColor:'light'},equipment:{weapon:{def:item},...([17,122].includes(item)?{coat:{def:151}}:{})}},o={action:[17,122].includes(item)?'attack-focus':'attack-sword',direction:'east',consumer:'world'},bundle=await world.prepareConfiguration([{player:p,options:o}]),ctx=cv.createCanvas(1,1).getContext('2d');
  assert.equal(bundle.coverage[0].source,([17,122].includes(item)?`authored-orb-${item}-east-coat-151`:`authored-ordered-${item}-east`));assert.deepEqual(bundle.coverage[0].omitted,[]);
  for(const h of [.3,.5,.7]){const timing=Object.freeze({locked:true,duration:1.2,hitFrameRatio:h}),before=JSON.stringify(timing);assert(bundle.draw(ctx,p,{...o,progress:h,timing}));assert.equal(world.snapshot().last.frame,4);assert.equal(JSON.stringify(timing),before);}
  for(const speed of [.5,1,1.2,1.5,2,4]){
   let ia=0,ib=0;const clips={attack:{frames:4,fps:8,impact_frame:2,loop:false}},a=C.create(clips),b=C.create(clips);a.play('attack',{direction:'east',attackSpeed:speed,onImpact:()=>ia++});b.play('attack',{direction:'east',attackSpeed:speed,onImpact:()=>ib++});const initial=a.snapshot(),seen=new Set();
   // Present/read back each simulated frame: prevent an unbounded native Canvas command queue.
   for(let i=0;i<80;i++){const timing=Object.freeze(a.snapshot()),before=JSON.stringify(timing);ctx.clearRect(0,0,1,1);assert(bundle.draw(ctx,p,{...o,progress:timing.progress,time:timing.elapsed,timing}));ctx.getImageData(0,0,1,1);seen.add(world.snapshot().last.frame);assert.equal(JSON.stringify(timing),before);a.step(initial.duration/80);b.step(initial.duration/80);assert.deepEqual(a.snapshot(),b.snapshot());assert.equal(ia,ib);}
   assert.equal(ia,1);assert(!a.locked());assert.equal(seen.size,8);
  }bundle.release();console.log('clock complete',item,Math.round(process.memoryUsage().rss/1048576));
 }
});
