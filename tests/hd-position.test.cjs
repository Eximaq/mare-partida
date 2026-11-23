'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const adjust=require('../hd-position.js');
test('manifesto aceita somente deslocamentos inteiros e campos conhecidos',()=>{
 const m=adjust.empty(); assert.deepEqual(adjust.validate(m),m);
 assert.throws(()=>adjust.validate({...m,scale:1}));
 const key={body:'female',slot:'weapon',item:0,receiver:'512x512@256,448',weapon:0,action:'idle',direction:'south',part:'*',source:'a'.repeat(64)};
 const record={...key,cycle:[2,-1],phases:{0:[1,0]}};
 assert.deepEqual(adjust.validate({...m,records:[record]}).records,[record]);
 for(const bad of [{scale:1},{cycle:[1.5,0]},{phases:{'-1':[0,0]}},{cycle:[Infinity,1]},{slot:'skin'}])
  assert.throws(()=>adjust.validate({...m,records:[{...record,...bad}]}));
 assert.throws(()=>adjust.validate({...m,records:[record,record]}));
});

test('a mão fica fixa, a parte acompanha o ciclo e a fase e o vizinho sobrevive a uma assinatura antiga',async()=>{
 const {createCanvas}=require('@napi-rs/canvas');
 const make=(w,h)=>createCanvas(w,h);
 const tile=(color,x,y)=>{const c=make(12,12),t=c.getContext('2d');t.fillStyle=color;t.fillRect(x,y,1,1);return c;};
 const gear=tile('red',3,3),skin=tile('blue',4,3),mask=tile('red',4,3),sole=tile('green',4,8);
 gear.getContext('2d').drawImage(skin,0,0);
 const actor={equipment:{weapon:{def:0},boots:{def:148}},appearance96:{gender:'male'}};
 const session=adjust.session({action:'idle',direction:'east'},actor,{},make);
 function render(phase,capture=false){
  const c=make(12,12),ctx=c.getContext('2d');
  session.visit(phase,capture,()=>{
   adjust.material(ctx,'weapon','hand','signed weapon and material',gear,mask,[0,0]);
   adjust.blit(ctx,'boots','sole','signed boot',sole,[0,0]);
  });return ctx.getImageData(0,0,12,12).data;
 }
 const original=render(0,true);render(1,true);await session.finish({width:12,height:12,pivot:{x:6,y:11}},[0,1],8);
 const record=(slot,cycle,phases)=>{const {limits,...identity}=session.targets.find(t=>t.part==='*'&&t.slot===slot);return {...identity,cycle,phases};};
 const weapon=record('weapon',[1,1],{1:[1,0]}),boot=record('boots',[-1,0],{});
 session.configure({...adjust.empty(),records:[weapon,boot]},true);
 for(const [phase,x] of [[0,4],[1,5]]){
  const expected=make(12,12),c=expected.getContext('2d');c.drawImage(skin,0,0);c.drawImage(sole,-1,0);
  c.fillStyle='red';c.fillRect(x,4,1,1);
  assert.deepEqual(render(phase),c.getImageData(0,0,12,12).data);
 }
 const invalid={...adjust.empty(),records:[{...weapon,source:'0'.repeat(64)},boot]};
 assert.throws(()=>session.configure(invalid,true));assert(session.moved);
 assert.equal(session.configure(invalid).length,1);
 const expected=make(12,12),ctx=expected.getContext('2d');ctx.drawImage(gear,0,0);ctx.drawImage(sole,-1,0);
 assert.deepEqual(render(0),ctx.getImageData(0,0,12,12).data);
 assert.throws(()=>session.configure({...adjust.empty(),records:[{...boot,cycle:[0,100]}]},true));
 session.configure(adjust.empty(),true);assert.deepEqual(render(0),original);
});
