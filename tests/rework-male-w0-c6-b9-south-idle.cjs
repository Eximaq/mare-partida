'use strict';
const a=require('node:assert/strict'),{make}=require('./rework-integration-support.cjs'),api=make();
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
(async()=>{await api.ready;let prior;
 for(const skinColor of ['light','ebony']){
 const appearance96={version:1,gender:'masculino',hairStyle:'original',hairColor:'blue',eyeStyle:'original',eyeColor:'blue',skinStyle:'natural',skinColor};
 const off={classId:'sword',appearance96,equipment:{weapon:{def:0},coat:{def:6}}},on={...off,equipment:{...off.equipment,boots:{def:9}}},state=JSON.stringify(on);
 const b=select(off),r=select(on);a(r?.id.includes(':own-b9-south-idle'));a.deepEqual(r.omitted,[]);a.deepEqual(Object.keys(r.slotRoutes),['weapon','coat','boots']);a.equal(r.colorAppearance.hairColor,'blue');a.equal(r.colorAppearance.skin,skinColor);
 const d=b.pack.directions.south,e=r.pack.directions.south,g=e.layers.filter(boot);
 a.deepEqual({...e,layers:e.layers.filter(l=>!boot(l))},d);a.deepEqual(r.plan,b.plan);a.deepEqual(r.pack.pivot,b.pack.pivot);a.deepEqual(g.map(l=>l.depth),[-1,99,-1,99]);
 a.equal(b.plan.paddingPhysical,128);a(!select(on,{...o,action:'walk'})?.id.includes('own-b9'));
 a(!select(on,{...o,direction:'north'})?.id.includes('own-b9'));a(!select({...on,equipment:{...on.equipment,gloves:{def:25}}})?.id.includes('own-b9'));
 a(!select({...on,equipment:{...on.equipment,boots:{def:9,variant:'other'}}})?.id.includes('own-b9'));
 a(!select(on,{...o,consumer:'character-creation'})?.id.includes('own-b9'));
 const {w,h,px:x}=await draw(off,b),{w:wr,h:hr,px:y}=await draw(on,r);
 a.deepEqual([wr,hr],[w,h]);
 const {px:sem}=await draw(on,sub(r,boot,[])),{px:foot}=await draw(off,sub(b,leg,[]));
 const {px:bareWithoutSword}=await draw(off,sub(b,()=>true,[])),{px:wornWithoutSword}=await draw(on,sub(r,()=>true,[]));
 let maxBare=-1,maxBoot=-1,wearPixels=0,protectedSword=0;
 for(let i=0;i<foot.length;i+=4){const py=Math.floor(i/4/w);if(foot[i+3]>=128)maxBare=Math.max(maxBare,py);if(sem[i+3]>=128)maxBoot=Math.max(maxBoot,py);}
 for(let i=0;i<x.length;i+=4){
  if(!eq(x,y,i)){a(sem[i+3]>0,'out-of-boot change at '+i/4);wearPixels++;}
  a(y[i+3]>=x[i+3],'native silhouette unexpectedly cut');
  if(!eq(x,bareWithoutSword,i)){a(eq(x,y,i),'W0 changed when boot worn');protectedSword++;}
  if(!eq(y,wornWithoutSword,i))a(!eq(x,bareWithoutSword,i),'W0 moved');
  if(foot[i+3]>=128&&Math.floor(i/4/w)>=maxBare-10)a(sem[i+3]>=128,'bare toes under sole');
  if(prior)a(eq(sem,prior,i),'boot RGBA varies with skin tone');
 }
 a.equal(maxBoot,577,'authored outsole moved');a.equal(maxBare,575);a(wearPixels>5700&&protectedSword>2000);
 a.deepEqual((await draw(off,select(off))).px,x,'exact removal and reselect'); a.equal(JSON.stringify(on),state);prior=sem;
 console.log(skinColor,{wearPixels,protectedSword,maxBoot});
 }
 console.log('PASS actual World C6/W0+B9 South idle, 2 saved skin tones with blue hair');
})().catch(e=>{console.error(e);process.exitCode=1;});
