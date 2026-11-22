'use strict';
// Spawn each owned source as a fresh process to cap decoded native Canvas surfaces.
if(!process.env.KAIZOKU_GAUNTLET_HEAD_SHARD){
 const spawn=require('node:child_process').spawnSync, assert=require('node:assert/strict');
 let shards=0;
 for(const SIDE of ['east','west'])for(const WEAPON of ['32'])for(const TONE of ['light','ebony'])for(const HEAD of ['164','178']){
  const r=spawn(process.execPath,['--expose-gc',__filename],{stdio:'inherit',env:{...process.env,KAIZOKU_GAUNTLET_HEAD_SHARD:'1',SIDE,WEAPON,TONE,HEAD}});
  assert.equal(r.status,0,`World headgear shard ${SIDE}/${WEAPON}/${TONE}/${HEAD}: ${r.error||r.signal||r.status}`);shards++;
 }
 console.log('PASS '+(shards*8)+' poses of saved World Relic 32; exact independent headgear alpha, no hand or clothing contact');
 return;
}
const a=require('node:assert/strict'), R=require('node:path').resolve(process.env.PROOF_STAGE||require('node:path').join(__dirname,'..')),{make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance'),api=make();
const load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),catalog=require(R+'/tools/paper-doll-96-v3/weapons.json'),world=require(R+'/paper-doll-96-lobby.js');
const W='tools/rework-weapon-layers-hd/', pathFor=p=>p.startsWith('/')?p.slice(1):W+p, skull=new Set(['headBase','face','hair']);
const draw=(b,p,o,f)=>{let c;a(b.draw({save(){},restore(){},drawImage(q){c=q}},p,{...o,progress:(f+.25)/(Number(process.env.WEAPON)===109?20:8)}));return c;};
const take=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
const prep=(p,o)=>api.prepareConfiguration([{player:p,options:o}]);
(async()=>{await api.ready;let frames=0,rows=0;
for(const d of process.env.SIDE?[process.env.SIDE]:['east','west'])for(const w of process.env.WEAPON?[+process.env.WEAPON]:[2,3])for(const tone of process.env.TONE?[process.env.TONE]:['light','ebony']){
 const o={direction:d,action:w===32?'attack-focus':'attack-unarmed',consumer:'world'},p=A.commit({classId:w===32?'healer':w===117?'cyborg':'brawler',equipment:{weapon:{def:w}}},{gender:'masculino',skinColor:tone},()=>true),old=api.selectVisual(p,o);
 a(old?.basePack && old?.states.length===8); const base=old.basePack.pack.directions[d], prior=await prep(p,o),temp=cv.createCanvas(640,640),ctx=temp.getContext('2d');
 for(const h of process.env.HEAD?[+process.env.HEAD]:[164,178]){
  const q={...p,equipment:{...p.equipment,head:{def:h}}},r=api.selectVisual(q,o); a(r?.ownGauntletHead,JSON.stringify({d,w,h,tone,result:r?.id}));
  a.deepEqual(r.omitted,[]);a.equal(r.slotRoutes.head.item,h);a.equal(r.slotRoutes.weapon.item,w);
  a.deepEqual(r.timeline,old.timeline);a.deepEqual(r.states,old.states);a.deepEqual(r.colorAppearance,old.colorAppearance);
  for(const head of [{def:18},{def:h,variant:'alternate'}, {def:136}])
   a(!api.selectVisual({...q,equipment:{...q.equipment,head}},o)?.ownGauntletHead);
  a(!api.selectVisual(q,{...o,direction:'north'})?.ownGauntletHead);
  const proof=r.ownGauntletHead,gear=await load(proof.source);
  for(const action of [o.action,'attack','skill'])a.equal(world.selectWorldHD(api,catalog,q,{...o,action})?.id,r.id);
  const b=await prep(q,o);let overlap=0,nonHead=0;
  try{for(let f=0;f<8;f++){
   const oldFrame=draw(prior,p,o,f), orig=take(oldFrame), actual=take(draw(b,q,o,f));
   ctx.clearRect(0,0,640,640);ctx.drawImage(gear,...proof.offset);const hat=take(temp);
   ctx.clearRect(0,0,640,640);for(const l of old.states[f].layers){ctx.save();if(l.mirrorX){ctx.translate(640,0);ctx.scale(-1,1);}ctx.drawImage(await load(pathFor(l.ownArm117Gear?.url||l.url)),0,0);ctx.restore();}const hand=take(temp);
   ctx.clearRect(0,0,640,640);for(const l of base.layers.filter(l=>!skull.has(l.slot)))ctx.drawImage(await load(pathFor(old.basePack.images[l.frames?.[f]||l.source])),0,0);const other=take(temp);
   ctx.clearRect(0,0,640,640);ctx.drawImage(oldFrame,0,0);ctx.drawImage(gear,...proof.offset);a.deepEqual(take(temp),actual);
   let delta=0;
   for(let i=0;i<hat.length;i++) {if(hat[i]>>>24){if(hand[i]>>>24)overlap++;if(other[i]>>>24)nonHead++;}if(orig[i]!==actual[i]){a(hat[i]>>>24);delta++;}}
   a(delta>100);frames++;
  }}finally{b.release();}
  a.equal(api.selectVisual({...q,preferences:{hideHeadgear:true}},o)?.id,old.id);
  a.equal(overlap,0);a.equal(nonHead,0);console.log(d,w,tone,h,{overlap,nonHead}); rows++;
 }
 prior.release(); temp.width=1; global.gc?.();
}
console.log({frames,rows});
})().catch(e=>{console.error(e);process.exitCode=1});
