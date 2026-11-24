'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas'),A=require('../player-rework-eye-styles-hd.js'),look=require('../character-appearance.js');
require('../player-rework-modular-outfits-hd.js');global.MareAppearance96=require('../tools/paper-doll-96-v3/appearance.js');
const root=process.env.HD_PUBLISHED_ROOT||path.resolve(__dirname,'..'),load=require('../tools/rework-hd-test-loader.cjs').create(root);
test('a íris masculina usa apenas o material autorizado do rosto e conserva a expressão',async()=>{
 const sha='81ce2c74c6e8e05f2745223cdea70cfecee5b0ff49e4bcbf8d6ed25d62e72449',im=await load('tools/rework-base-hd/assets/'+sha+'.png');
 const expression=A.maleSource({direction:'south',pack:{directions:{south:{layers:[{slot:'face',source:sha}]}}}});
 const tile=()=>{const c=createCanvas(im.width,im.height).getContext('2d');c.drawImage(im,0,0);return c;};
 const data=c=>c.getImageData(0,0,im.width,im.height),original=tile(),expected=tile(),actual=tile();
 A.recolorIris(original,expression,'original');assert.deepEqual(data(original).data,data(tile()).data);
 const ref=data(expected),ramp=look.eyes.green.ramp;
 for(const [x,y,r,g,b,a,tone] of global.MareReworkModularOutfitsHD.southIrisSamples()){
  const i=((y-64)*im.width+x-64)*4;assert.deepEqual(Array.from(ref.data.slice(i,i+4)),[r,g,b,a]);
  ref.data.set(ramp[tone-1].slice(1).match(/../g).map(x=>parseInt(x,16)),i);
 }
 expected.putImageData(ref,0,0);A.recolorIris(actual,expression,'green');
 assert.ok(Buffer.from(data(actual).data).equals(Buffer.from(ref.data)),'a cor ultrapassou os pixels da íris');
 A.reshape(expected,'face-calm','south',expression.boxes);A.reshape(actual,'face-calm','south',expression.boxes);
 assert.ok(Buffer.from(data(actual).data).equals(Buffer.from(data(expected).data)));
});
