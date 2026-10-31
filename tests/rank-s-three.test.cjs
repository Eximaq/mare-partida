'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../akuma-system.js');const S=globalThis.MareRankS,A=globalThis.MareAkuma;
function sim(id,key,x=60){const m={id:1,x,y:0,hp:100000,alive:true,defense:50},hero={x:0,y:0,direction:'right'},hits=[],s=S.create(),c={fruit:id,key,now:0,hero,target:m,enemies:[m],stats:{physical:100,elemental:100},clear:()=>true,move(e,dx,dy){e.x+=dx;e.y+=dy;return Math.hypot(dx,dy)},damage:(e,p,m)=>p*m,hit(e,n){hits.push(n);e.hp-=n},heal(r){c.healed=(c.healed||0)+r}};return {m,hero,hits,s,c,cast(){return S.cast(s,c)},step(t){c.now=t;S.step(s,c)}}}
test('three fruits register distinct families, icons and required sheets',()=>{for(const [name,family] of [['gura','paramecia'],['hie','logia'],['phoenix','zoan']]){const f=A.byId(S.rules[name].id);assert.equal(f.family,family);assert.equal(f.skills.length,3);for(const k of S.rules[name].effectKeys)assert(require('node:fs').existsSync(require('node:path').join(__dirname,'..',S.effects[k].image)));}});
test('Gura cone, stun and defensive buff',()=>{const q=sim(S.rules.gura.id,'1',200);assert(q.cast());q.step(.7);assert.equal(q.hits[0],450);assert(q.m.rankAStunUntil>2);const b=sim(S.rules.gura.id,'3');assert(b.cast());assert.equal(b.s.jobs[0].duration,10)});
test('Hie spear slow, bird, freeze and shatter state',()=>{const q=sim(S.rules.hie.id,'1',100);assert(q.cast());q.step(.7);assert.equal(q.hits[0],420);assert(q.m.rankSIceSlowUntil>0);const b=sim(S.rules.hie.id,'2',100);assert(b.cast());b.step(.7);assert.equal(b.hits[0],450);const f=sim(S.rules.hie.id,'3',60);assert(f.cast());f.step(.1);assert.equal(f.m.rankSFreezePower,600);f.step(5);assert.equal(f.m.rankSFreezeUntil,0);assert(f.m.rankSIceHeavyAttackUntil>5)});
test('Phoenix dive, totem and energy use distinct timelines',()=>{const d=sim(S.rules.phoenix.id,'1',100);assert(d.cast());d.step(.5);assert.equal(d.hero.x,0);assert.equal(d.hero.y,0);assert.equal(d.hits[0],400);const t=sim(S.rules.phoenix.id,'2');assert(t.cast());t.step(7);assert.equal(Math.round(t.c.healed*100),105);const e=sim(S.rules.phoenix.id,'3');assert(e.cast());e.step(1.2);assert.equal(e.hits.length,5);assert.equal(Math.round(e.hits.reduce((a,b)=>a+b,0)),550)});

test('target vectors and full tile coverage for area effects',()=>{
 for(const [dx,dy] of [[100,0],[-100,0],[0,100],[0,-100],[80,80],[-80,80],[80,-80],[-80,-80]]){
  const q=sim(S.rules.phoenix.id,'1',dx);q.m.y=dy;assert(q.cast());const vector=q.s.jobs[0].direction;assert(Math.abs(vector[0]-dx/Math.hypot(dx,dy))<1e-9);assert(Math.abs(vector[1]-dy/Math.hypot(dx,dy))<1e-9);
 }
 assert.equal(S.areaTiles(5).length,81);assert.equal(S.areaTiles(3).length,29);
 const q=sim(S.rules.gura.id,'2');q.c.target=null;assert(q.cast());q.step(.4);assert.equal(q.hits.length,1);
});
