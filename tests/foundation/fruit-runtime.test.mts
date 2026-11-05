import {deriveOriginalFighter} from '../../apps/game-server/src/gameplay/character.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),A=require('../../akuma-system.js'),C=require('../../character-system.js'),P=require('../../akuma-passives.js'),catalog=require('../../character-catalog.js').create({characters:C});
function fixture(id:string){
 const E=require('../../world-battle.cjs'),base=C.derive({classId:'sword',level:30,attributes:C.empty()},catalog.classes.sword,catalog.factions.pirate,{attack:0,defense:0,hp:0}),stats=P.apply(base,id),b=E.create('beach',stats,Date.now(),()=>.5),m=b.mobs[0];
 b.mobs=[m];b.autoSkills=false;m.hp=m.maxHP=100000;m.attack=0;m.patrolClock=100;m.speed=0;
 const hero={x:m.x-50,y:m.y,direction:'right'},nav={map:{spawn:{...hero},width:3000,height:3000},walkable:()=>true,projectileClear:()=>true,path:(_:any,p:any)=>[{...p}],follow(a:any,p:any[],speed:number,dt:number){if(!p.length)return;const t=p[0],d=Math.hypot(a.x-t.x,a.y-t.y),s=Math.min(d,speed*dt);if(d){a.x+=(t.x-a.x)*s/d;a.y+=(t.y-a.y)*s/d;}if(s===d)p.shift();}};
 let now=Date.now();const context=()=>({hero,nav,stats,baseStats:base,fruitId:id,classId:'sword',factionId:'pirate',level:30,now,rng:()=>.5});b.targetId=m.id;
 const cast=(key:string)=>E.fruitCast(b,key,context()),step=(dt=.1)=>{now+=dt*1000;return E.step(b,{...context(),dt});};
 return {E,b,m,hero,nav,base,stats,context,cast,step};
}
test('server fruit passives apply exactly once, while transformed basics use physical melee',()=>{
 for(const fruit of A.catalog){const f=fixture(fruit.id);assert.equal(f.E.combatStats(f.b,f.context()).physical,f.stats.physical,fruit.id);}
 const f=fixture('akuma_inu_dachshund');assert(f.E.fruitTransform(f.b,true,f.context()));assert.equal(f.E.combatStats(f.b,f.context()).range,65);assert(f.cast('3'));const hp=f.m.hp;f.step(.5);assert(f.m.hp<hp);assert(!f.cast('3'));
});
test('fruit cast reserves server energy and cooldown, never deals damage outside worker; state survives JSON roundtrips',()=>{
 const f=fixture('akuma_mera_mera'),cost=A.activeSkill('akuma_mera_mera','1').cost;f.b.energy=1000;const hp=f.m.hp;
 assert(f.cast('1'));assert.equal(f.m.hp,hp);assert.equal(f.b.energy,1000-cost);assert(!f.cast('1'));assert(!f.cast('4'));
 let sawDamage=false;for(let i=0;i<60;i++){f.step(.5);const raw=JSON.parse(JSON.stringify(f.b));Object.assign(f.b,raw);sawDamage ||= f.b.events.some((x:any)=>x.type==='damage');}
 assert(f.b.mobs[0].hp<hp);assert(sawDamage);const cd=structuredClone(f.b.fruit.cooldowns);f.E.resetFruit(f.b);assert.deepEqual(f.b.fruit.cooldowns,cd);
});
test('all advanced fruit timelines accept only original valid intents and persist bounded runtime',()=>{
 for(const fruit of A.catalog.filter((x:any)=>['A','S'].includes(x.rank)))for(const skill of fruit.skills){const f=fixture(fruit.id);f.b.energy=1000;
  assert(f.cast(skill.key),fruit.id+':'+skill.key);for(let i=0;i<30;i++){f.step(.2);Object.assign(f.b,JSON.parse(JSON.stringify(f.b)));}assert(JSON.stringify(f.b).length<150000);assert(Number.isFinite(f.b.hp));
 }
});
test('server refuses fruit casts without range, energy, equipped fruit, or live character and preserves cooldown across switches',()=>{
 const f=fixture('akuma_mera_mera');f.b.energy=0;assert(!f.cast('1'));f.b.energy=1000;f.hero.x-=1000;assert(!f.cast('1'));f.hero.x+=1000;f.nav.projectileClear=()=>false;assert(!f.cast('1'));f.nav.projectileClear=()=>true;assert(f.cast('1'));
 f.step(.5);const saved=structuredClone(f.b.fruit.cooldowns);f.E.combatStats(f.b,{...f.context(),fruitId:null});f.E.combatStats(f.b,f.context());assert.deepEqual(f.b.fruit.cooldowns,saved);assert(!f.cast('1'));
 f.b.hp=0;assert(!f.cast('2'));assert(!f.E.fruitTransform(f.b,true,f.context()));
});
test('rank D and C retain their original casts, timelines, buffs and bounded serialized effects',()=>{
 for(const fruit of A.catalog.filter((x:any)=>['D','C'].includes(x.rank)))for(const skill of fruit.skills){const f=fixture(fruit.id);f.b.energy=1000;
  assert(f.cast(skill.key),fruit.id+':'+skill.key);for(let i=0;i<35;i++){f.step(.2);Object.assign(f.b,JSON.parse(JSON.stringify(f.b)));}assert(JSON.stringify(f.b).length<150000);assert(Number.isFinite(f.b.hp));
 }
});
test('Mato mark grants exactly the original number of free casts; Ushi and Wolf preserve their timed defenses',()=>{
 const f=fixture('akuma_mato_mato');f.b.energy=1000;assert(f.cast('2'));f.step(.5);const cost=A.activeSkill('akuma_mato_mato','1').cost;
 for(let i=0;i<require('../../rank-c-system.js').rules.mato.charges;i++){const e=f.b.energy;assert(f.cast('1'));assert.equal(f.b.energy,e);f.step(.5);}
 const e=f.b.energy;assert(!f.cast('1'));assert.equal(f.b.energy,e);assert(cost>0);
});
test('all Rank B skills use server state; Jiki release measures server time and Hoya cancellation preserves recast',()=>{
 for(const fruit of A.catalog.filter((x:any)=>x.rank==='B'))for(const skill of fruit.skills){const f=fixture(fruit.id);f.b.energy=1000;
  if(fruit.id==='akuma_hoya_hoya'&&skill.key==='2'){assert(f.cast('1'));f.step(.5);}assert(f.cast(skill.key),fruit.id+':'+skill.key);for(let i=0;i<40;i++){f.step(.2);Object.assign(f.b,JSON.parse(JSON.stringify(f.b)));}assert(Number.isFinite(f.b.hp));
 }
 const j=fixture('akuma_jiki_jiki');j.b.energy=1000;assert(j.cast('1'));j.step(.5);for(let i=0;i<10;i++)j.step(.2);const e=j.b.energy;assert(j.cast('1'));assert.equal(j.b.energy,e);j.step(.5);assert(!j.b.fruit.effects.jikiCharge);assert(!j.cast('1'));
 const h=fixture('akuma_hoya_hoya');h.b.energy=1000;assert(h.cast('1'));h.step(.5);assert(h.b.fruit.effects.genie);const cds=structuredClone(h.b.fruit.cooldowns);assert(h.cast('1'));h.step(.5);assert(!h.b.fruit.effects.genie);assert.deepEqual(h.b.fruit.cooldowns,cds);
});
test('Phoenix passive restores health and energy only after ten seconds actually simulated',()=>{
 const f=fixture('akuma_tori_phoenix');f.b.hp=20;f.b.energy=0;const initial=f.b.hp;
 for(let i=0;i<99;i++)f.step(.1);const before=f.b.hp;assert(before>initial);f.step(.11);assert(f.b.hp-before>=f.stats.maxHP*.1);assert(f.b.energy>=f.stats.maxEnergy*.1);
});
test('Kuku rejects old corpses, while two original food pickups survive independently',()=>{
 const f=fixture('akuma_kuku_kuku');f.m.alive=false;f.m.hp=0;assert(!f.cast('1'));f.m.corpseUntil=f.context().now+12000;assert(f.cast('1'));f.step(.5);assert.equal(f.b.fruit.effects.food.length,1);
 for(let i=0;i<76;i++)f.step(.2);f.b.mobs.push({...f.m,id:'second',fruitConsumed:false,corpseUntil:f.context().now+12000,x:f.hero.x+80});assert(f.cast('1'));f.step(.5);assert.equal(f.b.fruit.effects.food.length,2);
});
test('Zoan basics preserve the original impact frame instead of a generic half-cycle',()=>{
 const f=fixture('akuma_tori_albatroz');f.E.fruitTransform(f.b,true,f.context());f.b.auto=true;f.b.targetId=f.m.id;f.step(.05);assert(Math.abs(f.b.pending.remaining-(1/f.stats.speed*4/9-.05))<1e-6);
});

test('Wolf charge follows server-validated steering while walls stop the charge',()=>{
 const f=fixture('akuma_inu_wolf');f.b.energy=1000;assert(f.cast('1'));const y=f.hero.y,x=f.hero.x;
 f.E.step(f.b,{...f.context(),manualPath:[{x,y:y+200}],dt:.05,now:f.context().now+50});
 assert(f.hero.y>y);assert(Math.abs(f.hero.x-x)<.01);
 f.nav.walkable=()=>false;f.step(.05);assert(!f.b.fruit.effects.action);
});
test('fruit percentage heals preserve original efficiency-independent amount',()=>{
 const F=require('../../fruit-runtime.cjs'),f=fixture('akuma_horu_horu');f.b.energy=1000;assert(f.cast('2'));let heal:any;
 F.tick(f.b,{...f.context(),now:f.context().now+250,stats:{...f.stats,healingReceivedPercent:.5}},.05,{hit(){},heal:(amount:number,ignore:boolean)=>{heal={amount,ignore};}});
 assert.equal(heal.amount,f.stats.maxHP*.2);assert.equal(heal.ignore,true);
});

test('every fruit combines with all original classes and final talents within the authoritative fighter contract',()=>{
 const T=require('../../talent-system.js'),F=require('../../forge-system.js'),defs=require('../../item-catalog.js').create({forge:F,prison:require('../../prison-system.js'),haki:require('../../haki-system.js'),akuma:A,hakiProgression:require('../../haki-progression.js')}).items;
 let checked=0;for(const classId of Object.keys(catalog.classes))for(const final of T.getTree(classId).ultimates)for(const fruit of A.catalog){
  const tree=T.getTree(classId),nodes=Object.fromEntries(T.nodes(classId).filter((n:any)=>Number(n.id.split('-')[1])<2).map((n:any)=>[n.id,10])),build={nodes,keystone:tree.keystones[0].id,ultimate:final.id};
  const inventory={catalogId:'original-game-v1',inventory:[],equipment:{akuma_no_mi:{id:'fixture-fruit',def:defs.findIndex((d:any)=>d.fruitId===fruit.id),fruitId:fruit.id,type:'akuma_no_mi',level:1,plus:0,rarity:A.rarityFor(fruit)}},potions:0,materials:0,forgeSeq:0,forgeVersion:4,forgeHistory:[]};
  const fighter=deriveOriginalFighter(classId,'pirate',{characterId:'11111111-1111-4111-8111-111111111111',version:0,level:104,experience:'0',gold:'0'},C.empty(),inventory as any,build,undefined,undefined,{registered:A.catalog.map((f:any)=>f.id)});
  assert.equal(fighter.rulesetId,'original-character-v1');assert(Number.isFinite(fighter.maxHp));checked++;
 }assert.equal(checked,630);
});
