'use strict';
// The gait rasters for boots are authored facing the final screen direction.
// Translate the registered artwork before the renderer composes it as an independent pixel oracle.
const path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=process.env.HD_PUBLISHED_ROOT||path.resolve(__dirname,'..'),from=n=>require(path.join(root,n));
global.MareSword0Checkpoint=from('player-rework-sword0-checkpoint.js');
const {make}=require('./rework-integration-support.cjs'),A=from('hd-position.js'),world=from('paper-doll-96-lobby.js');
const catalog=from('tools/paper-doll-96-v3/weapons.json'),{weapons,gear,slots}=require('../tools/audit-hd-wardrobe-product.cjs');
const hash=c=>crypto.createHash('sha256').update(c.getContext('2d').getImageData(0,0,c.width,c.height).data).digest('hex');
const layer=A.layer;let reference=null,hits=0;
A.layer=(ctx,l,image,args)=>{
 if(!reference?.parts.has(l.positionPart||l.id))return layer(ctx,l,image,args);
 assert.equal(args.length,8);assert.deepEqual(l.matrix,[1,0,0,1,0,0]);
 const local=[...args];local[4]+=reference.x*args[6]/args[2];local[5]+=reference.y*args[7]/args[3];
 hits++;ctx.drawImage(image,...local);
};
(async()=>{
 const api=make();await api.ready;await api.warmSwordCheckpoint();
 const swords=weapons.filter(w=>w.role==='sword');assert.equal(swords.length,6);
 const bodies=process.env.HD_BODIES?.split(',')||['masculino','feminino'];
 const directions=process.env.HD_DIRECTIONS?.split(',')||['west','east','north','south'];
 const sweep=process.argv.includes('--catalog'),ids=sweep?gear[slots.indexOf('boots')]:(process.env.HD_BOOT_IDS||'8').split(',').map(Number);
 if(sweep)assert.equal(ids.length,10);
 let frames=0,cases=0;
 for(const id of ids)for(const gender of bodies)for(const direction of directions)for(const action of ['idle','walk']){
  let shared;const signByPhase=new Map();
  const armed=sweep?[swords[ids.indexOf(id)%swords.length]]:swords;
  for(const w of [weapons.find(w=>w.id===2),...armed]){
   const player=MareCharacterAppearance.apply({classId:w.role,equipment:{weapon:{def:w.id},coat:{def:151},boots:{def:id}}},{gender});
   const options={consumer:'world',direction,action},source=world.selectWorldHDOnly(api,catalog,player,options);
   const b=await api.prepareConfiguration([{player,options}],{inspectPositions:true,resolve:()=>({player,options,source})});
   try{
    const v=b.positionView(options),parts=v.targets.filter(t=>t.slot==='boots'&&t.item===id),t=parts.find(t=>t.part==='*');
    const label=[id,gender,w.id,action,direction].join('/');assert(t,label);
    if(!shared){
     const {limits,...identity}=t,first=v.clock[0].phase;
     shared=A.withPosition(A.empty(),t,'direction',[5,12]);
     shared.records.push({...identity,cycle:[0,0],phases:{[first]:[-1,2]}});
     signByPhase.set(first,[-1,2]);
    }
    // A phase is portable when the signed sources, geometry and clock all match.
    const compatible=shared.records.find(r=>!r.range&&A.key(r)===A.key(t)&&r.source===t.source);
    assert(compatible,'Fase da bota perdeu o vínculo: '+label);
    v.set(shared);
    const positions=[...new Map(v.clock.map(p=>[p.frame,p])).values()];
    const actual=positions.map(p=>hash(v.frame(p.frame).canvas));
    const original=positions.map(p=>hash(v.frame(p.frame,true).canvas));
    assert(actual.some((s,i)=>s!==original[i]),label);
    v.set(shared);hits=0;
    for(const [i,p] of positions.entries()){
     const extra=compatible&&signByPhase.get(p.phase)||[0,0];
     reference={parts:new Set(parts.map(row=>row.part)),x:5+extra[0],y:12+extra[1]};
     assert.equal(hash(v.frame(p.frame).canvas),actual[i],label+' quadro '+p.frame);
     reference=null;frames++;
    }
    assert(hits>0,label);v.set(A.empty());assert.equal(hash(v.frame(positions[0].frame).canvas),original[0]);cases++;
   }finally{reference=null;b.release();global.gc?.();}
  }
 }
 assert.equal(cases,ids.length*bodies.length*directions.length*2*(sweep?2:7));assert(cases&&frames);
 console.log(JSON.stringify({boots:ids,bodies,directions,cases,frames}));
})().catch(err=>{console.error(err);process.exitCode=1;});
