'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {make,cv}=require('./rework-integration-support.cjs');
global.MareReworkEyeStylesHD=require('../player-rework-eye-styles-hd.js');
require('../character-appearance.js');

test('all eye styles render distinct pixels without changing silhouette on both original rigs',async()=>{
 const native=make();
 await native.ready;
 for(const gender of ['masculino','feminino']) for(const direction of ['south','north','east','west']) {
  const action=direction==='south'?'idle':direction==='east'?'walk':'attack';
  let originalAlpha,originalHash;
  const variants=new Set();
  for(const eyeStyle of ['original','face-calm','face-resolute','face-almond','face-focused']){
   const player={appearance96:{gender,hairStyle:'original',eyeStyle,eyeColor:'original',skinColor:'original',hairColor:'original'},equipment:{}};
   const pose={action,direction,x:220,y:320,progress:.4};
   assert(await native.prepareStablePose(player,pose),JSON.stringify(native.snapshot()));
   const ctx=cv.createCanvas(440,380).getContext('2d');
   assert(native.draw(ctx,player,pose));
   const {data}=ctx.getImageData(0,0,440,380);
   const alpha=Buffer.from(data.filter((_,i)=>i%4===3));
   const hash=crypto.createHash('sha256').update(data).digest('hex');
   if(eyeStyle==='original'){originalAlpha=alpha;originalHash=hash;}
   else {
    assert.equal(native.snapshot().last.eyeStyle,eyeStyle);
    assert.deepEqual(alpha,originalAlpha);
    if(direction==='north')assert.equal(hash,originalHash);
    else assert.notEqual(hash,originalHash,gender+'/'+direction+'/'+eyeStyle);
    variants.add(hash);
   }
  }
  assert.equal(variants.size,direction==='north'?1:4,gender+'/'+direction);
 }
});

test('female original hair and skin palettes retain the eye style and iris palette',async()=>{
 const native=make();
 await native.ready;
 const player={appearance96:{gender:'feminino',hairStyle:'original',eyeStyle:'face-focused',eyeColor:'green',skinColor:'dark',hairColor:'pink'},equipment:{}};
 for(const direction of ['south','north','east','west'])for(const action of ['idle','walk','attack']){
  const pose={action,direction,x:220,y:320,progress:.4};
  assert(await native.prepareStablePose(player,pose),JSON.stringify(native.snapshot()));
  assert(native.draw(cv.createCanvas(440,380).getContext('2d'),player,pose));
  const result=native.snapshot().last;
  assert.equal(result.eyeStyle,'face-focused');
  assert.equal(result.skinPalette,'dark');
  assert.equal(result.hairPalette,'pink');
  assert.match(result.source,/eye-palette:green/);
 }
});

test('female original hair palette preserves pixels outside the owned hair layer',async()=>{
 const native=make();
 await native.ready;
 const appearance96={gender:'feminino',hairStyle:'original',eyeStyle:'original',eyeColor:'original',skinColor:'original',hairColor:'original'};
 const pose={action:'idle',direction:'south',x:256,y:448};
 const render=async color=>{
  const player={appearance96:{...appearance96,hairColor:color},equipment:{}};
  assert(await native.prepareStablePose(player,pose));
  const ctx=cv.createCanvas(512,512).getContext('2d');
  assert(native.draw(ctx,player,pose));
  return ctx.getImageData(0,0,512,512).data;
 };
 const original=await render('original'),pink=await render('pink');
 let changed=0;
 for(let pixel=0;pixel<512*512;pixel++){
  const index=pixel*4;
  assert.equal(original[index+3],pink[index+3]);
  if(original[index]===pink[index]&&original[index+1]===pink[index+1]&&original[index+2]===pink[index+2])continue;
  assert(Math.floor(pixel/512)<380,'hair changed pixels below head and neck');
  changed++;
 }
 assert(changed>100);
});
