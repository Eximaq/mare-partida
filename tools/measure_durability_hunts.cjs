'use strict';

const engine = require('../world-battle.cjs');
const characters = require('../character-system.js');
const forge = require('../forge-system.js');
const world = require('../world-catalog.cjs').load();
const definitions = require('../item-catalog.js').create({
  forge,prison:require('../prison-system.js'),haki:require('../haki-system.js'),
  akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')
}).items;
const bands = [[5,'beach'],[38,'loguetown'],[80,'skypiea-01']];
const hours = Number(process.argv[2] ?? 8);
const filterLevel = Number(process.argv[3] ?? 0);
const filterBuild = process.argv[4];
const filterClass = process.argv[5];
const noWear = process.argv.includes('--no-wear');
const elite = process.argv.includes('--elite');
const faction = 'pirate';

function sample(level, area, classId, build) {
  let seed = 42 + level;
  const rng = () => (seed = (Math.imul(seed,1664525)+1013904223)>>>0)/2**32;
  const role = characters.roles[classId];
  const attributes = characters.empty();
  const points = characters.earned(level);
  attributes.dexterity = build==='rápida' ? Math.floor(points*.35) : 0;
  const remaining = points-attributes.dexterity;
  attributes[role.primary] += Math.floor(remaining*.6);
  attributes.vitality += Math.floor(remaining*.25);
  attributes[role.secondary] += remaining-Math.floor(remaining*.6)-Math.floor(remaining*.25);
  const gear = {};
  const slots = level<11 ? ['weapon','coat'] : level<50
    ? ['weapon','coat','legs','boots','gloves','head','ring']
    : ['weapon','coat','legs','boots','gloves','head','ring','cloak','charm','belt','necklace'];
  for(const [i,slot] of slots.entries()){
    const rank = level<11 ? 'common' : level<50 ? ['uncommon','common','rare'][i%3] : ['rare','uncommon','epic','common'][i%4];
    const valid = def=>def.slot===slot&&!def.kind&&!def.unavailable&&(slot!=='weapon'||def.type===classId);
    const highRanks=['supreme','legendary','epic','rare'];
    const highest=elite?highRanks.map(rarity=>definitions.findIndex(entry=>valid(entry)&&entry.rarity===rarity)).find(index=>index>=0):undefined;
    let def = highest??definitions.findIndex(entry=>valid(entry)&&entry.rarity===rank);
    if(def<0)def=definitions.findIndex(entry=>valid(entry)&&entry.rarity==='common');
    if(def<0)def=definitions.findIndex(valid);
    if(def<0)continue;
    const levelSource = engine.hunt.get(level>=50 ? ['skypiea-01','alubarna-04','alubarna-05'][i%3]
      : level>=30 ? ['loguetown','arlong'][i%2] : area);
    gear[slot]=forge.generateItem({id:'qa:'+slot,def,level:forge.lootLevel(level,levelSource),plus:0},definitions,rng,{potential:11});
  }
  const inventory = {equipment:gear,inventory:[]};
  const derive = () => characters.derive({classId,level,attributes},engine.catalog.classes[classId],
    engine.catalog.factions[faction],forge.aggregate(gear,definitions));
  let stats = derive(),hits=0,dirty=false,maintenancePaid=0;
  const firstSpeed=stats.speed,firstAttack=stats.attack;
  const wear = {begin:()=>forge.beginWear(gear,definitions),confirm:action=>{
    hits++;
    if(!noWear&&forge.confirmWear(action,inventory,definitions))dirty=forge.durabilityOf(gear.weapon)<80*forge.hitsPerPercent;
  }};
  const nav=world.navigation(world.mapId(area));
  const hero={...nav.map.spawn,direction:'front'},battle=engine.create(area,stats,1000,rng);
  battle.auto=true;
  let kills=0,berry=0,potions=4,potionsUsed=0,bought=0,deaths=0,spent=0;
  let lastEvent=0;
  const thresholds={80:null,50:null,20:null};
  for(let t=1;t<=hours*3600;t++){
    if(dirty){stats=derive();dirty=false;}
    const result=engine.step(battle,{hero,nav,stats,classId,factionId:faction,level,
      now:1000+t*1000,dt:1,rng,potions,wear});
    potions-=result.potionsUsed;
    potionsUsed+=result.potionsUsed;
    for(const event of battle.events)if(event.seq>lastEvent&&event.type==='death')deaths++;
    lastEvent=battle.seq;
    for(const kill of result.kills){kills++;berry+=Math.round(kill.reward.gold*engine.catalog.factions[faction].gold);}
    if(potions<4&&berry-maintenancePaid-spent>=35){potions++;bought++;spent+=35;}
    const condition=forge.durabilityOf(gear.weapon)/forge.hitsPerPercent;
    for(const [threshold,time] of Object.entries(thresholds)){
      if(time===null&&condition<=Number(threshold))thresholds[threshold]=t;
    }
    if(condition<=20){
      const plan=forge.repairPlan(inventory,'repairAll',null,definitions);
      if(berry-maintenancePaid-spent>=plan.total){
        maintenancePaid+=plan.total;
        for(const {item} of plan.items)item.durability=forge.maxDurability;
        dirty=true;
      }
    }
  }
  stats=derive();
  const repairOutstanding=forge.repairPlan(inventory,'repairAll',null,definitions).total;
  const maintenance=maintenancePaid+repairOutstanding;
  return {classId,level,area,build,hours,noWear,elite,hits,remaining:forge.durabilityOf(gear.weapon)/forge.hitsPerPercent,
    thresholdsSeconds:thresholds,firstSpeed,firstAttack,finalAttack:stats.attack,damage:battle.metrics.damage,kills,berry,potionsUsed,
    potionsBought:bought,potionCost:spent,deaths,maintenancePaid,repairOutstanding,maintenance,
    maintenancePct:berry?100*maintenance/berry:null,gear:Object.values(gear).map(x=>[definitions[x.def].slot,x.level,x.rarity])};
}
for(const [level,area] of bands.filter(([level])=>!filterLevel||level===filterLevel)){
  for(const classId of Object.keys(engine.catalog.classes).filter(name=>!filterClass||name===filterClass)){
    for(const build of ['lenta','rápida'].filter(name=>!filterBuild||name===filterBuild)){
      console.log(JSON.stringify(sample(level,area,classId,build)));
    }
  }
}
