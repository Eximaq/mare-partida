import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{createWorldPresentation}=require('../../apps/account-client/game-ui.js');
const world=(patch:any={})=>({mapId:'lobby',position:{x:0,y:0},path:[],speed:100,direction:'right',serverNow:'2026-01-01T00:00:00Z',motionUntil:'2026-01-01T00:00:03Z',...patch});

test('a new key faces its collision-checked route in the input frame',()=>{
 const p=createWorldPresentation({walk:true});p.update(world(),0);
 p.predict({x:0,y:-100},0);assert.equal(p.sample(80).direction,'back');
 p.predict({x:-100,y:-8},80);
 assert.equal(p.sample(80).direction,'left','face the new route immediately, without waiting for a displacement frame');
 assert.equal(p.sample(80).moving,true,'a continuous turn must not insert an idle frame');
 assert.equal(p.sample(100).direction,'left');
});

test('W A S D W confirmation continues the current intent instead of walking sideways to an older segment',()=>{
 const p=createWorldPresentation({walk:true});p.update(world({position:{x:100,y:100}}),0);
 let ticket:any;for(const [t,x,y] of [[0,100,-150],[80,-150,92],[160,92,342],[240,342,100],[320,100,-150]]){
  ticket=p.predict({x,y},t);for(let at=t+20;at<=t+80;at+=20)p.sample(at);
 }
 const acknowledged=world({position:{x:90,y:110},path:[{x:100,y:-150}],direction:'front'});
 p.update(acknowledged,400);p.settle(ticket,400);
 const before=p.sample(400),after=p.sample(420);
 assert.equal(before.direction,'back','acknowledgement must not flash the pre-turn server facing');
 assert.equal(before.moving,true,'acknowledging a continuous route must not reset the walking animation');
 assert.ok(after.y<before.y,'accepted northward intent must keep advancing north');
 assert.equal(after.x,before.x,'do not insert lateral correction before the intended route');
 assert.equal(after.direction,'back');
 p.update({...acknowledged,position:{x:91,y:80}},440);
 assert.equal(p.sample(460).x,100,'the following poll must not restore the old lateral bridge');
});

test('confirmed intent continuation respects blocked shortcuts and the movement lease',()=>{
 let blocked=false;
 const p=createWorldPresentation({walk:true,route:(_from:any,to:any)=>blocked&&to.y===-100?[]:[{...to}]});
 p.update(world(),0);const ticket=p.predict({x:0,y:-100},0);p.sample(100);blocked=true;
 p.update(world({position:{x:10,y:0},path:[{x:0,y:-100}]}),100);p.settle(ticket,100);
 assert.ok(p.sample(120).x>0,'a blocked shortcut must use the collision-checked bridge instead');
 const q=createWorldPresentation({walk:true});q.update(world(),0);const intent=q.predict({x:0,y:-100},0);q.sample(100);
 q.update(world({position:{x:10,y:0},path:[{x:0,y:-100}],motionUntil:'2026-01-01T00:00:00.200Z'}),100);q.settle(intent,100);
 for(let t=120;t<=1000;t+=20)q.sample(t);
 assert.equal(q.sample(1000).y,-30,'a direct continuation does not add travel beyond the confirmed lease');
});

test('a stopped authoritative correction preserves facing without animating a reverse walk',()=>{
 for(const [dx,dy,direction] of [[1,0,'right'],[-1,0,'left'],[0,-1,'back'],[0,1,'front']] as const){
  const p=createWorldPresentation({walk:true});p.update(world({direction}),0);
  p.predict({x:dx*100,y:dy*100},0);for(let t=20;t<=100;t+=20)p.sample(t);
  const stop=p.predict(null,100,{stop:true});
  const authoritative=world({direction,position:{x:dx*8,y:dy*8}}),copy=structuredClone(authoritative);
  p.update(authoritative,150);p.settle(stop,150);
  for(let t=160;t<=250;t+=10){const pose=p.sample(t);assert.equal(pose.direction,direction);assert.equal(pose.moving,false,'position reconciliation is not a walking command');}
  assert.equal(p.sample(250).x,dx*8);assert.equal(p.sample(250).y,dy*8);assert.deepEqual(authoritative,copy);
 }
});
test('local intent moves before acknowledgement without changing the authoritative snapshot',()=>{
 const p=createWorldPresentation({walk:true}),w=world(),copy=structuredClone(w);p.update(w,0);
 assert.equal(typeof p.predict,'function');
 const ticket=p.predict({x:100,y:0},0);assert.ok(ticket);
 assert.equal(p.sample(20).x,2);assert.deepEqual(w,copy);
 p.update(world({path:[{x:100,y:0}]}),100);
 assert.equal(p.sample(100).x,10,'an older poll cannot erase an unacknowledged input');
 p.settle(ticket,100);
 assert.equal(p.sample(120).x,12,'acknowledgement joins the predicted path without walking backward');
});
test('the latest click survives an older command acknowledgement and reconciles rejection',()=>{
 const p=createWorldPresentation({walk:true});p.update(world(),0);assert.equal(typeof p.predict,'function');
 const a=p.predict({x:100,y:0},0);p.sample(100);
 const b=p.predict({x:-100,y:0},100);p.update(world({path:[{x:100,y:0}]}),150);p.settle(a,150);
 assert.equal(p.sample(160).x,4,'newest intent responds before its network slot');
 p.update(world(),200);p.settle(b,200);for(let t=220;t<=1000;t+=20)p.sample(t);
 assert.equal(p.sample(1000).x,0,'rejected intent returns to the authoritative position');
});
test('prediction follows collision paths and has a bounded lifetime even under click spam',()=>{
 const p=createWorldPresentation({walk:true,route:()=>[{x:0,y:20},{x:200,y:20}]});p.update(world(),0);assert.equal(typeof p.predict,'function');
 p.predict({x:200,y:20},0);assert.deepEqual(p.sample(100),{x:0,y:10,direction:'front',moving:true});
 const blocked=createWorldPresentation({walk:true,route:()=>[]});blocked.update(world(),0);
 assert.equal(blocked.predict({x:100,y:0},0),null);assert.equal(blocked.sample(100).x,0);
 const stalled=createWorldPresentation({walk:true});stalled.update(world(),0);stalled.predict({x:10000,y:0},0);
 let maximum=0;
 for(let t=20;t<=1600;t+=20){if(t%100===0)stalled.predict({x:10000,y:0},t);maximum=Math.max(maximum,stalled.sample(t).x);}
 assert.ok(maximum<=75.00001,'new clicks do not extend an unconfirmed prediction indefinitely');
 assert.equal(stalled.sample(1600).x,0,'timeout reconciles safely instead of continuing offline');
});
test('loss of control, map changes and respawns discard predicted movement',()=>{
 const p=createWorldPresentation({walk:true});p.update(world(),0);assert.equal(typeof p.predict,'function');
 p.predict({x:100,y:0},0);p.sample(100);p.cancel(100);for(let t=120;t<=240;t+=20)p.sample(t);
 assert.equal(p.sample(240).x,0);
 const old=p.predict({x:100,y:0},300);p.update(world({mapId:'dawn',position:{x:500,y:400}}),320);p.settle(old,340);
 assert.deepEqual(p.sample(340),{x:500,y:400,direction:'right',moving:false});
 p.predict({x:600,y:400},400);p.sample(420);p.update(world({mapId:'dawn',position:{x:200,y:200}}),440,{reset:true});
 assert.equal(p.sample(460).x,200);
});
test('acknowledged earlier inputs keep a rapid stream responsive but an unacknowledged stream times out',()=>{
 const p=createWorldPresentation({walk:true});p.update(world(),0);
 let previous=p.predict({x:1000,y:0},0),latest=previous;
 for(let t=20;t<=1000;t+=20){
  if(t%200===0){latest=p.predict({x:1000,y:0},t);p.update(world({position:{x:t/10-10,y:0},path:[{x:1000,y:0}]}),t);p.settle(previous,t);previous=latest;}
  p.sample(t);
 }
 assert.ok(p.sample(1000).x>99,'successful acknowledgements must not cause a periodic stop during continuous clicking');
 let peakY=0;
 // Only the eastward path was confirmed. Subsequent northward clicks have no ack.
 for(let t=1020;t<=2000;t+=20){if(t%100===0)p.predict({x:100,y:1000},t);peakY=Math.max(peakY,p.sample(t).y);}
 assert.ok(peakY>20&&peakY<=75.00001,'unconfirmed displacement is bounded while the approved path remains valid');
});
