'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const manifest=JSON.parse(read('assets/ui/inventory-slots/manifest.json'));
const css=read('ui-screens.css');
const game=read('game.js');
const builder=read('tools/build_pages.py');
const expected=[
  ['common','Comum','#8A8A8A'],
  ['uncommon','Incomum','#00DD55'],
  ['rare','Raro','#008CFF'],
  ['epic','Épico','#A020F0'],
  ['legendary','Lendário','#FFB900'],
  ['supreme','Supremo','#FF2020']
];

assert.deepEqual(manifest.rarities.map(({id,label,referenceHex})=>[id,label,referenceHex]),expected);
assert.match(read('index.html'),/<link rel="stylesheet" href="ui-screens\.css" \/>/,'rarity frames use the inventory screen stylesheet');
assert.match(builder,/shutil\.copytree\(ROOT\/folder, OUT\/folder\)/,'Pages copies the new frame PNGs with assets');
assert.match(game,/rarity:itemRarity\(item\)/,'inventory entries use existing item rarity metadata');
assert.match(game,/class="op-item rarity-\$\{entry\.rarity\}/,'occupied item slots receive the metadata rarity class');
assert.match(game,/class="op-item empty" aria-hidden="true"/,'empty slots stay neutral and have no rarity class');
assert.match(game,/class="op-item-icon">\$\{icon\}/,'item artwork remains inside the slot content');
assert.match(css,/background-size:contain;background-origin:border-box/,'frame images retain their aspect ratio and fill the slot box');
assert.match(css,/\.op-item\.empty\{background:var\(--rpg-recess\);border-color:var\(--rpg-recess-edge\)\}/,'empty slots retain the neutral inventory style');

for(const [id] of expected){
  const relative=`assets/ui/inventory-slots/${id}.png`;
  const image=fs.readFileSync(path.join(root,relative));
  assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a',`${id} is a PNG`);
  assert.equal(image.readUInt32BE(16),400,`${id} crop width`);
  assert.equal(image.readUInt32BE(20),382,`${id} crop height`);
  assert.equal(image[25],6,`${id} has external alpha transparency`);
  assert.ok(css.includes(`.op-item.rarity-${id}:not(.empty){background-image:url("${relative}")}`),`${id} metadata maps to its frame`);
}

assert.ok(game.includes("item?'filled rarity-'+rarity:''"),'equipped slots receive their item metadata rarity class');
assert.ok(css.includes('.op-equip-slot.filled.rarity-common,.op-equip-slot.filled.rarity-uncommon'),'occupied equipment slots use rarity frames while empty equipment stays neutral');
for(const [id] of expected){
  const relative='assets/ui/inventory-slots/'+id+'.png';
  const equipmentRule='.op-equip-slot.filled.rarity-'+id+'{background-image:url("'+relative+'")';
  assert.ok(css.includes(equipmentRule),'equipped '+id+' items use their rarity frame');
}

console.log('Inventory rarity slots: six metadata mappings and transparent frames verified for bag and equipment slots.');
