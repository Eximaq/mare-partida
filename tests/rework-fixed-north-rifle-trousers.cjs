'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Use the published game');
const {make,cv}=require('./rework-integration-support.cjs');
const world=require(path.join(root,'paper-doll-96-lobby.js')),look=require(path.join(root,'character-appearance.js'));
const weaponCatalog=require(path.join(root,'tools/paper-doll-96-v3/weapons.json'));
const {gear}=require('../tools/audit-hd-wardrobe-product.cjs');
const bank=require(path.join(root,'tools/rework-combat-wardrobe/index.json')).northRiflePants;
const images=require('../tools/rework-hd-test-loader.cjs').create(root);
const data=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
function mask(runs){const a=new Uint8Array(640*640);for(const [k,n] of runs)a.fill(1,k,k+n);return a;}
(async()=>{
 const api=make();await api.ready;const options={action:'attack-firearm',direction:'north',consumer:'world'},rows=[];
 const role='gunner',cut=mask(bank.clear);
 for(const id of [4,5,113,115,116]){
  const p=look.commit({classId:role,equipment:{weapon:{def:id}}},{gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',hairStyle:'original',eyeStyle:'original'},()=>true);
  const select=actor=>world.selectWorldHDOnly(api,weaponCatalog,actor,options);
  const prepare=(actor,r)=>api.prepareConfiguration([{player:actor,options}],{resolve:()=>({player:actor,options,source:r})});
  const bare=select(p),off=await prepare(p,bare);const clock=bare.timeline.length;
  assert.equal(clock,48);
  const draw=(bundle,actor,t)=>{let canvas;assert(bundle.draw({save(){},restore(){},drawImage(c){canvas=c;}},actor,{...options,progress:(t+.2)/clock}));return canvas;};
  let checks=0;
  try{for(const item of gear[1]){
   const actor={...p,equipment:{weapon:{def:id},legs:{def:item}}},r=select(actor);
   assert.deepEqual(r.omitted,[]);assert.equal(r.slotRoutes.legs.item,item);assert.equal(r.slotRoutes.weapon.item,id);
   assert.deepEqual(r.timeline,bare.timeline);assert.equal(r.action,'attack-firearm');
   const pack=await prepare(actor,r);assert.deepEqual(pack.coverage[0].omitted,[]);
   try{
    const slots=new Map();
    for(let t=0;t<clock;t++){
     const i=Number(bare.timeline[t]),actual=data(draw(pack,actor,t));
     if(!slots.has(i)){
      const before=draw(off,p,t),original=data(before),cloth=bank.items[item];
      const sha=cloth?.sha||r.rifleLower.trousers.sha;
      const owner=await images('tools/'+(cloth?'rework-modular-outfits-hd':'rework-weapon-layers-hd')+'/assets/'+sha+'.png');
      const c=cv.createCanvas(640,640),ctx=c.getContext('2d');ctx.drawImage(owner,0,0);
      const own=data(c),keep=cloth?mask(bank.poses[bare.states[i].layers.map(l=>l.sha256).join('/')]):null;
      let drawn=0;for(let k=0;k<actual.length;k++)if(actual[k]!==original[k]){
       assert((own[k]>>>24||cloth?.replace&&cut[k])&&!keep?.[k],[id,item,t,k,'outside own pass'].join('/'));
       if((own[k]>>>24)>200)drawn++;
      }
      assert(drawn>1000,[id,item,t,drawn].join('/'));
      // Independent reconstruction uses RGBA ImageData for protected or stripped
      // pixels and the canvas source-over operator for the original fabric.
      const garment=ctx.getImageData(0,0,640,640),gp=new Uint32Array(garment.data.buffer);
      if(keep){for(let k=0;k<gp.length;k++)if(keep[k])gp[k]=0;ctx.putImageData(garment,0,0);}
      const ref=cv.createCanvas(640,640),cx=ref.getContext('2d');cx.drawImage(before,0,0);
      if(cloth?.replace){const raw=cx.getImageData(0,0,640,640),rgba=new Uint32Array(raw.data.buffer);
       for(let k=0;k<rgba.length;k++)if(cut[k])rgba[k]=0;cx.putImageData(raw,0,0);}
      cx.drawImage(c,0,0);slots.set(i,Buffer.from(data(ref).buffer));
      c.width=ref.width=1;
     }
     assert(Buffer.from(actual.buffer).equals(slots.get(i)),[id,item,t,i,'registered recoil'].join('/'));checks++;
    }
    assert.equal(slots.size,3);
   }finally{pack.release();}
  }}finally{off.release();}
  assert.equal(checks,480);rows.push({id,items:10,ticks:checks});console.log(id,checks);global.gc?.();
 }
 assert.equal(rows.length,5);if(process.env.HD_RIFLE_RESULTS)fs.writeFileSync(process.env.HD_RIFLE_RESULTS,JSON.stringify(rows));
})().catch(e=>{console.error(e);process.exitCode=1;});
