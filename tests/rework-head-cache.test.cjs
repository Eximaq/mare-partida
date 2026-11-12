const test=require('node:test'),assert=require('node:assert/strict'),api=require('../player-rework-head-family.js');
function fakeCanvas(w,h){return{getContext(){return{drawImage(){},putImageData(){},createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)})}}};}
test('head family cache avoids re-render per pose and is bounded by palette-aware keys',()=>{
 let renders=0;const pack={directions:{south:{layers:[{id:'base',slot:'headBase',source:'s'}]}}};
 const r={package:'male_hair_user_adjustments_source-only_v1',snapshot:'a',direction:'south',rest:{NECK:{x:64,y:42}},sourceRefs:['s'],entry:{pack},adjustmentRecord:{adjustment:{}}};
 const registry=api.create({schema:'rework-head-layer-index-v1',records:[r]},{makeCanvas:fakeCanvas,appearanceAPI:{recolor:a=>a,materialMask:()=>[]},vendor:{hairMale:{adjustment:()=>({})},hairPreview:{prepare:()=>({pack,images:new Map})},compositor:{render:()=>{renders++}}}});
 const images=new Map([['s',{}]]),opts={pose:[{label:'NECK',x:.5,y:.4}]};registry.compose(r,images,opts);const first=renders;assert.ok(first>0);registry.compose(r,images,{pose:[{label:'NECK',x:.51,y:.5}]});assert.equal(renders,first,'pose changes use prepared family');assert.equal(registry.cachedFamilies,1);
 for(let i=0;i<20;i++)registry.compose(r,images,{...opts,skinRamp:[String(i)]});assert.equal(registry.cachedFamilies,16);
});
