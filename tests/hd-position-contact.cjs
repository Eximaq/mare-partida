'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(process.env.HD_PUBLISHED_ROOT||path.join(__dirname,'..')),from=f=>require(path.join(root,f));
global.MareSword0Checkpoint=from('player-rework-sword0-checkpoint.js');
const {make}=require('./rework-integration-support.cjs'),A=from('hd-position.js'),world=from('paper-doll-96-lobby.js');
const weapons=from('tools/paper-doll-96-v3/weapons.json');
const rgba=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const hash=c=>crypto.createHash('sha256').update(rgba(c)).digest('hex');
(async()=>{
 const api=make();await api.ready;
 const reference=process.argv.includes('--original');
 let mask;const draw=A.blit;
 A.blit=(ctx,slot,part,source,img,...rest)=>{
  if(slot==='weapon'&&part==='contact-metal')mask=rgba(img);
  return draw(ctx,slot,part,source,img,...rest);
 };
 const player=MareCharacterAppearance.apply({classId:'cyborg',equipment:{weapon:{def:117},boots:{def:8},gloves:{def:25}}},{gender:'masculino'});
 for(const direction of ['south','east','west']){
  const options={consumer:'world',action:'attack-unarmed',direction},source=world.selectWorldHDOnly(api,weapons,player,options);
  const b=await api.prepareConfiguration([{player,options}],{inspectPositions:true,resolve:()=>({player,options,source})});
  try{
   const v=b.positionView(options),frames=[...new Set(v.clock.map(p=>p.frame))],original=frames.map(f=>hash(v.frame(f,true).canvas));
   assert.equal(frames.length,8);
   if(!reference){
    const whole=v.targets.find(t=>t.slot==='weapon'&&t.part==='*');assert.ok(whole,direction);
    v.set(A.withPosition(A.empty(),whole,'direction',[0,0]));
    assert.deepEqual(frames.map(f=>hash(v.frame(f).canvas)),original);
    v.set(A.withPosition(A.empty(),whole,'direction',[3,0]));
    for(const f of frames){
     const base=rgba(v.frame(f,true).canvas);mask=null;
     const canvas=v.frame(f).canvas,data=rgba(canvas),width=canvas.width;
     assert.ok(mask,direction+' metal '+f);
     let changed=0;
     for(let i=0;i<data.length;i+=4){
      if(data[i]===base[i]&&data[i+1]===base[i+1]&&data[i+2]===base[i+2]&&data[i+3]===base[i+3])continue;
      assert.ok(mask[i+3]||(i/4%width>=3&&mask[i-12+3]),direction+' quadro '+f+' pixel '+i/4+' fora do metal');changed++;
     }
     assert.ok(changed>0,direction+' quadro '+f);
    }
    v.set(A.empty());assert.deepEqual(frames.map(f=>hash(v.frame(f).canvas)),original);
   }
   console.log(direction,original.join(' '));
  }finally{b.release();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
