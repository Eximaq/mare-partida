import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{createWorldPresentation}=require('../../apps/account-client/game-ui.js');
const world=(x:number,patch:any={})=>({mapId:'lobby',position:{x,y:0},path:[],speed:100,direction:'right',serverNow:'2026-01-01T00:00:00Z',motionUntil:'2026-01-01T00:01:00Z',...patch});
test('late walking acknowledgements never accelerate to erase presentation lag',()=>{
 const p=createWorldPresentation({walk:true});p.update(world(0),0);
 p.update(world(50,{path:[{x:500,y:0}]}),500);
 let prior=p.sample(500);
 for(let t=520;t<=2000;t+=20){const next=p.sample(t);assert.ok(Math.hypot(next.x-prior.x,next.y-prior.y)<=2.000001,'rendered walking is capped at approved 100px/s');prior=next;}
 assert.ok(prior.x>140&&prior.x<151);assert.equal(p.sample(2000).x,prior.x,'same frame is not advanced twice');
});
test('a distant same-map update is walked to, while map changes and explicit respawns reset',()=>{
 const p=createWorldPresentation({walk:true});p.update(world(0),0);assert.equal(p.update(world(800),750),false);
 assert.equal(p.sample(750).x,0,'long distance is not permission to teleport');
 assert.ok(p.sample(770).x<=2.000001);
 p.update(world(900,{mapId:'dawn'}),800);assert.equal(p.sample(800).x,900);
 p.update(world(50,{mapId:'dawn'}),900,{reset:true});assert.equal(p.sample(900).x,50);
});
test('walking follows the collision route and cannot cut the corner or run beyond the lease',()=>{
 const p=createWorldPresentation({walk:true,route:()=>[{x:0,y:50},{x:50,y:50}]});p.update(world(0),0);
 const next=world(50,{position:{x:50,y:50},path:[{x:150,y:50}],motionUntil:'2026-01-01T00:00:00.500Z'}),copy=structuredClone(next);
 p.update(next,100);
 for(let t=120;t<=3500;t+=20){const v=p.sample(t);assert.ok(v.x===0||Math.abs(v.y-50)<1e-7,'stay on collision route');}
 assert.deepEqual({x:p.sample(3500).x,y:p.sample(3500).y},{x:100,y:50});assert.deepEqual(next,copy);
});
test('frequent combat snapshots and a delayed frame cannot create a speed burst',()=>{
 const p=createWorldPresentation({walk:true});p.update(world(0),0,{buffered:true});let prior=p.sample(0),x=0;
 for(let t=20;t<=4000;t+=20){if(t%200===0){x+=20;p.update(world(x),t,{buffered:true});}const v=p.sample(t);assert.ok(v.x-prior.x<=2.000001);prior=v;}
 const late=p.sample(9000);assert.ok(late.x-prior.x<=10.000001,'paused rendering resumes with a bounded step');
});

test('100ms realtime combat uses a short bounded buffer without changing walking speed',()=>{
 const p=createWorldPresentation({walk:true});const options={buffered:true,realtime:true};p.update(world(0),0,options);let prior=p.sample(0);
 for(let t=20;t<=3000;t+=20){
  if(t%100===0)p.update(world(t/10),t,options);
  const next=p.sample(t);assert.ok(next.x-prior.x<=2.000001,'never speed up to catch up');prior=next;
  if(t>1000)assert.ok(t/10-next.x<=25,'do not retain the 400/900ms polling buffer on a 100ms stream');
 }
 for(let t=3020;t<=4000;t+=20)p.sample(t);
 assert.equal(p.sample(4000).x,300,'lost updates stop at the last authoritative point');
});
