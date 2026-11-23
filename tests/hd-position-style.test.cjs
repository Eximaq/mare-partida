'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas'),A=require('../hd-position.js');
const make=(w,h)=>createCanvas(w,h);
const tile=(color,x,y,w,h)=>{const c=make(16,16),g=c.getContext('2d');g.fillStyle=color;g.fillRect(x,y,w,h);return c;};
test('espelho, rotação e oclusão alteram só a arma; o punho tem a forma da camada real',async()=>{
 const shared=A.session({action:'idle',direction:'east'},{equipment:{weapon:{def:0}}},{},make);
 const arm=tile('#ff0000',5,7,4,2),fist=tile('#0000ff',6,7,1,1),gear=tile('#00ff00',5,7,3,1);
 gear.getContext('2d').fillStyle='#ffff00';gear.getContext('2d').fillRect(7,7,1,1);
 const paint=()=>{const canvas=make(16,16),c=canvas.getContext('2d');c.drawImage(arm,0,0);
  A.layer(c,{id:'handRight',slot:'foreground',source:'hand'},fist,[0,0]);
  A.blit(c,'weapon','blade','sword',gear,[0,0]);return {canvas};};
 const render=capture=>shared.visit(0,capture,paint).canvas;
 const orig=render(true);await shared.finish({width:16,height:16,pivot:{x:8,y:13}},[{frame:0,phase:0}],8);
 const {limits,...id}=shared.targets.find(t=>t.part==='*');
 const record={...id,cycle:[0,0],phases:{}};
 const px=(canvas,x,y)=>[...canvas.getContext('2d').getImageData(x,y,1,1).data];
 const read=(style)=>{shared.configure(A.validate({...A.empty(),schema:2,records:[{...record,style:{cycle:style,phases:{}}}]}),true);return render(false)};
 const normal=px(orig,5,7),tip=px(orig,7,7);assert.notDeepEqual(normal,tip);
 const flipped=read({flip:true});assert.deepEqual(px(flipped,5,7),tip);assert.deepEqual(px(flipped,7,7),normal);
 const rotated=read({angle:90});assert.deepEqual(px(rotated,6,8),tip);assert.deepEqual(px(rotated,6,6),normal);
 const enlarged=read({size:200});assert.deepEqual(px(enlarged,8,7),tip);assert.deepEqual(px(enlarged,4,7),normal);
 assert.throws(()=>read({size:0}));assert.throws(()=>read({size:2000}));
 const hand=read({layer:'hand'});assert.deepEqual(px(hand,6,7),[0,0,255,255]);assert.deepEqual(px(hand,5,7),normal);
 const back=read({layer:'body'});assert.deepEqual(px(back,5,7),[255,0,0,255]);assert.deepEqual(px(back,6,7),[0,0,255,255]);
 assert.throws(()=>read({layer:'forearm'}));assert.throws(()=>read({angle:181}));assert.throws(()=>read({flip:'true'}));
 shared.configure({...A.empty(),records:[record]},true);assert.deepEqual(render(false).data(),orig.data());
});
test('cópia lateral usa a assinatura de destino, reflete X e rotação e remapeia as fases reais',()=>{
 const t={body:'male',slot:'weapon',item:0,weapon:0,receiver:'16x16@8,13@abcd',action:'walk',direction:'east',part:'*',source:'a'.repeat(64)};
 const other={...t,direction:'west',receiver:'16x16@8,13@cdef',source:'b'.repeat(64)};
 const a={...t,cycle:[4,2],phases:{2:[-1,3]},style:{cycle:{angle:30,flip:true,layer:'hand'},phases:{2:{angle:-10}}}};
 const clock=ns=>ns.map(phase=>({phase}));
 const b=A.mirrorRecord(a,other,clock([1,2,2]),clock([5,7,7]));
 assert.deepEqual(b,{...other,cycle:[-4,2],phases:{7:[1,3]},style:{cycle:{angle:-30,flip:true,layer:'hand'},phases:{7:{angle:10}}}});
 assert.throws(()=>A.mirrorRecord(a,other,clock([1,2,2]),clock([1,2,3])));
 assert.throws(()=>A.mirrorRecord(a,{...other,item:3},clock([2]),clock([2])));
});

test('uma bota agrupa frente, traseira e forro no mesmo pé e mantém o par e as partes salvas',async()=>{
 const session=A.session({action:'idle',direction:'south'},{equipment:{boots:{def:148}}},{},make);
 const rows=[['left-rear',3,8,'blue'],['right-rear',11,8,'orange'],['left-own-material-backing',4,8,'purple'],['left-front',4,9,'red'],['right-front',12,9,'green']];
 const layers=rows.map(([id,x,y,color])=>({id:'boot148-'+id,tile:tile(color,x,y,1,1)}));
 const render=(phase,capture=false)=>session.visit(phase,capture,()=>{
  const canvas=make(16,16),ctx=canvas.getContext('2d');
  for(const l of layers)A.blit(ctx,'boots',l.id,l.id,l.tile,[0,0]);
  return {canvas};
 }).canvas;
 const before=render(0,true);render(1,true);await session.finish({width:16,height:16,pivot:{x:8,y:14}},[0,1],8);
 const record=(part,cycle,phases={})=>{const t=session.targets.find(t=>t.part===part);assert.ok(t,'Falta '+part);const {limits,...id}=t;return {...id,cycle,phases};};
 const pair=record('*',[0,-1]),left=record('foot:left',[1,0],{1:[0,-1]}),toe=record('boot148-left-front',[1,0]);
 assert.ok(session.targets.some(t=>t.part==='foot:right'));
 session.configure({...A.empty(),records:[pair,left,toe]},true);
 for(const f of [0,1]){const expected=make(16,16),c=expected.getContext('2d');
  for(const l of layers){const chosen=l.id.startsWith('boot148-left');c.drawImage(l.tile,Number(chosen)+Number(l.id===toe.part),-1-(chosen?f:0));}
  assert.deepEqual(render(f).data(),expected.data());}
 const rotated={...left,cycle:[0,0],phases:{},style:{cycle:{angle:180},phases:{}}};
 session.configure({...A.empty(),schema:2,records:[rotated]},true);
 const expected=make(16,16),c=expected.getContext('2d');
 for(const l of layers){c.save();if(l.id.startsWith('boot148-left')){c.translate(8,18);c.scale(-1,-1);}c.drawImage(l.tile,0,0);c.restore();}
 assert.deepEqual(render(0).data(),expected.data());
 session.configure(A.empty(),true);assert.deepEqual(render(0).data(),before.data());
});
