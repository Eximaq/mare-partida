'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
require('../sprite-combat-v2-data.js');
const root=path.join(__dirname,'..');
function size(file){const b=fs.readFileSync(path.join(root,file));assert.equal(b.subarray(1,4).toString(),'PNG');return[b.readUInt32BE(16),b.readUInt32BE(20)];}
let count=0;for(const dirs of Object.values(globalThis.MareSpriteCombatV2Data.ryu.clips))for(const c of Object.values(dirs))if(c.image.includes('rework-v3')){assert.deepEqual(size(c.image),[c.size*c.frames,c.size]);for(const b of c.bounds)assert.ok(b[0]>=0&&b[1]>=0&&b[2]<=c.size&&b[3]<=c.size);assert.ok(c.anchor[1]<=c.size);count++;}
assert.equal(count,8);
for(const [file,w,h] of [['mordida-focal',384,48],['poeira',1024,64],['leopard',768,192],['furia-atras',768,640],['furia-frente',768,640],['chicote-arco',768,640],['casco-atras',640,512],['casco-frente',640,512],['investida-poeira',640,512]])assert.deepEqual(size(`assets/akuma/zoan/reworks/${file}.png`),[w,h]);
assert.deepEqual(size('assets/akuma/wolf/aura-garras-v2.png'),[768,384]);
console.log('Eight Ryu clips plus ten Zoan VFX atlases have valid PNG dimensions, cell bounds and anchors.');
