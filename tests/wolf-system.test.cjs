'use strict';
const assert=require('node:assert/strict'),A=require('../akuma-system.js');
assert.ok(A.byId('akuma_inu_wolf'),'Wolf must append to the playable catalog');
const W=require('../wolf-system.js');
assert.deepEqual(W.rules,require('../assets/akuma/wolf/rules.json'));
assert.equal(A.slotsForRank({akumaCompendium:['akuma_inu_wolf']},'D')[4].fruit.id,'akuma_inu_wolf');
for(const [time,want]of [[0,0],[.25,3],[.75,3],[1,6]])assert.equal(W.frameIndex('charge',time),want);
for(const [time,want]of [[0,9],[1/12,10],[2/12,11],[3/12,12],[1,12]])assert.equal(W.frameIndex('finish',time),want);
const bleed={nextTick:1,started:10};assert.deepEqual(W.dueTicks(bleed,10.999),[]);assert.deepEqual(W.dueTicks(bleed,11),[1]);assert.deepEqual(W.dueTicks(bleed,15),[2,3,4,5]);assert.deepEqual(W.dueTicks(bleed,16),[]);
assert.equal(W.damage(100,0,1)+5*W.damage(100,0,.2),200);
assert.equal(W.leech(100,true),10);assert.equal(W.leech(100,false),0);
assert.equal(W.cycle(2),.5);assert.equal(W.cycle(2*1.3),1/2.6);
assert.equal(W.auraActive({equipped:W.rules.id,transformed:true,hp:1,until:6000},5999),true);
assert.equal(W.auraActive({equipped:W.rules.id,transformed:true,hp:1,until:6000},6000),false);
assert.equal(W.auraActive({equipped:W.rules.id,transformed:false,hp:1,until:6000},1),false);
// The aura follows the same feet anchor in every direction, vertically extended behind the shoulders, with its base held at the feet.
global.Image=class {constructor(){this.complete=true;this.naturalWidth=1024;}addEventListener(){}};
const calls=[],ctx={save(){},restore(){},drawImage(...args){calls.push(args)}};
assert.equal(W.drawEffect(ctx,'aura',100,200,800),true);
assert.equal(calls[0][6],Math.round(200+1.6-64*2.3));
assert.equal(calls[0][5],Math.round(100-32*1.8));
assert.equal(calls[0][7],Math.round(64*1.8));
assert.equal(calls[0][8],Math.round(64*2.3));
assert.ok(Math.abs(calls[0][6]+calls[0][8]-202)<=1,'Aura base stays at the feet');
for(const kind of ['aura','bleed']){
 const source=require('../assets/akuma/wolf/'+(kind==='aura'?'firelight-take-2':'firelight-take-4')+'.json');
 assert.deepEqual(W.effects[kind].frames,source.frames.map(f=>({...f.frame,duration:f.duration})));
 assert.deepEqual(W.effects[kind].anchor,source.meta.anchor);
}
for(const action of ['idle','attack','charge','finish','walk'])for(const direction of ['front','back','left','right']){
 for(let i=0;i<30;i++)assert.equal(W.drawActor(ctx,100,200,{action,direction,time:i/12,scale:W.visuals.worldScale}),true);
}
const particleStart=calls.length;
assert.equal(W.drawAuraParticles(ctx,100,200,800),true);
assert.equal(calls.length-particleStart,3);
for(const call of calls.slice(particleStart)){
 assert.ok(call[7]<=24&&call[8]<=24,'Front particles stay small');
 assert.ok(call[6]>=110,'Keep the face unobscured');
}
delete global.Image;
const WN=require('../neko-system.js');assert.equal(WN.segmentHit({x:0,y:0},{x:100,y:0},{x:60,y:0},24),true);
console.log('Wolf: append-only Rank D, charge/finish frame ranges, five independent bleed ticks, attack-speed interval and lifesteal expiry passed');
