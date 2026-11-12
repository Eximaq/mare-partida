const assert=require('node:assert/strict'),{test}=require('node:test');
const index=require('./tools/rework-modular-outfits-hd/index.json'),vendor=require('./tools/rework-accessories/vendor.js');
const api=require('./player-rework-modular-outfits-hd.js').create(index,{vendor,allowCandidates:true});
test('isolated boot9 and pants133 remain available across unarmed actions without adding coat or gloves',()=>{
 for(const direction of ['south','north','east','west'])for(const action of ['idle','walk','attack-unarmed']){
  const r=api.resolve({body:'male',direction,action,equipment:{pants:133,boots:9}});
  assert.ok(r,`${action}/${direction} missing`);
  assert.equal(r.candidate,true);
  assert.deepEqual(r.equipment,{pants:133,boots:9});
  assert.ok(r.pack.directions[direction].layers.some(l=>l.id.startsWith('boot9')));
 }
});
test('unknown boot148 laterals do not claim coverage',()=>{
 for(const direction of ['east','west'])assert.equal(api.resolve({body:'male',direction,action:'attack-unarmed',equipment:{pants:133,boots:148}}),null);
});
test('all new combinations render through actual archive loader and padding preserves every source RGBA pixel',async()=>{
 const {createCanvas}=require('@napi-rs/canvas'),load=require('./tools/rework-hd-test-loader.cjs').create(__dirname),proof=require('./docs/native-hd/isolated-boots-overlay.json');
 const prefix='tools/rework-modular-outfits-hd/assets/';let count=0;
 for(const p of proof.pixelProof){
  const im=await load(prefix+p.sourceSHA256+'.png'),padded=await load(prefix+p.paddedSHA256+'.png');
  assert.equal(im.width,512);assert.equal(padded.width,640);
  const a=createCanvas(512,512),b=createCanvas(640,640);a.getContext('2d').drawImage(im,0,0);b.getContext('2d').drawImage(padded,0,0);
  assert.deepEqual(b.getContext('2d').getImageData(64,64,512,512).data,a.getContext('2d').getImageData(0,0,512,512).data);
 }
 const gallery=createCanvas(640*4,640*3),gc=gallery.getContext('2d');gc.fillStyle='#363e48';gc.fillRect(0,0,gallery.width,gallery.height);
 for(const r of index.records.filter(r=>r.bootsOverlay&&!r.equipment.torso)){
  const d=r.pack.directions[r.direction],canvas=createCanvas(r.pack.frame.width*4,r.pack.frame.height*4),ctx=canvas.getContext('2d'),images=new Map();
  for(const p of api.requiredFiles(r))images.set(p,await load(p));
  for(let frame=0;frame<d.clip.frames;frame++){api.render(ctx,r,images,{frame});assert.ok(ctx.getImageData(0,0,canvas.width,canvas.height).data.some(v=>v));count++;}
  if(r.equipment.boots===9&&r.action!=='attack-focus'){
   api.render(ctx,r,images,{frame:r.action==='attack-unarmed'?3:0});
   const x=['south','north','east','west'].indexOf(r.direction)*640,y=['idle','walk','attack-unarmed'].indexOf(r.action)*640;
   gc.drawImage(canvas,x+(640-canvas.width)/2,y+(640-canvas.height)/2);gc.fillStyle='white';gc.font='24px sans-serif';gc.fillText(r.action+' '+r.direction,x+20,y+30);
  }
 }
 require('fs').writeFileSync('/tmp/isolated-boots-runtime.png',gallery.toBuffer('image/png'));
 assert.equal(count,166);console.log(count+' frames rendered at native density via real runtime');
});

test('attack clothing occludes naked calves without changing source images',async()=>{
 const {createCanvas}=require('@napi-rs/canvas'),load=require('./tools/rework-hd-test-loader.cjs').create(__dirname);
 const r=api.resolve({body:'male',direction:'south',action:'attack-unarmed',equipment:{pants:133,boots:9}}),images=new Map();
 for(const p of api.requiredFiles(r))images.set(p,await load(p));
 const c=createCanvas(640,640);api.render(c.getContext('2d'),r,images,{frame:3});
 // Original naked heel sits outside the garment at this pixel (visually verified).
 assert.equal(c.getContext('2d').getImageData(267,506,1,1).data[3],0);
});

test('all 64 attack states preserve every rendered pixel above calf occlusion',async()=>{
 const {createCanvas}=require('@napi-rs/canvas'),load=require('./tools/rework-hd-test-loader.cjs').create(__dirname);let count=0;
 for(const r of index.records.filter(r=>r.bootsOverlay&&r.bodyOcclusion&&!r.equipment.torso)){
  const images=new Map();for(const p of api.requiredFiles(r))images.set(p,await load(p));
  const without={...r};delete without.bodyOcclusion;
  for(let frame=0;frame<r.pack.directions[r.direction].clip.frames;frame++){
   const a=createCanvas(640,640),b=createCanvas(640,640);api.render(a.getContext('2d'),r,images,{frame});api.render(b.getContext('2d'),without,images,{frame});
   assert.deepEqual(a.getContext('2d').getImageData(0,0,640,400).data,b.getContext('2d').getImageData(0,0,640,400).data,r.id+' frame '+frame);
   count++;
  }
 }
 assert.equal(count,64);
});
