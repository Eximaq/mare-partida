'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {make,cv}=require('./rework-integration-support.cjs'),{gear,weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const root=process.env.HD_PUBLISHED_ROOT;assert(root);
const mod=n=>require(path.join(root,n)),load=require('../tools/rework-hd-test-loader.cjs').create(root);
const app=mod('character-appearance.js'),world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json');
const archive=mod('tools/rework-combat-wardrobe/index.json').southPunchWaist;
const weapon=Number(process.argv[2]),tone=process.argv[3];assert([2,3,14,110].includes(weapon)&&['ebony','light'].includes(tone));
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
 const fixed={weapon,boots:169,coat:151,gloves:152,head:19},bare=await pose({weapon}),baseline=await pose(fixed);
 const registry=mod('player-rework-weapon-native-hd.js').create(mod('tools/rework-weapon-layers-hd/index.json'),{makeCanvas:cv.createCanvas});
 const native=registry.southPunchHeadLayers(bare.r),dir='tools/rework-weapon-layers-hd/',base=[];
 for(let f=0;f<12;f++){
  const c=tile(),x=c.getContext('2d');
  for(const metal of native.metal[f])x.drawImage(await load(dir+metal),0,0);
  const cut=new Uint8Array(640*640);
  for(const [start,n] of archive.frames[Math.min(f,7)].cut)cut.fill(1,start,start+n);
  base.push({bare:bare.draw(f),kit:baseline.draw(f),metal:colors(c),cut});c.width=1;
 }
 for(const legs of gear[1]){
  const worn=await pose({weapon,legs}),dressed=await pose({...fixed,legs});
  const pass=worn.r.independentPlan.passes.get('pants'),owner=pass.decorator.own;
  assert.equal(pass.decorator.field,'southSignedPants');assert.equal(worn.r.slotRoutes.legs.item,legs);
  for(const slot of Object.keys(fixed))assert.deepEqual(dressed.r.slotRoutes[slot],baseline.r.slotRoutes[slot]);
  for(let f=0;f<12;f++){
   const t=Math.min(f,7),src=owner.phases[t],cloth=await load('tools/rework-modular-outfits-hd/assets/'+src+'.png');
   const c=tile(),x=c.getContext('2d');x.drawImage(cloth,0,0);const color=colors(c);
   const r=base[f],a=worn.draw(f),b=dressed.draw(f);let outside=0,solid=0,stock=0,single=0,mixed=0;
   const bareImage=x.createImageData(640,640);new Uint32Array(bareImage.data.buffer).set(r.bare);x.putImageData(bareImage,0,0);
   x.drawImage(cloth,0,0);const fabricOnSkin=colors(c);
   for(let i=0;i<a.length;i++){
    const y=Math.floor(i/640),alpha=color[i]>>>24,m=r.metal[i]>>>24;
    if(!alpha&&!r.cut[i]||m===255){assert.equal(a[i],r.bare[i]);assert.equal(b[i],r.kit[i]);outside++;}
    // Below the arc of either fist, the garment sits directly on the actual
    // signed legs. Compare the rendered RGBA, including translucent hems.
    if(y>=385&&!m&&!r.cut[i]&&alpha){assert.equal(a[i],fabricOnSkin[i],legs+'/'+f+' hem '+i);solid++;}
    // The central belt is away from both wrist arcs and has no skin beneath it.
    const xx=i%640;
    if(xx>=311&&xx<334&&y>=335&&y<355&&r.cut[i]&&!m&&alpha){
     assert.equal(a[i],owner.replaceShorts?color[i]:fabricOnSkin[i],legs+'/'+f+' belt '+i);stock++;
    }
    if(a[i]!==r.bare[i])single++;if(b[i]!==r.kit[i])mixed++;
   }
   assert(outside>380000&&solid>200&&single>300&&mixed>100,JSON.stringify({weapon,legs,f,single,mixed,solid}));
   if(owner.replaceShorts)assert(stock>300,'replace the original waist');
   rows.push({legs,f,single,mixed,solid,stock,source:src});c.width=1;
  }
  worn.release();dressed.release();
 }
 bare.release();baseline.release();assert.equal(rows.length,120);assert.equal(saved,JSON.stringify(actor.appearance96));
 if(process.env.HD_SIGNED_TROUSERS)fs.writeFileSync(process.env.HD_SIGNED_TROUSERS,JSON.stringify(rows));
 console.log(weapon,tone,rows.length,'individual and equipped trouser phases');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
