'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ui=require('../ui-system.js');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

for(const [width,columns] of [[320,5],[360,5],[389,5],[390,6],[760,6],[761,7],[1024,7],[1025,8],[1180,8],[1181,9],[1440,9]]){
  assert.deepEqual(ui.inventoryGrid(width),{columns,rows:7,pageSize:columns*7},'grid at '+width+'px');
}
assert.equal(ui.inventoryPageAtResize(2,49,63),1,'keep first visible item when grid grows');
assert.equal(ui.inventoryPageAtResize(1,63,35),1,'keep first visible item when grid shrinks');
assert.equal(ui.inventoryPageAtResize(0,49,63),0,'first page is stable');
assert.equal(ui.inventoryPageAtResize(4,0,63),4,'no previous size is safe');
assert.equal(ui.inventoryPageAtResize(-4,49,63),0,'negative page is rejected');

const gameplay=read('game.js');
assert.match(gameplay,/MareUI\.inventoryGrid\(innerWidth\)/,'game rendering follows layout tokens');
assert.match(gameplay,/MareUI\.inventoryPageAtResize\(/,'page count migration on resize');
assert.match(gameplay,/inventoryUI\.pageSize!==MareUI\.inventoryGrid\(innerWidth\)\.pageSize/,'resize when modal is open');
assert.match(gameplay,/BAG_CAPACITY=120/,'preserve inventory storage capacity');

const responsive=read('ui-responsive.css');
assert.match(responsive, /\.op-grid\s*\{[\s\S]*?grid-template-columns:repeat\(var\(--bag-columns\),minmax\(0,1fr\)\)/,
  'slot grid must fill available width rather than fixed pixels');
for(const [max,columns] of [[1180,8],[1024,7],[760,6],[389,5]]){
  assert.ok(responsive.includes('@media(max-width:'+max+'px)'),'missing responsive slot tier '+max);
  assert.ok(responsive.includes('--bag-columns:'+columns),'missing slot columns '+columns);
}
assert.match(responsive, /\.op-equip-slot\.filled\s*\{[\s\S]*?background-image:none/,
  'equipped items must not reuse rarity artwork as full slot background');
assert.match(responsive, /background:var\(--slot-rarity-frame\) center\/100% 100% no-repeat/,
  'both slot types must reuse the exact original illustrated image without stretching its edge pieces');
assert.match(responsive, /mask-composite:exclude/,
  'the original illustration center must be masked out to keep the socket translucent');
for(const rarity of ['common','uncommon','rare','epic','legendary','supreme']){
  assert.ok(responsive.includes('.op-grid>.op-item.rarity-'+rarity+':not(.empty)'),
    'backpack is missing rarity '+rarity);
  assert.ok(responsive.includes('.op-equip-slot.filled.rarity-'+rarity),
    'equipment is missing rarity '+rarity);
  assert.ok(responsive.includes('inventory-slots/'+rarity+'.png'),
    'the original illustrated frame is missing rarity '+rarity);
}
console.log('Inventory dynamic grid, pagination and dark equipment slot contracts passed');
