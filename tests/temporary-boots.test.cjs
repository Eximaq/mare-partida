'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),fs=require('node:fs'),vm=require('node:vm');
const F=require('../forge-system.js'),Prison=require('../prison-system.js'),Haki=require('../haki-system.js'),Akuma=require('../akuma-system.js'),HP=require('../haki-progression.js');
const defs=require('../item-catalog.js').create({forge:F,prison:Prison,haki:Haki,akuma:Akuma,hakiProgression:HP}).items;
const item=(id,def,rarity='common')=>({id,def,rarity,level:7,plus:0,locked:false});

test('the two archived boots cannot spawn or be granted, but existing copies are not altered by the block',()=>{
 assert.deepEqual(defs.map((d,i)=>d.acquisitionBlocked?i:-1).filter(i=>i>=0),[8,9]);
 const zone={min:1,max:100};
 for(const rarityRoll of [.1,.88])for(let step=0;step<400;step++){
  const rolls=[0,rarityRoll,(step+.5)/400];
  const loot=F.normalLoot(defs,1,zone,()=>rolls.shift());
  assert(loot&&loot.def!==8&&loot.def!==9);
 }
 for(const [def,rarity] of [[8,'common'],[9,'rare']]){
  const instance=item('old'+def,def,rarity);
  assert.throws(()=>F.generateItem(instance,defs,()=>.25),/temporariamente/);
  assert.equal(F.normalizeItem(instance,defs).def,def);
  assert(F.isGear(instance,defs));
 }
});

test('boots fusion yields only Corsário at the normal next rarity, surviving reload, without changing normal drops',()=>{
 assert.equal(defs[134].name,'Botas do Corsário');
 for(const [rarity,next] of [['common','uncommon'],['uncommon','rare'],['rare','epic'],['epic','legendary']]){
  const g={classId:'brawler',gold:99999,materials:1000,inventory:Array.from({length:5},(_,i)=>item('piece'+i,0,rarity)),equipment:{},forgeSeq:0};
  const ids=g.inventory.map(i=>i.id),fused=F.execute(g,{type:'fuseEquipment',slot:'boots',itemIds:ids,expectedSeq:0},defs,()=>.2,1000);
  assert(fused.ok,JSON.stringify(fused));
  const [result]=fused.state.inventory;assert.equal(fused.state.inventory.length,1);
  assert.deepEqual([result.def,result.rarity,result.level],[134,next,7]);
  assert.equal(F.migrate(fused.state,defs).inventory[0].rarity,next);
 }
 assert.equal(F.generateItem(item('drop',134),defs,()=>.2).rarity,'rare');
});

test('local character creation carries four potions and no gear',()=>{
 const source=fs.readFileSync(require.resolve('../game.js'),'utf8');
 const code=source.slice(source.indexOf('function createGame('),source.indexOf('function getDerived'));
 const noop={migrate:x=>x},world={};
 const box={world,starterWeapon:()=>0,itemDefs:defs,newItem:def=>({def:defs.indexOf(def)}),VERSION:'test',MareTalents:noop,MareForge:F,MareCharacterCatalog:{},MareCharacters:noop,selectedFaction:'pirate',inventorySlotsLeft:['head','coat','boots'],inventorySlotsRight:['weapon'],MareBossDungeons:noop,MareHierarchy:noop,MareAkuma:noop,MareHaki:noop,MarePrison:noop,MareHunt:noop,getDerived:()=>({maxHP:50,maxEnergy:40})};
 const start=vm.runInNewContext(code+";createGame('Teste','sword');",box);
 assert.equal(start.potions,4);assert.equal(start.inventory.length,0);assert(Object.values(start.equipment).every(x=>x===null));
 assert.deepEqual([start.hp,start.energy],[50,40]);
});

