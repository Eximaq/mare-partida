'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Use the exported game');
const {make,cv}=require('./rework-integration-support.cjs');
const world=require(path.join(root,'paper-doll-96-lobby.js')),look=require(path.join(root,'character-appearance.js'));
const weapons=require(path.join(root,'tools/paper-doll-96-v3/weapons.json'));
const bank=require(path.join(root,'tools/rework-combat-wardrobe/index.json')).northFocusCoats;
const images=require('../tools/rework-hd-test-loader.cjs').create(root);
const options={action:'attack-focus',direction:'north',consumer:'world'};
const rgba=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
(async()=>{
 const api=make();await api.ready;const rows=[];
 const select=p=>world.selectWorldHDOnly(api,weapons,p,options);
 const prepare=(p,source)=>api.prepareConfiguration([{player:p,options}],{resolve:()=>({player:p,options,source})});
 function draw(bundle,actor,t){
  let frame;assert(bundle.draw({save(){},restore(){},drawImage(c){frame=c;}},actor,{...options,progress:(t+.2)/9}));
  return frame;
 }
 assert.deepEqual(Object.keys(bank).map(Number),[123,124,125,126,127]);
 for(const [key,record] of Object.entries(bank)){
  const weapon=Number(key),player=look.commit({classId:weapon<125?'strategist':'healer',equipment:{weapon:{def:weapon}}},
   {gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',hairStyle:'original',eyeStyle:'original'},()=>true);
  const original=JSON.stringify(player),base=select(player),bare=await prepare(player,base);
  try{for(const [id,plate] of Object.entries(record.coats)){
   const item=Number(id),actor={...player,equipment:{coat:{def:item},weapon:{def:weapon}}},source=select(actor);
   assert.deepEqual(source.omitted,[],[weapon,id,source.id]);assert.equal(source.slotRoutes.coat.item,item);
   assert.equal(source.slotRoutes.weapon.item,weapon);assert.equal(source.action,options.action);
   assert.deepEqual(source.timeline,base.timeline);assert(source.slotRoutes.coat.source.includes(plate.archive));
   const dressed=await prepare(actor,source);assert.deepEqual(dressed.coverage[0].omitted,[]);
   try{
    for(let t=0;t<9;t++){
     const before=draw(bare,player,t),ref=cv.createCanvas(640,640),ctx=ref.getContext('2d');
     ctx.drawImage(before,0,0);const body=rgba(ref);
     ctx.drawImage(await images('tools/rework-combat-wardrobe/assets/'+plate.cloth[t]+'.png'),0,0);
     const expected=rgba(ref);assert(!expected.equals(body));const actual=draw(dressed,actor,t);
     assert(rgba(actual).equals(expected),[weapon,item,t,'owned fabric over customized receiving body'].join('/'));
     ref.width=1;rows.push({weapon,item,t,source:plate.cloth[t]});
    }
   }finally{dressed.release();}
  }}finally{bare.release();}
  assert.equal(original,JSON.stringify(player));console.log(weapon,'36 signed coat frames');global.gc?.();
 }
 assert.equal(rows.length,180);
 if(process.env.HD_FOCUS_RESULTS)fs.writeFileSync(process.env.HD_FOCUS_RESULTS,JSON.stringify(rows));
})().catch(e=>{console.error(e);process.exitCode=1});
