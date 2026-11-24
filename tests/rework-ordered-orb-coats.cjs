'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;
assert(root,'Use the exported game');
const mod=name=>require(path.join(root,name)), {make,cv}=require('./rework-integration-support.cjs');
const world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json');
const look=mod('character-appearance.js'),prefix='tools/rework-weapon-layers-hd/';
const index=mod(prefix+'index.json'),load=require('../tools/rework-hd-test-loader.cjs').create(root);
const pixels=canvas=>Buffer.from(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data);
(async()=>{
 const api=make();await api.ready;
 let ticks=0;
 for(const weapon of [17,122])for(const direction of ['east','west']){
  const registered=index.orderedAttackProfiles.find(r=>r.id==='authored-orb-'+weapon+'-'+direction);
  const options={consumer:'world',action:'attack-focus',direction};
  const actor=look.commit({classId:'strategist',equipment:{weapon:{def:weapon}}},
   {gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',eyeStyle:'original',hairStyle:'original'},()=>true);
  const select=p=>world.selectWorldHDOnly(api,catalog,p,options);
  async function prepare(p){
   const source=select(p);assert(source&&!source.appearanceAdapted&&!source.visualDegraded);assert.deepEqual(source.omitted||[],[]);
   const bundle=await api.prepareConfiguration([{player:p,options}],{resolve:()=>({player:p,options,source})});
   assert.deepEqual(bundle.coverage[0].omitted,[]);
   return {source,bundle,draw(i){let c;assert(bundle.draw({save(){},restore(){},drawImage(canvas){c=canvas;}},p,
    {...options,progress:(i+.2)/source.timeline.length}));return c;}};
  }
  const bare=await prepare(actor);
  try{
   assert.equal(bare.source.timeline.length,20);
   const baseline=bare.source.timeline.map((_,t)=>{const c=bare.draw(t),out=cv.createCanvas(c.width,c.height);out.getContext('2d').drawImage(c,0,0);return out;});
   for(const id of [151,158,165,179]){
    const p={...actor,equipment:{...actor.equipment,coat:{def:id}}},mounted=await prepare(p);
    try{
     assert.equal(mounted.source.slotRoutes.coat.item,id);
     assert.deepEqual(mounted.source.slotRoutes.weapon,bare.source.slotRoutes.weapon);
     assert.deepEqual(mounted.source.timeline,bare.source.timeline);
     for(let t=0;t<baseline.length;t++){
      const frame=bare.source.timeline[t],row=registered.requiredAuthoredCoats[id][frame],base=baseline[t];
      assert.equal(mounted.source.states[frame].layers.at(-1).sha256,row.layer.sha256);
      const expected=cv.createCanvas(base.width,base.height),ctx=expected.getContext('2d');
      ctx.drawImage(base,0,0);const before=pixels(expected);
      ctx.drawImage(await load(prefix+row.layer.url),...(bare.source.renderOffsetPhysical||[0,0]));
      const after=pixels(expected);
      assert(!before.equals(after),'The garment must contribute visible original pixels');
      assert(pixels(mounted.draw(t)).equals(after),[weapon,direction,id,frame,t].join('/'));
      expected.width=1;ticks++;
     }
     const reversed={...p,equipment:{coat:{def:id},boots:{def:8},head:{def:19},weapon:{def:weapon}}};
     const combined=select(reversed);
     assert.deepEqual(combined.omitted,[]);assert.deepEqual(combined.slotRoutes.coat,mounted.source.slotRoutes.coat);
     assert.deepEqual(combined.slotRoutes,select({...p,equipment:Object.fromEntries(Object.entries(reversed.equipment).reverse())}).slotRoutes);
     assert.deepEqual(actor.appearance96,p.appearance96);
    }finally{mounted.bundle.release();}
   }
   for(const c of baseline)c.width=1;
  }finally{bare.bundle.release();}
 }
 assert.equal(ticks,320);console.log(ticks,'registered coat ticks with saved skin, hair and eyes');
})().catch(e=>{console.error(e);process.exitCode=1;});
