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

test('posição por ID, movimento e corpo tem direção, quatro direções e exceção assinada',async()=>{
 const cv=require('@napi-rs/canvas'),make=(w,h)=>cv.createCanvas(w,h);
 const makeView=async(item,gender,direction,weapon,action='walk')=>{
  const equipment={coat:{def:item},legs:{def:22},boots:{def:148}};if(weapon!==null)equipment.weapon={def:weapon};
  const session=adjust.session({action,direction},{appearance96:{gender},equipment},{},make);
  const draw=(capture=false)=>session.visit(0,capture,()=>{
   const size=weapon===null?24:32,c=make(size,size),ctx=c.getContext('2d');
   for(const [slot,id,x,color] of [['coat',item,4,'red'],['legs',22,10,'blue'],['boots',148,16,'green']]){
    const tile=make(1,1),pen=tile.getContext('2d');pen.fillStyle=color;pen.fillRect(0,0,1,1);
    adjust.blit(ctx,slot,'signed-'+slot,slot+'-'+id+'@'+weapon,tile,[x,8]);
   }return c;
  });
  const c=draw(true);await session.finish({width:c.width,height:c.height,pivot:{x:8,y:15}},[{frame:0,phase:0}],8);
  return {session,draw,coat:session.targets.find(t=>t.slot==='coat'&&t.part==='*')};
 };
 const east=await makeView(6,'masculino','east',null),armed=await makeView(6,'masculino','east',0),west=await makeView(6,'masculino','west',0);
 const pixel=(c,x,y)=>Array.from(c.getContext('2d').getImageData(x,y,1,1).data);
 function check(view,manifest,dx,dy){
  view.session.configure(adjust.validate(manifest),true);const c=view.draw();
  assert.deepEqual(pixel(c,4+dx,8+dy),[255,0,0,255]);assert.deepEqual(pixel(c,10,8),[0,0,255,255]);assert.deepEqual(pixel(c,16,8),[0,128,0,255]);
  if(dx||dy)assert.equal(pixel(c,4,8)[3],0);
 }
 let m=adjust.withPosition(adjust.empty(),east.coat,'direction',[3,1]);check(armed,m,3,1);check(west,m,0,0);
 m=adjust.withPosition(m,east.coat,'motion',[2,-1]);check(west,m,2,-1);
 for(const d of ['north','south'])check(await makeView(6,'masculino',d,4),m,2,-1);
 for(const v of [await makeView(7,'masculino','east',0),await makeView(6,'feminino','east',0),await makeView(6,'masculino','east',0,'idle')])check(v,m,0,0);
 m=adjust.withPosition(m,armed.coat,'pose',[0,0]);check(armed,m,0,0);check(east,m,2,-1);
 m=adjust.withPosition(m,west.coat,'direction',[-2,1]);check(west,m,-2,1);check(east,m,2,-1);
 const legacy={...adjust.empty(),records:[(({limits,...id})=>({...id,cycle:[2,1],phases:{}}))(east.coat)]};
 const migrated=adjust.shareVerified(legacy,adjust.legacyPositions(legacy));check(armed,migrated,2,1);assert.equal(legacy.records.length,1);
 assert.throws(()=>adjust.validate({...m,records:[...m.records,m.records[0]]}));
 assert.throws(()=>adjust.validate({...m,reference:'0'.repeat(40)}));
 assert.throws(()=>armed.session.configure(adjust.withPosition(m,armed.coat,'pose',[99,0]),true));
});

test('a montagem de origem detecta uma arte substituída mesmo com X/Y compartilhado',async()=>{
 const {createCanvas}=require('@napi-rs/canvas'),actor={classId:'sword',equipment:{coat:{def:6}},appearance96:{gender:'masculino'},preferences:{hideHeadgear:false}};
 async function view(source){
  const session=adjust.session({action:'walk',direction:'east'},actor,{},createCanvas);
  session.visit(0,true,()=>{const c=createCanvas(12,12),im=createCanvas(1,1);im.getContext('2d').fillRect(0,0,1,1);adjust.blit(c.getContext('2d'),'coat','panel',source,im,[3,4]);});
  await session.finish({width:12,height:12,pivot:{x:6,y:10}},[{frame:0,phase:0}],8);return session;
 }
 const original=await view('arte-original'),changed=await view('arte-nova'),t=original.targets.find(v=>v.part==='*');
 const witness={role:'sword',gear:{coat:6},look:{gender:'masculino'},hide:false};
 const m=adjust.withPosition(adjust.empty(),t,'motion',[2,1],witness);
 assert.throws(()=>changed.configure(m,true),/incompatível/);assert.equal(changed.moved,false);
});

test('a exceção da caminhada Sul do peitoral 151 só pertence ao conjunto escolhido',()=>{
 const t={body:'male',weapon:null,receiver:'512x512@256,448@abc',action:'walk',direction:'south',slot:'coat',item:151,part:'*',source:'a'.repeat(64)};
 const a={role:'sword',gear:{coat:151,boots:148},look:{gender:'masculino'},hide:false},b={...a,gear:{coat:151,boots:8}};
 let m=adjust.withPosition(adjust.empty(),t,'direction',[5,2],a);
 m=adjust.withPosition(m,t,'outfit',[1,7],a);adjust.validate(m);
 assert.deepEqual(adjust.positionFor(t,m.records,a.gear).cycle,[1,7]);assert.deepEqual(adjust.positionFor(t,m.records,b.gear).cycle,[5,2]);
 assert.equal(adjust.positionFor({...t,action:'idle'},m.records,a.gear),null);
 m=adjust.withPosition(m,{...t,action:'idle'},'direction',[-2,1],a);
 assert.deepEqual(adjust.positionFor({...t,action:'idle'},m.records,b.gear).cycle,[-2,1]);
 m=adjust.withPosition(m,t,'outfit',[0,0],b);assert.deepEqual(adjust.positionFor(t,m.records,b.gear).cycle,[0,0]);
 assert.deepEqual(adjust.positionFor(t,m.records,a.gear).cycle,[1,7]);assert.equal(m.records.length,4);
});

test('cada ação e direção mantém seu padrão por ID do catálogo nos dois corpos',()=>{
 const {actions}=require('../paper-doll-96-lobby.js');
 const {gear,slots,weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
 const items=[...gear.flatMap((ids,i)=>ids.map(item=>({item,slot:slots[i]}))),...weapons.map(({id:item})=>({item,slot:'weapon'}))];
 assert.equal(items.length,92);assert(actions.includes('walk')&&actions.includes('idle'));
 const directions=['north','south','west','east'];let checks=0;
 for(const {slot,item} of items)for(const body of ['male','female']){
  const records=[];
  for(const [i,action] of actions.entries())for(const [j,direction] of directions.entries()){
   records.push({item,slot,body,action,direction,part:'*',weapon:slot==='weapon'?item:null,source:'a'.repeat(64),receiver:'origem',range:'direction',cycle:[i+1,j+1],phases:{}});
  }
  for(const r of records){
   const target={...r,receiver:'outro receptor',source:'b'.repeat(64),weapon:slot==='weapon'?item:4};
   assert.deepEqual(adjust.positionFor(target,records).cycle,r.cycle);
   assert.equal(adjust.positionFor({...target,item:9999},records),null);checks++;
  }
 }
 assert.equal(checks,92*2*4*actions.length);
});
