'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const F=require('../forge-system.js');
const game=fs.readFileSync('game.js','utf8');
const start=game.indexOf('// Append only: preserve save indices and reuse the 13 ATK');
const defs=vm.runInNewContext('const itemDefs=[];'+game.slice(start,game.indexOf('  const questDefs',start))+';itemDefs;');
assert.deepEqual(Array.from(defs,d=>[d.name,d.rarity]),[['Adaga de Cristal','epic'],['Punhal de Netuno','legendary'],['Punhal Flamejante','legendary'],['Lâmina das Trevas','supreme']]);
assert(start>game.indexOf("name:'Meito: Ame no Habakiri'"),'new definitions append after saved catalog indices');
for(const def of defs){
 assert.equal(def.type,'rogue');assert.equal(def.slot,'weapon');assert(def.description.length>100);
 const catalog=[def,{name:'Existing rogue baseline',slot:'weapon',type:'rogue',attack:13,defense:0,hp:0,rarity:def.rarity}];
 for(const level of [1,13,40]){
  const item=F.normalizeItem({id:'qa',def:0,level,plus:0,rarity:'common'},catalog);
  assert.equal(item.rarity,def.rarity);
  assert.equal(F.itemStats(item,catalog).attack,F.itemStats({...item,def:1},catalog).attack,'existing progression applies unchanged');
 }
}
const manifest=JSON.parse(fs.readFileSync('assets/ui/items-pixellab/gatuno-weapons.json','utf8'));
for(const asset of manifest.assets)assert.equal(crypto.createHash('sha256').update(fs.readFileSync('assets/ui/items-pixellab/'+asset.asset)).digest('hex'),asset.sha256);
const dark=defs[3];assert.equal(dark.slotAnimation.frames,16);assert.equal(dark.slotAnimation.columns,4);assert.equal(dark.slotAnimation.rows,4);
const css=fs.readFileSync('inventory-compact.css','utf8');
assert(css.includes('.lamina-trevas-slot-animation{animation:ame-habakiri-slot-frames'));
assert(css.includes('.lamina-trevas-slot-animation{animation:none'));
console.log('Gatuno: fixed rarities, class metadata, unchanged power progression, supplied assets and shared slot animation verified.');
