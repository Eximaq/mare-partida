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
assert.equal(catalog.styles.length,26);
assert.deepEqual(catalog.styles.filter(s=>s.itemId!==undefined).map(s=>s.itemId).sort((a,b)=>a-b),[8,9,18,19,21,22,23,24,25,26]);
for(const style of catalog.styles)for(const body of ['masculino','feminino'])for(const direction of ['south','north','west','east']){
  const file=style.layers[body][direction];assert.match(file,/^assets\/[a-z0-9-]+\.png$/);
  const png=fs.readFileSync(path.join(root,file));assert.equal(png.readUInt32BE(16),128);assert.equal(png.readUInt32BE(20),128);
  if(style.kind==='face')assert.ok(['original','original-derived'].includes(style.physiognomy),'faces must derive from the clean original');
}
assert.equal(catalog.headCalibration.south.hairX,1);
const fit=JSON.parse(fs.readFileSync(path.join(root,'appearance-rig.json')));
assert.equal(fit.contactCalibration.measuredFrames,416);
for(const body of ['masculino','feminino'])for(const directions of Object.values(fit.clips[body]))for(const clip of Object.values(directions)){
  assert.equal(clip.fitSource,'measured-on-new-neutral-body-and-refined');
  for(const pose of clip.poses){assert.equal(pose.length,18);assert.ok(pose.every(j=>Number.isFinite(j.x)&&Number.isFinite(j.y)));}
}
const fabric=new Uint8ClampedArray(128*128*4),neutral=new Uint8ClampedArray(160*160*4);
for(let y=65;y<111;y++)for(let x=48;x<80;x++)fabric.set([25,40,75,255],(y*128+x)*4);
for(let y=90;y<120;y++)for(let x=70;x<88;x++)neutral.set([190,189,188,255],(y*160+x)*4);
const fitted=appearance.fitTrousersToBody(fabric,neutral,rest,rest,16,160,160);
assert.equal(fitted[(100*160+78)*4+3],255,'trousers cover the actual neutral body');
assert.deepEqual(Array.from(fitted.slice((100*160+78)*4,(100*160+78)*4+3)),[25,40,75]);
assert.equal(fitted[0],0,'fitting must not extend outside the real body');
console.log('96px wardrobe: 26 models, 10 existing item IDs, 416 measured poses, clean original faces and silhouette coverage passed');

assert.deepEqual(catalog.coverage.generatedPosesPending,[]);
assert.equal(catalog.styles.find(s=>s.id==='item-19').hairOcclusion,'crown');
for(const body of ['masculino','feminino'])for(const action of ['idle','walk'])for(const direction of ['south','north','west','east']){
  const pack=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'))),clip=pack.bodies[body].clips[action][direction];
  assert.equal(clip.frames,action==='idle'?4:8);assert.equal(clip.loop,true);
  assert.ok(clip.layers.body&&clip.layers.face&&clip.layers.hair&&clip.layers.pants&&clip.layers.top);
}
console.log('Four-direction idle/walk coverage, clean face policy and helmet hair occlusion passed');

const headMask=new Uint8ClampedArray([1,2,3,0,4,5,6,100]);
assert.deepEqual(Array.from(appearance.clipToHead(new Uint8ClampedArray([9,8,7,255,6,5,4,255]),headMask)),[9,8,7,0,6,5,4,100]);
assert.throws(()=>appearance.clipToHead(new Uint8ClampedArray(4),new Uint8ClampedArray(8)));
const capeRest=rest.concat([{label:'LEFT SHOULDER',x:76/128,y:52/128},{label:'RIGHT SHOULDER',x:52/128,y:52/128}]);
const capePose=capeRest.map(p=>({...p,x:p.x+.04,y:p.y-.02}));
const mapped=appearance.shoulderTransform(capeRest,capePose,16).map({x:64,y:52});
assert.ok(Math.abs(mapped.x-(64+.04*128+16))<.0001);assert.ok(Math.abs(mapped.y-(52-.02*128+16))<.0001);
assert.deepEqual(catalog.sideMirroring.pixelCoordinateSums,{masculino:127,feminino:128});
for(const collection of ['originalHeads','originalHairs','originalHands'])for(const body of ['masculino','feminino'])for(const dir of ['south','north','west','east'])assert.ok(fs.existsSync(path.join(root,catalog[collection][body][dir])));
console.log('Face containment, exact mirror pivots and shoulder-bound cape transport passed');

const {refineContacts}=require('../tools/paper_doll_96_contact_refinement.cjs');
const guide=fit.rests.masculino.south.map(p=>({...p})),collapsed=guide.map(p=>({...p})),snapshot=JSON.stringify(collapsed);
for(const suffix of ['KNEE','LEG']){const a=collapsed.find(p=>p.label==='LEFT '+suffix),b=collapsed.find(p=>p.label==='RIGHT '+suffix);a.x=b.x;a.y=b.y;}
const silhouette=new Uint8ClampedArray(128*128*4);
for(const p of guide)for(let y=Math.round(p.y*128)-3;y<=Math.round(p.y*128)+3;y++)for(let x=Math.round(p.x*128)-3;x<=Math.round(p.x*128)+3;x++)if(x>=0&&y>=0&&x<128&&y<128)silhouette[(y*128+x)*4+3]=255;
const measuredBefore=JSON.stringify(collapsed),refined=refineContacts(collapsed,guide,silhouette,128,128);
assert.equal(JSON.stringify(collapsed),measuredBefore,'contact repair must not mutate measurements');
const left=refined.points.find(p=>p.label==='LEFT LEG'),right=refined.points.find(p=>p.label==='RIGHT LEG');
assert.ok(Math.hypot(left.x-right.x,left.y-right.y)*128>8,'collapsed ankle contacts must recover separate visible feet');
assert.ok(refined.changes.some(c=>c.reason==='collapsed-contact'));
assert.throws(()=>refineContacts([],guide,silhouette,128,128));
console.log('Collapsed ankle regression: labelled guide and native silhouette restore both boots independently');

const motion=require('../tools/paper-doll-96-v3/motion.js'),patch=new Uint8ClampedArray(128*128*4);
for(let y=55;y<61;y++)for(let x=60;x<69;x++)patch.set([150+x,90,30,255],(y*128+x)*4);
for(const angle of [0,.4,-.3]){const map=p=>({x:16+64+(p.x-64)*Math.cos(angle)-(p.y-64)*Math.sin(angle),y:16+64+(p.x-64)*Math.sin(angle)+(p.y-64)*Math.cos(angle)});
assert.deepEqual(motion.rasterMesh(patch,128,128,appearance.opaqueMesh(patch,map),160,160),motion.rasterMesh(patch,128,128,motion.affineMesh(map),160,160),'bounded raster must preserve native pixels');}
console.log('Opaque-region raster is pixel-identical to full-canvas raster for rigid transforms');

const shortFabric=new Uint8ClampedArray(128*128*4),bareBody=new Uint8ClampedArray(128*128*4);
for(let y=65;y<=85;y++)for(let x=48;x<80;x++)shortFabric.set(y===85?[10,10,10,255]:[25,40,75,255],(y*128+x)*4);
for(const [x,y] of [[83,74],[71,94],[71,80]])bareBody.set([210,140,80,255],(y*128+x)*4);
const shorts=appearance.fitTrousersToBody(shortFabric,bareBody,rest,rest,0,128,128);
assert.equal(shorts[(74*128+83)*4+3],0,'fabric must not paint the free hand');
assert.equal(shorts[(94*128+71)*4+3],0,'hem ink must not extend down the bare leg');
assert.equal(shorts[(80*128+71)*4+3],255,'valid garment surface remains covered');
console.log('Garment extent regression: free hands and bare legs remain outside the shorts');

const {cleanDetached}=require('../tools/paper_doll_96_contact_refinement.cjs'),noise=new Uint8ClampedArray(32*32*4);
for(let y=10;y<22;y++)for(let x=10;x<22;x++)noise[(y*32+x)*4+3]=255;
for(let y=1;y<=2;y++)for(let x=1;x<=8;x++)noise[(y*32+x)*4+3]=255;
noise[(28*32+28)*4+3]=200;
const clean=cleanDetached([noise],32,32,[{x:28,y:28}]);
assert.equal(clean.removed.length,16);assert.equal(clean.layers[0][(28*32+28)*4+3],200);
assert.equal(noise[(1*32+1)*4+3],255,'cleanup preserves source for undo');
console.log('Detached non-anatomical clusters are removed while nearby fingertip pixels survive');

{
  const {cleanHeadFragments}=require('../tools/paper_doll_96_customization_assembly.cjs');
  const src=new Uint8ClampedArray(512*256*4),put=(x,y)=>{src[(y*512+x)*4+3]=255;};
  for(let y=15;y<25;y++)for(let x=50;x<70;x++)put(x,y);
  put(60,40);put(61,40);put(75,20);
  const out=cleanHeadFragments(src,512,256);
  assert.equal(out[(40*512+60)*4+3],0);
  assert.equal(out[(20*512+75)*4+3],255);
  assert.equal(src[(40*512+60)*4+3],255);
}
console.log('Headgear cleanup regression: facial scraps removed, highlights retained');
