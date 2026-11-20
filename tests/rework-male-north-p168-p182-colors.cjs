'use strict';
const a=require('node:assert/strict'),{make}=require('./rework-integration-support.cjs');
const api=make(),raw={gender:'masculino',hairStyle:'original',hairColor:'original',skinColor:'original',eyeColor:'original',eyeStyle:'original'};
const profiles=[{...raw,skinColor:'ebony',hairColor:'silver',eyeColor:'blue'},{...raw,skinColor:'porcelain',hairColor:'pink'}];
const player=(appearance96,pants=168)=>({classId:'fighter',appearance96,equipment:{coat:{def:151},legs:{def:pants},boots:{def:155},gloves:{def:152}}});
const select=(r,keep,suffix)=>{
 const d=r.pack.directions.north;
 return {...r,id:r.id+':'+suffix,pack:{...r.pack,directions:{north:{...d,layers:d.layers.filter(keep)}}}};
};
const pixels=(q,p,opt,i,n)=>{
 let c;a(q.draw({save(){},restore(){},drawImage(out){c=out;}},p,{...opt,progress:(i+.25)/n}));
 return Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
};
(async()=>{
 await api.ready;let count=0;
 for(const item of [168,182])for(const action of ['idle','walk'])for(const look of profiles){
  const opt={action,direction:'north',consumer:'world'},before=player(raw,item),after=player(look,item),save=JSON.stringify(after);
  const x=api.selectVisual(before,opt),y=api.selectVisual(after,opt);
  a(y?.id.endsWith(':verified-north'),y?.id);
  a.deepEqual(x.pack,y.pack);a.deepEqual(x.equipment,y.equipment);a.deepEqual(y.omitted,[]);
  a.equal(y.slotRoutes.gloves.item,152);a.equal(y.slotRoutes.legs.item,item);a.equal(y.slotRoutes.boots.item,155);
  a.equal(y.colorAppearance.skin,look.skinColor);a.equal(y.colorAppearance.hairColor,look.hairColor);a.equal(y.colorAppearance.eyeColor,look.eyeColor);
  for(const bad of [player({...look,hairStyle:'hair-cropped'},item),player({...look,eyeStyle:'face-calm'},item),player({...look,eyeColor:'amber'},item),player(look,133)]){
   a(!api.selectVisual(bad,opt)?.id.endsWith(':verified-north'));
  }
  const n=y.pack.directions.north.clip.frames;
  a.equal(n,action==='idle'?1:16);a.equal(Object.keys(y.paletteSourceMasks).length,7);
  const owns=new Set([...Object.keys(y.paletteSourceMasks),...Object.keys(y.baseMaterialSources)]);
  const isOwned=l=>(l.frames||[l.source]).some(h=>owns.has(h));
  const equipment=l=>!isOwned(l);
  a(y.pack.directions.north.layers.filter(l=>l.id.startsWith('pants'+item+'-')).every(equipment));
  const group=await Promise.all([[before,x],[after,y],[before,select(x,isOwned,'ownership')],[before,select(x,equipment,'equipment')],[after,select(y,equipment,'equipment')]].map(([p,source])=>api.prepareConfiguration([{player:p,source,options:opt}],{resolve:q=>q})));
  try{
   for(let i=0;i<n;i++){
    const [b,c,domain,bGear,cGear]=group.map((q,j)=>pixels(q,j===1||j===4?after:before,opt,i,n));
    a.deepEqual(bGear,cGear);
    let delta=0;for(let j=0;j<b.length;j+=4){
     a.equal(b[j+3],c[j+3]);if(b.readUInt32LE(j)===c.readUInt32LE(j))continue;
     a(domain[j+3],String(j));delta++;
    }
    a(delta>1000);count++;
   }
  } finally {for(const q of group)q.release();}
  a.equal(JSON.stringify(after),save);global.gc?.();
 }
 a.equal(count,68);console.log('PASS',count);
})().catch(e=>{console.error(e);process.exitCode=1;});
