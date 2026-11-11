'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const Art=require('../supa-art.js');
const Akuma=require('../akuma-system.js');
const manifest=require('../assets/akuma/supa/manifest.json');
assert.equal(Art.animations.slash.frames.length,24);
assert.equal(Art.animations.slash.duration,472);
assert.equal(Art.animations.shield.frames.length,36);
assert.equal(Art.animations.shield.duration,756);
for(const asset of manifest.assets){
  const bytes=fs.readFileSync(path.join(__dirname,'../assets/akuma/supa',asset.asset));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256);
}
for(const [kind,file] of [['slash','slash-arc'],['shield','spiral-ward']]){
  const source=require('../paramecia-rework-manifest.js').supa.effects[kind];
  const animation=Art.animations[kind];
  const png=fs.readFileSync(path.join(__dirname,'..',animation.image));
  assert.equal(animation.image,source.image);
  assert.deepEqual(animation.anchor,source.anchor);
  assert.deepEqual(animation.frames,source.frames);
  for(const f of animation.frames){assert.ok(f.x+f.w<=png.readUInt32BE(16));assert.ok(f.y+f.h<=png.readUInt32BE(20));}
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
  const image={complete:true,naturalWidth:png.readUInt32BE(16)};
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
