const assert=require('node:assert/strict'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const api=require('../player-rework-head-family.js'),vendor=require('../tools/rework-accessories/vendor.js'),index=require('../tools/rework-accessories/head-layer-index.json');
const registry=api.create(index,{vendor,makeCanvas:createCanvas,appearanceAPI:{}});
(async()=>{
assert.equal(registry.resolve({body:'male',direction:'south',look:{hair:'original'}}),null);
assert.ok(registry.resolve({body:'masculino',direction:'south',look:{hair:'original',originalHairStyle:'cropped'}}));
assert.equal(registry.resolve({body:'male',direction:'south',look:{hair:'hair-cropped',eyeColor:'green'}}),null);
const cache=new Map;let n=0;for(const r of index.records){
 assert(r.entry.pack.directions[r.direction].layers.every(l=>['headBase','face','hair'].includes(l.slot)||l.id===r.headgearPolicy?.gearId));
 for(const f of registry.requiredFiles(r))if(!cache.has(f))cache.set(f,await loadImage(require('node:path').join(__dirname,'..',f)));
 const opts={pose:[{label:'NECK',x:r.rest.NECK.x/128,y:r.rest.NECK.y/128}]};
 const out=registry.compose(r,cache,opts);for(const v of Object.values(out))assert.equal(v.length,128*128*4);n++;
} console.log(n+' source head families rendered, without body layers');
})().catch(e=>{console.error(e);process.exitCode=1;});
