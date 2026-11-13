const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),crypto=require('crypto'),cv=require('@napi-rs/canvas'),vendor=require('./tools/rework-accessories/vendor.js');
const records=require('./tools/female-torsos-frozen/records.json'),fragment=require('./tools/female-torsos-frozen/archive-fragment.json'),root=__dirname;
global.MareReworkZip=require('./player-rework-zip.js');
const store=require('./player-rework-hd-assets.js').create({schema:'hd-source-archives-v1',...fragment},{baseURL:'https://fixture.test/',prefix:'tools/rework-modular-outfits-hd/archives/',fetchBytes:async u=>new Uint8Array(fs.readFileSync(root+new URL(u).pathname)),decode:b=>cv.loadImage(Buffer.from(b))});
const api=require('./player-rework-modular-outfits-hd.js').create({schema:'rework-modular-outfits-hd-v1',records},{vendor,allowCandidates:true});
test('Frozen ten female torsos: 120 records; native ZIP loading, exact identity and unchanged base layers',async()=>{
 assert.equal(records.length,120);let frames=0;
 for(const r of records){
  assert.equal(api.resolve({body:r.body,direction:r.direction,action:r.action,equipment:r.equipment}),r);
  assert.equal(api.resolve({body:r.body,direction:r.direction,action:r.action,equipment:{...r.equipment,boots:155}}),null);
  const images=new Map();for(const s of r.sourceRefs)images.set(s,await store.load('tools/rework-modular-outfits-hd/assets/'+s+'.png'));
  const original=require('./tools/rework-base-hd/index.json').records.find(b=>b.id===r.baseRecord),originalLayers=original.pack.directions[r.direction].layers;
  for(const l of r.pack.directions[r.direction].layers.filter(l=>l.id.startsWith('base:'))){const old=originalLayers.find(b=>b.id===l.id.slice(5));assert(old);for(const src of l.frames||[l.source])assert((old.frames||[old.source]).includes(src),'No substituted body/head pixels');}
  const d=r.pack.directions[r.direction],baseOnly=structuredClone(r);baseOnly.pack.directions[r.direction].layers=d.layers.filter(l=>l.id.startsWith('base:'));
  for(let frame=0;frame<d.clip.frames;frame++){
   const size=r.pack.frame.width*4,c=cv.createCanvas(size,size);api.render(c.getContext('2d'),r,images,{frame});assert(c.getContext('2d').getImageData(0,0,512,512).data.some(x=>x));frames++;

  }
  assert(d.layers.filter(l=>!l.id.startsWith('base:')).every(l=>!/^visible-clothed-composite$|^visible-original-hands$|^native-visible-near-arm-manual$/.test(l.id)));
 }
 assert.equal(frames,1960);
});
test('Game runtime completes ten torso families without mutating saved equipment',async()=>{
 global.ReworkAccessoryVendor=vendor;global.MareAppearance96=require('./tools/paper-doll-96-v3/appearance.js');
 for(const[n,f]of Object.entries({MareReworkBaseHD:'player-rework-base-hd',MareReworkWeaponNativeHD:'player-rework-weapon-native-hd',MareReworkFemaleEquipmentHD:'player-rework-female-equipment-hd',MareReworkHead:'player-rework-head-family',MareNativeHeadCompat:'native-head-compat',MareReworkModularOutfitsHD:'player-rework-modular-outfits-hd',MareReworkWeaponCarryHD:'player-rework-weapon-carry-hd',MareReworkOutfitOverlayHD:'player-rework-outfit-overlay-hd',MareReworkOutfitCarryOverlayHD:'player-rework-outfit-carry-overlay-hd',MareReworkZip:'player-rework-zip',MareReworkHDAssets:'player-rework-hd-assets'}))global[n]=require('./'+f+'.js');
 const load=require('./tools/rework-hd-test-loader.cjs').create(__dirname),runtime=require('./player-rework-native-hd.js').create({fetchJSON:async p=>JSON.parse(fs.readFileSync(root+'/'+p)),loadImage:load,makeCanvas:cv.createCanvas});
 for(const item of [6,7,130,137,144,151,158,165,172,179]){
  const p={appearance96:{gender:'feminino',hairStyle:'original'},equipment:{coat:{def:item}}},before=JSON.stringify(p);
  assert(await runtime.prepareFamily(p),item+JSON.stringify(runtime.snapshot()));
  for(const action of ['idle','walk','attack'])for(const direction of ['south','north','east','west']){
   const o={action,direction,progress:.4,x:500,y:700},r=runtime.select(p,o);assert(r,item+'/'+action+'/'+direction);
   assert(await runtime.prepare(p,o),item+'/'+action+'/'+direction);assert(runtime.drawStable(cv.createCanvas(1000,1000).getContext('2d'),p,o));assert.equal(runtime.snapshot().last.sourceScale,1);
  }
  assert.equal(JSON.stringify(p),before);
 }
});
