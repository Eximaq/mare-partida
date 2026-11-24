'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const R=path.resolve(process.env.KAIZOKU_REPO||path.join(__dirname,'..')),get=f=>require(R+'/'+f);
// Prevent native Canvas memory from accumulating across the six programs.
if(!process.env.PANTS&&!process.env.SELECT_ONLY){
 const run=require('node:child_process').spawnSync;
 for(const id of [140,147,154,161,168,175,182]){
  const result=run(process.execPath,['--expose-gc',__filename],{env:{...process.env,PANTS:String(id)},stdio:'inherit'});
  assert.equal(result.status,0,'isolated cloth shard '+id);
 }
 return;
}
const {make,cv}=get('tests/rework-integration-support.cjs'),A=get('character-appearance.js'),api=make();
const load=get('tools/rework-hd-test-loader.cjs').create(R),V=global.ReworkAccessoryVendor.compositor;
const catalog=get('item-catalog.js').create({forge:get('forge-system.js'),prison:get('prison-system.js'),haki:get('haki-system.js'),akuma:get('akuma-system.js'),hakiProgression:get('haki-progression.js')}).items;
const role=id=>catalog[id].type;
const dress=(w,p,skinColor)=>A.commit({classId:role(w),equipment:{weapon:{def:w},...(p?{legs:{def:p}}:{})}},{gender:'masculino',skinColor},()=>true);
const pass=[140,147,154,161,168,175,182], shards=[2,14,31,110,113,120,126];
function take(bundle,player,o,k,n){
 let im;assert(bundle.draw({save(){},restore(){},drawImage(img){im=img;}},player,{...o,progress:(k+.25)/n}));return im;
}
const pix=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
(async()=>{await api.ready;let selections=0,renders=0;
 for(const direction of (process.env.SIDE?[process.env.SIDE]:['south']))for(const action of ['idle','walk']){
  const o={consumer:'world',direction,action};
  for(const [i,item] of pass.entries()){
   if(process.env.PANTS&&Number(process.env.PANTS)!==item)continue;
   const w=shards[i];
   for(const tone of Object.keys(A.skins)){
    const off=dress(w,null,tone),on=dress(w,item,tone),snap=JSON.stringify(on),bare=api.selectVisual(off,o),r=api.selectVisual(on,o);
    assert(r?.ownSouthGaitPants,'held weapon cannot suppress proven South gait pants '+[w,item,direction,action,tone]);
    const old=bare.pack.directions[direction],d=r.pack.directions[direction],clip=d.clip.frames;
    const own=d.layers.filter(l=>l.id.startsWith('pants'+item+'-'));
    assert.deepEqual({...d,layers:d.layers.filter(l=>!own.includes(l))},old);
    assert.deepEqual(r.colorAppearance,bare.colorAppearance);
    assert.deepEqual(r.plan,bare.plan);assert.deepEqual(r.preMirroredLayers,bare.preMirroredLayers);
    assert.equal(r.slotRoutes.weapon.item,w);assert.equal(r.slotRoutes.legs.item,item);assert.deepEqual(r.omitted,[]);
    assert.equal(r.slotRoutes.weapon.source,bare.id);assert.equal(r.slotRoutes.legs.source,r.outfitOverlay.sourceRecord);
    // Either a legacy source is present for a synthetic invalid save or none,
    // but this new independent provider must never authorize a wrong class.
    assert(!api.selectVisual({...on,classId:role(w)==='healer'?'strategist':'healer'},o)?.ownSouthGaitPants);
    assert(!api.selectVisual({...on,equipment:{...on.equipment,legs:{def:item,variant:'other'}}},o)?.ownSouthGaitPants);
    assert(!api.selectVisual(on,{...o,direction:'north'})?.ownSouthGaitPants);
    selections++;
    if(process.env.SELECT_ONLY||!['light','ebony'].includes(tone)||process.env.TONE&&process.env.TONE!==tone)continue;
    const a=await api.prepareConfiguration([{player:off,options:o}]),b=await api.prepareConfiguration([{player:on,options:o}]);
    const assets=new Map();
    try{for(let k=0;k<clip;k++){
     const x=take(a,off,o,k,clip),y=take(b,on,o,k,clip);
     assert.equal(x.width,y.width);assert.equal(x.height,y.height);
     const c=cv.createCanvas(x.width,x.height),ctx=c.getContext('2d'),pad=bare.plan.paddingPhysical??0;
     for(const l of own){
      const h=l.frames?.[k]||l.source;if(!assets.has(h))assets.set(h,await load('tools/rework-modular-outfits-hd/assets/'+h+'.png'));
      const size=r.pack.frame.width*r.pack.density,tile=cv.createCanvas(size,size),tctx=tile.getContext('2d');
      const single={...r.pack,directions:{[direction]:{...d,layers:[l]}}};
      V.render(tctx,single,new Map([[h,assets.get(h)]]),{direction,frame:k,density:r.pack.density});
      ctx.drawImage(tile,pad,pad);tile.width=1;
     }
     const src=pix(x),dst=pix(y),mask=pix(c);
     let changes=0;
     for(let j=0;j<src.length;j++){
      assert((dst[j]>>>24)>=(src[j]>>>24),'lost silhouette '+[w,item,direction,action,k,j]);
      if(src[j]!==dst[j]){
       assert(mask[j]>>>24,'delta outside owned cloth '+[w,item,direction,action,k,j]);changes++;
      }
     }
     assert(changes>500);
     assert.deepEqual(pix(take(a,off,o,k,clip)),src);
     c.width=1;renders++;
    }}finally{a.release();b.release();global.gc?.();}
    assert.equal(JSON.stringify(on),snap);
   }
  }
 }
 console.log('PASS South pants',process.env.PANTS||'all selections',selections,'selectors;',renders,'rendered steps');
})().catch(e=>{console.error(e);process.exitCode=1});
