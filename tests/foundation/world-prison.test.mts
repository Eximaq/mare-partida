import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),E=require('../../world-battle.cjs'),P=require('../../prison-system.js'),C=require('../../character-system.js'),M=E.prisonCatalog,maps=require('../../world-catalog.cjs').load();
function setup(floor=1){
 const stats={...C.derive({classId:'sword',level:1,attributes:C.empty()},E.catalog.classes.sword,E.catalog.factions.pirate,{attack:0,defense:0,hp:0}),maxHP:1000,maxEnergy:100,accuracy:1,crit:0,evasion:0,healthRegen:0,energyRegen:0};
 const b=E.create(null,stats,1000,()=>0),spec=P.rollEncounter(floor,M,()=>0),hero={...maps.maps['impel-down'].spawn},nav=maps.navigation('impel-down');
 b.cooldowns=[7,9];b.talentCooldowns={immortalUntil:90000};b.energy=42;E.enterPrison(b,spec,stats,hero);
 let now=1000;const step=(dt=.05)=>E.step(b,{hero,nav,stats,baseStats:stats,classId:'sword',factionId:'pirate',level:1,build:{nodes:{},keystone:null,ultimate:null},rng:()=>0,now:now+=dt*1000,dt});
 return {b,spec,hero,stats,step};
}
test('prison uses exactly one original scaled monster and preserves energy, cooldowns and regional hunts',()=>{
 for(const floor of [1,5,50,100]){const f=setup(floor),m=f.b.mobs[0];assert.equal(f.b.mobs.length,1);assert.equal(m.hp,f.spec.hp);assert.equal(m.attack,f.spec.atk);assert.equal(m.defense,f.spec.def);assert.equal(f.b.area,'impel-down');assert.equal(f.b.energy,42);assert.deepEqual(f.b.cooldowns,[7,9]);assert.equal(f.b.talentCooldowns.immortalUntil,90000);assert.equal(m.type,f.spec.type);assert.equal(!!m.prisonElite,floor%5===0);}
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


test('the duel catalog preserves official enemies and omits all retired identities',()=>{
 assert.equal(Object.keys(E.prisonCatalog).length,28);
 for(const id of ['crab','bandit','spirit','boss'])assert.equal(E.prisonCatalog[id],undefined);
 assert.equal(P.resolveEncounter({floor:1,type:'crab',token:'impel-1-crab-1'},M).type,'cesar');
 assert(P.resolveEncounter({floor:5,type:'boss',token:'impel-5-boss-1'},M).prisonElite);
});
