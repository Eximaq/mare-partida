'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {make,cv}=require('./rework-integration-support.cjs'),{gear,weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const root=process.env.HD_PUBLISHED_ROOT;assert(root);
const mod=n=>require(path.join(root,n)),load=require('../tools/rework-hd-test-loader.cjs').create(root);
const app=mod('character-appearance.js'),world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json');
const archive=mod('tools/rework-combat-wardrobe/index.json').southPunchCoats;
const weapon=Number(process.argv[2]),tone=process.argv[3];assert([2,3,14,110,111,118,119,120].includes(weapon)&&['ebony','light'].includes(tone));
const opt={consumer:'world',action:'attack-unarmed',direction:'south'},tile=()=>cv.createCanvas(640,640);
const colors=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
async function main(){
 const api=make();await api.ready;
 const actor=app.commit({classId:weapons.find(row=>row.id===weapon).role,equipment:{}},
  {gender:'masculino',skinColor:tone,hairColor:tone==='ebony'?'blue':'black',eyeColor:tone==='ebony'?'green':'blue'},()=>true);
 const saved=JSON.stringify(actor.appearance96),rows=[];
 const clock=[111,118,119,120].includes(weapon)?'0 0 1 1 2 2 3 3 4 4 5 5 6 6 7 8 9 10 11 11'.split(' '):Array.from({length:12},(_,f)=>String(f));
 async function pose(eq){
  const p={...actor,equipment:Object.fromEntries(Object.entries(eq).map(([k,v])=>[k,{def:v}]))};
  const r=world.selectWorldHDOnly(api,catalog,p,opt);
  assert.deepEqual(r.omitted||[],[]);assert(!r.visualDegraded&&!r.appearanceAdapted);
  assert.deepEqual(r.timeline,clock);
  for(const [k,v] of Object.entries(eq))assert.equal(r.slotRoutes[k].item,v);
  const bundle=await api.prepareConfiguration([{player:p,options:opt}],{resolve:()=>({player:p,options:opt,source:r})});
  function draw(f){let c;assert(bundle.draw({save(){},restore(){},drawImage(v){c=v;}},p,{...opt,progress:(clock.indexOf(String(f))+.1)/clock.length}));
   assert.equal(api.snapshot().last.frame,f);return colors(c);}
  return {r,draw,release:()=>bundle.release()};
 }
 const fixed={weapon,head:19,boots:169,gloves:152,...([111,118,119,120].includes(weapon)?{legs:168}:{})};
 const bare=await pose({weapon}),kit=await pose(fixed),base=[];
 const proof=mod('player-rework-weapon-native-hd.js').create(mod('tools/rework-weapon-layers-hd/index.json'),{makeCanvas:cv.createCanvas});
 const sources=proof.southPunchHeadLayers(bare.r);
 assert.deepEqual(Object.keys(archive.items).map(Number).sort((a,b)=>a-b),[...gear[0]].sort((a,b)=>a-b));
 for(let f=0;f<12;f++){
  const c=tile(),x=c.getContext('2d');
  for(const url of sources.metal[f])x.drawImage(await load('tools/rework-weapon-layers-hd/'+url),0,0);
  base.push({bare:bare.draw(f),kit:kit.draw(f),metal:colors(c)});c.width=1;
 }
 for(const coat of gear[0]){
  const entry=archive.items[coat],solo=await pose({weapon,coat}),dressed=await pose({...fixed,coat});
  assert.equal(solo.r.slotRoutes.coat.source,entry.record+'/twelve-state-front');
  assert.deepEqual(solo.r.slotRoutes.coat,dressed.r.slotRoutes.coat);
  for(const other of Object.keys(fixed))assert.deepEqual(kit.r.slotRoutes[other],dressed.r.slotRoutes[other]);
  for(let f=0;f<12;f++){
   const b=base[f],s=solo.draw(f),k=dressed.draw(f),c=tile(),x=c.getContext('2d');
   const read=async h=>{x.clearRect(0,0,640,640);x.drawImage(await load('tools/rework-combat-wardrobe/assets/'+h+'.png'),0,0);return colors(c);};
   const front=await read(entry.phases[f].front),rear=entry.phases[f].rear?await read(entry.phases[f].rear):null;
   const raw=x.createImageData(640,640);new Uint32Array(raw.data.buffer).set(b.bare);x.putImageData(raw,0,0);
   if(rear){x.save();x.globalCompositeOperation='destination-over';x.drawImage(await load('tools/rework-combat-wardrobe/assets/'+entry.phases[f].rear+'.png'),0,0);x.restore();}
   x.drawImage(await load('tools/rework-combat-wardrobe/assets/'+entry.phases[f].front+'.png'),0,0);const expected=colors(c);
   let single=0,mixed=0,pigment=0,protectedMetal=0;
   for(let i=0;i<s.length;i++){
    const colored=front[i]>>>24,lining=rear&&rear[i]>>>24,metal=b.metal[i]>>>24;
    if(!colored&&!lining){assert.equal(s[i],b.bare[i]);assert.equal(k[i],b.kit[i]);}
    if(metal===255){assert.equal(s[i],b.bare[i]);assert.equal(k[i],b.kit[i]);if(colored)protectedMetal++;}
    if(colored&&!metal){assert.equal(s[i],expected[i]);if(s[i]!==b.bare[i])pigment++;}
    if(s[i]!==b.bare[i])single++;
    if(k[i]!==b.kit[i])mixed++;
   }
   assert(single>300&&mixed>300&&pigment>200,JSON.stringify({coat,f,single,mixed,pigment}));
   rows.push({coat,f,single,mixed,pigment,protectedMetal});c.width=1;
  }
  solo.release();dressed.release();
 }
 bare.release();kit.release();assert.equal(rows.length,120);assert.equal(saved,JSON.stringify(actor.appearance96));
 if(process.env.HD_SOUTH_COAT_RESULTS)fs.writeFileSync(process.env.HD_SOUTH_COAT_RESULTS,JSON.stringify(rows));
 console.log(weapon,tone,rows.length,'individual and equipped coat frames');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
