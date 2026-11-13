'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const index=require('../tools/rework-modular-outfits-hd/index.json');
const archives=require('../tools/rework-modular-outfits-hd/archives/archive-index.json');
require('../tools/rework-accessories/vendor.js');
const registry=require('../player-rework-modular-outfits-hd.js').create(index,{allowCandidates:true});
test('male item22 resolves its own independent layers in the shipped index',()=>{
 for(const direction of ['south','north','east','west'])for(const action of ['idle','walk','attack-unarmed']){
  const record=registry.resolve({body:'male',direction,action,equipment:{legs:{def:22}},appearance:{hair:'original'}});
  assert(record,action+'/'+direction);assert.match(record.id,/^male-pants22-/);
  const d=record.pack.directions[direction],layer=d.layers.find(l=>l.id.startsWith('pants22-'));
  assert(layer);assert.equal(layer.slot,'pants');assert.equal(layer.frames.length,d.clip.frames);
  for(const hash of record.sourceRefs)assert(archives.sources[hash],'Missing published source '+hash);
  assert(!d.layers.some(l=>l.id==='own133-isolated'||l.id==='pants133-visible-cloth-only'||l.id==='pants133-translated-candidate'));
 }
});
test('item22 registration does not claim unsupported equipment combinations',()=>{
 assert.equal(registry.resolve({body:'male',direction:'south',action:'idle',equipment:{legs:22,coat:151},appearance:{hair:'original'}}),null);
});
