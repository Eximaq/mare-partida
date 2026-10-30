'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '../tools/paper-doll-96-v3');
const appearance = require(path.join(root, 'appearance.js'));
const torso = require(path.join(root, 'torso.js'));
const head = require('../tools/paper_doll_96_head_materials.cjs');
const { cleanHeadwear } = require('../tools/paper_doll_96_headwear.cjs');
const catalog = require(path.join(root, 'appearance-catalog.json'));
const rig = require(path.join(root, 'appearance-rig.json'));
assert.ok(catalog.equipmentSlots.includes('torso'));
assert.deepEqual(catalog.styles.filter(s => s.kind === 'torso').map(s => [s.itemId, s.equipmentSlot]), [[6, 'coat'], [7, 'coat']]);
assert.equal(catalog.styles.find(s => s.itemId === 19).hairOcclusion, 'all');
for(const style of catalog.styles.filter(s=>s.kind==='torso'))for(const body of ['masculino','feminino'])for(const action of ['idle','walk','attack-sword','attack-unarmed','attack-firearm','attack-daggers','attack-focus','attack-tech']){
  const atlas=style.animations[body][action],png=fs.readFileSync(path.join(root,atlas.file));
  assert.equal(atlas.framesPerDirection,action==='idle'?4:8);
  assert.deepEqual(atlas.directions,['south','north','west','east']);
  assert.equal(png.readUInt32BE(16),atlas.columns*atlas.cell);assert.equal(png.readUInt32BE(20),atlas.rows*atlas.cell);
  if(action==='attack-tech')assert.equal(atlas.file,style.animations[body]['attack-firearm'].file);
}
for (const style of catalog.styles.filter(s => s.kind === 'torso')) for (const maps of Object.values(style.layers)) for (const file of Object.values(maps)) {
  const png = fs.readFileSync(path.join(root, file));
  assert.equal(png.readUInt32BE(16), 128); assert.equal(png.readUInt32BE(20), 128);
}
const pixels = new Uint8ClampedArray(128 * 128 * 4), put = (x,y,rgb) => pixels.set([...rgb,255],(y*128+x)*4);
for(let y=20;y<30;y++)for(let x=54;x<74;x++)put(x,y,[25,42,75]);
put(65,34,[254,190,124]); put(65,28,[255,190,125]); put(64,19,[5,7,10]);
const snapshot = new Uint8ClampedArray(pixels), clean = cleanHeadwear(pixels);
assert.deepEqual(pixels, snapshot);
assert.equal(clean[(34*128+65)*4+3],0,'generated cheek cannot belong to headwear');
assert.equal(clean[(28*128+65)*4+3],0,'skin inside the accessory is removed too');
assert.equal(clean[(23*128+60)*4+3],255); assert.equal(clean[(19*128+64)*4+3],255);
const shades = new Uint8ClampedArray([79,24,12,255,254,190,124,255,8,7,7,255]);
const mask = appearance.materialMask(shades,'headSkin');
assert.ok(mask[0]>0&&mask[1]>0); assert.equal(mask[2],0);
const dyed=appearance.recolor(shades,mask,appearance.skins.ebony.ramp);
assert.notDeepEqual(dyed.slice(0,3),shades.slice(0,3));assert.deepEqual(dyed.slice(8),shades.slice(8));
const face = new Uint8ClampedArray([242,220,211,255,245,243,237,255,28,54,88,255]);
const paddedFace = new Uint8ClampedArray(128*128*4);paddedFace.set(face);
const detail=head.cleanFaceFeatures(paddedFace,[2]);assert.equal(detail[3],0);assert.equal(detail[7],255);assert.equal(detail[11],255);
const skull=new Uint8ClampedArray(128*128*4);for(let i=3;i<skull.length;i+=4)skull[i]=255;
const profile=head.profileFace(skull,'feminino',[[28,54,88],[80,120,160]]);
assert.equal(profile.protection.length,2);assert.ok(profile.pixels.some(v=>v===255));
const body=new Uint8ClampedArray(128*128*4),material=new Uint8ClampedArray(body.length);
for(let y=48;y<79;y++)for(let x=49;x<79;x++){body.set([220,145,80,255],(y*128+x)*4);material.set([25,45,75,255],(y*128+x)*4);}
const rest=rig.rests.masculino.south,result=torso.fit(material,body,rest,rest,0,128,128).full;
assert.ok(result.some((v,i)=>i%4===3&&v===255));
for(let i=3;i<result.length;i+=4)if(result[i])assert.equal(body[i],255,'torso cannot extend outside native body');
const blank=torso.fit(material,new Uint8ClampedArray(body.length),rest,rest,0,128,128).full;
assert.ok(blank.every(v=>v===0));
console.log('96px torso: existing coat IDs, native fit, profile features, head-only skin shades and headwear without baked flesh passed');
