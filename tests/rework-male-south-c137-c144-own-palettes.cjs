'use strict';
const a=require('node:assert/strict'),{make}=require('./rework-integration-support.cjs');
const api=make(),raw={gender:'masculino',hairStyle:'original',hairColor:'original',skinColor:'original',eyeColor:'original',eyeStyle:'original'};
const profiles=[{...raw,skinColor:'ebony',hairColor:'silver',eyeColor:'green'},{...raw,skinColor:'porcelain',hairColor:'pink',eyeColor:'amber'}];
const opts={direction:'south',consumer:'world'},coats=[137,144];
const kits=[
 ...['idle','walk','attack-unarmed'].map(action=>({action,pants:22})),
 ...[undefined,9,148].map(boots=>({action:'attack-unarmed',pants:133,boots}))
];
const player=(appearance96,coat,{pants,boots})=>({classId:'fighter',appearance96,equipment:{coat:{def:coat},legs:{def:pants},...(boots?{boots:{def:boots}}:{})}});
const prep=(p,r,o)=>api.prepareConfiguration([{player:p,source:r,options:o}],{resolve:q=>q});
function pixel(q,p,o,i,len){let c;a(q.draw({save(){},restore(){},drawImage(out){c=out;}},p,{...o,progress:(i+.25)/len}));return [c.width,Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data)];}
const sub=(r,keep,suffix)=>{
 const d=r.pack.directions.south;
 return {...r,id:r.id+':'+suffix,pack:{...r.pack,directions:{south:{...d,layers:d.layers.filter(keep)}}}};
};
(async()=>{
 await api.ready;let selected=0,rendered=0;
 for(const kit of kits)for(const coat of coats)for(const profile of profiles){
  const opt={...opts,action:kit.action},base=player(raw,coat,kit),saved=player(profile,coat,kit),save=JSON.stringify(saved);
  const x=api.selectVisual(base,opt),y=api.selectVisual(saved,opt);
  a(y?.strictSouthAppearance,JSON.stringify([kit,coat,y?.id]));a.deepEqual(x.pack,y.pack);a.deepEqual(x.equipment,y.equipment);a.deepEqual(x.slotRoutes,y.slotRoutes);
  a.equal(y.colorAppearance.skin,profile.skinColor);a.equal(y.colorAppearance.hairColor,profile.hairColor);a.equal(y.colorAppearance.eyeColor,profile.eyeColor);
  a.equal(y.strictSouthAppearance.repairs.length,2);
  a(!y.baseMaterialSources);
  const allowed=new Set([...Object.keys(y.paletteSourceMasks),y.strictSouthAppearance.face,...y.strictSouthAppearance.repairs]);
  const owned=l=>(l.frames||[l.source]).some(h=>allowed.has(h)),cloth=l=>!l.id.startsWith('base:')&&!y.strictSouthAppearance.repairs.includes(l.source);
  a(!y.pack.directions.south.layers.some(l=>cloth(l)&&owned(l)));
  selected++;
  if(process.env.SELECT_ONLY||process.env.SMOKE&&coat!==137)continue;
  const paints=await Promise.all([[base,x],[saved,y],[base,sub(x,owned,'coverage')],[base,sub(x,cloth,'equipment')],[saved,sub({...y,strictSouthAppearance:undefined},cloth,'equipment')]].map(([p,r])=>prep(p,r,opt)));
  const d=x.pack.directions.south, len=d.clip.frames;
  try{
   for(let i=0;i<len;i++){
    const [w,p0]=pixel(paints[0],base,opt,i,len),[,p1]=pixel(paints[1],saved,opt,i,len),[,mask]=pixel(paints[2],base,opt,i,len);
    const [,a0]=pixel(paints[3],base,opt,i,len),[,a1]=pixel(paints[4],saved,opt,i,len);
    a.deepEqual(a0,a1,'coat, lining, trousers and boots are pixel exact');
    let diff=0,iris=0;
    for(let j=0;j<p0.length;j+=4){
     a.equal(p0[j+3],p1[j+3]);
     if(p0.readUInt32LE(j)===p1.readUInt32LE(j))continue;
     const xp=j/4%w,yp=Math.floor(j/4/w);
     a(mask[j+3],'outside owned appearance materials');
     if(xp>=302&&xp<=340&&yp>=200&&yp<=215)iris++;
     diff++;
    }
    a(diff>1800);a(iris>12);rendered++;
   }
  }finally{for(const q of paints)q.release();}
  a.equal(JSON.stringify(saved),save);global.gc?.();
 }
 a.equal(selected,24);
 if(!process.env.SELECT_ONLY&&!process.env.SMOKE)a.equal(rendered,196);
 console.log({selected,rendered,equipmentRasterExact:true});
})().catch(e=>{console.error(e);process.exitCode=1});
