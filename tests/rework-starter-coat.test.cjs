'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const base=require('../tools/rework-base-hd/index.json');
const outfits=require('../tools/rework-modular-outfits-hd/index.json');
const plan=require('../tools/rework-weapon-layers-hd/carry-binding-plan.json');
const carry=require('../player-rework-weapon-carry-hd.js').create(base,plan,{vendor:{compositor:{}}});
const {adaptStarterCoat}=require('../player-rework-outfit-carry-overlay-hd.js');

test('male starter keeps authored body, weapon, pivots and timing when applying coat 6',()=>{
 for(const direction of ['south','north','east','west'])for(const action of ['idle','walk']){
  const source=carry.resolve({item:0,body:'male',action,direction,equipment:{weapon:0}});
  const dressed=adaptStarterCoat(source,outfits);
  assert(dressed,direction+'/'+action);
  assert.equal(dressed.outfitOverlay.sourceRecord,'male-torso6-'+direction+'-frozen-'+action+'-native');
  assert.equal(dressed.plan,source.plan);
  assert.deepEqual(dressed.base.pack.pivot,source.base.pack.pivot);
  const authored=source.base.pack.directions[direction],resolved=dressed.base.pack.directions[direction];
  assert.deepEqual(resolved.clip,authored.clip);
  assert.deepEqual(resolved.poses,authored.poses);
  assert.deepEqual(resolved.layers.slice(0,authored.layers.length),authored.layers);
  assert.deepEqual(dressed.preMirroredLayers,direction==='west'?resolved.layers.slice(authored.layers.length).map(layer=>layer.id):[]);
 }
});

test('coat 6 is rejected when its authored body or frame contract differs',()=>{
 const source=carry.resolve({item:0,body:'male',action:'walk',direction:'east',equipment:{weapon:0}});
 const changed=structuredClone(source);
 changed.base.pack.directions.east.poses[0].HIP.x++;
 assert.equal(adaptStarterCoat(changed,outfits),null);
 assert.equal(adaptStarterCoat({...source,item:1},outfits),null);
 assert.equal(adaptStarterCoat({...source,base:{...source.base,body:'female'}},outfits),null);
});
