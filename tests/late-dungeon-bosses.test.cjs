'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('../boss-dungeon-system.js'),C=require('../character-system.js'),E=require('../world-battle.cjs');
const timing=require('../dungeon-timing.cjs'),maps=require('../world-catalog.cjs').load();
const encounters=[['kuma',120],['kizaru',130],['hancock',140],['magellan',150],['ace',160],['aokiji',170],['akainu',180]];

test('seven later dungeons enforce their requested levels and persist the configured rewards and reject a missing item definition',()=>{
 for(const [id,level] of encounters){
  const d=D.byId[id];assert(d,id+' is available in the dungeon catalog');
  assert.equal(d.level,level);assert.equal(d.monster,'dungeon-'+id);
  assert(E.worldMonsterCatalog[d.monster]);assert(!E.prisonCatalog[d.monster],id+' remains outside Impel Down');
  assert(fs.existsSync(path.join(__dirname,'..',d.portrait)),id+' has an available portrait');
  const original={characterId:'late-dungeon-player',level:level-1,inventory:[],gold:0,stats:{goldEarned:100},bossDungeons:{version:D.VERSION,seq:0,records:{},reveal:null}};
  assert.equal(D.status(original,id),'locked');assert.equal(D.begin(original,id,'run',1000).ok,false);
  const begun=D.begin({...original,level},id,'run',1000);assert(begun.ok);
  const profile=D.combatProfile(id);assert.equal(profile.level,level);assert.equal(profile.xp,0);assert.deepEqual(profile.gold,[0,0]);
  const defeated=D.defeat(begun.state,id,{runId:'run',encounterId:'run:enemy'},()=>1000,2000);assert(defeated.ok);assert.equal(defeated.record.reward.items.length,id==='kizaru'?2:1);
  const reloaded=JSON.parse(JSON.stringify(defeated.state)),resumed=D.begin(reloaded,id,'unused-run',3000);
  assert.equal(D.status(reloaded,id),'pending');assert.equal(resumed.resume,true);assert.equal(resumed.record.runId,'run');
  let committed=false;
  const claim=D.claim(reloaded,id,{runId:'run',position:{x:0,y:0},chest:{x:0,y:0,radius:10},defs:[],applyXP(){throw Error('No XP expected');},commit(){committed=true;return true;}});
  assert.equal(claim.ok,false);assert.equal(committed,false);assert.equal(reloaded.gold,0);assert.deepEqual(reloaded.inventory,[]);
 }
});

test('each new boss hits once with its authored basic clip after JSON resume and cannot respawn after victory',()=>{
 const stats={...C.derive({classId:'sword',level:180,attributes:C.empty()},E.catalog.classes.sword,E.catalog.factions.pirate,{attack:0,defense:0,hp:0}),maxHP:1e8,maxEnergy:100,accuracy:1,crit:0,evasion:0,healthRegen:0,vitalityHealthRegen:0,vitalityRegenRate:0,energyRegen:0};
 const nav=maps.navigation('quest-dungeons');
 for(const [id,level] of encounters){
  assert(D.byId[id],id+' is assigned');
  const b=E.create(null,stats,1000,()=>.5),hero={...maps.maps['quest-dungeons'].spawn};
  const record={runId:'11111111-1111-4111-8111-111111111111',encounterId:'enemy',spawnId:'22222222-2222-4222-8222-222222222222',phase:'running'};
  E.enterDungeon(b,id,record,stats,hero);assert.equal(b.mobs.length,1);assert.equal(b.mobs[0].type,'dungeon-'+id);assert.equal(b.mobs[0].level,level);
  let now=1000;const step=(dt=.05)=>E.step(b,{hero,nav,stats,baseStats:stats,classId:'sword',factionId:'pirate',level:180,build:{nodes:{},keystone:null,ultimate:null},rng:()=>.5,now:now+=dt*1000,dt});
  const m=b.mobs[0];b.auto=false;m.attackClock=0;Object.assign(hero,{x:m.x+40,y:m.y});const hp=b.hp;
  step();assert(m.dungeonAttack,id+' starts its basic attack');assert.equal(b.hp,hp);assert.equal(timing[m.type].east.impact_frame,2);
  b.mobs=JSON.parse(JSON.stringify(b.mobs));for(let i=0;i<30&&b.mobs[0].dungeonAttack;i++)step();
  assert.equal(b.events.filter(e=>e.type==='hurt').length,1,id+' has one impact');assert(b.hp<hp);
  const enemy=b.mobs[0];Object.assign(enemy,{hp:1,defense:0,attackClock:999});Object.assign(hero,{x:enemy.x-20,y:enemy.y});b.pending={targetId:enemy.id,remaining:0};
  const result=step();assert.equal(result.kills.length,1);assert.equal(result.kills[0].dungeonId,id);assert.equal(result.kills[0].reward,null);assert.equal(step().kills.length,0);
  E.enterDungeon(b,id,{...record,phase:'pending'},stats,hero);assert.equal(b.mobs.length,0);assert.equal(b.auto,false);
 }
});
