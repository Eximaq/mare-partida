'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Use the exported game');
const {make,cv}=require('./rework-integration-support.cjs');
const world=require(path.join(root,'paper-doll-96-lobby.js')),look=require(path.join(root,'character-appearance.js'));
const weapons=require(path.join(root,'tools/paper-doll-96-v3/weapons.json'));
const wardrobe=require(path.join(root,'tools/rework-combat-wardrobe/index.json'));
const bank={...wardrobe.northFocusCoats,...wardrobe.northWeaponCoats};
const sharedFocus=[16,17,31,32,121,122];
const catalog=require('../tools/audit-hd-wardrobe-product.cjs');
const images=require('../tools/rework-hd-test-loader.cjs').create(root);
let options;
const rgba=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);

async function visibleGrip(record,frame){
 const {attachment}=record.states[frame],rig=record.basePack,d=rig.pack.directions.north;
 const load=url=>images(new URL(url,'https://art.invalid/tools/rework-weapon-layers-hd/').pathname.slice(1));
 const surface=cv.createCanvas(640,640),x=surface.getContext('2d');
 x.imageSmoothingEnabled=false;x.save();x.transform(...attachment.matrix);
 assert(!attachment.mirrorX);const gear=await load(attachment.url);
 if(record.w121IndependentNorth){
  const mount=cv.createCanvas(640,640),local=mount.getContext('2d');
  local.drawImage(gear,0,0);local.drawImage(await load('assets/'+record.w121IndependentNorth.grip+'.png'),0,0);
  x.drawImage(mount,0,0);mount.width=1;
 }else x.drawImage(gear,0,0);
 x.restore();
 x.globalCompositeOperation='destination-out';
 for(const layer of d.layers.filter(l=>l.depth>attachment.depth)){
  if(layer.binding.kind==='rigid'){
   for(const k of [layer.binding.a,layer.binding.b])assert.deepEqual(d.poses[frame][k],d.rest[k]);
  }else assert.equal(layer.binding.kind,'fixed');
  const key=layer.frames?.[frame]||layer.source;
  x.drawImage(await load(rig.images[key]),0,0);
 }
 return surface;
}

(async()=>{
 const api=make();await api.ready;await api.warmSwordCheckpoint();const rows=[];
 const select=p=>world.selectWorldHDOnly(api,weapons,p,options);
 const prepare=(p,source)=>api.prepareConfiguration([{player:p,options}],{resolve:()=>({player:p,options,source})});
 function draw(bundle,actor,t,frames){
  let frame;assert(bundle.draw({save(){},restore(){},drawImage(c){frame=c;}},actor,{...options,progress:(t+.2)/frames}));
  return frame;
 }
 assert.deepEqual(Object.keys(bank).map(Number),[16,17,67,70,110,122,123,124,125,126,127]);
 const receivers={...bank,...Object.fromEntries([31,32,121].map(id=>[id,bank[17]]))};
 for(const [key,record] of Object.entries(receivers)){
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
   if(record.source?.startsWith('sword')||sharedFocus.includes(weapon)){
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
   if(sharedFocus.includes(weapon)){
    alone=await prepare(control,select(control));combined=await prepare(kit,select(kit));
    assert.deepEqual(combined.coverage[0].omitted,[]);
    for(const slot of ['weapon','head','boots'])assert.deepEqual(combined.coverage[0].slotRoutes[slot],alone.coverage[0].slotRoutes[slot]);
   }
   try{
    for(let t=0;t<record.poses.length;t++){
     const before=draw(bare,player,t,record.poses.length),ref=cv.createCanvas(before.width,before.height),ctx=ref.getContext('2d');
     ctx.drawImage(before,0,0);const body=rgba(ref);
     const textile=await images('tools/rework-combat-wardrobe/assets/'+plate.cloth[t]+'.png');
     let protectedMetal=0,partialEdge=0;
     if(combined){
      const gear=await visibleGrip(base.independentPlan?.base||base,t),metal=rgba(gear);
      const layer=cv.createCanvas(ref.width,ref.height),x=layer.getContext('2d');x.drawImage(textile,0,0);
      const coverage=rgba(layer);
      x.globalCompositeOperation='source-atop';x.drawImage(gear,0,0);ctx.drawImage(layer,0,0);
      const pixels=rgba(ref);
      for(let i=0;i<metal.length;i+=4)if(coverage[i+3]&&metal[i+3]){
       if(metal[i+3]===255){
        for(let ch=0;ch<4;ch++)assert(Math.abs(pixels[i+ch]-body[i+ch])<=1,'the sleeve obscured opaque hardware');
        protectedMetal++;
       }else partialEdge++;
      }
      layer.width=1;gear.width=1;
     }else ctx.drawImage(textile,0,0);
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
     ref.width=1;rows.push({weapon,item,t,source:plate.cloth[t],mixedPixels,protectedMetal,partialEdge});
    }
   }finally{dressed.release();alone?.release();combined?.release();}
  }}finally{bare.release();}
  assert.equal(original,JSON.stringify(player));console.log(weapon,record.poses.length*4,'signed coat frames');global.gc?.();
 }
 assert.equal(rows.length,468);
 for(const weapon of sharedFocus){
  const cases=rows.filter(row=>row.weapon===weapon);
  assert(cases.some(row=>row.protectedMetal>0),'missing the overlap regression '+weapon);
  if(weapon!==16)assert(cases.some(row=>row.partialEdge>0),'missing the antialiased edge '+weapon);
 }
 if(process.env.HD_FOCUS_RESULTS)fs.writeFileSync(process.env.HD_FOCUS_RESULTS,JSON.stringify(rows));
})().catch(e=>{console.error(e);process.exitCode=1});
