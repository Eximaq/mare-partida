'use strict';
const assert=require('node:assert/strict'),H=require('../hunt-system.js');
require('../orange-world.js');require('../ember-world.js');require('../dawn-world.js');require('../conchas-world.js');require('../world-system.js');
const W=globalThis.MareWorld,E=globalThis.MareDawn;
const base=()=>H.migrate({level:1,gold:120,stats:{kills:99},inventory:[],equipment:{keep:{id:'safe'}},claimed:['boss']});
let g=base(),source=JSON.stringify(g);assert.deepEqual(H.migrate(g),g);assert.equal(g.hunts.areas.beach.kills,0);
assert.equal(H.regions.beach.boss,'César');
assert(H.regions.beach.sectors.every(s=>s.min===5&&s.max===5&&s.roles.length===1&&s.roles[0]==='cesar'));
assert.equal(H.profile('beach','cais','cesar').level,5);assert.equal(g.stats.kills,99);
const legacyRanges={
 'skypiea-01':[75,80],'skypiea-02':[80,85],'skypiea-03':[85,90],'skypiea-04':[90,95],
 alabasta:[40,50],rare:[16,20],syrup:[21,25],baratie:[26,30],arlong:[31,35],beach:[1,5],orange:[11,15],loguetown:[36,40],swamp:[5,10],
 'alubarna-01':[50,55],'alubarna-02':[55,60],'alubarna-03':[60,65],'alubarna-04':[65,70],'alubarna-05':[70,75]
};
assert.deepEqual(Object.fromEntries(Object.entries(H.regions).map(([id,r])=>[id,[r.min,r.max]])),{
 ...legacyRanges,'enies-lobby-01':[95,100],'enies-lobby-02':[101,104],'enies-lobby-03':[104,106],'enies-lobby-04':[107,109],'enies-lobby-05':[110,114],
 'thriller-bark-01':[114,117],'thriller-bark-02':[118,121],'thriller-bark-03':[122,126],'thriller-bark-04':[127,130],
 'sabaody-01':[131,135],'sabaody-02':[136,140],'sabaody-03':[141,145],'sabaody-04':[146,150],
 'marineford-01':[151,155],'marineford-02':[156,160],'marineford-03':[161,165],'marineford-04':[166,170],'marineford-05':[171,175],'marineford-06':[176,180]
},'new destinations retain every existing area and its exact level range');
assert.equal(H.regions.swamp.boss,null);assert(H.regions.swamp.sectors.every(s=>s.min===8&&s.max===8&&s.roles.length===1&&s.roles[0]==='helmeppo'));
for(const [area,region] of Object.entries(H.regions).filter(([,region])=>!!region.boss)){
 const anchors=area==='orange'?globalThis.MareOrange.districts:area==='beach'?E.districts:globalThis.MareConchas.districts,map=area==='orange'?globalThis.MareOrange.map:area==='beach'?E.map:W.maps.conchas,nav=new W.Navigation(map,map.navigationCell||24);
 for(const s of H.sectors(area,anchors)){
  assert(nav.walkable(s.x,s.y),s.name);assert(nav.path(map.spawn,s).length,s.name);assert.equal(H.sectorAt(area,s,anchors).id,s.id);
  for(const type of ['crab','bandit','spirit','boss'])for(const roll of [0,.5,.99999]){
   const m=H.profile(area,s.id,type,roll);assert(m.level>=region.min&&m.level<=region.max);assert(m.maxHP>0&&m.attack>0);
   if(type==='boss')assert.equal(m.level,region.bossLevel);
   const data={...m,type,district:s.id},lo=H.rewards(area,data,1),hi=H.rewards(area,data,100);
   assert.equal(lo.gearLevel,hi.gearLevel);assert.equal(lo.gold,hi.gold);assert.equal(hi.xp,lo.xp/2);
  }
 }
 const s=region.sectors.at(-1);assert(!H.bossReady(g,area,s,1000,anchors));
 let current=g;for(let i=0;i<12;i++)current=H.recordKill(current,area,'bandit',1000).state;
 assert(H.bossReady(current,area,s,1000,anchors));assert(!H.bossReady(current,area,{x:0,y:0},1000,anchors));
 const killed=H.recordKill(current,area,'boss',1000);assert(killed.first);assert(!H.bossReady(killed.state,area,s,60999,anchors));assert(H.bossReady(killed.state,area,s,61000,anchors));
 const before=JSON.stringify(killed.state),full={...killed.state,inventory:Array(120).fill({id:'full'})};assert(!H.claimFirst(full,area,{id:'reward'}).ok);assert.equal(JSON.stringify(killed.state),before);
 const claim=H.claimFirst(killed.state,area,{id:'reward'});assert(claim.ok);assert.equal(claim.state.gold,killed.state.gold+region.firstGold);assert(!H.claimFirst(claim.state,area,{id:'again'}).ok);assert(!H.recordKill(killed.state,area,'boss').first);
}
for(let n=0;n<1000;n++){assert.notEqual(H.rarity('beach',false,n/1000),'legendary');assert.notEqual(H.rarity('swamp',false,n/1000),'legendary');}
assert.equal(H.rarity('swamp',true,.999),'epic');assert.equal(JSON.stringify(g),source);
const boss={type:'boss',x:100,y:100,attackCount:2};boss.telegraph=H.beginWarning(boss,{x:110,y:110});assert(H.danger(boss.telegraph,{x:110,y:110}));assert.equal(H.stepWarning(boss,.5,{x:110,y:110}),null);const miss=H.stepWarning(boss,1,{x:400,y:100});assert(!miss.hit);assert.equal(boss.telegraph,null);
boss.attackCount=5;boss.telegraph=H.beginWarning(boss,{x:200,y:100});assert.equal(boss.telegraph.shape,'line');assert(H.danger(boss.telegraph,{x:200,y:110}));assert(!H.danger(boss.telegraph,{x:200,y:200}));assert(!H.stepWarning(boss,2,{x:200,y:100},{clear:false}).hit);
const spirit={type:'spirit',x:100,y:100};spirit.telegraph=H.beginWarning(spirit,{x:200,y:100});assert.equal(H.stepWarning(spirit,2,{x:200,y:100},{blocked:true}),null);assert.equal(spirit.telegraph,null);
console.log('Hunt: fixed regional levels, reachable sectors, economy/tiers, boss gates/respawn, unique rewards, migration and dodgeable/interrupted warnings passed');
