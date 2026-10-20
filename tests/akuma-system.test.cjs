'use strict';
const assert=require('node:assert/strict');
const Akuma=require('../akuma-system.js');
const Forge=require('../forge-system.js');
const Characters=require('../character-system.js');

const entries=Akuma.ranks.map((rank,i)=>new Akuma.AkumaNoMiData(`fruit-${rank}`,`Fruta ${rank}`,rank,`icons/${rank}.png`,{bonus_attack:i+1,bonus_defense:2},`vfx/${rank}.png`));
const defs=entries.map(fruit=>({type:'akuma_no_mi',slot:'akuma_no_mi',fruitId:fruit.id,bonus_stats:fruit.bonus_stats}));
let game={classId:'sword',level:1,attributes:{strength:0,dexterity:0,vitality:0,intelligence:0,spirit:0},akumaCompendium:[]};
const klass={baseHP:136,hpStep:12,attack:14,attackStep:3,defense:7,defenseStep:1.2,speed:1.25,range:48,energy:90,energyStep:4,crit:.16};
const faction={attack:1,defense:1,hp:1,energy:1,speed:1,crit:0};
const derive=(g,gear)=>Characters.derive(g,klass,faction,{...gear,akumaRegistered:Akuma.passiveCount(g,entries)});
const base=derive(game,Forge.aggregate({},defs));
for(const rank of Akuma.ranks){
  const slots=Akuma.slotsForRank(game,rank,entries);
  assert.equal(slots.length,5,`five preview slots for rank ${rank}`);
  assert.ok(slots.every(slot=>slot.fruit===null),'unregistered fruits remain hidden');
}
assert.equal(Akuma.slotsForRank(game,'X',entries).length,0);
for(const [index,fruit] of entries.entries()){
  const item={id:`item-${index}`,def:index,type:'akuma_no_mi',fruitId:fruit.id};
  assert.equal(Akuma.isFruit(item,defs),true,`${fruit.rank} equips`);
  assert.equal(Forge.isGear(item,defs),false,'fruit stays outside forge recipes');
  assert.equal(Akuma.itemData(item,defs,entries)?.rank,fruit.rank);
  const gear=Akuma.applyGear(Forge.aggregate({},defs),item,defs,entries);
  assert.equal(gear.attack,index+1);
  assert.equal(gear.defense,2);
  assert.ok(derive(game,gear).attack>base.attack);
  game=Akuma.register(game,fruit.id,entries).state;
  assert.equal(Akuma.slotsForRank(game,fruit.rank,entries)[0].fruit?.id,fruit.id);
}
const extra=Array.from({length:6},(_,i)=>new Akuma.AkumaNoMiData(`extra-${i}`,`Extra ${i}`,'E','','',null));
assert.equal(Akuma.slotsForRank(game,'E',extra).length,6,'slots expand for future batches');
assert.equal(Akuma.passiveCount(game,entries),6);
assert.ok(derive(game,Forge.aggregate({},defs)).maxHP>base.maxHP);
assert.ok(derive(game,Forge.aggregate({},defs)).attributes.strength>base.attributes.strength);
assert.equal(Akuma.register(game,entries[0].id,entries).state.akumaCompendium.length,6,'registration is unique');
assert.deepEqual(Akuma.migrate({...game,akumaCompendium:['future-fruit','future-fruit',...game.akumaCompendium]}).akumaCompendium,['future-fruit',...game.akumaCompendium]);
assert.equal(Akuma.register(game,'unknown',entries).ok,false);
assert.throws(()=>new Akuma.AkumaNoMiData('bad','Bad','X','','',''));
assert.deepEqual(Akuma.catalog.map(f=>f.id),['akuma_kuku_kuku','akuma_beri_beri','akuma_tori_albatroz','akuma_uma_uma','akuma_inu_dachshund']);
assert.ok(Akuma.catalog.every(f=>f.rank==='E'&&f.icon_path.startsWith('assets/akuma/')));
for(const fruit of Akuma.catalog){
  const item={type:'akuma_no_mi',fruitId:fruit.id};
  const gear=Akuma.applyGear(Forge.aggregate({},defs),item,defs);
  if(fruit.id==='akuma_kuku_kuku'){assert.equal(gear.healingReceivedPercent,.05);assert.equal(gear.maxHpPercent,.03);assert.equal(Akuma.activeSkill(fruit.id).key,'1');}
  else if(fruit.id==='akuma_beri_beri'){assert.equal(gear.impactResistancePercent,.15);assert.equal(Akuma.activeSkill(fruit.id).key,'2');}
  else if(fruit.id==='akuma_tori_albatroz'){assert.equal(Akuma.isZoan(fruit),true);assert.equal(gear.moveSpeedPercent,.12);assert.equal(gear.evasionPercent,.05);assert.equal(Akuma.activeSkill(fruit.id).cooldown,14);}
  else if(fruit.id==='akuma_uma_uma'){assert.equal(gear.moveSpeedPercent,.15);assert.equal(gear.maxHpPercent,.03);assert.equal(Akuma.activeSkill(fruit.id).key,'2');}
  else{assert.equal(gear.evasionPercent,.10);assert.equal(gear.physicalDefensePercent,.03);assert.equal(Akuma.activeSkill(fruit.id).key,'3');}
}
const zoanGame={...game,equipment:{akuma_no_mi:{fruitId:'akuma_tori_albatroz'}},zoanTransformed:true};
assert.equal(Akuma.migrate(zoanGame).zoanTransformed,true);
assert.equal(Akuma.migrate({...zoanGame,equipment:{akuma_no_mi:null}}).zoanTransformed,false);
const zoanStats=derive(game,Akuma.applyGear(Forge.aggregate({},defs),{type:'akuma_no_mi',fruitId:'akuma_inu_dachshund'},defs));
assert.ok(zoanStats.evasion>base.evasion&&zoanStats.defense>base.defense);
console.log('Akuma no Mi: Rank E catalog, six ranks, equipment bonuses, permanent HP/STR, unique registration and migration passed');
