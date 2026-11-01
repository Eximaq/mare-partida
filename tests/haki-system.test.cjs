'use strict';
const assert=require('node:assert/strict');
const H=require('../haki-system.js');
const A=require('../achievement-system.js');
const P=H.progression;const defs=[H.book,...P.fragments];
const base=()=>H.migrate({level:50,hp:100,inventory:[{id:'book',def:0}],stats:{},equipment:{}});
let g=base(),rt=H.start();
assert.equal(g.has_haki_unlocked,false);assert.equal(H.unlock({...g,level:49},'book',defs).ok,false);
assert.equal(H.unlock({...g,inventory:[{id:'book',def:0,locked:true}]},'book',defs).ok,false);
let result=H.unlock(g,'book',defs);assert(result.ok);assert.equal(g.inventory.length,1);
g=result.state;assert.equal(g.inventory.length,0);assert.equal(g.haki.current,100);assert.equal(H.unlock(g,'book',defs).ok,false);
assert.deepEqual(H.migrate(H.migrate(g)),H.migrate(g));
assert.equal(H.configure(g,'armament',true),null);
for(const b of P.ids){g=P.addFragments(g,b,100,defs,d=>({id:'test-'+b,def:defs.indexOf(d)}));for(const n of P.branches[b])for(let i=0;i<n.max;i++){const r=P.invest(g,n.id,g.haki.mastery.seq,defs,()=>true);assert(r.ok,r.message);g=r.state;}}
g=H.configure(g,'armament',true);assert.equal(H.configure(g,'conqueror',true),null);
H.touch(g,rt);assert.equal(rt.active,'armament');
const stats={defense:100,penetration:.10,evasion:.10,accuracy:.75};
assert.equal(H.stats(stats,g,rt).penetration,.25);assert(Math.abs(H.stats(stats,g,rt).defense-110)<1e-8);
H.tick(g,rt,2);assert.equal(g.haki.current,90);H.touch(g,rt);H.tick(g,rt,6);assert.equal(g.haki.current,60);assert.equal(rt.active,null);assert.equal(rt.inCombat,false);
H.tick(g,rt,2);assert.equal(g.haki.current,70);
g=H.configure(g,'observation',true);assert.equal(g.haki.auto,'observation');H.touch(g,rt);assert.equal(rt.active,'observation');assert.equal(H.stats(stats,g,rt).evasion,.25);assert.equal(H.stats(stats,g,rt).accuracy,.90);
g.haki.current=1;H.tick(g,rt,1);assert.equal(g.haki.current,0);assert.equal(rt.active,null);H.touch(g,rt);assert.equal(rt.active,null);H.tick(g,rt,6);H.tick(g,rt,20);assert.equal(g.haki.current,100);
H.touch(g,rt);assert.equal(rt.active,'observation');H.stop(rt);assert.equal(rt.active,null);
assert(H.toggle(g,rt,'armament').ok);assert.equal(rt.active,'armament');H.touch(g,rt);assert.equal(rt.active,'armament');assert(H.toggle(g,rt,'observation').ok);assert.equal(rt.active,'observation');assert(H.toggle(g,rt,'observation').ok);assert.equal(rt.active,null);
assert(!H.toggle(g,rt,'armament',{inHunt:false}).ok);
const foes=[{id:1,type:'bandit',x:20,y:0,alive:true},{id:2,type:'boss',x:30,y:0,alive:true},{id:3,type:'bandit',x:400,y:0,alive:true},{id:4,type:'bandit',x:10,y:0,alive:true}];
result=H.cast(g,rt,{x:0,y:0},foes,{clear:(a,b)=>b.id!==4});assert(result.ok);assert.equal(result.targets,2);assert.equal(g.haki.current,50);assert.equal(foes[0].talentControl.remaining,3);assert.equal(foes[1].talentControl,undefined);assert.equal(foes[1].hakiDebuff,8);assert.equal(foes[2].talentControl,undefined);assert.equal(foes[3].talentControl,undefined);
assert(!H.cast(g,rt,{x:0,y:0},[]).ok);assert.equal(g.haki.current,50);assert(H.cooldown(g)>0);const resumed=H.migrate(g);assert.equal(resumed.haki.kingReadyAt,g.haki.kingReadyAt);assert(H.cast(g,rt,{x:0,y:0},[],{now:g.haki.kingReadyAt}).ok);assert.equal(g.haki.current,0);assert(!H.cast(g,rt,{x:0,y:0},[]).ok);
g.haki.current=49;assert(!H.cast(g,rt,{x:0,y:0},[]).ok);assert.equal(g.haki.current,49);
assert(H.drop({type:'boss',source:'world',level:30},()=>.049999));assert(!H.drop({type:'boss',source:'world',level:30},()=>.05));
for(const m of [{type:'bandit',source:'world',level:50},{type:'boss',source:'world',level:29},{type:'boss',source:'prison',level:50},{type:'boss',source:'world'}])assert(!H.drop(m,()=>0));
assert(H.drop({boss:true,source:'daily',level:40},()=>0));
let earned=g;for(const id of H.ids)earned=A.record(earned,'hakiUnlocked',id);
assert.equal(A.list(earned).filter(a=>a.category==='haki'&&a.ready).length,3);
assert(!A.list(earned).find(a=>a.metric==='hakiMastery').ready);
for(const bad of [NaN,Infinity,-100,200]){const clean=H.migrate({...g,haki:{current:bad,auto:'conqueror'}});assert(clean.haki.current>=0&&clean.haki.current<=100);assert.equal(clean.haki.auto,null);}
// Frame partitioning does not alter drain or the six-second combat timeout.
const a=H.migrate(g),b=H.migrate(g),ar=H.start(),br=H.start();a.haki.current=b.haki.current=100;H.touch(a,ar);H.touch(b,br);H.toggle(a,ar,'armament');H.toggle(b,br,'armament');H.tick(a,ar,8);for(let i=0;i<160;i++)H.tick(b,br,.05);assert(Math.abs(a.haki.current-b.haki.current)<1e-7);
console.log('Haki: unlock, idempotent migration, exclusivity, first-hit auto, drain, exhaustion, rest, stats, king AoE/LOS, costs, drop boundaries, achievements, frame partition passed');

const manual=H.migrate(g),mr=H.start();manual.haki.current=100;H.toggle(manual,mr,'armament');H.tick(manual,mr,30);assert.equal(manual.haki.current,50);assert.equal(mr.exhausted,false);H.touch(manual,mr);assert.equal(mr.active,manual.haki.auto);
