'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Use the exported game');
const {make,cv}=require('./rework-integration-support.cjs');
const world=require(path.join(root,'paper-doll-96-lobby.js')),look=require(path.join(root,'character-appearance.js'));
const weapons=require(path.join(root,'tools/paper-doll-96-v3/weapons.json'));
const wardrobe=require(path.join(root,'tools/rework-combat-wardrobe/index.json'));
const bank={...wardrobe.northFocusCoats,...wardrobe.northWeaponCoats};
const catalog=require('../tools/audit-hd-wardrobe-product.cjs');
const images=require('../tools/rework-hd-test-loader.cjs').create(root);
let options;
const rgba=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
(async()=>{
 const api=make();await api.ready;await api.warmSwordCheckpoint();const rows=[];
 const select=p=>world.selectWorldHDOnly(api,weapons,p,options);
 const prepare=(p,source)=>api.prepareConfiguration([{player:p,options}],{resolve:()=>({player:p,options,source})});
 function draw(bundle,actor,t,frames){
  let frame;assert(bundle.draw({save(){},restore(){},drawImage(c){frame=c;}},actor,{...options,progress:(t+.2)/frames}));
  return frame;
 }
 assert.deepEqual(Object.keys(bank).map(Number),[16,17,67,70,110,122,123,124,125,126,127]);
 for(const [key,record] of Object.entries(bank)){
  const weapon=Number(key),role=catalog.weapons.find(w=>w.id===weapon).role;
  options={action:api.attackActionFor(weapon),direction:'north',consumer:'world'};
  const player=look.commit({classId:role,equipment:{weapon:{def:weapon}}},
   {gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',hairStyle:'original',eyeStyle:'original'},()=>true);
  const original=JSON.stringify(player),base=select(player),bare=await prepare(player,base);
  try{for(const [id,plate] of Object.entries(record.coats)){
   const item=Number(id),actor={...player,equipment:{coat:{def:item},weapon:{def:weapon}}},source=select(actor);
   assert.deepEqual(source.omitted,[],[weapon,id,source.id]);assert.equal(source.slotRoutes.coat.item,item);
   assert.equal(source.slotRoutes.weapon.item,weapon);assert.equal(source.action,options.action);
   assert.deepEqual(source.timeline,base.timeline);assert(source.slotRoutes.coat.source.includes(plate.archive));
   if(record.source?.startsWith('sword')||[16,17,122].includes(weapon)){
    for(const hat of catalog.gear[4])for(const boot of catalog.gear[2]){
     const equipment={boots:{def:boot},...actor.equipment,head:{def:hat}},mixed=select({...actor,equipment});
     assert.deepEqual(mixed.omitted,[]);assert.deepEqual(mixed.slotRoutes.coat,source.slotRoutes.coat);
     assert.deepEqual(mixed.slotRoutes.weapon,base.slotRoutes.weapon);
     assert.equal(mixed.slotRoutes.head.item,hat);assert.equal(mixed.slotRoutes.boots.item,boot);
     const reversed=Object.fromEntries(Object.entries(equipment).reverse());
     assert.deepEqual(select({...actor,equipment:reversed}).slotRoutes,mixed.slotRoutes);
    }
   }
   const dressed=await prepare(actor,source);assert.deepEqual(dressed.coverage[0].omitted,[]);
   const neighbours={head:{def:19},boots:{def:148}},control={...player,equipment:{...player.equipment,...neighbours}},kit={...actor,equipment:{...actor.equipment,...neighbours}};
   let alone,combined;
   if([16,17,122].includes(weapon)){
    alone=await prepare(control,select(control));combined=await prepare(kit,select(kit));
    assert.deepEqual(combined.coverage[0].omitted,[]);
    for(const slot of ['weapon','head','boots'])assert.deepEqual(combined.coverage[0].slotRoutes[slot],alone.coverage[0].slotRoutes[slot]);
   }
   try{
    for(let t=0;t<record.poses.length;t++){
     const before=draw(bare,player,t,record.poses.length),ref=cv.createCanvas(before.width,before.height),ctx=ref.getContext('2d');
     ctx.drawImage(before,0,0);const body=rgba(ref);
     const textile=await images('tools/rework-combat-wardrobe/assets/'+plate.cloth[t]+'.png');ctx.drawImage(textile,0,0);
     const expected=rgba(ref);assert(!expected.equals(body));const actual=draw(dressed,actor,t,record.poses.length);
     assert(rgba(actual).equals(expected),[weapon,item,t,'owned fabric over customized receiving body'].join('/'));
     let mixedPixels;
     if(combined){
      const on=rgba(draw(combined,kit,t,record.poses.length)),off=rgba(draw(alone,control,t,record.poses.length));
      ctx.clearRect(0,0,ref.width,ref.height);ctx.drawImage(textile,0,0);const mask=rgba(ref);mixedPixels=0;
      for(let i=0;i<on.length;i+=4)if(on.readUInt32LE(i)!==off.readUInt32LE(i)){
       assert(mask[i+3]>0,'coat changed pixels outside its original material');mixedPixels++;
      }
      assert(mixedPixels>500);
     }
     ref.width=1;rows.push({weapon,item,t,source:plate.cloth[t],mixedPixels});
    }
   }finally{dressed.release();alone?.release();combined?.release();}
  }}finally{bare.release();}
  assert.equal(original,JSON.stringify(player));console.log(weapon,record.poses.length*4,'signed coat frames');global.gc?.();
 }
 assert.equal(rows.length,372);
 if(process.env.HD_FOCUS_RESULTS)fs.writeFileSync(process.env.HD_FOCUS_RESULTS,JSON.stringify(rows));
})().catch(e=>{console.error(e);process.exitCode=1});
