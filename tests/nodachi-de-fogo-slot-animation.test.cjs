'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const game=fs.readFileSync(path.join(root,'game.js'),'utf8');
const def=game.split(/\r?\n/).find(line=>line.includes("name:'Nodachi de Fogo'"));
assert.ok(def,'Nodachi de Fogo is registered');
assert.ok(def.includes("icon_path:'assets/ui/items-pixellab/nodachi-de-fogo.png?v=20261022'"),'the existing item art remains available as a static fallback');
assert.ok(def.includes("spriteSheet:'assets/ui/items-pixellab/nodachi-de-fogo-animation.png?v=20261022-slot'"),'animation uses the supplied frame sheet');
assert.ok(def.includes('frameWidth:64,frameHeight:64,columns:4,rows:4,frames:16,duration:.5'),'all 16 64px frames use the expected timeline');
assert.ok(game.includes("function itemIcon(key,name='',animatedSlot=false)"),'item rendering supports an animated slot variant');
assert.ok(game.includes('if(animatedSlot&&def?.slotAnimation)'),'animation is opt-in for item slots');
assert.ok(game.includes("function invSymbol(entry){return itemIcon(entry.kind==='gear'?entry.item.def:entry.kind,entry.name,true);}"),'the bag requests the animated item icon');
assert.ok(game.includes('item?itemIcon(item.def,itemBase(item).name,true)'),'the equipped item slot requests the animated icon');
assert.ok(game.includes('if(def?.icon_path)return'), 'non-slot item views retain the original icon');

const css=fs.readFileSync(path.join(root,'inventory-compact.css'),'utf8');
assert.ok(css.includes('background-size:var(--slot-sprite-size)'),'sprite sheet is scaled as a 4x4 grid');
assert.ok(css.includes('animation-timing-function:steps(1,end)'),'each frame is held as a discrete pixel-art frame');
assert.ok(css.includes('prefers-reduced-motion:reduce'),'reduced-motion settings keep the first frame still');
const timelineStart=css.indexOf('@keyframes nodachi-fire-slot-frames{');
const timelineEnd=css.indexOf('\n@media',timelineStart);
assert.ok(timelineStart>=0&&timelineEnd>timelineStart,'slot animation timeline exists');
const timeline=css.slice(timelineStart,timelineEnd);
assert.equal((timeline.match(/%\{background-position:/g)||[]).length,17,'the 16 supplied frames are followed by a reset to frame one');
assert.ok(timeline.includes('0%{background-position:0% 0%'),'animation begins on the first sprite');
assert.ok(timeline.includes('93.75%{background-position:100% 100%'),'animation reaches the last sprite');

const sheet=fs.readFileSync(path.join(root,'assets/ui/items-pixellab/nodachi-de-fogo-animation.png'));
assert.equal(sheet.subarray(0,8).toString('hex'),'89504e470d0a1a0a','animation sheet is a PNG');
assert.equal(sheet.readUInt32BE(16),256,'sheet width is preserved');
assert.equal(sheet.readUInt32BE(20),256,'sheet height is preserved');
assert.equal(sheet[25],6,'sprite transparency is preserved');
console.log('Nodachi de Fogo 4x4 sprite animation is mapped to inventory and equipment slots.');
