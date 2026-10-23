'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const Art=require('../supa-art.js');
const Akuma=require('../akuma-system.js');
const manifest=require('../assets/akuma/supa/manifest.json');
for(const asset of manifest.assets){
  const bytes=fs.readFileSync(path.join(__dirname,'../assets/akuma/supa',asset.asset));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256);
}
for(const [kind,file] of [['slash','slash-arc'],['shield','shield-bubble']]){
  const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/akuma/supa',file+'.json'),'utf8'));
  const animation=Art.animations[kind];
  const png=fs.readFileSync(path.join(__dirname,'../assets/akuma/supa',file+'.png'));
  assert.equal(png.readUInt32BE(16),source.meta.size.w);
  assert.equal(png.readUInt32BE(20),source.meta.size.h);
  assert.deepEqual(animation.anchor,source.meta.anchor);
  assert.deepEqual(animation.frames,source.frames.map(f=>({...f.frame,duration:f.duration})));
  let elapsed=0;
  for(const frame of animation.frames){
    assert.equal(Art.frameAt(kind,elapsed),frame);
    assert.equal(Art.frameAt(kind,elapsed+frame.duration-1),frame);
    elapsed+=frame.duration;
  }
  assert.equal(Art.frameAt(kind,elapsed),null);
  assert.equal(Art.frameAt(kind,elapsed,true),animation.frames[0]);
  assert.equal(Art.frameAt(kind,-1,true),null);
  assert.equal(Art.frameAt(kind,NaN,true),null);
  const image={complete:true,naturalWidth:source.meta.size.w};
  const calls=[];
  const ctx={save(){},restore(){},drawImage(...args){calls.push(args);}};
  assert.equal(Art.draw(ctx,image,kind,100,200,0),true);
  const frame=animation.frames[0];
  assert.deepEqual(calls[0],[image,frame.x,frame.y,frame.w,frame.h,100-animation.anchor.x,200-animation.anchor.y,frame.w,frame.h]);
}
const state=Akuma.register({akumaCompendium:[]},'akuma_supa_supa').state;
assert.equal(Akuma.slotsForRank(state,'D')[0].fruit.name,'Supa Supa no Mi');
assert.equal(Akuma.byId('akuma_supa_supa').family,'paramecia');
console.log('Supa art: all source frames, timing, origins, loop, expiration and Rank D registration passed');
