'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const forge = require('../forge-system.js');

const slots = ['weapon','coat','legs','head','gloves','boots','cloak','belt','necklace','ring','charm'];
const defs = slots.map(slot => ({name:slot,slot,attack:200,defense:200,hp:100,rarity:'rare'}));
const item = (index, durability) => ({id:'item-'+index,def:index,level:40,rarity:'rare',durability,plus:0,locked:true,extras:[],sockets:['pearl_for_1']});

test('legacy and zero condition load correctly and only direct attack and defense change', () => {
  assert.equal(forge.normalizeItem(item(0),defs).durability,100000);
  assert.equal(forge.normalizeItem(item(0,0),defs).durability,0);
  const full = forge.itemStats(item(4,100000),defs);
  for (const [wear,attack,defense] of [[80000,1,1],[60000,.95,.975],[55000,.925,.9625],[50000,.9,.95],[40000,.85,.925],[20000,.7,.85],[0,.5,.75]]) {
    const current = forge.itemStats(item(4,wear),defs);
    assert.ok(Math.abs(current.attack - full.attack * attack) < 1e-8);
    assert.ok(Math.abs(current.defense - full.defense * defense) < 1e-8);
    assert.deepEqual({...current,attack:full.attack,defense:full.defense},full);
  }
});

test('repair costs match the fixed slot weights and the precise condition', () => {
  const costs = [80000,70000,50000,20000,0].map(n=>forge.repairCost(item(4,n),defs));
  assert.deepEqual(costs,[2016,3024,5040,8064,10080]);
  assert.equal(forge.repairCost(item(0,50000),defs),15750);
  assert.equal(forge.repairCost(item(0,99999),defs),1);
  assert.equal(slots.reduce((n,_,i)=>n+forge.repairCost(item(i,50000),defs),0),63000);
});

test('equipped batch uses an exact quote, can repair locked socketed gear, and is atomic', () => {
  const game={gold:15750,materials:0,forgeSeq:0,inventory:[item(4,0)],equipment:{weapon:item(0,50000)}};
  const operation={type:'repairAll',expectedSeq:0,quote:[{id:'item-0',cost:15750}]};
  assert.equal(forge.execute({...game,gold:15749},operation,defs).ok,false);
  assert.equal(forge.execute({...game,equipment:{weapon:item(0,49999)}},operation,defs).ok,false);
  const repaired=forge.execute(game,operation,defs);
  assert.equal(repaired.ok,true);
  assert.equal(repaired.state.gold,0);
  assert.equal(repaired.state.equipment.weapon.durability,100000);
  assert.equal(repaired.state.equipment.weapon.locked,true);
  assert.deepEqual(repaired.state.equipment.weapon.sockets,['pearl_for_1']);
  assert.equal(repaired.state.inventory[0].durability,0);
  assert.equal(forge.execute(repaired.state,operation,defs).ok,false);
  assert.equal(game.equipment.weapon.durability,50000);
});

test('a confirmed action wears its original equipment once even after a swap', () => {
  const weapon=item(0,100000), replacement={...weapon,id:'replacement'}, glove=item(4,1);
  const game={equipment:{weapon,gloves:glove},inventory:[]};
  const execution=forge.beginWear(game.equipment,defs);
  game.inventory.push(weapon);game.equipment.weapon=replacement;
  assert.equal(forge.confirmWear(execution,game,defs),true);
  assert.equal(forge.confirmWear(execution,game,defs),false);
  assert.equal(weapon.durability,99999);
  assert.equal(replacement.durability,100000);
  assert.equal(glove.durability,0);
  const next=forge.beginWear(game.equipment,defs);
  forge.confirmWear(next,game,defs);
  assert.equal(replacement.durability,99999);
  assert.equal(glove.durability,0);
});
const engine = require('../world-battle.cjs');
const characters = require('../character-system.js');
function fight(classId='sword', rolls=()=>.1,fruitId=null) {
  const inventory={equipment:{weapon:item(0,100000),gloves:item(4,100000)},inventory:[]};
  const stats=characters.derive({classId,level:10,attributes:characters.empty()},engine.catalog.classes[classId],engine.catalog.factions.pirate,{attack:0,defense:0,hp:0});
  let b=engine.create('beach',stats,1000,()=>.5);
  const first=b.mobs[0];
  first.hp=first.maxHP=1e8;
  first.attack=0;first.patrolClock=100;
  b.targetId=first.id;
  b.autoSkills=false;
  const hero={x:first.x-24,y:first.y,direction:'right'};
  const nav={map:{key:'dawn',width:2000,height:2000,spawn:hero},walkable:()=>true,projectileClear:()=>true,path:()=>[],follow:()=>{}};
  const hits=[];
  const wear={begin:()=>forge.beginWear(inventory.equipment,defs),confirm(action){hits.push(action.id);forge.confirmWear(action,inventory,defs);}};
  let now=1000;
  const context=()=>({wear,hero,nav,stats,classId,fruitId,factionId:'pirate',level:10,now,rng:rolls});
  return {get battle(){return b;},hero,inventory,first,hits,skill(i){return engine.skill(b,i,context());},fruit(key){return engine.fruitCast(b,key,context());},
    reload(){b=JSON.parse(JSON.stringify(b));},step(seconds=.1){now+=seconds*1000;engine.step(b,{...context(),dt:seconds});}};
}

test('authoritative basics count after impact, cancel without hits, and miss without wear', () => {
  const f=fight();
  f.battle.auto=true;f.step(.05);
  assert.equal(f.hits.length,0);
  f.hero.x-=500;f.battle.auto=false;
  f.step(1);
  assert.equal(f.hits.length,0);
  f.hero.x+=500;f.battle.auto=true;
  for(let i=0;i<8;i++)f.step(.5);
  assert.ok(f.hits.length>=2);
  assert.equal(new Set(f.hits).size,f.hits.length);
  assert.equal(f.inventory.equipment.gloves.durability,100000-f.hits.length);
  const miss=fight('sword',()=>.9999);
  miss.battle.auto=true;
  for(let i=0;i<8;i++)miss.step(.5);
  assert.equal(miss.hits.length,0);
  assert.ok(miss.battle.events.some(event=>event.type==='miss'));
});

test('the authoritative projectile keeps the original item ID through serialization and swapping', () => {
  const f=fight('gunner');
  f.hero.x-=105;
  f.battle.auto=true;f.step(.05);f.battle.auto=false;
  const old=f.inventory.equipment.weapon;
  f.inventory.inventory.push(old);
  f.inventory.equipment.weapon={...old,id:'new-weapon'};
  for(let i=0;i<20;i++){f.reload();f.step(.1);}
  assert.equal(f.hits.length,1);
  assert.equal(old.durability,99999);
  assert.equal(f.inventory.equipment.weapon.durability,100000);
});

test('a class area cast that damages several targets charges a single wear unit', () => {
  const f=fight('sword');
  const index=engine.catalog.classes.sword.skills.findIndex(skill=>skill.type==='area');
  assert.notEqual(index,-1);
  for(const [i,enemy] of f.battle.mobs.slice(1,3).entries()){
    enemy.x=f.first.x+i+3;enemy.y=f.first.y;enemy.hp=enemy.maxHP=1e8;
  }
  assert.equal(f.skill(index),true);
  for(let i=0;i<12;i++){f.reload();f.step(.1);}
  assert.ok(new Set(f.battle.events.filter(e=>e.type==='damage').map(e=>e.id)).size>=2);
  assert.equal(f.hits.length,1);
});

test('fruit multi-hit and damage over time share the cast across serializations',()=>{
  for(const [fruit,key] of [['akuma_neko_leopard','2'],['akuma_doku_doku','1']]){
    const f=fight('strategist',()=>.1,fruit);
    assert.equal(f.fruit(key),true,fruit);
    let damageEvents=0,seq=0;
    for(let i=0;i<100;i++){
      f.reload();f.step(.1);
      damageEvents+=f.battle.events.filter(e=>e.seq>seq&&e.type==='damage').length;
      seq=f.battle.seq;
    }
    assert.ok(damageEvents>1,fruit);
    assert.equal(f.hits.length,1,fruit);
    assert.equal(f.inventory.equipment.weapon.durability,99999,fruit);
  }
});

test('bag repair preserves identity, enhancement, and pearls and leaves other slots untouched',()=>{
  const worn={...item(4,0),plus:13,potential:77,origin:'Espólio'};
  const game={gold:10080,materials:2,forgeSeq:0,inventory:[worn],equipment:{weapon:item(0,50000)}};
  const confirm={type:'repair',itemId:worn.id,quote:[{id:worn.id,cost:10080}],expectedSeq:0};
  assert.equal(forge.execute({...game,inventory:[]},confirm,defs).ok,false);
  const result=forge.execute(game,confirm,defs);
  assert.deepEqual(result.state.inventory[0],{...worn,durability:100000});
  assert.deepEqual(result.state.equipment,game.equipment);
  assert.equal(result.state.materials,2);
  assert.equal(result.state.gold,0);
});

test('both attack paths and power decrease while life, mana and pearl contributions persist',()=>{
  for(const classId of ['sword','strategist']){
    const loadout={weapon:item(0,100000),gloves:item(4,100000),charm:item(10,100000)};
    const get=gear=>characters.derive({classId,level:40,attributes:characters.empty()},engine.catalog.classes[classId],engine.catalog.factions.pirate,forge.aggregate(gear,defs));
    const full=get(loadout);
    const worn=get({...loadout,gloves:item(4,50000),charm:item(10,0)});
    assert.ok(worn.physical<full.physical&&worn.elemental<full.elemental);
    assert.ok(worn.defense<full.defense&&worn.power<full.power);
    assert.equal(worn.maxHP,full.maxHP);
    assert.equal(worn.maxEnergy,full.maxEnergy);
    assert.deepEqual(worn.attributes,full.attributes);
  }
});
test('ongoing Skypiea sessions survive the durability merge from either predecessor', () => {
  const active = {rulesHash:'0ae58ec04a2cc20713bf441306de7b193f34da0505f6568f596060d27f5dcee7',area:'skypiea-01',tick:17,hp:42,projectiles:[{id:'in-flight'}]};
  const expected = {...structuredClone(active),rulesHash:engine.rulesHash};
  engine.upgradeBalance(active);
  assert.deepEqual(active,expected);
  const earlier = {rulesHash:'a2e4d9333c0770e539dee6262fb900e1747e94b44c1226a0baacb513b6c07a57',area:'syrup',hunts:{areas:{}},hp:42};
  engine.upgradeBalance(earlier);
  assert.equal(earlier.rulesHash,engine.rulesHash);
  assert.equal(earlier.hp,42);
  for (const area of ['skypiea-02','skypiea-03','skypiea-04']) assert.ok(earlier.hunts.areas[area]);
  const migrated = structuredClone(earlier);
  engine.upgradeBalance(earlier);
  assert.deepEqual(earlier,migrated);
});
