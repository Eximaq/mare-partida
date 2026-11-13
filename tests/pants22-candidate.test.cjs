'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('candidate import verifies source hashes before allowing retargeting',async()=>{
 const build=require('../tools/pants22-native/candidate.cjs');
 const result=await build.audit(process.env.PANTS22_SOURCES);
 assert.equal(result.valid,true);assert.equal(result.sources.length,6);
 assert.equal(result.productionEnabled,false);
 const altered=structuredClone(result.manifest);altered.layers[0].sha256='0'.repeat(64);
 await assert.rejects(()=>build.audit(process.env.PANTS22_SOURCES,altered),/hash mismatch/);
});

test('retargeting keeps transparent pixels and fixed destination canvas',()=>{
 const {warpStrip}=require('../tools/pants22-native/candidate.cjs'),cv=require('@napi-rs/canvas');
 const source=cv.createCanvas(4,4),s=source.getContext('2d');s.fillStyle='#804020';s.fillRect(1,1,2,2);
 const output=warpStrip(source,{source:[{y:0,x:2},{y:4,x:2}],target:[{y:2,x:4},{y:6,x:4}],widthScale:1,canvas:8});
 assert.equal(output.width,8);assert.equal(output.height,8);const d=output.getContext('2d');
 assert.deepEqual([...d.getImageData(3,3,1,1).data],[128,64,32,255]);
 assert.equal(d.getImageData(0,0,1,1).data[3],0);
 assert.equal(d.getImageData(4,4,1,1).data[3],255);
});
