'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;
assert(root,'Use the exported game');
const {make,cv}=require('./rework-integration-support.cjs');
const {gear,weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const world=require(path.join(root,'paper-doll-96-lobby')),look=require(path.join(root,'character-appearance'));
const catalog=require(path.join(root,'tools/paper-doll-96-v3/weapons.json'));
const bank=require(path.join(root,'tools/rework-combat-wardrobe/index.json')).daggerBoots;
const load=require('../tools/rework-hd-test-loader.cjs').create(root),prefix='tools/rework-weapon-layers-hd/';
const read=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
const texture=k=>load('tools/rework-combat-wardrobe/assets/'+k+'.png');
(async()=>{
 const direction=process.argv[2];assert(['east','west'].includes(direction));
 const custom=new Map(),api=make({loadImage:u=>custom.get(u)||load(u)});await api.ready;await api.warmSwordCheckpoint();
 const ids=weapons.filter(r=>r.role==='rogue').map(w=>w.id);assert.deepEqual(ids,[12,13,71,72,73,74]);
 const select=(p,o)=>world.selectWorldHDOnly(api,catalog,p,o);
 const prepare=(p,o,r)=>api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:r})});
 const o={action:'attack-daggers',direction,consumer:'world'};
 const data=[];
 for(const weapon of ids){
  const player=look.commit({classId:'rogue',equipment:{weapon:{def:weapon}}},
   {gender:'masculino',skinColor:direction==='east'?'ebony':'light',hairColor:'blue',eyeColor:'green',hairStyle:'original',eyeStyle:'original'},()=>true);
  const bare=select(player,o),off=await prepare(player,o,bare);
  const draw=(b,p,t)=>{let canvas;assert(b.draw({save(){},restore(){},drawImage(c){canvas=c}},p,{...o,progress:(t+.25)/8}));return canvas;};
  try{for(const boots of gear[2]){
   const p={...player,equipment:{...player.equipment,boots:{def:boots}}},r=select(p,o);
   assert.deepEqual(r.omitted,[]);assert.equal(r.slotRoutes.boots.item,boots);assert(r.bootTrack?.orderedDagger);
   const phases=bank.tracks.daggers[boots],states=[];
   // Replay the four signed operations with a physically dressed body.
   // Both the body and the restoration have that source in the original.
   for(let i=0;i<8;i++){
    const s=bare.states[i],l=s.layers[1],img=await load(prefix+l.url),f=phases[i];
    const c=cv.createCanvas(640,640),ctx=c.getContext('2d');ctx.drawImage(img,0,0);
    if(direction==='west'){ctx.translate(640,0);ctx.scale(-1,1);}
    ctx.globalCompositeOperation='destination-out';ctx.drawImage(await texture(f.mask),f.x,f.y);
    ctx.globalCompositeOperation='source-over';ctx.drawImage(await texture(f.art),f.x,f.y);
    const sha=crypto.createHash('sha256').update(['test-original',weapon,boots,direction,i].join('/')).digest('hex');
    const url='assets/'+sha+'.png';custom.set(prefix+url,c);
    states.push({...s,layers:s.layers.map((x,k)=>k===1||k===3?{...x,url,sha256:sha}:x)});
   }
   const reference={...bare,id:bare.id+'#reference-'+boots,states},check=await prepare(player,o,reference),on=await prepare(p,o,r);
   try{for(let i=0;i<8;i++){
    const actual=read(draw(on,p,i)),expected=read(draw(check,player,i)),naked=read(draw(off,player,i));
    assert(actual.equals(expected),[weapon,boots,direction,i,'source body under both daggers'].join('/'));
    let differences=0;for(let k=0;k<actual.length;k+=4)if(actual.readUInt32LE(k)!==naked.readUInt32LE(k))differences++;
    assert(differences>500,'Boot must be visible on the map rig');data.push({weapon,boots,direction,phase:i,differences});
   }}finally{on.release();check.release();custom.clear();}
   for(const coat of [151,158,165,179]){
    const a={...p,equipment:{...p.equipment,coat:{def:coat}}},mixed=select(a,o);
    assert.deepEqual(mixed.omitted,[]);assert.deepEqual(mixed.slotRoutes.boots,r.slotRoutes.boots);
    assert.equal(mixed.slotRoutes.coat.item,coat);assert.equal(mixed.slotRoutes.weapon.item,weapon);
    assert.deepEqual(select({...a,equipment:Object.fromEntries(Object.entries(a.equipment).reverse())},o).slotRoutes,mixed.slotRoutes);
   }
  }}finally{off.release();}
  console.log(direction,weapon,'80 verified boot phases');global.gc?.();
 }
 assert.equal(data.length,480);
 if(process.env.HD_DAGGER_BOOT_RECEIPT)fs.writeFileSync(process.env.HD_DAGGER_BOOT_RECEIPT,JSON.stringify(data));
})().catch(e=>{console.error(e);process.exitCode=1});
