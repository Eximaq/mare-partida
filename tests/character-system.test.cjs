const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const model=require('../character-system.js');
const source=fs.readFileSync(require.resolve('../game.js'),'utf8');
const context={MareCharacters:model};vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('  const classes ='),source.indexOf('  // Somente artes'))+'\nglobalThis.data={classes,factions};',context);
const {classes,factions}=context.data,gear={attack:8,defense:4,hp:17};
let checks=0;
function test(name,fn){fn();checks++;console.log(name+': passed');}
const make=(classId,level=20)=>model.migrate({classId,level,equipment:{},inventory:[{id:'old',def:4,plus:3}],gold:777,xp:41});
const derived=g=>model.derive(g,classes[g.classId],factions.pirate,gear);

test('Every class has its exact immutable 50-point birth allocation',()=>{
  const expected={brawler:[14,9,13,5,9],sword:[15,14,9,6,6],gunner:[9,15,8,10,8],rogue:[10,16,9,7,8],cyborg:[11,6,17,8,8],strategist:[5,8,8,17,12],healer:[5,8,10,12,15]};
  for(const [id,values] of Object.entries(expected)){
    const g=make(id,1),d=derived(g);assert.deepEqual(Object.values(d.attributes),values);assert.equal(values.reduce((a,b)=>a+b),50);
    assert(Object.isFrozen(model.birth[id]));assert.equal(g.attributePoints,0);assert.equal(model.spent(g.attributes),0);
  }
});
test('V1 investments survive V2 migration and class changes without granting birth points',()=>{
  const old={...make('sword',10),attributeVersion:1,attributes:{...model.empty(),strength:10,dexterity:5}};
  let g=model.migrate(old);assert.equal(g.attributeVersion,2);assert.deepEqual(g.attributes,old.attributes);assert.equal(g.attributePoints,30);
  for(const id of Object.keys(model.birth)){g=model.migrate({...g,classId:id});assert.equal(g.attributes.strength,10);assert.equal(g.attributePoints,30);assert.equal(derived(g).attributes.strength,model.birth[id].strength+10);}
});
test('Old level 1, 2 and 20 saves receive 0, 5 and 95 points',()=>{
  for(const [level,expected] of [[1,0],[2,5],[20,95]])assert.equal(make('sword',level).attributePoints,expected);
});
test('Repeated migration preserves inventory, progress and exact point budget',()=>{
  let g=make('gunner',12),draft=model.empty();draft.dexterity=13;draft.strength=7;
  assert(model.commit(g,draft));
  for(let i=0;i<20;i++)g=model.migrate(JSON.parse(JSON.stringify(g)));
  assert.equal(g.attributePoints,35);assert.equal(g.attributes.dexterity,13);assert.equal(g.inventory[0].id,'old');assert.equal(g.gold,777);assert.equal(g.xp,41);
});
test('Unconfirmed drafts do not change the save; insufficient and invalid points cannot commit',()=>{
  const g=make('sword',2),before=JSON.stringify(g),draft=model.empty();draft.strength=6;
  assert.equal(model.commit(g,draft),false);assert.equal(JSON.stringify(g),before);
  draft.strength=-1;assert.equal(model.commit(g,draft),false);draft.strength=.5;assert.equal(model.commit(g,draft),false);
  draft.strength=5;assert(model.commit(g,draft));assert.equal(g.attributePoints,0);assert.equal(model.commit(g,draft),false);
});
test('Level gain adds exactly five unallocated points; loading cannot grant them twice',()=>{
  let g=make('rogue',2),draft=model.empty();draft.dexterity=5;assert(model.commit(g,draft));
  g.level++;g=model.migrate(g);assert.equal(g.attributePoints,5);assert.equal(model.migrate(g).attributePoints,5);
});
test('Corrupt allocations are bounded by the earned budget',()=>{
  const g=model.migrate({...make('sword',2),attributes:{strength:999999,dexterity:-2},attributePoints:9999});
  assert.equal(model.spent(g.attributes)+g.attributePoints,5);assert(g.attributePoints>=0);
});
test('Every class yields finite usable combat attributes',()=>{
  assert.equal(Object.keys(classes).length,7);
  for(const id of Object.keys(classes))for(const value of Object.values(derived(make(id))))if(typeof value==='number')assert(Number.isFinite(value));
});
test('Elementalist INT 80 beats INT 20 in actual elemental damage formula',()=>{
  const low=make('strategist'),high=make('strategist');low.attributes.intelligence=20;high.attributes.intelligence=80;
  assert(model.damage(derived(high),10,{type:'elemental',multiplier:2.4})>model.damage(derived(low),10,{type:'elemental',multiplier:2.4})*1.5);
});
test('Tank VIT improves HP and incoming damage without matching physical DPS scaling',()=>{
  const tank=make('cyborg'),high=make('cyborg'),sword=make('sword');high.attributes.vitality=50;sword.attributes.strength=50;
  assert(derived(high).maxHP>derived(tank).maxHP);assert(model.incoming(derived(high),60)<model.incoming(derived(tank),60));
  assert(derived(high).physical<derived(sword).physical);assert(model.incoming(derived(high),60,true)<model.incoming(derived(high),60));
});
test('Healer ESP/INT improve real healing, energy and regeneration, with recipient HP capped',()=>{
  const low=make('healer'),high=make('healer');high.attributes.spirit=40;high.attributes.intelligence=20;
  assert(derived(high).healing>derived(low).healing);assert(derived(high).maxEnergy>derived(low).maxEnergy);assert(derived(high).regenBuff>derived(low).regenBuff);
  const recipients=[{id:'hero',hp:10,maxHP:100},{id:'real-ally',hp:95,maxHP:100}];
  const result=model.healRecipients(recipients,derived(high).healing);
  assert.equal(recipients[0].hp,100);assert.equal(result[1].amount,5);assert.equal(result.length,2);
});
test('Sword FOR and ranged DES improve different attacks; DES improves accuracy, evasion and speed with caps',()=>{
  for(const [id,key] of [['sword','strength'],['brawler','strength'],['rogue','dexterity'],['gunner','dexterity']]){
    const low=make(id),high=make(id);high.attributes[key]=50;assert(derived(high).physical>derived(low).physical);
  }
  const g=make('rogue');g.attributes.dexterity=10000;const d=derived(g);assert(d.evasion<=.35&&d.crit<=.5&&d.speed<=3&&d.accuracy<=.99);
});
console.log(`${checks} character balance and migration scenarios passed.`);
