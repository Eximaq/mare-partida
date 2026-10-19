const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const F=require('../forge-system.js'),C=require('../character-system.js');
const source=fs.readFileSync(require.resolve('../game.js'),'utf8'),box={MareCharacters:C};vm.createContext(box);
vm.runInContext(source.slice(source.indexOf('  const classes ='),source.indexOf('  // Somente artes'))+';globalThis.data={classes,factions}',box);
const defs=[{name:'Teste',slot:'weapon',type:'sword',attack:10,defense:2,hp:20,rarity:'common'},...F.pearls.map(p=>({name:p.name,slot:'pearl',kind:'pearl',pearlId:p.id,rarity:p.rarity}))];
const original={name:'Legacy',level:10,gold:100000,materials:5000,equipment:{weapon:{id:'weapon',def:0,level:10,plus:2,locked:false,custom:'preserved'}},inventory:[],stats:{kills:77},attributeVersion:2,attributes:C.empty()};
let checks=0;function test(name,fn){fn();checks++;console.log(name+': passed');}
const seed=(rarity='rare')=>F.migrate({...structuredClone(original),equipment:{weapon:{...original.equipment.weapon,rarity}}},defs);
const pearl=(id,index)=>({id:'p-'+index,def:defs.findIndex(d=>d.pearlId===id),pearlId:id,level:1,plus:0,locked:false});
const run=(g,command,rng=()=>0)=>F.execute(g,{...(command.type==='fuse'&&!command.itemIds?{itemIds:g.inventory.filter(i=>F.pearlOf(i,defs)?.id===command.pearlId&&!i.locked).slice(0,5).map(i=>i.id)}:{}),...command,expectedSeq:g.forgeSeq},defs,rng);
test('25 real pearls, exact attributes/levels/percentages and stable canonical IDs',()=>{
 assert.equal(F.pearls.length,25);assert.equal(new Set(F.pearls.map(p=>p.id)).size,25);
 for(const key of F.keys){const ps=F.pearls.filter(p=>p.attribute===key);assert.equal(ps.length,5);for(const p of ps){assert(Math.abs(p.percent-p.level*.02)<1e-10);assert.equal(p.multiplier,1+p.percent);assert(F.pearlById[p.id]);}}
});
test('All 1000 rarity outcomes match boundaries and never drop Supreme',()=>{
 const counts={};for(let roll=1;roll<=1000;roll++){const r=F.rarityFromRoll(roll);counts[r]=(counts[r]||0)+1;}
 assert.deepEqual(counts,{legendary:5,epic:120,rare:150,uncommon:225,common:500});assert.throws(()=>F.rarityFromRoll(0));assert.throws(()=>F.rarityFromRoll(1001));
});
test('All six rarities apply base multiplier once, keep refinement additive, unique scalable extras and sockets',()=>{
 for(const [id,r] of Object.entries(F.rarity)){
  const g=seed(id),i=g.equipment.weapon,s=F.itemStats(i,defs);assert.equal(i.extras.length,r.extras);assert.equal(new Set(i.extras.map(e=>e.stat)).size,r.extras);assert.equal(i.sockets.length,r.sockets);assert.equal(s.attack,Math.round((10*r.mult+6)*1.81));
  const bounds=F.extraRange(i.level,id);for(const x of i.extras){if(F.keys.includes(x.stat))assert(x.value>=bounds.min&&x.value<=bounds.max);if(x.stat==='crit')assert(x.value<=.04);}
 }
 assert(F.extraRange(30,'supreme').max>F.extraRange(1,'common').max);
});
test('Legacy migration deterministic, idempotent, preserves identity, custom fields and progression',()=>{
 const old=structuredClone(original),a=F.migrate(old,defs),b=F.migrate(old,defs);assert.deepEqual(a,b);for(let i=0;i<10;i++)assert.deepEqual(F.migrate(a,defs),a);
 assert.deepEqual(old,original);for(const k of ['id','def','level','plus','locked','custom'])assert.equal(a.equipment.weapon[k],old.equipment.weapon[k]);assert.deepEqual(a.stats,old.stats);assert.equal(a.gold,old.gold);assert.equal(a.materials,old.materials);
});
test('Upgrade guarantees +1 through +5, supports +20, scales costs and rejects stale commands',()=>{
 for(const plus of Array.from({length:20},(_,i)=>i)){
  let g=seed();g.equipment.weapon.plus=plus;const cost=F.upgradeCost(g.equipment.weapon),snapshot=JSON.stringify(g),win=run(g,{type:'upgrade',itemId:'weapon'},()=>0);assert(win.ok&&win.result.success);assert.equal(win.state.equipment.weapon.plus,plus+1);assert.equal(win.state.gold,g.gold-cost.gold);assert.equal(win.state.materials,g.materials-cost.materials);assert.equal(JSON.stringify(g),snapshot);
  const lost=run(g,{type:'upgrade',itemId:'weapon'},()=>.999);assert.equal(lost.result.success,plus<5);assert.equal(lost.state.equipment.weapon.plus,plus+(plus<5?1:0));
  assert(!F.execute(win.state,{type:'upgrade',itemId:'weapon',expectedSeq:g.forgeSeq},defs,()=>0).ok);
 }
 const g=seed();g.equipment.weapon.plus=20;assert(!run(g,{type:'upgrade',itemId:'weapon'}).ok);g.equipment.weapon.plus=0;g.gold=0;assert(!run(g,{type:'upgrade',itemId:'weapon'}).ok);
});
test('Imbue consumes one pearl, only free sockets, equipped-only aggregation and sum100×(1+.02+.06+.10)=118',()=>{
 let g=seed('epic');g.inventory=[pearl('pearl_for_1',1),pearl('pearl_for_3',3),pearl('pearl_for_5',5)];
 for(let i=0;i<3;i++){const id=g.inventory[0].id,t=run(g,{type:'imbue',itemId:'weapon',pearlItemId:id,socket:i});assert(t.ok);g=t.state;assert(!run(g,{type:'imbue',itemId:'weapon',pearlItemId:id,socket:i}).ok);}
 assert.equal(g.inventory.length,0);const gear=F.aggregate(g.equipment,defs);assert(Math.abs(gear.pearlPercent.strength-.18)<1e-9);
 gear.attributes.strength=0;const character={classId:'sword',level:20,attributes:{...C.empty(),strength:85}},d=C.derive(character,box.data.classes.sword,box.data.factions.pirate,gear);assert.equal(d.preAttributes.strength,100);assert.equal(d.attributes.strength,118);
 const naked=F.aggregate({},defs);assert.equal(naked.pearlPercent.strength,0);
 const common=seed('common');common.inventory=[pearl('pearl_for_1',1)];assert(!run(common,{type:'imbue',itemId:'weapon',pearlItemId:'p-1',socket:0}).ok);
});
test('Removal exact fee, insufficient gold/full bag protection and return without duplication',()=>{
 let g=seed();g.equipment.weapon.sockets[0]='pearl_esp_5';const fee=F.removalCost(g.equipment.weapon,F.pearlById.pearl_esp_5);assert.equal(fee,Math.ceil((20+10*4)*1.7*(1+5*.75)));
 const t=run(g,{type:'remove',itemId:'weapon',socket:0});assert(t.ok);assert.equal(t.state.gold,g.gold-fee);assert.equal(t.state.inventory.length,1);assert.equal(t.state.inventory[0].pearlId,'pearl_esp_5');assert.equal(t.state.equipment.weapon.sockets[0],null);
 assert(!run(t.state,{type:'remove',itemId:'weapon',socket:0}).ok);g.gold=fee-1;assert(!run(g,{type:'remove',itemId:'weapon',socket:0}).ok);g.gold=100000;g.inventory=Array.from({length:120},(_,i)=>pearl('pearl_for_1',i));assert(!run(g,{type:'remove',itemId:'weapon',socket:0}).ok);
});
test('Four fusion tiers: exact probabilities, success/failure consume five and money, no Nv6 or locked inputs',()=>{
 for(let level=1;level<5;level++){
  const id='pearl_for_'+level,g=seed();g.inventory=Array.from({length:5},(_,i)=>pearl(id,i));const settings=F.fusion[level-1];
  for(const [roll,expected] of [[0,true],[settings.chance-1e-8,true],[settings.chance,false],[.999999,false]]){
    const t=run(g,{type:'fuse',pearlId:id},()=>roll);assert(t.ok);assert.equal(t.result.success,expected);assert.equal(t.state.gold,g.gold-settings.gold);assert.equal(t.state.inventory.length,expected?1:0);if(expected){assert.equal(t.state.inventory[0].pearlId,'pearl_for_'+(level+1));assert(t.state.inventory[0].obtainedAt>0);}
  }
  g.inventory[0].locked=true;assert(!run(g,{type:'fuse',pearlId:id}).ok);
 }
 assert(!run(seed(),{type:'fuse',pearlId:'pearl_for_5'}).ok);
});
test('Reforge changes extras only for six rarities and charges exact scalable resources',()=>{
 for(const rarity of Object.keys(F.rarity)){
  const g=seed(rarity);if(g.equipment.weapon.sockets.length)g.equipment.weapon.sockets[0]='pearl_vit_2';const before=structuredClone(g.equipment.weapon),cost=F.reforgeCost(before),t=run(g,{type:'reforge',itemId:'weapon'},()=>.99);assert(t.ok);const after=structuredClone(t.state.equipment.weapon);delete before.extras;delete after.extras;assert.equal(after.reforgeAttempts,before.reforgeAttempts+1);delete before.reforgeAttempts;delete after.reforgeAttempts;assert.deepEqual(after,before);assert.equal(t.state.gold,g.gold-cost.gold);assert.equal(t.state.materials,g.materials-cost.materials);assert.equal(t.state.equipment.weapon.extras.length,F.rarity[rarity].extras);
 }
 assert(F.reforgeCost(seed('supreme').equipment.weapon).gold>F.reforgeCost(seed('common').equipment.weapon).gold);
});
test('Seven classes apply primary extras and pearl effects once; derived caps and persistence remain safe',()=>{
 for(const id of Object.keys(box.data.classes)){
  const g=seed('supreme');g.classId=id;g.equipment.weapon.extras=[{stat:'strength',value:10},{stat:'dexterity',value:8},{stat:'vitality',value:6},{stat:'intelligence',value:7},{stat:'spirit',value:9},{stat:'crit',value:.04}];g.equipment.weapon.sockets=['pearl_for_5','pearl_des_5','pearl_vit_5','pearl_int_5','pearl_esp_5'];
  const gear=F.aggregate(g.equipment,defs),d=C.derive(g,box.data.classes[id],box.data.factions.pirate,gear);assert(d.power>0);for(const k of C.keys)assert.equal(d.attributes[k],Math.round(d.preAttributes[k]*1.1*1e6)/1e6);assert(d.crit<=.5&&d.speed<=3&&d.evasion<=.35);assert.deepEqual(F.migrate(JSON.parse(JSON.stringify(g)),defs),g);
 }
});
test('RNG failure and unknown commands do not consume resources or mutate original data',()=>{
 const g=seed();g.equipment.weapon.plus=5;const before=JSON.stringify(g);assert(!run(g,{type:'upgrade',itemId:'weapon'},()=>{throw Error('offline')}).ok);assert.equal(JSON.stringify(g),before);assert(!run(g,{type:'unknown'}).ok);
});


test('Individual reforge preserves other lines, unique stats and fixed item data; +30% next cost',()=>{
 const g=seed('epic'),before=structuredClone(g),item=g.equipment.weapon,cost=F.reforgeCost(item,true),t=run(g,{type:'reforgeLine',itemId:'weapon',line:1},()=>.99);assert(t.ok);
 const output=t.state.equipment.weapon;for(const index of [0,2,3])assert.deepEqual(output.extras[index],item.extras[index]);assert.equal(new Set(output.extras.map(x=>x.stat)).size,4);
 for(const key of ['id','def','level','rarity','plus','baseStats','sockets'])assert.deepEqual(output[key],item[key]);assert(F.reforgeCost(output,true).gold>=Math.floor(cost.gold*1.3));assert.deepEqual(g,before);
 assert(!run(g,{type:'reforgeLine',itemId:'weapon',line:99}).ok);item.locked=true;for(const type of ['upgrade','reforge','reforgeLine','remove','imbue'])assert(!run(g,{type,itemId:'weapon',line:0,socket:0}).ok);
});
test('Equipment fusion consumes exactly five unlocked bag items, minimum level, compatible weapon; no Supreme shortcut',()=>{
 for(const rarity of ['common','uncommon','rare','epic']){
  const g=seed();g.classId='sword';g.inventory=Array.from({length:6},(_,i)=>F.normalizeItem({id:'mat-'+i,def:0,level:i+2,plus:i,rarity,locked:false},defs));
  const ids=g.inventory.slice(0,5).map(i=>i.id),plan=F.equipmentFusion(g,ids,'weapon',defs);assert(!plan.error);const t=run(g,{type:'fuseEquipment',itemIds:ids,slot:'weapon'});assert(t.ok);assert.equal(t.state.inventory.length,2);const output=t.state.inventory.find(i=>i.id!==g.inventory[5].id);assert.equal(output.level,2);assert.equal(output.plus,0);assert.equal(output.rarity,plan.target);assert.equal(output.def,0);assert.equal(t.state.gold,g.gold-plan.cost.gold);assert(t.state.inventory.some(i=>i.id==='mat-5'));assert.equal(t.state.equipment.weapon.id,'weapon');
  assert(!run(g,{type:'fuseEquipment',itemIds:[...ids.slice(0,4),'weapon'],slot:'weapon'}).ok);
  g.inventory[0].locked=true;assert(!run(g,{type:'fuseEquipment',itemIds:ids,slot:'weapon'}).ok);g.inventory[0].locked=false;g.inventory[0].sockets=['pearl_for_1'];assert(!run(g,{type:'fuseEquipment',itemIds:ids,slot:'weapon'}).ok);g.inventory[0].sockets=[];g.inventory[0].rarity='legendary';assert(!run(g,{type:'fuseEquipment',itemIds:ids,slot:'weapon'}).ok);
 }
 const g=seed();g.inventory=Array.from({length:5},(_,i)=>F.normalizeItem({id:'legend-'+i,def:0,rarity:'legendary',level:30},defs));assert(F.equipmentFusion(g,g.inventory.map(i=>i.id),'weapon',defs).error);
});
test('Migration preserves +20 and saved metadata, capped persistent history, budget failures atomic',()=>{
 const g=seed();g.equipment.weapon.plus=19;const old=structuredClone(g),cost=F.upgradeCost(g.equipment.weapon);g.gold=cost.gold-1;let called=false;assert(!run(g,{type:'upgrade',itemId:'weapon'},()=>{called=true;return 0}).ok);assert(!called);
 const t=run(old,{type:'upgrade',itemId:'weapon'},()=>0);assert(t.ok);assert.equal(F.migrate(t.state,defs).equipment.weapon.plus,20);assert.equal(t.state.forgeHistory.length,1);assert.equal(t.state.forgeHistory[0].itemId,'weapon');assert(!run(t.state,{type:'upgrade',itemId:'weapon'}).ok);
 let history=seed();history.equipment.weapon.plus=0;history.gold=10000000;for(let i=0;i<15;i++){const t=run(history,{type:'upgrade',itemId:'weapon'});assert(t.ok);history=t.state;}assert.equal(history.forgeHistory.length,12);assert.equal(history.forgeHistory[0].seq,4);
});
test('Pearl slots validate exact owned instances, duplicates, mixed attributes/levels, locked/equipped and replay',()=>{
 const g=seed();g.inventory=Array.from({length:7},(_,i)=>pearl('pearl_for_1',i));const ids=g.inventory.slice(1,6).map(i=>i.id),before=JSON.stringify(g);
 const t=run(g,{type:'fuse',itemIds:ids});assert(t.ok);assert.equal(t.state.inventory.filter(i=>ids.includes(i.id)).length,0);assert(t.state.inventory.some(i=>i.id==='p-0'));assert(t.state.inventory.some(i=>i.id==='p-6'));assert.equal(JSON.stringify(g),before);
 for(const bad of [ids.slice(0,4),[ids[0],ids[0],...ids.slice(2)],[...ids.slice(0,4),'missing']])assert(!run(g,{type:'fuse',itemIds:bad}).ok);
 for(const pearlId of ['pearl_des_1','pearl_for_2']){const mixed=structuredClone(g);mixed.inventory[1]=pearl(pearlId,1);assert(!run(mixed,{type:'fuse',itemIds:ids}).ok);}
 const locked=structuredClone(g);locked.inventory[1].locked=true;assert(!run(locked,{type:'fuse',itemIds:ids}).ok);
 const equipped=structuredClone(g);equipped.equipment.charm=equipped.inventory.splice(1,1)[0];assert(!run(equipped,{type:'fuse',itemIds:ids}).ok);
 assert(!F.execute(t.state,{type:'fuse',itemIds:ids,expectedSeq:g.forgeSeq},defs).ok);
 const throwing=run(g,{type:'fuse',itemIds:ids},()=>{throw Error('rng');});assert(!throwing.ok);assert.equal(JSON.stringify(g),before);
});
console.log(`${checks} expanded forge model groups passed.`);
