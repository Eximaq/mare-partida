'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),V=require('../combat-vfx.js');
for(const [kind,file,count,seconds] of [['folegoFerro','folego-ferro',41,41/30],['impactoAncora','impacto-ancora',21,.25]]){
 const effect=V.data.effects[kind],source=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/combat-vfx',file+'.json')));
 assert.equal(effect.frames.length,count);assert.equal(effect.duration/effect.playbackRate/1000,seconds);assert.equal(effect.impactTailMs,0);assert(effect.fixedPalette);
 assert.deepEqual(effect.frames,source.frames.map(f=>({...f.frame,duration:f.duration})));assert.equal(V.frame(kind,effect.duration-.001),count-1);assert.equal(V.frame(kind,effect.duration),null);
 const png=fs.readFileSync(path.join(__dirname,'../assets/combat-vfx',file+'.png'));assert.equal(png.readUInt32BE(16),source.meta.size.w);assert.equal(png.readUInt32BE(20),source.meta.size.h);assert.equal(png[25],6);
 for(const f of effect.frames){assert(f.x+f.w<=source.meta.size.w);assert(f.y+f.h<=source.meta.size.h);}
}
assert.equal(V.data.effects.folegoFerro.bodyScale,1.4);assert.equal(V.data.effects.impactoAncora.worldWidth,88);assert.equal(V.classify({category:'impactoAncora'}),'impactoAncora');assert.equal(V.classify({source:'class',classId:'brawler'}),'punch');
console.log('Lutador VFX: original RGBA sheets, all source frames, exact quick lifetimes and separate basic-punch mapping passed');

for(const [cls,kinds] of Object.entries(V.data.classSkills)){
 for(const kind of kinds){
  const effect=V.data.effects[kind];assert(effect,cls+': '+kind);assert(effect.fixedPalette);
  const file=kind==='folegoFerro'?'folego-ferro':kind==='impactoAncora'?'impacto-ancora':kind;
  const src=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/combat-vfx',file+'.json')));
  assert.deepEqual(effect.frames,src.frames.map(f=>({...f.frame,duration:f.duration})));
 }
}
assert.equal(V.data.effects.protocoloProvocacao.layer,'back');
assert.equal(V.data.effects.protocoloProvocacao.rangeBound,true);
assert.equal(V.data.effects.protocoloProvocacao.worldWidth,undefined);
assert.equal(V.data.effects.bencaoFarol.loopFrames,34);
assert.equal(V.data.effects.bencaoFarol.activeSeconds,8);
assert.equal(V.frame('bencaoFarol',3400,{loop:true,end:33}),0);
assert.equal(V.frame('bencaoFarol',0,{start:34}),34);
assert(V.data.effects.disparoPreciso.flightOnly);
assert(V.data.effects.chamaConcentrada.flightOnly);
console.log('Class skills: all source frames, range-bound background taunt, sustained projectile and blessing loop/ending passed');
