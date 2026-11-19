'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {composeSlots}=require('../player-rework-modular-outfits-hd.js');

const l=(id,source,depth=1)=>({id,source,slot:'top',depth,binding:{kind:'fixed'}});
const torso=l('coat','coat-hash'),legs=l('pants','pants-hash');
const boot=l('boot-155','155-hash',4),replacement=l('boot-9','9-hash',4);
const record=(id,layers,item)=>({id,body:'male',direction:'east',action:'walk',equipment:{torso:151,pants:133,...(item==null?{}:{boots:item})},
 pack:{density:4,frame:{width:128,height:128},pivot:{x:64,y:96},directions:{east:{clip:{frames:2,fps:12,loop:true},poses:[{},{}],rest:{},layers}}}});
const anchor=record('a',[torso,legs,boot],155),donor=record('b',[torso,legs,replacement],9);
const compose=(wanted,opts={})=>composeSlots({anchor,equipment:wanted,fixed:{torso:151,pants:133},slots:{boots:{
  anchorLayers:['boot-155'],uncoveredBaseVerified:true,records:{9:{record:donor,layers:['boot-9']},155:{record:anchor,layers:['boot-155']}}
 }},...opts});

test('a slot can be removed and swapped without resolving a new body or another slot',()=>{
 const missing=compose({torso:151,pants:133}),changed=compose({torso:151,pants:133,boots:9});
 assert.deepEqual(missing.pack.directions.east.layers,[torso,legs]);
 assert.deepEqual(changed.pack.directions.east.layers,[torso,legs,replacement]);
 assert.deepEqual(changed.equipment,{torso:151,pants:133,boots:9});
 assert.deepEqual(changed.slotRoutes.boots,{item:9,quality:'hd',source:'b'});
 assert.deepEqual(anchor.pack.directions.east.layers,[torso,legs,boot],'source untouched');
});

test('unproved donor omits only the requested slot if a clean base is registered',()=>{
 const result=compose({torso:151,pants:133,boots:999});
 assert.deepEqual(result.omitted,['boots']);
 assert.deepEqual(result.slotRoutes.boots,{item:999,quality:'missing'});
 assert.deepEqual(result.pack.directions.east.layers,[torso,legs]);
 assert.equal(compose({torso:7,pants:133,boots:9}),null);
 assert.equal(compose({torso:151,pants:133,weapon:0,boots:9}),null,'must not hide a weapon without independent registration');
});

test('clock, pivot, appearance and non-owned layer mismatch cannot be smuggled into the slot',()=>{
 for(const change of [
  d=>{d.pack.directions.east.clip.fps++;},
  d=>{d.pack.pivot.x++;},
  d=>{d.pack.directions.east.layers[1].source='different';},
  d=>{d.approvedAppearance={skin:'light'};},
 ]){
  const bad=structuredClone(donor);change(bad);
  const result=compose({torso:151,pants:133,boots:9},{slots:{boots:{anchorLayers:['boot-155'],uncoveredBaseVerified:false,records:{9:{record:bad,layers:['boot-9']}}}}});
  assert.equal(result,null);
 }
});

test('independently registered slots may share a common body without borrowing each other\'s layers',()=>{
 const originalGlove=l('glove-25','glove-25-hash',6),changedGlove=l('glove-152','glove-152-hash',6);
 const addGlove=(r,glove,item)=>({...r,equipment:{...r.equipment,gloves:item},pack:{...r.pack,directions:{east:{...r.pack.directions.east,layers:[...r.pack.directions.east.layers,glove]}}}});
 const ar=addGlove(anchor,originalGlove,25),br=addGlove(donor,originalGlove,25),cr=addGlove(anchor,changedGlove,152);
 const result=composeSlots({anchor:ar,fixed:{torso:151,pants:133},equipment:{torso:151,pants:133,boots:9,gloves:152},slots:{
  boots:{anchorLayers:[boot.id],records:{9:{record:br,layers:[replacement.id],otherOwnedLayers:{gloves:[originalGlove.id]}}}},
  gloves:{anchorLayers:[originalGlove.id],records:{152:{record:cr,layers:[changedGlove.id],otherOwnedLayers:{boots:[boot.id]}}}}
 }});
 assert.deepEqual(result.pack.directions.east.layers,[torso,legs,replacement,changedGlove]);
 assert.deepEqual(result.omitted,[]);
});

test('another slot cannot claim overlapping draw order without a certified composition',()=>{
 const b=l('b','boot',6),g=l('g','glove',6);
 const a=record('a',[torso,legs,b,g],155);a.equipment.gloves=25;
 const result=composeSlots({anchor:a,fixed:{torso:151,pants:133},equipment:{torso:151,pants:133,boots:155,gloves:25},slots:{
  boots:{anchorLayers:['b'],records:{155:{record:a,layers:['b'],otherOwnedLayers:{gloves:['g']}}}},
  gloves:{anchorLayers:['g'],records:{25:{record:a,layers:['g'],otherOwnedLayers:{boots:['b']}}}}
 }});
 assert.equal(result,null);
});
