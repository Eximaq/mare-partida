'use strict';
const a=require('node:assert/strict'),p=require('node:path'),fs=require('node:fs'),R=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..')),
 {make,cv}=require(R+'/tests/rework-integration-support.cjs'),stock=make(),C=process.env.CANDIDATE_DIR,
 api=C?require(C+'/player-rework-native-hd.js').create({fetchJSON:async f=>JSON.parse(fs.readFileSync(p.join(R,f))),loadImage:require(R+'/tools/rework-hd-test-loader.cjs').create(R),makeCanvas:cv.createCanvas}):stock;
const list=(env,all)=>process.env[env]?process.env[env].split(',').map(x=>typeof all[0]==='number'?Number(x):x):all;
const weapons=list('WEAPONS',[0,1,67,68,69,70]),coats=list('COATS',[6,7,137,144]),hairs=list('HAIR',['black','blue']),skins=list('SKINS',Object.keys(MareCharacterAppearance.skins));
const o={action:'idle',direction:'south',consumer:'world'},boot=l=>l.id.startsWith('boot9-'),leg=l=>l.id==='lower-redrawn';
const select=(p,options=o)=>api.selectVisual(p,options),draw=async(p,r)=>{
 const q=await api.prepareConfiguration([{player:p,source:r,options:o}],{resolve:x=>x});let c;
 try{a(q.draw({save(){},restore(){},drawImage(x){c=x;}},p,{...o,progress:0}));
 const w=c.width,h=c.height;return {w,h,px:c.getContext('2d').getImageData(0,0,w,h).data};}finally{q.release();}
};
const sub=(r,keep,parts=r.plan.parts)=>{
 const d=r.pack.directions.south,pack={...r.pack,directions:{south:{...d,layers:d.layers.filter(keep)}}};
 return {...r,id:r.id+':proof:'+String(keep)+parts.length,pack,plan:{...r.plan,parts},base:{...r.base,pack}};
};
const eq=(x,y,i)=>x[i]===y[i]&&x[i+1]===y[i+1]&&x[i+2]===y[i+2]&&x[i+3]===y[i+3];
(async()=>{await api.ready;let tested=0;for(const item of weapons)for(const coat of coats){let prior;
 for(const hairColor of hairs)for(const skinColor of skins){
 const appearance96={version:1,gender:'masculino',hairStyle:'original',hairColor,eyeStyle:'original',eyeColor:'blue',skinStyle:'natural',skinColor};
 const equipment={head:null,necklace:null,coat:{def:coat},legs:null,boots:null,weapon:{def:item},cloak:null,gloves:null,ring:null,belt:null,charm:null,akuma_no_mi:null};
 const off=JSON.parse(JSON.stringify(MareCharacterAppearance.commit({classId:'sword',equipment},appearance96,()=>true)));
 const on={...off,equipment:{...off.equipment,boots:{def:9}}},state=JSON.stringify(on);
 const b=select(off),r=select(on);a(r?.id.includes(':own-b9-south-idle'));a.deepEqual(r.omitted,[]);a.deepEqual(Object.keys(r.slotRoutes).sort(),['boots','coat','weapon']);a.equal(r.colorAppearance.hairColor,hairColor);a.equal(r.colorAppearance.skin,skinColor);
 if(C){const before=stock.selectVisual(on,o);if(item!==0||hairColor==='black'||coat===6&&!['light','ebony'].includes(skinColor))a(!before?.id.includes(':own-b9-south-idle'));else a.deepEqual(r,before);}
 const d=b.pack.directions.south,e=r.pack.directions.south,g=e.layers.filter(boot);
 a.deepEqual({...e,layers:e.layers.filter(l=>!boot(l))},d);a.deepEqual(r.plan,b.plan);a.deepEqual(r.pack.pivot,b.pack.pivot);a.deepEqual(g.map(l=>l.depth),[-1,99,-1,99]);
 a.equal(b.plan.paddingPhysical,item===0?128:256);a(!select(on,{...o,action:'walk'})?.id.includes('own-b9'));
 a(!select(on,{...o,direction:'north'})?.id.includes('own-b9'));a(!select({...on,equipment:{...on.equipment,gloves:{def:25}}})?.id.includes('own-b9'));
 a(!select({...on,equipment:{...on.equipment,boots:{def:9,variant:'other'}}})?.id.includes('own-b9'));
 a(!select(on,{...o,consumer:'character-creation'})?.id.includes('own-b9'));
 const {w,h,px:x}=await draw(off,b),{w:wr,h:hr,px:y}=await draw(on,r);
 a.deepEqual([wr,hr],[w,h]);
 const {px:sem}=await draw(on,sub(r,boot,[])),{px:foot}=await draw(off,sub(b,leg,[]));
 const {px:bareWithoutSword}=await draw(off,sub(b,()=>true,[])),{px:wornWithoutSword}=await draw(on,sub(r,()=>true,[]));
 const coatSet=new Set(b.outfitOverlay.layerIds);
 const {px:bareNoCoat}=await draw(off,sub(b,l=>!coatSet.has(l.id)));
 let maxBare=-1,maxBoot=-1,wearPixels=0,protectedSword=0,coatOverlap=0,coatChanged=0;
 for(let i=0;i<foot.length;i+=4){const py=Math.floor(i/4/w);if(foot[i+3]>=128)maxBare=Math.max(maxBare,py);if(sem[i+3]>=128)maxBoot=Math.max(maxBoot,py);}
 for(let i=0;i<x.length;i+=4){
  if(!eq(x,y,i)){a(sem[i+3]>0,'out-of-boot change at '+i/4);wearPixels++;}
  a(y[i+3]>=x[i+3],'native silhouette unexpectedly cut');
  if(!eq(x,bareWithoutSword,i)){a(eq(x,y,i),'W0 changed when boot worn');protectedSword++;}
  if(!eq(x,bareNoCoat,i)&&sem[i+3]>0)coatOverlap++;
  if(!eq(x,bareNoCoat,i)&&!eq(x,y,i))coatChanged++;
  if(!eq(y,wornWithoutSword,i))a(!eq(x,bareWithoutSword,i),'W0 moved');
  if(foot[i+3]>=128&&Math.floor(i/4/w)>=maxBare-10)a(sem[i+3]>=128,'bare toes under sole');
  if(prior)a(eq(sem,prior,i),'boot RGBA varies with skin tone');
 }
 const pad=b.plan.paddingPhysical-128;a.equal(maxBoot,577+pad,'authored outsole moved');a.equal(maxBare,575+pad);a(wearPixels>5700&&protectedSword>500);a.equal(coatOverlap,0,'boots overlap visible cloth');a.equal(coatChanged,0,'authored coat affected');
 a.deepEqual(select(off),b,'exact removal and reselect'); a.equal(JSON.stringify(on),state);prior=sem;
 if(skinColor==='light')for(const rejected of [130,151,158,165,172,179])a(!select({...on,equipment:{...on.equipment,coat:{def:rejected}}})?.id.includes('own-b9'));
 tested++;console.log(item,coat,hairColor,skinColor,{wearPixels,protectedSword,maxBoot,coatOverlap,coatChanged});
 }
 } a.equal(tested,weapons.length*coats.length*hairs.length*skins.length);console.log('PASS South idle B9 and own carry, '+tested+' World poses');
})().catch(e=>{console.error(e);process.exitCode=1;});
