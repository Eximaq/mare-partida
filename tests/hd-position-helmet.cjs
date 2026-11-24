'use strict';
// Compare every frame with a separate placement of the registered helmet in body space.
// The map's reported pivot supplies the origin, independently of the carry plan's padding.
const assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto');
const root=process.env.HD_PUBLISHED_ROOT||path.join(__dirname,'..'),from=n=>require(path.join(root,n));
global.MareSword0Checkpoint=from('player-rework-sword0-checkpoint.js');
const {make}=require('./rework-integration-support.cjs'),world=from('paper-doll-96-lobby.js'),A=from('hd-position.js');
const catalog=from('tools/paper-doll-96-v3/weapons.json'),{weapons,slots,gear}=require('../tools/audit-hd-wardrobe-product.cjs');
const hash=c=>crypto.createHash('sha256').update(c.getContext('2d').getImageData(0,0,c.width,c.height).data).digest('hex');
const heads=global.MareOriginalHairHelmetsHD,create=heads.create;
let origin,oracle=false,draws=0;
heads.create=(...args)=>{
 const registry=create(...args),draw=registry.draw;
 registry.draw=(ctx,r,images,proof,settings)=>{
  if(!oracle)return draw(ctx,r,images,proof,settings);
  draws++;ctx.save();
  try{ctx.translate(...origin);return draw(ctx,r,images,proof);}finally{ctx.restore();}
 };
 return registry;
};
async function namedHair(api,swords){
 const hats=gear[slots.indexOf('head')];assert.equal(hats.length,10);let cases=0;
 for(const [i,item] of hats.entries())for(const gender of ['feminino','masculino']){
  const w=swords[i%swords.length],direction=['east','north','south','west'][i%4];
  const equipment={weapon:{def:w.id},head:{def:item},coat:{def:151},boots:{def:148}};
  const player=MareCharacterAppearance.apply({classId:w.role,equipment},{gender,hairStyle:'hair-bob'});
  const options={consumer:'world',action:'walk',direction},source=world.selectWorldHDOnly(api,catalog,player,options);
  const b=await api.prepareConfiguration([{player,options}],{inspectPositions:true,resolve:()=>({player,options,source})});
  try{
   const v=b.positionView(options),head=v.targets.find(t=>t.slot==='head'&&t.part==='*'&&t.item===item);
   const label=[item,gender,direction,w.id].join('/');assert(head,'Sem capacete ajustável em '+label);
   const frame=v.clock[0].frame,before=hash(v.frame(frame,true).canvas);
   v.set(A.withPosition(A.empty(),head,'direction',[5,19]));
   assert.notEqual(hash(v.frame(frame).canvas),before,label);v.set(A.empty());
   assert.equal(hash(v.frame(frame).canvas),before,label);cases++;
  }finally{b.release();global.gc?.();}
 }
 assert.equal(cases,20);console.log(JSON.stringify({namedHairCases:cases,helmets:hats}));
}
(async()=>{
 const api=make();await api.ready;assert(await api.warmSwordCheckpoint());
 const swords=weapons.filter(w=>w.role==='sword');assert.equal(swords.length,6);
 if(process.argv.includes('--hair'))return namedHair(api,swords);
 const controls=[4,73,31].map(id=>weapons.find(w=>w.id===id));
 const directions=process.env.HD_DIRECTIONS?.split(',')||['east','west','north','south'];
 assert(directions.length&&directions.every(d=>['east','west','north','south'].includes(d)));
 const actions=process.env.HD_ACTIONS?.split(',')||['walk','idle'];assert(actions.length&&actions.every(a=>['idle','walk'].includes(a)));
 let cases=0,frames=0;
 for(const direction of directions)for(const action of actions)for(const w of [...swords,...controls]){
  const key=[w.id,direction,action].join('/'),equipment={head:{def:18},weapon:{def:w.id},coat:{def:151},boots:{def:148}};
  const player=MareCharacterAppearance.apply({classId:w.role,equipment},{gender:'masculino'});
  const options={consumer:'world',action,direction},source=world.selectWorldHDOnly(api,catalog,player,options);
  const b=await api.prepareConfiguration([{player,options}],{inspectPositions:true,resolve:()=>({player,options,source})});
  try{
   const v=b.positionView(options),body=source.independentPlan.base.pack,head=v.targets.find(t=>t.slot==='head'&&t.item===18&&t.part==='*');
   assert(head,key);origin=[v.pivot.x-body.pivot.x*body.density,v.pivot.y-body.pivot.y*body.density];
   const m=A.withPosition(A.empty(),head,'direction',[5,19]);v.set(m);const actual=[],original=[];
   for(const {frame} of v.clock){actual.push(hash(v.frame(frame).canvas));original.push(hash(v.frame(frame,true).canvas));}
   assert(actual.some((h,i)=>h!==original[i]),'Capacete imóvel em '+key);
   v.set(m);oracle=true;draws=0;
   for(const [i,{frame}] of v.clock.entries()){
    assert.equal(hash(v.frame(frame).canvas),actual[i],'Capacete fora do referencial do corpo em '+key+' · quadro '+i+' · origem '+origin);frames++;
   }
   assert(draws>0,'Referência sem desenho em '+key);cases++;
  }finally{oracle=false;b.release();global.gc?.();}
 }
 assert.equal(cases,9*actions.length*directions.length);console.log(JSON.stringify({cases,frames,directions,actions,weapons:[...swords,...controls].map(w=>w.id)}));
})().catch(e=>{console.error(e);process.exitCode=1;});
