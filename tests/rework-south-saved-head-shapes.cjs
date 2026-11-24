'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root);
const mod=n=>require(path.join(root,n));
global.MareSword0Checkpoint=mod('player-rework-sword0-checkpoint.js');
const {make,cv}=require('./rework-integration-support.cjs');
const {weapons,gear}=require('../tools/audit-hd-wardrobe-product.cjs');
const world=mod('paper-doll-96-lobby.js'),catalog=mod('tools/paper-doll-96-v3/weapons.json'),look=mod('character-appearance.js');
const load=require('../tools/rework-hd-test-loader.cjs').create(root);
const read=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
(async()=>{
 const api=make();await api.ready;
 const palette=look.choices,files=mod('tools/rework-accessories/head-layer-index.json'),
  headFamily=global.MareReworkHead.create(files,{vendor:global.ReworkAccessoryVendor,appearanceAPI:global.MareAppearance96,makeCanvas:cv.createCanvas});
 const roles=weapons.filter(w=>['sword','rogue'].includes(w.role)||[123,124,125,126,127,128].includes(w.id));
 assert.equal(roles.length,18);
 const configs=Object.keys(palette.hairStyle),faces=Object.keys(palette.eyeStyle),headIDs=gear[4];
 assert.equal(configs.length,14);assert.equal(faces.length,5);assert.equal(headIDs.length,10);
 let selected=0,drawn=0;
 for(const {id,role} of roles){
  const o={action:api.attackActionFor(id),direction:'south',consumer:'world'},fixed={weapon:id,coat:151,gloves:25,legs:168,boots:148};
  function resolve(hairStyle,eyeStyle,head=null,override={}){
   const p=look.commit({classId:role,equipment:{}},{gender:'masculino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',hairStyle,eyeStyle,...override},()=>true);
   p.equipment=Object.fromEntries(Object.entries({...fixed,...(head==null?{}:{head})}).map(([k,v])=>[k,{def:v}]));
   const saved=JSON.stringify(p.appearance96),r=world.selectWorldHDOnly(api,catalog,p,o);
   assert(r&&r.direction==='south'&&(r.resolvedAction??r.action)===o.action&&!r.visualDegraded&&!r.appearanceAdapted&&!r.omitted?.length,JSON.stringify([id,hairStyle,eyeStyle,head,r?.omitted]));
   for(const [k,v] of Object.entries(p.equipment))assert.equal(r.slotRoutes[k]?.item,v.def);
   assert.equal(saved,JSON.stringify(p.appearance96));return {p,r};
  }
  for(const hair of configs)for(let i=0;i<faces.length;i++){
   const head=headIDs[(configs.indexOf(hair)+i+id)%10];resolve(hair,faces[i],head);selected++;
  }
  if(![0,1,69,73,123,128].includes(id))continue;
  async function take(hair,face,hat,extra,contact=false){
   const {p,r}=resolve(hair,face,hat,extra),b=await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:r})});
   assert(!b.coverage[0].omitted.length);let c;const reference=[];
   try{for(let n=contact?4:0;n<(contact?5:r.states.length);n++){const tick=r.timeline.findIndex(t=>Number(t)===n);assert(tick>=0);
    assert(b.draw({save(){},restore(){},drawImage(im){c=im;}},p,{...o,progress:(tick+.2)/r.timeline.length}));
    reference.push(read(c));drawn++;
   }}finally{b.release();}
   return {pixels:reference};
  }
  const bare=await take('none','original'),styled=await take('hair-spiky','original'),calm=await take('none','face-calm');
  const hairRecord=headFamily.resolve({body:'male',direction:'south',look:{hair:'hair-spiky'}}),images=new Map();
  for(const path of headFamily.requiredFiles(hairRecord))images.set(path,await load(path));
  const targetNeck={x:80,y:60.01913875598086};
  const own=headFamily.composeNative(hairRecord,images,{width:160,height:160,targetNeck,look:{hair:'hair-spiky'},hairRamp:global.MareAppearance96.hairs.blue.ramp}).hair;
  const hairInk=new Uint32Array(own.buffer),boxes=[[292,187,316,213],[326,187,349,213]];
  for(let n=0;n<bare.pixels.length;n++){
   const width=Math.sqrt(bare.pixels[n].length);assert([640,896].includes(width));const pad=(width-640)/2;let hairs=0,eyes=0,ink=0;
   for(let i=0;i<width*width;i++){
    const x=i%width-pad,y=Math.floor(i/width)-pad,old=bare.pixels[n][i];
    if(styled.pixels[n][i]!==old){assert(x>=0&&x<640&&y>=0&&y<640&&hairInk[y*640+x]>>>24,[id,n,x,y,'outside approved hair'].join('/'));hairs++;
     if((hairInk[y*640+x]>>>24)===255&&hairInk[y*640+x]===styled.pixels[n][i])ink++;
    }
    if(calm.pixels[n][i]!==old){assert(boxes.some(([l,t,r,b])=>x>=l&&x<=r&&y>=t&&y<=b),[id,n,x,y,'outside authored eyes'].join('/'));eyes++;}
   }
   assert(hairs>100&&ink>40&&eyes>10,JSON.stringify([id,n,hairs,ink,eyes]));
  }

  // Compare only the contact phase for the three existing helmet policies.
  if([1,73,123].includes(id)){
   const diff=(a,b,allows)=>{
    const width=Math.sqrt(a.length),pad=(width-640)/2;let count=0;
    for(let i=0;i<a.length;i++)if(a[i]!==b[i]){
     const x=i%width-pad,y=Math.floor(i/width)-pad;
     assert(allows(x,y),[id,x,y,'unexpected palette change'].join('/'));count++;
    }
    return count;
   };
   const contact=async(hat,override)=>(await take('hair-spiky','face-calm',hat,override,true)).pixels[0];
   for(const hat of [18,19,164]){
    const blue=await contact(hat),auburn=await contact(hat,{hairColor:'auburn'});
    const fit=headFamily.resolve({body:'male',direction:'south',look:{hair:'hair-spiky',head:'head-'+hat}});
    const fittedImages=new Map();for(const path of headFamily.requiredFiles(fit))fittedImages.set(path,await load(path));
    const fitted=headFamily.composeNative(fit,fittedImages,{width:160,height:160,targetNeck,look:{hair:'hair-spiky'},hairRamp:global.MareAppearance96.hairs.blue.ramp});
    const mask=new Uint32Array(fitted.hair.buffer);
    const different=diff(blue,auburn,(x,y)=>!!(x>=0&&y>=0&&x<640&&y<640&&mask[y*640+x]>>>24));
    assert(hat===19?different===0:different>30,[id,hat,different,'helmet hair policy'].join('/'));
   }
   const green=await contact(null),brown=await contact(null,{eyeColor:'brown'});
   assert(diff(green,brown,(x,y)=>boxes.some(([l,t,r,b])=>x>=l&&x<=r&&y>=t&&y<=b))>8,[id,'iris material'].join('/'));
  }
  // A second request after switching the material must recover the exact saved raster.
  const returned=await take('none','original');for(let n=0;n<returned.pixels.length;n++)assert(Buffer.from(returned.pixels[n].buffer).equals(Buffer.from(bare.pixels[n].buffer)),[id,n,'A → B → A'].join('/'));
 }
 assert.equal(selected,1260);assert.equal(drawn,232);console.log(JSON.stringify({selected,drawn}));
})().catch(e=>{console.error(e);process.exitCode=1;});