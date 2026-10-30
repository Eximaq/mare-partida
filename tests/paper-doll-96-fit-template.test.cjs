'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../tools/paper-doll-96-v3');
const api=require(path.join(root,'appearance.js'));
const surface=require(path.join(root,'surface.js'));
const head=require('../tools/paper_doll_96_head_materials.cjs');
const panel=require('../tools/paper_doll_96_surface_assembly.cjs');
const kit=require(path.join(root,'fit-template.json'));
const catalog=require(path.join(root,'appearance-catalog.json'));
assert.equal(kit.schema,'mare-native-fit-96-v1');
assert.deepEqual(kit.canvas.rest,[128,128]);assert.deepEqual(kit.canvas.attack,[160,160]);
assert.deepEqual(kit.canvas.pivotRest,[64,112]);assert.deepEqual(kit.canvas.pivotAttack,[80,128]);
assert.deepEqual(kit.atlas.columns,['south','north','west','east']);
assert.deepEqual(kit.alpha,[0,255]);assert.equal(kit.productionEnabled,false);
assert.equal(catalog.canonicalMirror.pixelSum,128);
assert.equal(catalog.canonicalMirror.allLayers,true);
assert.deepEqual(catalog.sideMirroring.pixelCoordinateSums,{masculino:128,feminino:128});
for(const style of catalog.styles)if(style.sideMirroring){
  assert.equal(style.sideMirroring.malePixelCoordinateSum,128);
  assert.equal(style.sideMirroring.femalePixelCoordinateSum,128);
}
for(const file of Object.values(kit.references)){
  assert.match(file,/^assets\/[a-z0-9-]+\.png$/);
  const png=fs.readFileSync(path.join(root,file));
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png.readUInt32BE(16),512);assert.equal(png.readUInt32BE(20),256);
}
for(const style of catalog.styles)if(['boots','gloves','pants'].includes(style.kind)){
  for(const body of kit.atlas.rows)for(const dir of kit.atlas.columns){
    const expected=style.kind==='pants'?kit.trouserPanels:kit.pairPanels;
    assert.deepEqual(Object.keys(style.parts[body][dir]).sort(),expected.slice().sort());
    for(const file of Object.values(style.parts[body][dir]))assert.ok(fs.existsSync(path.join(root,file)));
  }
}
const material=new Uint8ClampedArray(128*128*4);
for(let x=10;x<60;x++)material.set([25+x,25+x,25+x,255],x*4);
material.set([3,4,5,255],0);
const mask=api.materialMask(material,'hair');
assert.equal(mask[0],0,'native hair ink must not be repainted');
assert.ok(new Set(mask).size>=3,'dark hairstyles retain controlled tonal bands');
assert.equal(mask[10],mask[11],'near-identical tones must not become high-contrast isolated pixels');
assert.ok(new Set(mask).size<=4,'narrow source ranges must not be stretched to the full palette');
const dyed=api.recolor(material,mask,api.hairs.blonde.ramp);
assert.deepEqual(Array.from(dyed.subarray(0,4)),[3,4,5,255]);
assert.deepEqual(Array.from(material.subarray(0,4)),[3,4,5,255]);
const axis=surface.axis({x:20,y:40},{x:30,y:80}),v={x:35,y:60},local=axis.at(v.x,v.y),round=axis.point(local.along,local.across);
assert.ok(Math.hypot(round.x-v.x,round.y-v.y)<1e-9);
const source=new Uint8ClampedArray(128*128*4),body=new Uint8ClampedArray(source.length),fitted=new Uint8ClampedArray(source.length);
for(let y=50;y<60;y++)for(let x=50;x<60;x++){const i=(y*128+x)*4;body.set([180,120,70,255],i);source.set([30,50,80,255],i);fitted.set([30,50,80,255],i);}
fitted.set([30,50,80,255],(100*128+100)*4);
const constrained=surface.constrainVolume(fitted,source,body,body,128,128);
assert.equal(constrained[(100*128+100)*4+3],0);assert.equal(fitted[(100*128+100)*4+3],255);
assert.equal(constrained[(55*128+55)*4+3],255);
const hair=new Uint8ClampedArray(source.length);for(let y=16;y<30;y++)for(let x=55;x<70;x++)hair.set([80,80,80,255],(y*128+x)*4);
hair.set([255,255,255,255],(36*128+74)*4);
assert.equal(head.cleanHair(hair)[(36*128+74)*4+3],0);
assert.equal(head.cleanHair(hair)[(20*128+60)*4+3],255);
assert.deepEqual(head.mirrorHairEast(head.mirrorHairEast(hair,'masculino'),'masculino'),hair);
assert.equal(typeof panel.splitTrousers,'function');
console.log('96px reusable template: native sizes, complete limb panels, indexed shading, body-constrained volume and head cleanup passed');

{const r=kit.restContacts.masculino.south,src=new Uint8ClampedArray(128*128*4);for(let y=20;y<50;y++)src.set([60,60,60,255],(y*128+64)*4);const out=api.clipHairCrown(src,r,{x:.25,y:.4,angle:.2},0,128,128,34);for(let i=3;i<out.length;i+=4)assert.ok(out[i]===0||out[i]===255);assert.equal(src[(20*128+64)*4+3],255);}

{const iris=new Uint8ClampedArray([100,60,30,255,210,140,80,255]),mask=api.materialMask(iris,'skin',[0]);const dyed=api.recolor(iris,mask,api.skins.ebony.ramp);assert.deepEqual(Array.from(dyed.subarray(0,4)),[100,60,30,255]);assert.notDeepEqual(Array.from(dyed.subarray(4,8)),[210,140,80,255]);}

{const canonical=require('../tools/paper_doll_96_canonical_materials.cjs');const src=new Uint8ClampedArray(128*128*4);src.set([232,175,98,255],(20*128+64)*4);const area=new Uint8ClampedArray(src.length);area[(20*128+64)*4]=255;assert.equal(canonical.extractHair(src,area)[(20*128+64)*4+3],255,'valid light hair must remain opaque');assert.equal(catalog.canonicalMirror.pixelSum,128);assert.equal(catalog.canonicalMirror.allLayers,true);assert.equal(catalog.headFit,'canonical-neck-v7');}
