'use strict';
const assert=require('node:assert/strict'),H=require('../hunt-system.js');
require('../orange-world.js');require('../ember-world.js');require('../dawn-world.js');require('../conchas-world.js');require('../world-system.js');
const W=globalThis.MareWorld,E=globalThis.MareDawn;
const base=()=>H.migrate({level:1,gold:120,stats:{kills:99},inventory:[],equipment:{keep:{id:'safe'}},claimed:['boss']});
let g=base(),source=JSON.stringify(g);assert.deepEqual(H.migrate(g),g);assert.equal(g.hunts.areas.beach.kills,0);assert.equal(g.stats.kills,99);
assert.deepEqual(Object.values(H.regions).map(r=>[r.min,r.max]),[[31,40],[1,10],[21,30],[11,20]]);
for(const [area,region] of Object.entries(H.regions).filter(([area])=>area!=='rare')){
 const anchors=area==='orange'?globalThis.MareOrange.districts:area==='beach'?E.districts:globalThis.MareConchas.districts,map=area==='orange'?globalThis.MareOrange.map:area==='beach'?E.map:W.maps.conchas,nav=new W.Navigation(map,map.navigationCell||24);
 for(const s of H.sectors(area,anchors)){
  assert(nav.walkable(s.x,s.y),s.name);assert(nav.path(map.spawn,s).length,s.name);assert.equal(H.sectorAt(area,s,anchors).id,s.id);
  for(const type of ['crab','bandit','spirit','boss'])for(const roll of [0,.5,.99999]){
   const m=H.profile(area,s.id,type,roll);assert(m.level>=region.min&&m.level<=region.max);assert(m.maxHP>0&&m.attack>0);
   if(type==='boss')assert.equal(m.level,region.bossLevel);
   const data={...m,type,district:s.id},lo=H.rewards(area,data,m.level),hi=H.rewards(area,data,100);
   assert.equal(lo.gearLevel,hi.gearLevel);assert.equal(lo.gold,hi.gold);assert(hi.xp<=lo.xp);assert(hi.xp>=Math.floor(lo.xp*.15));
  }
 }
 const s=region.sectors.at(-1);assert(!H.bossReady(g,area,s,1000,anchors));
 let current=g;for(let i=0;i<12;i++)current=H.recordKill(current,area,'bandit',1000).state;
 assert(H.bossReady(current,area,s,1000,anchors));assert(!H.bossReady(current,area,{x:0,y:0},1000,anchors));
 const killed=H.recordKill(current,area,'boss',1000);assert(killed.first);assert(!H.bossReady(killed.state,area,s,90999,anchors));assert(H.bossReady(killed.state,area,s,91000,anchors));
 const before=JSON.stringify(killed.state),full={...killed.state,inventory:Array(120).fill({id:'full'})};assert(!H.claimFirst(full,area,{id:'reward'}).ok);assert.equal(JSON.stringify(killed.state),before);
 const claim=H.claimFirst(killed.state,area,{id:'reward'});assert(claim.ok);assert.equal(claim.state.gold,killed.state.gold+region.firstGold);assert(!H.claimFirst(claim.state,area,{id:'again'}).ok);assert(!H.recordKill(killed.state,area,'boss').first);
}
for(let n=0;n<1000;n++){assert.notEqual(H.rarity('beach',false,n/1000),'legendary');assert.notEqual(H.rarity('swamp',false,n/1000),'legendary');}
assert.equal(H.rarity('swamp',true,.999),'legendary');assert.equal(JSON.stringify(g),source);
const boss={type:'boss',x:100,y:100,attackCount:2};boss.telegraph=H.beginWarning(boss,{x:110,y:110});assert(H.danger(boss.telegraph,{x:110,y:110}));assert.equal(H.stepWarning(boss,.5,{x:110,y:110}),null);const miss=H.stepWarning(boss,1,{x:400,y:100});assert(!miss.hit);assert.equal(boss.telegraph,null);
boss.attackCount=5;boss.telegraph=H.beginWarning(boss,{x:200,y:100});assert.equal(boss.telegraph.shape,'line');assert(H.danger(boss.telegraph,{x:200,y:110}));assert(!H.danger(boss.telegraph,{x:200,y:200}));assert(!H.stepWarning(boss,2,{x:200,y:100},{clear:false}).hit);
const spirit={type:'spirit',x:100,y:100};spirit.telegraph=H.beginWarning(spirit,{x:200,y:100});assert.equal(H.stepWarning(spirit,2,{x:200,y:100},{blocked:true}),null);assert.equal(spirit.telegraph,null);
console.log('Hunt: fixed regional levels, reachable sectors, economy/tiers, boss gates/respawn, unique rewards, migration and dodgeable/interrupted warnings passed');
