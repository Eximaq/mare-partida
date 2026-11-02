import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {characterCommandSchema} from '@mare/shared';
const require=createRequire(import.meta.url);
const chars=require('../../character-system.js'),catalog=require('../../character-catalog.js').create({characters:chars});
function fixture(cls='sword'){
 const engine=require('../../world-battle.cjs'),stats=chars.derive({classId:cls,level:1,attributes:chars.empty()},catalog.classes[cls],catalog.factions.pirate,{attack:0,defense:0,hp:0});
 const b=engine.create('beach',stats,1000,()=>.5),m=b.mobs[0];b.autoSkills=false;b.mobs=[m];m.patrolClock=100;
 const hero={x:m.x-30,y:m.y,direction:'right'},nav={map:{spawn:{x:872,y:1608}},walkable:()=>true,projectileClear:()=>true,path:(_:any,p:any)=>[{...p}],follow(a:any,p:any[],speed:number,dt:number){let left=speed*dt;while(p.length&&left>0){const v=p[0],d=Math.hypot(v.x-a.x,v.y-a.y),n=Math.min(d,left);if(d){a.x+=(v.x-a.x)/d*n;a.y+=(v.y-a.y)/d*n;}left-=n;if(n===d)p.shift();else break;}}};
 let now=1000;const step=(dt=.1)=>engine.step(b,{hero,nav,stats,classId:cls,factionId:'pirate',now:now+=dt*1000,dt,rng:()=>.5});
 return {engine,b,m,hero,nav,stats,step};
}
test('server battle uses authored spawn slots, neutral AI and no browser save',()=>{
 let engine:any;try{engine=require('../../world-battle.cjs');}catch{}
 assert.equal(typeof engine?.create,'function','authoritative world battle engine must exist');
 const b=engine.create('beach',{maxHP:200,maxEnergy:90},1000,()=>.5);
 assert.equal(b.mobs.length,14);assert(b.mobs.every((m:any)=>m.type==='cesar'&&!m.engaged&&m.hp===m.maxHP));
 assert.equal(b.hp,200);assert.equal(b.energy,90);assert.equal(b.auto,false);
});
test('all authored islands retain their spawn profiles; automatic hunt crosses real Dawn collision paths',()=>{
 const engine=require('../../world-battle.cjs'),behavior=require('../../monster-behavior.js'),maps=require('../../world-catalog.cjs').load(),f=fixture();
 for(const area of Object.keys(engine.hunt.regions)){
  const b=engine.create(area,f.stats,1000,()=>.5),slots=behavior.slots(area).filter((s:any)=>!s.boss);
  assert.equal(b.mobs.length,slots.length,area);
  for(const m of b.mobs){const slot=slots.find((s:any)=>s.id===m.spawnId),profile=engine.hunt.profile(area,slot.sector,slot.type,.5);assert.equal(m.maxHP,profile.maxHP);assert.equal(m.level,profile.level);assert.equal(m.attack,profile.attack);}
 }
 const nav=maps.navigation('dawn'),b=engine.create('beach',f.stats,1000,()=>.5),hero={...nav.map.spawn,direction:'front'};b.auto=true;let killed=0,potions=4;
 for(let n=0;n<240&&!killed;n++){
  const r=engine.step(b,{hero,nav,stats:f.stats,classId:'sword',factionId:'pirate',level:1,now:1250+n*250,dt:.25,rng:()=>.5,potions});potions-=r.potionsUsed;killed+=r.kills.length;
  assert(nav.walkable(hero.x,hero.y),'server pursuit must obey original map collisions');assert(b.hp>=0);
 }
 assert(killed>=1,'the original automatic hunt must reach and defeat a live monster');
});
test('automatic hunt uses class skills and consumes only the server supplied potion stock',()=>{
 const f=fixture('brawler');f.b.auto=true;f.b.autoSkills=true;f.b.targetId=f.m.id;f.b.hp=f.stats.maxHP*.2;
 const result=f.engine.step(f.b,{hero:f.hero,nav:f.nav,stats:f.stats,classId:'brawler',factionId:'pirate',now:1250,dt:.25,rng:()=>.5,potions:1});
 assert.equal(result.potionsUsed,1);assert(f.b.hp>f.stats.maxHP*.5);assert(f.b.cooldowns.some((v:number)=>v>0));
});
test('battle protocol refuses client rewards, clock, HP and ownership while accepting only bounded intent',()=>{
 const envelope={requestId:'11111111-1111-4111-8111-111111111111',expectedVersion:0,control:{epoch:1,token:'x'.repeat(43)}};
 for(const [action,payload] of [['battle.auto',{enabled:true}],['battle.target',{targetId:null}],['battle.skill',{index:0}],['battle.start',{}]] as const){
  assert(characterCommandSchema.safeParse({...envelope,action,payload}).success);
  for(const field of ['hp','damage','gold','experience','now','dt','ownerId','accountId','characterId'])assert.equal(characterCommandSchema.safeParse({...envelope,action,payload:{...payload,[field]:100}}).success,false);
 }
 assert.equal(characterCommandSchema.safeParse({...envelope,action:'battle.reward',payload:{}}).success,false);
 assert.equal(characterCommandSchema.safeParse({...envelope,action:'battle.skill',payload:{index:2}}).success,false);
});
test('neutral monsters do not attack; basic hit waits for impact, checks range again and cannot double reward',()=>{
 const f=fixture();for(let i=0;i<20;i++)f.step();assert.equal(f.b.hp,f.stats.maxHP);
 f.b.auto=true;f.b.targetId=f.m.id;const hp=f.m.hp;f.step(.05);assert.equal(f.m.hp,hp);assert(f.b.pending);
 f.hero.x-=1000;f.b.auto=false;for(let i=0;i<10;i++)f.step();assert.equal(f.m.hp,hp);
 f.hero.x=f.m.x-30;f.b.auto=true;f.m.hp=1;let rewards:any[]=[];for(let i=0;i<12;i++)rewards.push(...f.step().kills);
 assert.equal(rewards.length,1);assert.equal(f.m.alive,false);assert.equal(f.b.hunts.areas.beach.kills,1);
 for(let i=0;i<10;i++)assert.equal(f.step().kills.length,0);
 assert(f.b.hunts.areas.beach.respawns[f.m.spawnId]>30000);
});
test('AI leash, return immunity, death and respawn preserve authored timing',()=>{
 const f=fixture();f.m.engaged=true;f.hero.x=f.m.anchorX+400;f.step();assert(f.m.returning||!f.m.engaged);
 f.b.hp=0;f.b.respawn=4.1;for(let i=0;i<40;i++)f.step();assert.equal(f.b.hp,0);f.step(.2);assert.equal(f.b.hp,f.stats.maxHP);assert.equal(f.hero.x,872);
 assert.throws(()=>f.engine.step(f.b,{hero:f.hero,nav:f.nav,stats:f.stats,classId:'sword',now:9999,dt:60,rng:()=>.5}),/step/);
});
test('class skill costs and cooldowns are authoritative; healing and projectiles use original rules',()=>{
 for(const cls of Object.keys(catalog.classes)){
  const f=fixture(cls),skill=catalog.classes[cls].skills[0];f.b.targetId=f.m.id;f.b.hp=f.stats.maxHP/2;
  const energy=f.b.energy;assert.equal(f.engine.skill(f.b,0,{hero:f.hero,nav:f.nav,stats:f.stats,classId:cls,factionId:'pirate',rng:()=>.5,now:1000}),true);
  assert.equal(f.b.energy,energy-skill.cost);assert.equal(f.b.cooldowns[0],skill.cd);
  assert.equal(f.engine.skill(f.b,0,{hero:f.hero,nav:f.nav,stats:f.stats,classId:cls,factionId:'pirate',rng:()=>.5,now:1000}),false);
 }
 const f=fixture('gunner');f.b.auto=true;f.b.targetId=f.m.id;f.hero.x=f.m.x-180;const hp=f.m.hp;
 for(let i=0;i<5;i++)f.step(.1);assert.equal(f.m.hp,hp,'projectile needs flight time after release');
 for(let i=0;i<6;i++)f.step();assert(f.m.hp<hp);
});
test('ranged skills travel before impact and a released projectile can hit beyond initial cast range',()=>{
 const f=fixture('gunner');f.hero.x=f.m.x-180;f.b.targetId=f.m.id;const hp=f.m.hp;
 assert(f.engine.skill(f.b,0,{hero:f.hero,nav:f.nav,stats:f.stats,classId:'gunner',factionId:'pirate'}));
 f.step(.05);assert.equal(f.m.hp,hp);assert(f.b.projectiles.length);
 // Original projectile follows its released target; range is checked at release.
 f.hero.x-=50;for(let i=0;i<10;i++)f.step(.05);assert(f.m.hp<hp);
});
