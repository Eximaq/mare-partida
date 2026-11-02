import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),E=require('../../world-battle.cjs'),D=require('../../boss-dungeon-system.js'),C=require('../../character-system.js'),maps=require('../../world-catalog.cjs').load();
function setup(id='alvida'){
 const stats={...C.derive({classId:'sword',level:10,attributes:C.empty()},E.catalog.classes.sword,E.catalog.factions.pirate,{attack:0,defense:0,hp:0}),maxHP:10000,maxEnergy:100,accuracy:1,crit:0,evasion:0,healthRegen:0,energyRegen:0};
 const b=E.create(null,stats,1000,()=>.5),hero={...maps.maps['quest-dungeons'].spawn},nav=maps.navigation('quest-dungeons');
 b.energy=42;b.cooldowns=[3,7];b.talentCooldowns={immortalUntil:90000};
 E.enterDungeon(b,id,{runId:'11111111-1111-4111-8111-111111111111',encounterId:'enemy',spawnId:'22222222-2222-4222-8222-222222222222',phase:'running'},stats,hero);
 let now=1000;const step=(dt=.05)=>E.step(b,{hero,nav,stats,baseStats:stats,classId:'sword',factionId:'pirate',level:10,build:{nodes:{},keystone:null,ultimate:null},rng:()=>.5,now:now+=dt*1000,dt});return {b,hero,stats,step};
}
test('nine dungeons use their original boss profile, spawn and persistent resources',()=>{
 for(const d of D.catalog){const f=setup(d.id),m=f.b.mobs[0],p=D.combatProfile(d.id);assert.equal(f.b.mobs.length,1);assert.equal(m.type,d.monster);assert.equal(m.hp,p.maxHP);assert.equal(m.attack,p.attack);assert.equal(m.defense,p.defense);assert.equal(m.magicDefense,p.magicDefense);assert.equal(m.x,928);assert.equal(m.y,672);assert.equal(f.hero.x,928);assert.equal(f.hero.y,1440);assert.equal(f.b.energy,42);assert.deepEqual(f.b.cooldowns,[3,7]);assert.equal(f.b.talentCooldowns.immortalUntil,90000);}
});
test('boss impact occurs once at its authored contact frame, survives JSON and cannot hit out of range',()=>{
 for(const id of D.catalog.map((d:any)=>d.id))for(const [direction,dx,dy] of [['south',0,40],['north',0,-40],['east',40,0],['west',-40,0]] as const){
  const f=setup(id),m=f.b.mobs[0];f.b.auto=false;m.attackClock=0;Object.assign(f.hero,{x:m.x+dx,y:m.y+dy});const before=f.b.hp;f.step(.05);assert(m.dungeonAttack);assert.equal(m.emberFacing,direction);assert.equal(f.b.hp,before);const at={x:m.x,y:m.y};
  f.b.mobs=JSON.parse(JSON.stringify(f.b.mobs));for(let i=0;i<30&&f.b.mobs[0].dungeonAttack;i++){f.step(.05);assert.equal(f.b.mobs[0].x,at.x);assert.equal(f.b.mobs[0].y,at.y);}assert(f.b.hp<before);assert.equal(f.b.events.filter((e:any)=>e.type==='hurt').length,1);
  f.b.mobs[0].attackClock=0;f.step(.05);assert(f.b.mobs[0].dungeonAttack);Object.assign(f.hero,{x:480,y:1440});const hp=f.b.hp;f.step(1);assert.equal(f.b.hp,hp);
 }
});
test('dungeon victory has no regional reward/respawn, and a pending chest resumes without a monster',()=>{
 const f=setup(),m=f.b.mobs[0],hunts=structuredClone(f.b.hunts);Object.assign(f.hero,{x:m.x-20,y:m.y});Object.assign(m,{hp:1,defense:0,attackClock:999});f.b.pending={targetId:m.id,remaining:0};f.b.auto=false;
 const r=f.step();assert.equal(r.kills.length,1);assert.equal(r.kills[0].dungeonId,'alvida');assert.equal(r.kills[0].reward,null);assert.deepEqual(f.b.hunts,hunts);assert.equal(f.step(1).kills.length,0);
 E.enterDungeon(f.b,'alvida',{...f.b.dungeon.record,phase:'pending'},f.stats,f.hero);assert.equal(f.b.mobs.length,0);assert.equal(f.b.auto,false);
});
test('death retries the same boss without resetting persistent steal budget or internal cooldowns',()=>{
 const f=setup(),m=f.b.mobs[0];f.b.auto=false;m.talentStolen=6;m.hp=1;f.b.hp=0;f.b.respawn=.01;f.step();assert.equal(f.b.mobs[0].id,m.id);assert.equal(f.b.mobs[0].hp,D.combatProfile('alvida').maxHP);assert.equal(f.b.mobs[0].talentStolen,6);assert.equal(f.b.talentCooldowns.immortalUntil,90000);
});
