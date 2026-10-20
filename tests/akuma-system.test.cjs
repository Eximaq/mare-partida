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
}
assert.equal(Akuma.passiveCount(game,entries),6);
assert.ok(derive(game,Forge.aggregate({},defs)).maxHP>base.maxHP);
assert.ok(derive(game,Forge.aggregate({},defs)).attributes.strength>base.attributes.strength);
assert.equal(Akuma.register(game,entries[0].id,entries).state.akumaCompendium.length,6,'registration is unique');
assert.deepEqual(Akuma.migrate({...game,akumaCompendium:['future-fruit','future-fruit',...game.akumaCompendium]}).akumaCompendium,['future-fruit',...game.akumaCompendium]);
assert.equal(Akuma.register(game,'unknown',entries).ok,false);
assert.throws(()=>new Akuma.AkumaNoMiData('bad','Bad','X','','',''));
console.log('Akuma no Mi: six ranks, equipment bonuses, permanent HP/STR, unique registration and migration passed');
