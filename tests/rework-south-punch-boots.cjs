'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const mod=n=>require(path.join(root,n)),{make,cv}=require('./rework-integration-support.cjs');
const load=require('../tools/rework-hd-test-loader.cjs').create(root),{weapons,gear}=require('../tools/audit-hd-wardrobe-product.cjs');
const world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json'),look=mod('character-appearance.js');
const weapon=Number(process.argv[2]),tone=process.argv[3]||'ebony';
assert([2,3,14,110,111,118,119,120].includes(weapon)&&['ebony','light'].includes(tone));
const canvas=()=>cv.createCanvas(640,640),read=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
async function main(){
 const api=make();await api.ready;
 const actor=look.commit({classId:weapons.find(w=>w.id===weapon).role,equipment:{}},{gender:'masculino',skinColor:tone,hairColor:'blue',eyeColor:'green',eyeStyle:'original',hairStyle:'original'},()=>true);
 const o={consumer:'world',action:'attack-unarmed',direction:'south'},select=p=>world.selectWorldHDOnly(api,catalog,p,o);
 async function prepare(eq){
  const p={...actor,equipment:Object.fromEntries(Object.entries(eq).map(([s,id])=>[s,{def:id}]))},r=select(p);
  assert.deepEqual(r.omitted||[],[]);for(const [s,id] of Object.entries(eq))assert.equal(r.slotRoutes[s].item,id);
  const bundle=await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:r})});
  const draw=f=>{let c;assert(bundle.draw({save(){},restore(){},drawImage(v){c=v;}},p,{...o,progress:((r.timeline?r.timeline.indexOf(String(f)):f)+.1)/(r.timeline?.length||8)}));return c;};
  return {r,draw,release:()=>bundle.release()};
 }
 const rawIndex=mod('tools/rework-weapon-layers-hd/index.json'),stock=rawIndex.orderedAttackProfiles.find(r=>r.id==='authored-ordered-14-south');
 const withoutBoot=await prepare({weapon}),withHat=await prepare({weapon,head:136}),rows=[];
 const model=mod('tools/rework-base-hd/index.json').records.find(r=>r.id==='male-attack-unarmed-south-drawn8');
 const raw=async im=>{const c=canvas();c.getContext('2d').drawImage(im,0,0);const data=read(c);c.width=1;return data;};
 for(let f=0;f<12;f++){
  const i=Math.min(f,7),rig=canvas(),ctx=rig.getContext('2d');
  for(const l of model.pack.directions.south.layers.filter(l=>['skin-arms-phase','shorts-phase'].includes(l.id)))ctx.drawImage(await load('tools/rework-base-hd/assets/'+l.frames[i]+'.png'),0,0);
  const original=await raw(await load('tools/rework-weapon-layers-hd/'+stock.states[f].layers[0].url)),reference=read(rig);rig.width=1;
  assert(original.subarray(380*640*4).equals(reference.subarray(380*640*4)),'authored lower anatomy, phase '+f);
 }
 for(const id of gear[2]){
  const donor=await prepare({boots:id}),bank=donor.r.nativeSlotPack,pass=donor.r.independentPlan.passes.get('boots');
  assert(pass.layers.length>=2);const poses=[];
  for(let p=0;p<8;p++){
   const planes=[];
   for(const l of [...pass.layers].sort((a,b)=>a.depth-b.depth)){
    const key=l.frames?.[p]||l.source,t=canvas(),c=t.getContext('2d'),fit=bank.phaseTransforms.find(x=>x.layer.id===l.id);
    assert(l.id.startsWith('boot'+id+'-'));assert.equal(l.binding.kind,'fixed');
    const im=await load('tools/rework-modular-outfits-hd/assets/'+key+'.png'),pad=bank.padding?.[key]?.offset||0;
    c.imageSmoothingEnabled=false;if(fit)c.setTransform(...fit.matrices[p]);c.drawImage(im,pad,pad);
    const pixels=read(t);assert(!pixels.subarray(0,380*640*4).some(Boolean),'cloth extends into the new arm motion');
    planes.push({t,back:l.depth<0});
   }
   poses.push(planes);
  }
  for(const [hat,bare] of [[false,withoutBoot],[true,withHat]]){
   const worn=await prepare({weapon,boots:id,...(hat?{head:136}:{})});assert.equal(worn.r.states.length,12);
   for(let f=0;f<12;f++){
    const ref=canvas(),x=ref.getContext('2d'),legs=poses[Math.min(f,7)];
    for(const p of legs.filter(o=>o.back))x.drawImage(p.t,0,0);
    const base=bare.draw(f);x.drawImage(base,0,0);
    for(const p of legs.filter(o=>!o.back))x.drawImage(p.t,0,0);
    const got=read(worn.draw(f)),expected=read(ref),before=read(base);ref.width=1;
    const first=got.findIndex((v,k)=>v!==expected[k]);
    assert.equal(first,-1,'boot and native body '+weapon+'/'+id+'/'+f+'/'+hat+' (first byte '+first+')');
    let changed=0;for(let k=0;k<got.length;k+=4)if(got.readUInt32LE(k)!==before.readUInt32LE(k))changed++;
    assert(changed>100);rows.push({item:id,head:hat?136:null,phase:f,changed});
   }
   worn.release();
  }
  for(const p of poses.flat())p.t.width=1;donor.release();
 }
 withoutBoot.release();withHat.release();assert.equal(rows.length,240);
 if(process.env.HD_BOOT_RESULTS)fs.writeFileSync(process.env.HD_BOOT_RESULTS,JSON.stringify(rows));
 console.log(weapon,tone,rows.length,'complete boot phases with and without helmet');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
