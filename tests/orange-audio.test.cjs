'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const MarePixelWorldMaps=require('../pixellab-world-maps.js');

const played=[], listeners={}, values=new Map();
class Audio {
  constructor(src){this.src=src;this.paused=true;this.currentTime=0;}
  play(){this.paused=false;played.push(this);return Promise.resolve();}
  pause(){this.paused=true;}
}
const document={baseURI:'https://example.test/mare-partida/',body:{classList:{contains:()=>false}},
  readyState:'complete',addEventListener:(name,cb)=>{listeners[name]=cb;},dispatchEvent(){}};
const context={MarePixelWorldMaps,Audio,URL,document,MutationObserver:class{observe(){}},CustomEvent:class{},
  localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)},
  cancelAnimationFrame(){},requestAnimationFrame(){},performance:{now:()=>0}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../audio-system.js'),'utf8'),context);
const audio=context.MareAudio;
assert.equal(typeof audio.playOrange,'function','Orange Town needs its own effects channel');
assert.equal(typeof audio.walkOrange,'function','Orange Town footsteps need to follow actual gait contacts');
const filename=entry=>new URL(entry.src).pathname.split('/').at(-1);
audio.playOrange('orange','espada-corte');
assert.equal(played.length,0,'Wait for a browser gesture');
listeners.pointerdown();
audio.playOrange('lobby','espada-corte');
assert.equal(played.length,0,'Effects are local to Orange Town');
for(const cue of ['espada-corte','espada-acerto','magia-fogo','supa-espiral-cortante','supa-retaliacao-metalica']){
  audio.playOrange('orange',cue);
  assert.equal(filename(played.at(-1)),cue+'.ogg');
}
audio.setMuted(true);
assert.ok(played.every(clip=>clip.paused),'Mute stops active effects immediately');
const beforeMute=played.length;
audio.playOrange('orange','espada-corte');
assert.equal(played.length,beforeMute);
audio.setVolume(.55);
document.hidden=true;
audio.playOrange('orange','espada-corte');
assert.equal(played.length,beforeMute,'Background tabs should be silent');
document.hidden=false;

// These cells are in the current published projection (61 x 44), not the retired harbor map.
for(const [col,row,surface] of [[26,15,'cimento'],[24,11,'areia'],[32,11,'grama'],[15,30,'madeira'],[13,32,'madeira'],[1,1,null]]){
  const point={x:col*64+32,y:row*64+32};
  const from={...point,x:point.x-4};
  const start=played.length;
  audio.walkOrange('orange',from,point,{moving:true,distance:12,stepDistance:4});
  audio.walkOrange('orange',from,point,{moving:false,distance:20,stepDistance:0});
  assert.equal(played.length,start,'No foot contact or movement');
  for(const distance of [20,60,100])audio.walkOrange('orange',from,point,{moving:true,distance,stepDistance:4});
  const clips=played.slice(start);
  if(!surface){assert.equal(clips.length,0,'Water is silent');continue;}
  assert.equal(clips.length,3);
  assert.equal(new Set(clips.map(filename)).size,3,'Cycle three variants without repetition');
  for(const clip of clips){
    assert.match(clip.src,new RegExp('/mare-partida/assets/audio/orange-town/passo-'+surface+'-0[1-3]\\.ogg$'));
    assert.ok(clip.volume>0&&clip.volume<.55,'Footsteps are quieter than the user volume');
  }
}
const beforeExit=played.length;
audio.walkOrange('lobby',{x:0,y:0},{x:40,y:0},{moving:true,distance:20,stepDistance:4});
assert.equal(played.length,beforeExit);
assert.ok(played.every(clip=>clip.paused),'Leaving Orange Town stops active effects');
console.log('Orange Town SFX: gate, volume, surfaces, variant cycling and movement contacts');
