'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root);
const mod=n=>require(path.join(root,n)),{make,cv}=require('./rework-integration-support.cjs');
const load=require('../tools/rework-hd-test-loader.cjs').create(root);
const {weapons,gear}=require('../tools/audit-hd-wardrobe-product.cjs'),look=mod('character-appearance.js');
const world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json'),weaponDir='tools/rework-weapon-layers-hd/';
const weapon=Number(process.argv[2]),tone=process.argv[3]||'ebony';
assert([111,118,119,120].includes(weapon)&&['ebony','light'].includes(tone));
const C=()=>cv.createCanvas(640,640),pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
async function main(){
 const api=make();await api.ready;
 const wa=mod('player-rework-weapon-native-hd.js').create(mod(weaponDir+'index.json'),{makeCanvas:cv.createCanvas});
 const actor=look.commit({classId:weapons.find(w=>w.id===weapon).role,equipment:{}},{gender:'masculino',skinColor:tone,hairColor:'blue',eyeColor:'green',eyeStyle:'original',hairStyle:'original'},()=>true);
 const options={consumer:'world',action:'attack-unarmed',direction:'south'};
 const select=eq=>{const p={...actor,equipment:Object.fromEntries(Object.entries(eq).map(([s,def])=>[s,{def}]))};
  const r=world.selectWorldHDOnly(api,catalog,p,options);assert.deepEqual(r.omitted||[],[]);
  for(const [slot,id] of Object.entries(eq)){assert.equal(r.slotRoutes[slot].item,id);assert.equal(r.slotRoutes[slot].quality,'hd');}
  return {p,r};};
 async function prepared(eq){
  const {p,r}=select(eq);
  const b=await api.prepareConfiguration([{player:p,options}],{resolve:()=>({player:p,options,source:r})});
  return {draw(f){let c;assert(b.draw({save(){},restore(){},drawImage(im){c=im;}},p,{...options,progress:(r.timeline.indexOf(String(f))+.1)/20}));return c;},release:()=>b.release()};
 }
 const {r}=select({weapon}),parts=wa.southPunchHeadLayers(r),bp=r.ownedCyborg120Body,original=bp.pack.directions.south;
 assert.equal(r.timeline.length,20);assert.equal(r.states.length,12);
 const withoutShorts={...parts.body,ownedCyborg120Body:{...bp,pack:{...bp.pack,directions:{south:{...original,layers:original.layers.filter(l=>l.id!=='shorts-phase')}}}}};
 assert.equal(original.layers.length-withoutShorts.ownedCyborg120Body.pack.directions.south.layers.length,1);
 const images=new Map();for(const url of wa.requiredFiles(r))images.set(url,await load(url));
 const emptySheet=cv.createCanvas(1536,1024),stripped=new Map(images);
 for(const [url,im] of stripped)if(im.width===1536&&im.height===1024)stripped.set(url,emptySheet);
 const refs=[],bare=await prepared({weapon}),helmet=await prepared({weapon,head:136});
 for(let f=0;f<12;f++){
  const states=wa.requiredFiles(r,{frame:f}),plates=states.filter(u=>images.get(u).width===1536&&images.get(u).height===1024);
  assert.equal(plates.length,f>=7&&f<=10?1:0,'one original projected arm pair in each extra state');
  let arms;
  if(plates.length){
   const originalSheet=images.get(plates[0]),tile=cv.createCanvas(1536,1024),x=tile.getContext('2d');
   x.drawImage(originalSheet,0,0);const im=x.getImageData(0,0,1536,1024);
   im.data.set(global.MareAppearance96.recolor(im.data,global.MareNativeSkinHD.mask(im.data,1536,'anatomy'),global.MareAppearance96.skins[tone].ramp));x.putImageData(im,0,0);
   arms=tile;
  }
  const bases=[];
  for(const model of [parts.body,withoutShorts]){
   const c=C();wa.render(c.getContext('2d'),model,stripped,{frame:f,appearance:r.colorAppearance});bases.push(c);
  }
  const bm=pixels(bare.draw(f)),hm=pixels(helmet.draw(f)),hat=[];
  for(let k=0;k<bm.length;k+=4)if(bm.readUInt32LE(k)!==hm.readUInt32LE(k))hat.push(k);
  assert(hat.length>500);refs.push({bases,arms,hat,hm,bm});
 }
 // Rectangles in physical map pixels recover the original two hand plates.
 // On the trousers only the area below the shoulder repairs can overlap.
 function drawArms(ctx,sheet,f){
  if(!sheet)return;
  const s=[.25,.25,.26,.275][f-7];
  ctx.save();ctx.beginPath();ctx.rect(235,278,175,107);ctx.clip();
  for(const [half,sourceX,targetX] of [[0,615,285],[1,921,361]]){
   ctx.save();ctx.translate(targetX,252);ctx.scale(s,s);ctx.translate(-sourceX,-366);
   ctx.beginPath();ctx.rect(half*768,0,768,1024);ctx.clip();ctx.imageSmoothingEnabled=false;ctx.drawImage(sheet,0,0);ctx.restore();
  }
  ctx.restore();
 }
 const boot=select({boots:148}).r,bootPass=boot.independentPlan.passes.get('boots'),panels=[];
 for(const l of [...bootPass.layers].sort((a,b)=>a.depth-b.depth)){
  assert(l.id.startsWith('boot148-'));
  panels.push({l,im:await load('tools/rework-modular-outfits-hd/assets/'+l.source+'.png'),fit:boot.nativeSlotPack.phaseTransforms.find(t=>t.layer.id===l.id)});
 }
 function addBoot(ctx,back,p){for(const {l,im,fit} of panels)if((l.depth<0)===back){
  ctx.save();if(fit)ctx.setTransform(...fit.matrices[p]);ctx.imageSmoothingEnabled=false;ctx.drawImage(im,0,0);ctx.restore();
 }}
 const rows=[];
 for(const id of gear[1]){
  const donor=select({legs:id}).r,pass=donor.independentPlan.passes.get('pants'),[layer]=pass.layers;
  assert.equal(pass.layers.length,1);assert(layer.id.startsWith('pants'+id+'-'));
  const replace=(pass.removed||[]).includes('shorts-phase');
  const single=await prepared({weapon,legs:id}),combo=await prepared({weapon,boots:148,head:136,legs:id});
  try{for(let f=0;f<12;f++){
   const p=Math.min(7,f),{bases,arms,hat,hm,bm}=refs[f],im=await load('tools/rework-modular-outfits-hd/assets/'+(layer.frames?.[p]||layer.source)+'.png');
   const c=C(),ctx=c.getContext('2d');ctx.drawImage(im,0,0);
   assert(!pixels(c).subarray(0,278*640*4).some(Boolean),'trousers cannot overlap the shoulder repair');
   ctx.clearRect(0,0,640,640);ctx.drawImage(bases[Number(replace)],0,0);ctx.drawImage(im,0,0);drawArms(ctx,arms,f);
   for(const url of parts.metal[f])ctx.drawImage(images.get(weaponDir+url),0,0);
   // Above the waist always retain the true original armed upper body.
   const out=ctx.getImageData(0,0,640,640);out.data.set(bm.subarray(0,278*640*4));ctx.putImageData(out,0,0);
   const expected=pixels(c),got=pixels(single.draw(f));
   assert.equal(got.findIndex((v,k)=>v!==expected[k]),-1,'single trousers '+[weapon,id,f].join('/'));
   let changed=0;for(let k=0;k<got.length;k+=4)if(got.readUInt32LE(k)!==bm.readUInt32LE(k))changed++;assert(changed>300);
   for(const k of hat){assert.equal(got.readUInt32LE(k),bm.readUInt32LE(k),'head is separate from the trousers');out.data.set(hm.subarray(k,k+4),k);}
   ctx.putImageData(out,0,0);const full=C(),x=full.getContext('2d');addBoot(x,true,p);x.drawImage(c,0,0);addBoot(x,false,p);
   const final=pixels(combo.draw(f)),target=pixels(full);assert.equal(final.findIndex((v,k)=>v!==target[k]),-1,'boot, helmet and trousers '+[weapon,id,f].join('/'));
   rows.push({id,phase:f,changed,source:layer.frames?.[p]||layer.source});c.width=full.width=1;
  }}finally{single.release();combo.release();}
 }
 helmet.release();bare.release();for(const v of refs){for(const c of v.bases)c.width=1;if(v.arms)v.arms.width=1;}emptySheet.width=1;
 assert.equal(rows.length,120);
 if(process.env.HD_TROUSER_RESULTS)fs.writeFileSync(process.env.HD_TROUSER_RESULTS,JSON.stringify(rows));
 console.log(weapon,tone,'120 solo and 120 combined native trouser frames');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
