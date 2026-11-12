'use strict';
const engine=require('../world-battle.cjs');
const characters=require('../character-system.js');
const forge=require('../forge-system.js');
const world=require('../world-catalog.cjs').load();
const definitions=require('../item-catalog.js').create({
 forge,prison:require('../prison-system.js'),haki:require('../haki-system.js'),
 akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')
}).items;

const bands=[[5,'beach'],[17,'orange'],[35,'loguetown'],[55,'alubarna-01'],[77,'skypiea-01']];
const seconds=Number(process.argv[3]||300);
const seeds=[42,137,1087];
const standardSlots=['weapon','coat','legs','boots','gloves'];

function loadout(classId,level,area){
 const region=engine.hunt.get(area),equipment={};
 const slots=level<11?['weapon','coat']:standardSlots;
 for(const slot of slots){
  const def=definitions.findIndex(item=>item.slot===slot&&!item.kind&&!item.unavailable&&
   item.rarity==='common'&&(slot!=='weapon'||item.type===classId));
  if(def<0)continue;
  equipment[slot]=forge.generateItem({def,level:forge.lootLevel(level,region),plus:0,rarity:'common'},
   definitions,()=>.45,{potential:11});
 }
 return forge.aggregate(equipment,definitions);
}

for(const [level,area] of bands.filter(([level])=>!Number(process.argv[2])||level===Number(process.argv[2]))){
 const nav=world.navigation(world.mapId(area));
 for(const [classId,cls] of Object.entries(engine.catalog.classes))for(const startSeed of seeds){
  let seed=startSeed+level;
  const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
  const role=characters.roles[classId],attributes=characters.empty(),points=characters.earned(level);
  attributes[role.primary]=Math.floor(points*.65);
  attributes[role.secondary]=points-attributes[role.primary];
  const stats=characters.derive({classId,level,attributes},cls,engine.catalog.factions.pirate,loadout(classId,level,area));
  const hero={...nav.map.spawn,direction:'front'},battle=engine.create(area,stats,1000,rng);
  battle.auto=true;
  let kills=0,berry=0,potions=4,eligible=0,eligibleBerry=0;
  const minMonster=level<11?1:level<31?11:level<50?31:level<75?45:70;
  for(let t=.25;t<=seconds;t+=.25){
   const step=engine.step(battle,{hero,nav,stats,classId,factionId:'pirate',level,now:1000+t*1000,dt:.25,rng,potions});
   potions-=step.potionsUsed;
   for(const kill of step.kills){
    const amount=Math.round(kill.reward.gold*engine.catalog.factions.pirate.gold);
    kills++;berry+=amount;
    if(kill.monster.level>=minMonster){eligible++;eligibleBerry+=amount;}
   }
  }
  console.log(JSON.stringify({level,area,classId,seed:startSeed,seconds,kills,berry,eligible,eligibleBerry,potionsUsed:4-potions}));
 }
}
