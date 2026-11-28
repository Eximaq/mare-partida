'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../boss-dungeon-system.js'),C=require('../character-system.js'),E=require('../world-battle.cjs');
const CP9=require('../cp9-monsters.js'),timing=require('../dungeon-timing.cjs');
const maps=require('../world-catalog.cjs').load();
const encounters=[['rob-lucci',100,138274,4154,2835,1053],['gecko-moria',110,161606,4573,3114,1161]];
function setup(id){
 const stats={...C.derive({classId:'sword',level:110,attributes:C.empty()},E.catalog.classes.sword,E.catalog.factions.pirate,{attack:0,defense:0,hp:0}),maxHP:1e8,maxEnergy:100,accuracy:1,crit:0,evasion:0,healthRegen:0,vitalityHealthRegen:0,vitalityRegenRate:0,energyRegen:0};
 const b=E.create(null,stats,1000,()=>.5),hero={...maps.maps['quest-dungeons'].spawn},nav=maps.navigation('quest-dungeons');
 E.enterDungeon(b,id,{runId:'11111111-1111-4111-8111-111111111111',encounterId:'enemy',spawnId:'22222222-2222-4222-8222-222222222222',phase:'running'},stats,hero);
 let now=1000;const step=(dt=.05)=>E.step(b,{hero,nav,stats,baseStats:stats,classId:'sword',factionId:'pirate',level:110,build:{nodes:{},keystone:null,ultimate:null},rng:()=>.5,now:now+=dt*1000,dt});
 return {b,hero,stats,step};
}
test('Enies CP9 are available for world encounters without entering the Impel Down random pool',()=>{
 for(const [id,level,xp] of [['fukurou',97,19100],['kalifa',101,20800],['jabra',104,21900],['blueno',107,23000],['kaku',110,24100]]){
  assert(E.worldMonsterCatalog[id],id+' is assigned');
  assert.equal(E.worldMonsterCatalog[id].level,level);
  assert.equal(E.worldMonsterCatalog[id].xp,xp);
  assert(!E.prisonCatalog[id],id+' is world-only');
 }
 for(const id of ['absalom','perona','ryuma','oars']){
  assert(E.worldMonsterCatalog[id].worldOnly,id+' is assigned to its own world region');
  assert(!E.prisonCatalog[id],id+' remains outside Impel Down');
 }
});
test('Lucci and Moria require their level and retain a pending victory with the configured chest',()=>{
 for(const [id,level,hp,attack,defense,magicDefense] of encounters){
  assert(D.byId[id],id+' is assigned');
  assert(!E.prisonCatalog['dungeon-'+id],id+' is not added to the prison pool');
  const save={characterId:'enies-player',level:level-1,inventory:[],gold:0,stats:{goldEarned:100},bossDungeons:{version:D.VERSION,seq:0,records:{},reveal:null}};
  assert.equal(D.status(save,id),'locked');assert.equal(D.begin(save,id,'run',1000).ok,false);
  save.level=level;const begun=D.begin(save,id,'run',1000);assert(begun.ok);
  const p=D.combatProfile(id);assert.deepEqual([p.maxHP,p.attack,p.defense,p.magicDefense],[hp,attack,defense,magicDefense]);
  const result=D.defeat(begun.state,id,{runId:'run',encounterId:'run:enemy'},()=>1000,2000);assert(result.ok);assert.deepEqual(result.record.reward.items[0],{itemId:'epic-equipment-box',quantity:1,equipmentLevel:level});assert.equal(result.record.reward.items.length,id==='gecko-moria'?2:1);
  const reloaded=JSON.parse(JSON.stringify(result.state));assert.equal(D.status(reloaded,id),'pending');assert.equal(D.begin(reloaded,id,'unused',3000).resume,true);
  let committed=false;const claim=D.claim(reloaded,id,{runId:'run',position:{x:0,y:0},chest:{x:0,y:0,radius:10},defs:[],applyXP(){throw Error('No reward expected');},commit(){committed=true;return true;}});
  assert.equal(claim.ok,false);assert.equal(committed,false);assert.equal(reloaded.gold,0);
 }
});
test('both new bosses hit once from authored clips after JSON resume and preserve victory identity',()=>{
 for(const [id] of encounters){
  assert(D.byId[id],id+' is assigned');
  const f=setup(id),m=f.b.mobs[0];assert.equal(m.type,'dungeon-'+id);f.b.auto=false;m.attackClock=0;
  Object.assign(f.hero,{x:m.x+40,y:m.y});const hp=f.b.hp;f.step();assert(m.dungeonAttack);assert.equal(f.b.hp,hp);
  assert.equal(timing[m.type].east.impact_frame,2);
  f.b.mobs=JSON.parse(JSON.stringify(f.b.mobs));for(let i=0;i<30&&f.b.mobs[0].dungeonAttack;i++)f.step();
  assert.equal(f.b.events.filter(e=>e.type==='hurt').length,1);assert(f.b.hp<hp);
  const enemy=f.b.mobs[0],hunts=structuredClone(f.b.hunts);Object.assign(enemy,{hp:1,defense:0,attackClock:999});Object.assign(f.hero,{x:enemy.x-20,y:enemy.y});f.b.pending={targetId:enemy.id,remaining:0};
  const result=f.step();assert.equal(result.kills.length,1);assert.equal(result.kills[0].dungeonId,id);assert.equal(result.kills[0].reward,null);assert.deepEqual(f.b.hunts,hunts);assert.equal(f.step().kills.length,0);
  E.enterDungeon(f.b,id,{...f.b.dungeon.record,phase:'pending'},f.stats,f.hero);assert.equal(f.b.mobs.length,0);assert.equal(f.b.auto,false);
 }
});
test('CP9 transformation survives a serialized actor and resets after disengaging',()=>{
 for(const type of ['jabra','kaku','dungeon-rob-lucci']){
  const actor={type,hp:500,alive:true,engaged:true};assert.equal(CP9.recordHit(actor,1),true);
  const human=type.replace(/^dungeon-/,'');assert.equal(CP9.form(actor,1.1,.18),human);
  const restored=JSON.parse(JSON.stringify(actor));assert.equal(CP9.form(restored,40,.18),human+'-zoan');
  restored.engaged=false;assert.equal(CP9.form(restored,41,.18),human);assert.equal(restored.cp9Transformed,undefined);
 }
});
