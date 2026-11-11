'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../rank-s-system.js');
// Regression: the old scheduler drops the last scheduled Phoenix event when a
// substep crosses job.until. Exercise real cast/step, not a copied scheduler.
function setup(key,{start=0,x=100,area=true}={}){
 const state=S.create(),hero={x:0,y:0,direction:'east'},target={id:1,x,y:0,hp:100000,alive:true},hits=[],heals=[];
 const c={fruit:'akuma_tori_phoenix',key:String(key),now:start,hero,target,enemies:[target],stats:{physical:100,elemental:100,magicPen:0},clear:()=>true,damage:(_m,p,m)=>p*m,
 hit(m,n,event){hits.push({n,key:event.eventKey,now:c.now});m.hp-=n;},
 move(){throw Error('Phoenix must not move actors');}};
 if(area)c.healArea=(origin,radius,ratio)=>heals.push({origin:{...origin},radius,ratio,received:Math.hypot(hero.x-origin.x,hero.y-origin.y)<=radius});
 else c.heal=ratio=>heals.push({ratio,received:true});
 assert(S.cast(state,c));
 return {state,c,hero,target,hits,heals,step(now){c.now=now;S.step(state,c);},advance(pattern,end=8){let now=start,i=0;while(now<start+end){now=Math.min(start+end,now+pattern[i++%pattern.length]);this.step(now);}}};
}
const patterns=[['17ms',[.017]],['33ms',[.033]],['16ms',[.016]],['60Hz',[1/60]],['30Hz',[1/30]],['70ms',[.07]],['130ms',[.13]],['250ms',[.25]],['irregular',[.017,.033,.006,.049,.2,.011]],['resume 8s',[8]]];
for(const [name,pattern]of patterns){
 test(`Energy retains five unique hits across the final boundary: ${name}`,()=>{const q=setup(3);q.advance(pattern);assert.deepEqual(q.hits.map(h=>h.key),['energy:1','energy:2','energy:3','energy:4','energy:5']);assert(Math.abs(q.hits.reduce((n,h)=>n+h.n,0)-550)<1e-9);assert(Math.abs(q.target.rankSHealDebuffUntil-6.2)<1e-7,'five-second debuff uses the logical final boundary');assert.equal(q.state.jobs.length,0);assert.deepEqual(q.hero,{x:0,y:0,direction:'east'});});
 test(`Totem retains seven pulses across the final boundary: ${name}`,()=>{const q=setup(2);q.advance(pattern);assert.equal(q.heals.length,7);assert(q.heals.every(h=>h.radius===320&&h.ratio===.15&&h.received));assert(q.heals.every(h=>h.origin.x===0&&h.origin.y===0));assert.equal(q.state.jobs.length,0);});
}
test('No early fifth hit or antiheal; no duplicate after repeated/late steps',()=>{const q=setup(3);q.step(1.19);assert.equal(q.hits.length,4);assert.equal(q.target.rankSHealDebuffUntil,undefined);q.step(1.207);assert.equal(q.hits.length,5);for(const t of [1.207,1.207,1.3,5,9,30])q.step(t);assert.equal(q.hits.length,5);assert(Math.abs(q.target.rankSHealDebuffUntil-6.2)<1e-7);});
test('No early seventh pulse or duplicate after expiration',()=>{const q=setup(2);q.step(6.99);assert.equal(q.heals.length,6);q.step(7.007);assert.equal(q.heals.length,7);for(const t of [7.007,7.1,8,30])q.step(t);assert.equal(q.heals.length,7);});
test('Nonzero cast origin preserves final event and logical debuff deadline',()=>{const q=setup(3,{start:123.456});q.advance([.017,.033]);assert.equal(q.hits.length,5);assert(Math.abs(q.target.rankSHealDebuffUntil-129.656)<1e-7);const h=setup(2,{start:123.456});h.advance([.033]);assert.equal(h.heals.length,7);});
test('Target killed before the final tick receives no phantom hit or debuff',()=>{const q=setup(3);q.step(1.19);q.target.alive=false;q.step(1.207);assert.equal(q.hits.length,4);assert.equal(q.target.rankSHealDebuffUntil,undefined);assert.equal(q.state.jobs.length,0);});
test('Target removed before the final tick receives no phantom hit',()=>{const q=setup(3);q.step(1.19);q.c.enemies=[];q.step(1.207);assert.equal(q.hits.length,4);assert.equal(q.target.rankSHealDebuffUntil,undefined);});
test('Final-tick invulnerability still prevents damage and antiheal',()=>{const q=setup(3);q.step(1.19);q.target.isInvulnerable=true;q.step(1.207);assert.equal(q.hits.length,4);assert.equal(q.target.rankSHealDebuffUntil,undefined);});
test('Leaving fixed totem radius before last tick prevents its receipt',()=>{const q=setup(2);q.step(6.99);q.hero.x=321;q.step(7.007);assert.equal(q.heals.length,7);assert.equal(q.heals.filter(h=>h.received).length,6);assert.deepEqual(q.heals[6].origin,{x:0,y:0});});
test('Fallback heal callback receives last tick only within the radius',()=>{const q=setup(2,{area:false});q.advance([.017]);assert.equal(q.heals.length,7);const outside=setup(2,{area:false});outside.step(6.99);outside.hero.x=321;outside.step(7.007);assert.equal(outside.heals.length,6);});
test('Clearing/canceling state does not resurrect the pending last event',()=>{for(const key of [2,3]){const q=setup(key);q.step(key===2?6.99:1.19);const before=q.hits.length+q.heals.length;S.clear(q.state,[q.target]);q.step(10);q.step(11);assert.equal(q.hits.length+q.heals.length,before);assert.equal(q.target.rankSHealDebuffUntil,undefined);}});
test('Long pause does not extend final antiheal to resume time',()=>{const q=setup(3);q.step(30);assert.equal(q.hits.length,5);assert(Math.abs(q.target.rankSHealDebuffUntil-6.2)<1e-7);assert(q.target.rankSHealDebuffUntil<q.c.now);});
