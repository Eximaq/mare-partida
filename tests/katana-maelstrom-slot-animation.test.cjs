'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const game=fs.readFileSync(path.join(root,'game.js'),'utf8');
const catalog=fs.readFileSync(path.join(root,'item-catalog.js'),'utf8');
const def=catalog.split(/\r?\n/).find(line=>line.includes("name:'Katana da Maelstrom'"));
assert.ok(def,'Katana da Maelstrom is registered');
assert.ok(def.includes("rarity:'legendary',fixedRarity:true"),'Katana keeps the existing Legendary rarity');
assert.ok(def.includes("icon_path:'assets/ui/items-pixellab/katana-de-maelstrom.png?v=20261022'"),'the static item icon remains available outside slots');
assert.ok(def.includes("spriteSheet:'assets/ui/items-pixellab/katana-de-maelstrom-animation.png?v=20261023-slot'"),'animation uses the supplied sprite sheet');
assert.ok(def.includes("frameWidth:64,frameHeight:64,columns:4,rows:4,frames:16,duration:.5,className:'maelstrom-katana-slot-animation'"),'all 16 64px frames use the existing 0.5 second slot timeline');
assert.ok(game.includes("function invSymbol(entry){return itemIcon(entry.kind==='gear'?entry.item.def:entry.kind,entry.name,true);}"),'the backpack requests animated slot icons');
assert.ok(game.includes('item?itemIcon(item.def,itemBase(item).name,true)'),'equipped slots request animated slot icons');
assert.ok(game.includes('if(def?.icon_path)return'),'non-slot views retain the static icon');

const css=fs.readFileSync(path.join(root,'inventory-compact.css'),'utf8');
assert.ok(css.includes('background-size:var(--slot-sprite-size)'),'sprite sheet uses the existing slot renderer');
assert.ok(css.includes('animation-timing-function:steps(1,end)'),'pixel-art frames remain crisp');
assert.ok(css.includes('prefers-reduced-motion:reduce'),'reduced motion is supported');
const timelineStart=css.indexOf('@keyframes maelstrom-katana-slot-frames{');
const timelineEnd=css.indexOf('\n@media',timelineStart);
assert.ok(timelineStart>=0&&timelineEnd>timelineStart,'Katana slot timeline exists');
const timeline=css.slice(timelineStart,timelineEnd);
assert.equal((timeline.match(/%\{background-position:/g)||[]).length,17,'the 16 supplied frames loop back to the first frame');
assert.ok(timeline.includes('0%{background-position:0% 0%'),'animation starts on the first sprite');
assert.ok(timeline.includes('93.75%{background-position:100% 100%'),'animation reaches the final sprite');

const sheet=fs.readFileSync(path.join(root,'assets/ui/items-pixellab/katana-de-maelstrom-animation.png'));
assert.equal(sheet.subarray(0,8).toString('hex'),'89504e470d0a1a0a','animation sheet is a PNG');
assert.equal(sheet.readUInt32BE(16),256,'source sheet width is preserved');
assert.equal(sheet.readUInt32BE(20),256,'source sheet height is preserved');
assert.equal(sheet[25],6,'sprite transparency is preserved');
console.log('Katana da Maelstrom 4x4 sprite animation is mapped to backpack and equipment slots.');
