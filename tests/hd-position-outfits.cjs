'use strict';
// Renders each owned item after a wardrobe swap. HD_WEAPON_IDS splits the run
// into independent batches of at least ten weapons so every clothing ID appears.
const assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto');
const root=process.env.HD_PUBLISHED_ROOT||path.join(__dirname,'..'),from=n=>require(path.join(root,n));
global.MareSword0Checkpoint=from('player-rework-sword0-checkpoint.js');
const {make}=require('./rework-integration-support.cjs');
const {weapons,gear,slots}=require('../tools/audit-hd-wardrobe-product.cjs');
const world=from('paper-doll-96-lobby.js'),A=from('hd-position.js'),catalog=from('tools/paper-doll-96-v3/weapons.json');
const api=make(),pose={consumer:'world',action:'walk',direction:'east'};
const selected=process.env.HD_WEAPON_IDS?.split(',').map(Number);
const rows=selected?weapons.filter(w=>selected.includes(w.id)):weapons;
assert.equal(rows.length,selected?.length??42);assert(rows.length>=10);
const defaults=new Map(),checked=new Set();
const pixelHash=c=>crypto.createHash('sha256').update(c.getContext('2d').getImageData(0,0,c.width,c.height).data).digest('hex');
async function outfit(i,swap){
 const w=rows[i],equipment={weapon:{def:w.id}};
 for(const [j,s] of slots.entries())equipment[s]={def:gear[j][(i+2*j+(swap?1:0))%gear[j].length]};
 const player=MareCharacterAppearance.apply({classId:w.role,equipment},{}),source=world.selectWorldHDOnly(api,catalog,player,pose);
 assert.ok(source,'Sem caminhada para a arma '+w.id);
 const bundle=await api.prepareConfiguration([{player,options:pose}],{inspectPositions:true,resolve:()=>({player,options:pose,source})});
 try{
  const v=bundle.positionView(pose),frame=v.clock[0].frame,original=swap?pixelHash(v.frame(frame,true).canvas):null;
  for(const [slot,{def:id}] of Object.entries(equipment)){
   const t=v.targets.find(t=>t.slot===slot&&t.item===id&&t.part==='*');assert(t,slot+' #'+id+' com arma '+w.id);
   if(!swap){
    if(!defaults.has(id))defaults.set(id,A.withPosition(A.empty(),t,'direction',[3,-2]).records[0]);
    continue;
   }
   const saved=defaults.get(id);assert(saved,'Falta posição de origem para '+id);
   const m={...A.empty(),schema:3,records:[saved]};v.set(m);
   const moved=pixelHash(v.frame(frame).canvas);assert.notEqual(moved,original,'Sem diferença no desenho de '+slot+' #'+id+' com arma '+w.id);
   const {limits,...local}=t;v.set({...A.empty(),records:[{...local,cycle:[3,-2],phases:{}}]});
   assert.equal(pixelHash(v.frame(frame).canvas),moved,'A posição herdada divergiu da montagem local de '+id);
   v.set(A.empty());assert.equal(pixelHash(v.frame(frame).canvas),original);
   checked.add(id);
  }
 }finally{bundle.release();}
}
// Resolve movement from the actual weapon catalog, including shared attack poses.
async function checkAnimations(){
 const chosen=process.env.HD_DIRECTIONS?.split(',')||['south','north','east','west'];
 assert(chosen.length&&new Set(chosen).size===chosen.length&&chosen.every(d=>['south','north','east','west'].includes(d)));
 const motions=[{action:'idle',w:weapons[0]},{action:'walk',w:weapons[0]}];
 const families=new Set();
 for(const w of weapons){
  const action=api.attackActionFor(w.id),family=w.role+'/'+action;
  assert(world.actions.includes(action));
  if(!families.has(family)){families.add(family);motions.push({w,action});}
 }
 motions.push({w:weapons[0],action:'attack-unarmed',weaponless:true});let compared=0;
 for(const direction of chosen)for(const {action,w,weaponless=false} of motions){
  let saved;
  for(const swapped of [false,true]){
   const equipment={weapon:{def:w.id},coat:{def:151},legs:{def:swapped?168:22},gloves:{def:swapped?152:159},boots:{def:swapped?8:148},head:{def:swapped?157:18}};
   const player=MareCharacterAppearance.apply({classId:w.role,equipment},{gender:'feminino'}),options={consumer:'world',action,direction,weaponless},source=world.selectWorldHDOnly(api,catalog,player,options);
   assert.equal(source?.resolvedAction||source?.action,action);
   const b=await api.prepareConfiguration([{player,options}],{inspectPositions:true,resolve:()=>({player,options,source})});
   try{
    const view=b.positionView(options),t=view.targets.find(t=>t.slot==='coat'&&t.item===151&&t.part==='*');
    assert(t,'Peitoral 151 em '+action+'/'+direction);
    if(!swapped){saved=A.withPosition(A.empty(),t,'direction',[3,-2]);continue;}
    view.set(saved);let visible=false;
    for(const {frame} of view.clock)if(pixelHash(view.frame(frame).canvas)!==pixelHash(view.frame(frame,true).canvas)){visible=true;break;}
    assert(visible,'Peitoral 151 sem deslocamento em '+action+'/'+direction);compared++;
   }finally{b.release();}
  }
  if(global.gc)global.gc();
 }
 assert.equal(compared,chosen.length*motions.length);
 console.log(JSON.stringify({directions:chosen,movements:[...new Set(motions.map(m=>m.action))],families:[...families],compared,body:'feminino',item:151}));
}
(async()=>{
 await api.ready;assert(await api.warmSwordCheckpoint());
 if(process.argv.includes('--poses'))return checkAnimations();
 for(const swap of [false,true])for(let i=0;i<rows.length;i++){await outfit(i,swap);if(global.gc)global.gc();}
 assert.equal(checked.size,50+rows.length);
 console.log(JSON.stringify({weapons:rows.map(w=>w.id),clothing:gear.flat(),checked:[...checked],outfits:2*rows.length,individualPixelComparisons:6*rows.length,body:'masculino',action:'walk',direction:'east',tick:0}));
})().catch(e=>{console.error(e);process.exitCode=1;});
