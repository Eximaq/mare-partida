import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createWorldPresentation,worldPosition}=require('../../apps/account-client/game-ui.js');
const world=(x=0,patch={})=>({mapId:'lobby',position:{x,y:100},path:[{x:x+400,y:100}],speed:100,direction:'right',serverNow:'2026-01-01T00:00:00Z',motionUntil:'2026-01-01T00:00:04Z',...patch});
test('presentation preserves continuity on delayed snapshots and converges without changing authority',()=>{
 assert.equal(typeof createWorldPresentation,'function');
 const p=createWorldPresentation(),a=world(),b=world(70),copy=structuredClone(b);
 p.update(a,0);assert.equal(p.sample(400).x,40);
 p.update(b,400);assert.equal(p.sample(400).x,40);
 assert.equal(p.sample(600).x,worldPosition(b,200).x);
 assert.deepEqual(b,copy);
});
test('stop correction is continuous, bounded and expires; path is never extrapolated past its lease',()=>{
 assert.equal(typeof createWorldPresentation,'function');
 const p=createWorldPresentation();p.update(world(),0);
 p.update(world(25,{path:[]}),500);assert.equal(p.sample(500).x,50);
 assert.ok(p.sample(600).x>=25&&p.sample(600).x<=50);
 assert.equal(p.sample(700).x,25);assert.equal(p.sample(700).moving,false);
 p.update(world(25),800);assert.equal(p.sample(10000).x,425);
});
test('map changes and large discontinuities snap; repeated snapshots do not restart motion',()=>{
 assert.equal(typeof createWorldPresentation,'function');
 const p=createWorldPresentation(),a=world();p.update(a,0);p.update(a,100);
 assert.equal(p.sample(200).x,20);
 p.update(world(500,{mapId:'island'}),200);assert.equal(p.sample(200).x,500);
 p.update(world(1000,{mapId:'island'}),300);assert.equal(p.sample(300).x,1000);
});
test('a peer starting between polls is smoothed even when its first observed progress exceeds 128 pixels',()=>{
 const p=createWorldPresentation();p.update(world(0,{path:[],speed:250}),0);
 p.update(world(150,{speed:250}),750);
 assert.equal(p.sample(750).x,0);
 assert.equal(p.sample(950).x,200);
});
test('combat samples keep moving across the polling interval instead of stopping after 200 ms',()=>{
 const p=createWorldPresentation(),idle=(x:number)=>world(x,{path:[]}),options={buffered:true};
 p.update(idle(0),0,options);const next=idle(75),copy=structuredClone(next);p.update(next,750,options);
 assert.equal(p.sample(750).x,0);
 assert.ok(p.sample(1250).x>p.sample(1050).x,'movement continues in the middle of a 750ms snapshot interval');
 assert.ok(p.sample(1450).x<75,'do not rush to the endpoint then freeze');
 assert.equal(p.sample(2000).x,75,'packet loss settles at the last authorized point');
 assert.deepEqual(next,copy);
});
test('buffered combat handles jitter and a stop, while manual movement retains short correction',()=>{
 const p=createWorldPresentation(),idle=(x:number)=>world(x,{path:[]});
 p.update(idle(0),0,{buffered:true});p.update(idle(80),800,{buffered:true});
 const before=p.sample(1500);p.update(idle(145),1500,{buffered:true});assert.ok(Math.abs(p.sample(1500).x-before.x)<1e-9);
 p.update(idle(145),2400,{buffered:true});assert.equal(p.sample(4000).x,145);
 p.update(idle(160),4100);assert.equal(p.sample(4300).x,160);
});

test('a repeated combat position preserves the pace of the current interpolation',()=>{
 const idle=(x:number)=>world(x,{path:[]}),options={buffered:true};
 for(const walk of [false,true]){
  const regular=createWorldPresentation({walk}),repeated=createWorldPresentation({walk});
  for(const p of [regular,repeated]){
   p.update(idle(0),0,options);
   p.update(idle(75),750,options);
  }
  for(let t=760;t<=1600;t+=10){
   if(t===850)repeated.update(idle(75),t,options);
   assert.equal(repeated.sample(t).x,regular.sample(t).x,`duplicate changed the pace at ${t}ms (walk=${walk})`);
  }
  assert.equal(repeated.sample(2000).x,75);
 }
});

test('combat interpolation still advances across the observed 865ms gap',()=>{
 const idle=(x:number)=>world(x,{path:[]}),options={buffered:true};
 for(const walk of [false,true]){
  const p=createWorldPresentation({walk});
  p.update(idle(0),0,options);
  p.update(idle(75),750,options);
  let earlier;
  for(let t=760;t<=1610;t+=10){
   const {x}=p.sample(t);
   if(t===1600)earlier=x;
   if(t===1610)assert(x>earlier!&&x<75,`combat paused before the next frame (walk=${walk})`);
  }
 }
});
