'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {cv}=require('./rework-integration-support.cjs');
const baseIndex=require('../tools/rework-base-hd/index.json');
const headIndex=require('../tools/rework-accessories/head-layer-index.json');
const ownership=require('../tools/rework-accessories/female-original-face-ownership.json');
const load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..'));
const pixels=c=>c.getContext('2d').getImageData(0,0,512,512).data;

test('directional neck attachment fills the evidenced gap without moving hair, face or anchors',{timeout:120000},async()=>{
 const helper=global.MareFemaleNamedHairHD.create(headIndex,ownership,{baseRegistry:global.MareReworkBaseHD.create(baseIndex),makeCanvas:cv.createCanvas});
 const tones=Object.keys(global.MareAppearance96.skins);
 const styles=Object.keys(global.MareCharacterAppearance.choices.hairStyle);
 const probes=[...tones.map(tone=>['hair-cropped',tone]),...styles.filter(x=>x!=='hair-cropped').map(style=>[style,'dark'])];
 const images=new Map();
 for(const direction of ['north','east','west','south']){
  const base=baseIndex.records.find(r=>r.id==='v7-female-walk-drawn-all-'+direction);
  for(const [hair,skin] of direction==='south'?[['hair-cropped','dark']]:probes){
   const r=helper.resolve(base,{hair,appearance:{skin,hairColor:'blonde',eyeColor:'amber'}});
   assert(r,hair+'/'+skin+'/'+direction);
   for(const file of helper.requiredFiles(r))if(!images.has(file))images.set(file,await load(file));
   const before=pixels(helper.compose(base,r,images));
   const after=pixels(helper.compose(base,{...r,id:r.id+':direction-neck-test',northNeckContact:true,profileNeckRestore:true,profileNeckBridge:true},images));
   let restoredAlpha=0,changed=0;
   for(let i=0;i<before.length;i+=4){
    if([0,1,2,3].every(k=>before[i+k]===after[i+k]))continue;
    changed++;const pos=i/4,x=pos%512,y=Math.floor(pos/512);let lo,hi,top,bottom;
    if(direction==='north'){lo=241;hi=273;top=165;bottom=169;}else{[lo,,hi]=r.ownership.walkDifferenceBounds;top=163;bottom=169;}
    assert(direction!=='south'&&x>=lo&&x<=hi&&y>=top&&y<=bottom,direction+'/'+hair+'/'+skin+'/'+x+','+y);
    if(before[i+3]!==after[i+3]){assert.equal(before[i+3],0);assert.equal(after[i+3],255);restoredAlpha++;}
   }
   if(direction==='south'){assert.equal(changed,0);continue;}
   if(hair==='hair-cropped')assert.equal(restoredAlpha,direction==='north'?52:77,direction+'/'+skin);
   if(direction==='north'&&hair==='original')assert.equal(changed,0);
  }
 }
});
