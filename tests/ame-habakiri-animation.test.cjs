'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const game=fs.readFileSync(path.join(root,'game.js'),'utf8');
const line=game.split(/\r?\n/).find(x=>x.includes("name:'Meito: Ame no Habakiri'"));
assert.ok(line,'Ame no Habakiri definition exists');
assert.ok(line.includes("spriteSheet:'assets/effects/ame-no-habakiri-attack.png?v=20261022-attack'"),'weapon uses the supplied animation atlas');
assert.ok(line.includes('frameWidth:64,frameHeight:64,frames:16,duration:.5,fade:.1,scale:80'),'animation uses all 16 frames at the configured timing');
assert.ok(game.includes('const weaponAttackImages=Object.fromEntries(itemDefs.filter(def=>def.attackVfx?.spriteSheet)'), 'weapon VFX is preloaded once');
assert.ok(game.includes('const weaponDef=itemBase(game.equipment?.weapon),vfx=weaponDef?.attackVfx,image=weaponDef?weaponAttackImages[weaponDef.name]:null'),'equipped weapon selects its own VFX');
assert.ok(game.includes('weaponVfx:{...vfx,image},life,max:life'),'successful hits enqueue the timed animation');
assert.ok(game.includes('Math.floor(elapsed/vfx.duration*vfx.frames)'),'rendering advances through frames using elapsed time');
assert.ok(game.includes('ctx.drawImage(vfx.image,frame*vfx.frameWidth,0,vfx.frameWidth,vfx.frameHeight'),'renderer draws the selected atlas frame');

const sheet=fs.readFileSync(path.join(root,'assets/effects/ame-no-habakiri-attack.png'));
assert.equal(sheet.subarray(0,8).toString('hex'),'89504e470d0a1a0a','animation atlas is PNG');
assert.equal(sheet.readUInt32BE(16),64*16,'atlas stores 16 adjacent 64px frames');
assert.equal(sheet.readUInt32BE(20),64,'atlas frame height is 64px');
assert.equal(sheet[25],6,'atlas preserves RGBA transparency');

console.log('Ame no Habakiri attack atlas, timing, preload and equipped-hit renderer verified.');
