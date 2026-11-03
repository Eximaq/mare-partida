import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),E=require('../../world-battle.cjs'),P=require('../../prison-system.js'),C=require('../../character-system.js'),M={crab:{name:'Carapaça',hp:45,atk:7,def:3,reach:43,speed:42,attackSec:2.15},boss:{name:'Guardião',hp:350,atk:17,def:10,reach:56,speed:33,attackSec:2.45}},maps=require('../../world-catalog.cjs').load();
function setup(floor=1){
 const stats={...C.derive({classId:'sword',level:1,attributes:C.empty()},E.catalog.classes.sword,E.catalog.factions.pirate,{attack:0,defense:0,hp:0}),maxHP:1000,maxEnergy:100,accuracy:1,crit:0,evasion:0,healthRegen:0,energyRegen:0};
 const b=E.create(null,stats,1000,()=>0),spec=P.rollEncounter(floor,M,()=>0),hero={...maps.maps['impel-down'].spawn},nav=maps.navigation('impel-down');
 b.cooldowns=[7,9];b.talentCooldowns={immortalUntil:90000};b.energy=42;E.enterPrison(b,spec,stats,hero);
 let now=1000;const step=(dt=.05)=>E.step(b,{hero,nav,stats,baseStats:stats,classId:'sword',factionId:'pirate',level:1,build:{nodes:{},keystone:null,ultimate:null},rng:()=>0,now:now+=dt*1000,dt});
 return {b,spec,hero,stats,step};
}
test('prison uses exactly one original scaled monster and preserves energy, cooldowns and regional hunts',()=>{
 for(const floor of [1,5,50,100]){const f=setup(floor),m=f.b.mobs[0];assert.equal(f.b.mobs.length,1);assert.equal(m.hp,f.spec.hp);assert.equal(m.attack,f.spec.atk);assert.equal(m.defense,f.spec.def);assert.equal(f.b.area,'impel-down');assert.equal(f.b.energy,42);assert.deepEqual(f.b.cooldowns,[7,9]);assert.equal(f.b.talentCooldowns.immortalUntil,90000);assert.equal(m.type,floor%5===0?'boss':f.spec.type);}
});
test('prison enemy approaches without provocation and remains aggressive beyond ordinary leash',()=>{
 const f=setup(),x=f.b.mobs[0].x;f.b.auto=false;f.step(1);assert(f.b.mobs[0].x<x);assert(f.b.mobs[0].engaged);assert(!f.b.mobs[0].returning);f.step(1);assert(f.b.mobs[0].x<x);
});
test('prison victory produces a single domain event with no regional rewards or respawns',()=>{
 const f=setup(),m=f.b.mobs[0],hunts=structuredClone(f.b.hunts);Object.assign(f.hero,{x:m.x-20,y:m.y});Object.assign(m,{hp:1,defense:0,attackClock:999});f.b.pending={targetId:m.id,remaining:0};f.b.auto=false;
 const r=f.step();assert.equal(r.kills.length,1);assert.equal(r.kills[0].prisonFloor,1);assert.equal(r.kills[0].reward,null);assert.deepEqual(f.b.hunts,hunts);assert.equal(f.step(1).kills.length,0);assert.equal(f.b.mobs.length,1);
});
test('prison respawn restores the same encounter and server spawn without rerolling or changing cooldowns',()=>{
 const f=setup(),id=f.b.mobs[0].id;f.b.auto=false;f.b.hp=0;f.b.respawn=.01;f.b.mobs[0].hp=1;f.step();assert.equal(f.b.hp,f.stats.maxHP);assert.equal(f.b.mobs[0].hp,f.spec.hp);assert.equal(f.b.mobs[0].id,id);assert.equal(f.hero.x,maps.maps['impel-down'].spawn.x);assert.equal(f.hero.y,maps.maps['impel-down'].spawn.y);assert.equal(f.b.talentCooldowns.immortalUntil,90000);
});


test('shared duel catalog preserves all 31 original enemy definitions byte-for-byte',()=>{
 const {createHash}=require('node:crypto'),original=Object.fromEntries(Object.entries(E.prisonCatalog).filter(([id])=>id!=='satori'));assert.equal(Object.keys(E.prisonCatalog).length,32);assert.equal(Object.keys(original).length,31);assert.equal(createHash('sha256').update(JSON.stringify(original)).digest('hex'),'8400c8d1722d5e8bdbee35e50e897c979149e6a6957b0c3b646f7e5f6dc99bca');
});
