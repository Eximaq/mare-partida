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

test('copiar para outra peça remapeia todas as fases, preserva a origem e rejeita cópia parcial',()=>{
 const target=(item,part)=>({slot:'boots',item,part,body:'male',weapon:2,action:'walk',direction:'west',
  receiver:'receiver-'+item,source:(item===8?'a':'b').repeat(64),limits:{0:[-4,4,-4,4],1:[-4,4,-4,4],2:[-4,4,-4,4]}});
 const view=(item,phases)=>({targets:['*','foot:near','boot'+item+'-near-front'].map(part=>target(item,part)),
  clock:phases.map(phase=>({phase})),fps:12,footFor:t=>t.part==='*'?null:'foot:near'});
 const from=view(8,[0,1,1,2]),to=view(9,[2,0,0,1]);
 const gear={weapon:2,boots:8},witness={role:'brawler',gear:{weapon:2,boots:9},look:{gender:'masculino'},hide:false};
 let m=A.withPosition(A.empty(),from.targets[0],'direction',[3,-2]);
 const {limits,...id}=from.targets[2];m.records.push({...id,cycle:[1,0],phases:{0:[1,2],1:[-2,0],2:[3,1]},
  style:{cycle:{flip:true,layer:'body',size:115},phases:{0:{angle:18},1:{size:90},2:{angle:-7}}}});
 const unchanged=structuredClone(m),copy=A.validate(A.copyItemDirection(m,from,to,'boots',8,9,gear,witness));
 assert.deepEqual(m,unchanged);
 assert.deepEqual(A.positionFor(to.targets[0],copy.records,witness.gear).cycle,[3,-2]);
 const panel=A.localRecord(to.targets[2],copy.records);assert.equal(panel.source,'b'.repeat(64));
 assert.deepEqual(panel.phases,{0:[-2,0],1:[3,1],2:[1,2]});
 assert.deepEqual(panel.style,{cycle:{flip:true,layer:'body',size:115},phases:{0:{size:90},1:{angle:-7},2:{angle:18}}});
 for(const v of [{...to,clock:from.clock.slice(0,1)},{...to,clock:[0,1,2,2].map(phase=>({phase}))},{...to,targets:to.targets.slice(0,2)}]){
  assert.throws(()=>A.copyItemDirection(m,from,v,'boots',8,9,gear,witness));assert.deepEqual(m,unchanged);
 }
 const third={...m.records[1],part:'unavailable',receiver:'elsewhere'};
 assert.throws(()=>A.copyItemDirection({...m,records:[...m.records,third]},from,to,'boots',8,9,gear,witness),/outra montagem/);
});

test('copie attack-unarmed entre armas e corpos, adaptando fases apenas a pedido',()=>{
 const pose=(body,weapon,n)=>({fps:12,clock:Array.from({length:n},(_,phase)=>({phase})),footFor:()=>null,
  targets:[{body,weapon,item:8,slot:'boots',part:'*',action:'attack-unarmed',direction:'south',
   receiver:'rig-'+weapon,source:(body==='male'&&weapon===117?'a':'b').repeat(64)}]});
 const from=pose('male',117,8),src=from.targets[0],gear={boots:8,weapon:117};
 const original=A.withPosition(A.empty(),src,'direction',[2,1]);
 original.records.push({...src,cycle:[0,0],phases:{7:[1,-3]},style:{cycle:{angle:8},phases:{7:{size:105}}}});
 const before=structuredClone(original);
 for(const [body,n] of [['male',12],['female',8]]){
  const to=pose(body,3,n),dest=to.targets[0],w={gear:{boots:8,weapon:3},role:'brawler',hide:false,look:{gender:body==='male'?'masculino':'feminino'}};
  if(n!==8)assert.throws(()=>A.copyItemDirection(original,from,to,'boots',8,8,gear,w));
  const copy=A.validate(A.copyItemDirection(original,from,to,'boots',8,8,gear,w,{adaptPhases:true}));
  assert.deepEqual(original,before);
  for(const r of before.records)assert.ok(copy.records.some(x=>JSON.stringify(x)===JSON.stringify(r)));
  assert.deepEqual(A.positionFor(dest,copy.records,w.gear).cycle,[2,1]);
  const row=A.localRecord(dest,copy.records);assert.equal(row.body,body);assert.equal(row.weapon,3);
  assert.deepEqual(row.phases[n-1],[1,-3]);assert.deepEqual(row.style.phases[n-1],{size:105});
  assert.equal(row.style.cycle.angle,8);
  assert.throws(()=>A.copyItemDirection(original,from,{...to,targets:[{...dest,action:'idle'}]},'boots',8,8,gear,w));
 }
});

test('metal único do braço pode transferir ajustes para o único painel da luva',()=>{
 const hand=(item,part)=>({body:'male',weapon:item,slot:'weapon',item,part,receiver:'rig-'+item,action:'attack-unarmed',direction:'south',source:'a'.repeat(64)});
 const view=(id,parts)=>({targets:parts.map(p=>hand(id,p)),clock:[{phase:0}],fps:12,footFor:()=>null});
 const arm=view(117,['*','contact-metal']),glove=view(3,['*','plate-1']);
 const source=arm.targets[1],m={...A.empty(),records:[{...source,cycle:[1,0],phases:{0:[1,1]}}]};
 const w={role:'brawler',gear:{weapon:3},look:{gender:'masculino'},hide:false};
 const next=A.validate(A.copyItemDirection(m,arm,glove,'weapon',117,3,{weapon:117},w));
 assert.deepEqual(A.localRecord(glove.targets[1],next.records).phases,{0:[1,1]});
 assert.throws(()=>A.copyItemDirection(m,arm,view(3,['*','left-0','right-1']),'weapon',117,3,{weapon:117},w),/parte correspondente/);
});
