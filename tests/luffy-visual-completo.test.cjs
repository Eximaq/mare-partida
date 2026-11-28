'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const forge=require('../forge-system.js'),visuals=require('../visual-completo.js');
const catalog=()=>require('../item-catalog.js').create({forge,prison:require('../prison-system.js'),haki:require('../haki-system.js'),akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')});
const classes=['sword','brawler','gunner','rogue','cyborg','strategist','healer'];
const owner='00000000-0000-4000-8000-000000000001';
const other='00000000-0000-4000-8000-000000000002';
const item=(id,def=246)=>({id,def,level:1,plus:0,locked:false,obtainedAt:0});

test('Luffy appends at 246 while every saved definition at 0..245 remains unchanged',()=>{
 const defs=catalog().items;
 assert.equal(defs.length,247);
 assert.equal(defs[246].id,'visual_completo_luffy');
 assert.equal(defs.filter(d=>d.id==='visual_completo_luffy').length,1);
 assert.equal(createHash('sha256').update(JSON.stringify(defs.slice(0,246))).digest('hex'),'1bfef6b3e113854416970ca55c4dbac10eed7d695086e6782180aa10218e0cb2','catalog baseline c55d68d, including Zoro at 187 and the last sword at 245');
 assert.equal(defs[187].id,'visual_completo_zoro');
 assert.equal(defs[245].id,'sword-collection-pretzel');
});

test('Luffy is an owned legacy visual item with no combat stats, rarity, price or gear eligibility',()=>{
 const defs=catalog().items,luffy=defs[246],owned=item('luffy');
 assert.ok(luffy,'the appended cosmetic is present');
 assert.equal(luffy.slot,'visual_completo');
 assert.equal(luffy.kind,'visual-completo');
 assert.equal(luffy.cosmeticOnly,true);
 assert.equal(visuals.isVisual(owned,defs),true);
 for(const key of ['attack','defense','hp','energy','rarity','price','equipmentSet','collectionId'])assert.equal(luffy[key],undefined,key);
 assert.equal(forge.isGear(owned,defs),false);
 assert.deepEqual(forge.normalizeItem(owned,defs),owned);
 const gear={weapon:item('weapon',0),coat:item('coat',6)};
 assert.deepEqual(forge.aggregate({...gear,visual_completo:owned},defs),forge.aggregate(gear,defs));
});

for(const classId of classes)test('Luffy equips and survives save/unequip without altering '+classId+' state',()=>{
 const defs=catalog().items,owned={...item('luffy'),binding:'character',boundToCharacter:owner};
 const state={characterId:owner,classId,factionId:'marine',hp:87.25,energy:15.75,xp:1234,gold:99,appearance96:{gender:'female',hairColor:'blue'},equipment:{weapon:item('weapon',0),coat:item('coat',6)},inventory:[owned]};
 const before=structuredClone(state);
 const equipped=visuals.equip(state,owned.id,defs);
 assert.equal(equipped.ok,true);
 assert.deepEqual(state,before,'equip is a pure transition');
 assert.deepEqual(equipped.state.inventory,[]);
 assert.deepEqual(equipped.state.equipment.visual_completo,owned);
 const reloaded=JSON.parse(JSON.stringify(equipped.state));
 const removed=visuals.unequip(reloaded,defs);
 assert.equal(removed.ok,true);
 assert.deepEqual(removed.state,{...before,equipment:{...before.equipment,visual_completo:null}});
 assert.equal(visuals.unequip(removed.state,defs).ok,false,'removal cannot duplicate the instance');
});

test('the public class predicate enables Luffy for seven classes while Zoro stays sword-only',()=>{
 const defs=catalog().items;
 assert.equal(typeof visuals.canEquip,'function','UI and equip share the class predicate');
 for(const classId of classes){
  assert.equal(visuals.canEquip({classId},defs[246]),true,classId+' Luffy');
  assert.equal(visuals.canEquip({classId},defs[187]),classId==='sword',classId+' Zoro');
 }
 for(const classId of [undefined,null,'','unknown']){
  const state={classId,inventory:[item('luffy')],equipment:{}};
  assert.equal(visuals.canEquip(state,defs[246]),false);
  assert.deepEqual(visuals.equip(state,'luffy',defs),{ok:false,error:'item_class_mismatch'});
 }
 assert.equal(visuals.canEquip(null,defs[246]),false);
 assert.equal(visuals.canEquip({classId:'sword'},defs[0]),false);
 assert.equal(visuals.canEquip({classId:'sword'},{...defs[246],id:'visual_completo_unknown'}),false);
 assert.equal(visuals.id,'visual_completo_zoro','legacy export remains compatible');
 assert.equal(visuals.definition,defs[187]);
 assert.equal(visuals.luffyDefinition,defs[246]);
});

test('Luffy and Zoro replace each other without losing or duplicating owned instances',()=>{
 const defs=catalog().items,zoro=item('zoro',187),luffy=item('luffy');
 const state={classId:'sword',equipment:{visual_completo:zoro,weapon:item('weapon',0)},inventory:[luffy],hp:19.5,energy:4.25};
 const first=visuals.equip(state,'luffy',defs);
 assert.equal(first.ok,true);
 assert.deepEqual(first.state.inventory,[zoro]);
 assert.equal(first.state.equipment.visual_completo.id,'luffy');
 const second=visuals.equip(JSON.parse(JSON.stringify(first.state)),'zoro',defs);
 assert.equal(second.ok,true);
 assert.deepEqual(second.state,state);
});

test('unowned, foreign-bound and full-inventory requests preserve ownership and capacity',()=>{
 const defs=catalog().items,luffy={...item('luffy'),binding:'character',boundToCharacter:owner};
 const empty={characterId:owner,classId:'healer',inventory:[],equipment:{},gold:42};
 const before=structuredClone(empty);
 assert.deepEqual(visuals.equip(empty,'luffy',defs),{ok:false,error:'item_not_equippable'});
 assert.deepEqual(empty,before,'looking up a cosmetic never grants an item');
 const foreign={...empty,inventory:[{...luffy,boundToCharacter:other}]};
 const foreignBefore=structuredClone(foreign);
 assert.deepEqual(visuals.equip(foreign,'luffy',defs),{ok:false,error:'item_not_equippable'});
 assert.deepEqual(foreign,foreignBefore);
 const equipped=visuals.equip({...empty,inventory:[luffy]},'luffy',defs);
 assert.equal(equipped.ok,true);
 const full={...equipped.state,inventory:Array.from({length:120},(_,i)=>item('filler-'+i,0))};
 const fullBefore=structuredClone(full);
 assert.deepEqual(visuals.unequip(full,defs),{ok:false,error:'inventory_full'});
 assert.deepEqual(full,fullBefore);
});

test('Luffy uses the exact supplied icon bytes through the catalog path',()=>{
 const def=catalog().items[246];
 assert.ok(def,'the cosmetic definition exists');
 assert.equal(def.icon_path,'assets/skins/visual-completo/luffy/icon.png');
 const icon=path.join(__dirname,'..',def.icon_path);
 assert.ok(fs.existsSync(icon),'provided icon is copied into the asset path');
 assert.equal(createHash('sha256').update(fs.readFileSync(icon)).digest('hex'),'dacdb2dda30e5b395579f6a1d293b0173df2411f7f82b313f8f2d602e174f4df');
});
