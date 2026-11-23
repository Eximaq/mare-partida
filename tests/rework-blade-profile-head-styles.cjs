'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const mod=n=>require(path.join(root,n));
global.MareSword0Checkpoint=mod('player-rework-sword0-checkpoint.js');
const {make,cv}=require('./rework-integration-support.cjs');
const {weapons}=require('../tools/audit-hd-wardrobe-product.cjs');
const world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json'),look=mod('character-appearance.js');
const read=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
(async()=>{
 const api=make();await api.ready;await api.warmSwordCheckpoint();
 const loader=require('../tools/rework-hd-test-loader.cjs').create(root);
 const family=global.MareReworkHead.create(mod('tools/rework-accessories/head-layer-index.json'),
  {vendor:global.ReworkAccessoryVendor,appearanceAPI:global.MareAppearance96,makeCanvas:cv.createCanvas});
 const groups=[...weapons.filter(w=>w.role==='rogue').flatMap(w=>['east','west'].map(direction=>({...w,direction}))),
  ...weapons.filter(w=>w.role==='sword'&&[1,67,68,70].includes(w.id)).map(w=>({...w,direction:'north'}))];
 assert.equal(groups.length,16);let drawn=0,checks=0;
 for(const {id,role,direction} of groups){
  const o={action:api.attackActionFor(id),direction,consumer:'world'},gear={weapon:id,coat:165,legs:21,boots:183,gloves:159,head:178};
  function select(hairStyle,eyeStyle,head,hairColor='blue'){
   const equipment={...gear};if(head==null)delete equipment.head;else equipment.head=head;
   const p=look.commit({classId:role,equipment:Object.fromEntries(Object.entries(equipment).map(([s,v])=>[s,{def:v}]))},
    {gender:'masculino',skinColor:'ebony',hairStyle,eyeStyle,hairColor,eyeColor:'green'},()=>true);
   const r=world.selectWorldHDOnly(api,catalog,p,o);
   assert(r&&!r.omitted?.length&&!r.visualDegraded&&!r.appearanceAdapted,[id,direction,hairStyle,eyeStyle,head]);
   assert.equal(r.resolvedAction??r.action,o.action);assert.equal(r.direction,direction);
   for(const [slot,v] of Object.entries(equipment))assert.equal(r.slotRoutes[slot].item,v);
   return {r,p};
  }
  for(const hair of Object.keys(look.choices.hairStyle))for(const face of Object.keys(look.choices.eyeStyle)){
   select(hair,face,178);checks++;
  }
  async function take(hair,face,head,color){
   const {r,p}=select(hair,face,head,color),b=await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:r})});
   const result=[];
   try{assert.deepEqual(b.coverage[0].omitted,[]);for(let i=0;i<8;i++){
    const t=r.timeline.findIndex(n=>Number(n)===i);assert(t>=0);let c;
    assert(b.draw({save(){},restore(){},drawImage(v){c=v;}},p,{...o,progress:(t+.25)/r.timeline.length}));
    result.push(read(c));drawn++;
   }}finally{b.release();}
   return result;
  }
  const full=await take('hair-cropped','original',178);

  if([1,67,73].includes(id)){
   const baseline=await take('none','original',null),hair=await take('hair-cropped','original',null),
    eyes=await take('none','face-calm',null),auburn=await take('hair-cropped','original',178,'auburn');
   const naked=select('hair-cropped','original',null).r,fit=naked.daggerHeadRig||naked.basePack||naked.independentPlan?.base?.daggerHeadRig;
   assert(fit?.pack,[id,direction,'registered receiver']);
   const d=fit.pack.directions[direction],raw=family.resolve({body:'male',direction,look:{hair:'hair-cropped'}}),
    helmet=family.resolve({body:'male',direction,look:{hair:'hair-cropped',head:'head-178'}}),imgs=new Map();
   for(const s of new Set([...family.requiredFiles(raw),...family.requiredFiles(helmet)]))imgs.set(s,await loader(s));
   const source=global.MareReworkEyeStylesHD.maleSource({pack:fit.pack,direction});
   for(let i=0;i<8;i++){
    const width=Math.sqrt(hair[i].length),pad=(width-640)/2,pose=d.poses[i],targetNeck=pose.NECK;
    const plane=(r)=>new Uint32Array(family.composeNative(r,imgs,{width:160,height:160,targetNeck,look:{hair:'hair-cropped'},hairRamp:global.MareAppearance96.hairs.blue.ramp}).hair.buffer);
    const mask=plane(raw),worn=plane(helmet),dx=Math.round(4*(targetNeck.x-d.rest.NECK.x)),dy=Math.round(4*(targetNeck.y-d.rest.NECK.y));
    let hairPixels=0,own=0,eyePixels=0,tone=0;
    for(let j=0;j<hair[i].length;j++){
     const x=j%width-pad,y=Math.floor(j/width)-pad,k=y*640+x;
     if(hair[i][j]!==baseline[i][j]){
      assert(x>=0&&x<640&&y>=0&&y<640&&mask[k]>>>24,[id,direction,i,x,y,'outside own hair'].join('/'));
      hairPixels++;if((mask[k]>>>24)===255&&mask[k]===hair[i][j])own++;
     }
     if(eyes[i][j]!==baseline[i][j]){
      assert(!source.north&&source.boxes.some(([l,t,r,b])=>x>=l+dx&&x<=r+dx&&y>=t+dy&&y<=b+dy),[id,direction,i,x,y,'outside eyes'].join('/'));
      eyePixels++;
     }
     if(auburn[i][j]!==full[i][j]){
      assert(x>=0&&x<640&&y>=0&&y<640&&worn[k]>>>24,[id,direction,i,x,y,'hair hue leaked to another slot'].join('/'));tone++;
     }
    }
    assert(hairPixels>100&&own>25&&tone>10&&(source.north?eyePixels===0:eyePixels>2),[id,direction,i,hairPixels,own,eyePixels,tone].join('/'));
   }
  }

 }
 assert.equal(checks,1120);assert.equal(drawn,256);console.log(JSON.stringify({contexts:groups.length,checks,drawn}));
})().catch(e=>{console.error(e);process.exitCode=1;});