const assert = require('node:assert/strict');
const appearance = require('../tools/paper-doll-96-v3/appearance.js');
const rgba = new Uint8ClampedArray([220,145,80,255, 30,45,90,255, 200,190,190,0]);
const mask = appearance.materialMask(rgba, 'skin');
assert.deepEqual(Array.from(mask).slice(1), [0,0]);
const before = new Uint8ClampedArray(rgba);
for (const palette of Object.values(appearance.skins)) {
  const next = appearance.recolor(rgba, mask, palette.ramp);
  assert.deepEqual(next.slice(4), rgba.slice(4), 'skin palette must not recolor cloth/transparent pixels');
  assert.equal(next[3], 255);
}
assert.deepEqual(rgba, before, 'palette changes preserve the source');
assert.equal(Object.keys(appearance.skins).length, 8);
assert.equal(Object.keys(appearance.hairs).length, 10);
assert.throws(() => appearance.recolor(rgba, new Uint8Array(1), appearance.skins.light.ramp));
assert.equal(appearance.catalogItem([{ itemId:22,kind:'pants' }],22,'boots'),null);
assert.equal(appearance.catalogItem([{ itemId:22,kind:'pants' }],22,'pants').itemId,22);
const joints = ['NOSE','NECK','LEFT HIP','RIGHT HIP','LEFT KNEE','RIGHT KNEE','LEFT LEG','RIGHT LEG','LEFT ELBOW','RIGHT ELBOW','LEFT ARM','RIGHT ARM'];
const values = [[64,34],[64,50],[70,72],[58,72],[71,90],[57,90],[72,108],[56,108],[80,62],[48,62],[83,74],[45,74]];
const rest = joints.map((label,i)=>({label,x:values[i][0]/128,y:values[i][1]/128}));
const source = new Uint8ClampedArray(128*128*4);source.set([100,90,80,255],(106*128+72)*4);
const out = appearance.attach(source,'boots',rest,rest,null,16,160,160);
assert.deepEqual(Array.from(out.LEFT.slice(((106+16)*160+72+16)*4,((106+16)*160+72+16)*4+4)),[100,90,80,255]);
const pose = rest.map(j=>({...j,x:j.label==='LEFT LEG'?j.x+.04:j.x}));
const moved = appearance.attach(source,'boots',rest,pose,null,16,160,160);
assert.notDeepEqual(moved.LEFT,out.LEFT,'footwear follows ankle motion');
console.log('96px appearance: indexed palettes, skin isolation, immutable source, item IDs and paired ankle sockets passed');
const fs = require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../tools/paper-doll-96-v3');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'appearance-catalog.json')));
assert.equal(catalog.productionEnabled,false);
assert.equal(catalog.styles.length,20);
assert.deepEqual(catalog.styles.filter(s=>s.itemId!==undefined).map(s=>s.itemId).sort((a,b)=>a-b),[8,9,18,19,21,22,23,24,25,26]);
for(const style of catalog.styles)for(const body of ['masculino','feminino'])for(const direction of ['south','north','west','east']){
  const file=style.layers[body][direction];assert.match(file,/^assets\/[a-z0-9-]+\.png$/);
  const png=fs.readFileSync(path.join(root,file));assert.equal(png.readUInt32BE(16),128);assert.equal(png.readUInt32BE(20),128);
  if(style.kind==='face')assert.equal(style.physiognomy,'original','rejected generated faces must not return');
}
assert.equal(catalog.headCalibration.south.hairX,1);
const fit=JSON.parse(fs.readFileSync(path.join(root,'appearance-rig.json')));
assert.equal(fit.contactCalibration.measuredFrames,336);
for(const body of ['masculino','feminino'])for(const directions of Object.values(fit.clips[body]))for(const clip of Object.values(directions)){
  assert.equal(clip.fitSource,'measured-on-new-neutral-body');
  for(const pose of clip.poses){assert.equal(pose.length,18);assert.ok(pose.every(j=>Number.isFinite(j.x)&&Number.isFinite(j.y)));}
}
const fabric=new Uint8ClampedArray(128*128*4),neutral=new Uint8ClampedArray(160*160*4);
for(let y=65;y<111;y++)for(let x=48;x<80;x++)fabric.set([25,40,75,255],(y*128+x)*4);
for(let y=90;y<120;y++)for(let x=70;x<88;x++)neutral.set([190,189,188,255],(y*160+x)*4);
const fitted=appearance.fitTrousersToBody(fabric,neutral,rest,rest,16,160,160);
assert.equal(fitted[(100*160+78)*4+3],255,'trousers cover the actual neutral body');
assert.deepEqual(Array.from(fitted.slice((100*160+78)*4,(100*160+78)*4+3)),[25,40,75]);
assert.equal(fitted[0],0,'fitting must not extend outside the real body');
console.log('96px wardrobe: 20 models, 10 existing item IDs, 336 measured poses, clean original faces and silhouette coverage passed');
