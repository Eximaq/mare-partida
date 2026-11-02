'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const game=fs.readFileSync(path.join(root,'game.js'),'utf8');
const catalog=fs.readFileSync(path.join(root,'item-catalog.js'),'utf8');
const styles=fs.readFileSync(path.join(root,'ui-nautical.css'),'utf8')+fs.readFileSync(path.join(root,'inventory-compact.css'),'utf8')+fs.readFileSync(path.join(root,'ui-screens.css'),'utf8');
const weapons=[
  ['Katana da Maelstrom','legendary','katana-de-maelstrom.png','Uma katana lendária que carrega a fúria dos redemoinhos. Sua lâmina canaliza correntes de vento em movimentos circulares, transformando cada golpe em uma tempestade cortante.',[97,104]],
  ['Nodachi de Kairouseki','epic','nodachi-de-kairouseki.png','Uma nodachi forjada com Kairouseki, o lendário mineral dos mares. Sua lâmina enfraquece usuários de Akuma no Mi ao contato, anulando sua resistência sobrenatural e tornando-os vulneráveis ao aço.',[112,116]],
  ['Nodachi de Fogo','legendary','nodachi-de-fogo.png','Uma imponente nodachi envolta pelo calor das chamas. Seus golpes liberam energia flamejante, capazes de incendiar inimigos e deixar um rastro ardente pelo campo de batalha.',[111,116]],
  ['Meito: Ame no Habakiri','supreme','ame-no-habakiri.png','Uma espada lendária empunhada por Kozuki Oden, reconhecida entre as grandes Meito de Wano. Diz-se que sua lâmina é capaz de cortar os próprios céus, carregando o legado de um dos maiores samurais da história.',[112,117]]
];

const priorCatalog=catalog.indexOf('itemDefs.push(...MareAkuma.catalog.slice(0,5).map');
const firstNewWeapon=catalog.indexOf("name:'Katana da Maelstrom'");
assert.ok(priorCatalog>=0&&firstNewWeapon>priorCatalog,'weapons are appended after existing save-indexed catalog entries');
assert.ok(catalog.includes("type:'sword',attack:11,defense:0,hp:0"),'weapons reuse the existing 11-attack Espadachim baseline');
assert.ok(game.includes('if(def?.icon_path)return'), 'custom image paths render as item icons');
assert.ok(game.includes('const description=def.description||('),'item descriptions reach tooltips');
assert.ok(game.includes('item.rarity=def.fixedRarity?def.rarity:'),'fixed-rarity weapons retain their configured rarity');
assert.ok(game.includes("d.type===game.classId"),'weapon drops remain class-restricted');
assert.ok(game.includes("d.rarity===rarity&&d.rarity!=='supreme'"),'fixed-rarity drops match the existing rarity roll and Supreme remains outside normal drops');
assert.ok(game.includes("def.slot==='weapon'&&def.type==='sword'?'sword-weapon-art':''"),'provided sword art receives its dedicated display sizing');
assert.match(styles,/\.item-icon\{[^}]*object-fit:contain[^}]*image-rendering:pixelated/,'source art scales to UI bounds without stretching');
assert.ok(styles.includes('.op-item-icon .item-icon.sword-weapon-art{width:40px;height:40px'),'inventory artwork uses the larger square fit');
assert.ok(styles.includes('.op-slot-icon .item-icon.sword-weapon-art{width:36px;height:36px'),'equipped artwork uses the larger square fit');

for(const [name,rarity,file,description,size] of weapons){
  const definitionLine=catalog.split(/\r?\n/).find(line=>line.includes("name:'"+name+"'"));
  assert.ok(definitionLine,name+' is registered');
  assert.ok(definitionLine.includes("slot:'weapon',type:'sword'"),name+' is exclusive to Espadachim');
  assert.ok(definitionLine.includes("rarity:'"+rarity+"',fixedRarity:true"),name+' keeps its requested rarity');
  assert.ok(definitionLine.includes("description:'"+description+"'"),name+' has the supplied description');
  assert.ok(definitionLine.includes("icon_path:'assets/ui/items-pixellab/"+file+"?v=20261022'"),name+' uses its provided sprite');
  const image=fs.readFileSync(path.join(root,'assets/ui/items-pixellab',file));
  assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a',name+' asset is PNG');
  assert.equal(image.readUInt32BE(16),size[0],name+' losslessly trimmed asset width');
  assert.equal(image.readUInt32BE(20),size[1],name+' losslessly trimmed asset height');
  assert.equal(image[25],6,name+' asset preserves RGBA transparency');
}

console.log('Four sword definitions, class/rareness metadata, descriptions, save-safe indices and provided RGBA sprites verified.');
