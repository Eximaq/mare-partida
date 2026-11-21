'use strict';
const a=require('node:assert/strict'),{make,cv}=require('./rework-integration-support.cjs');
const api=make(),raw={gender:'masculino',hairStyle:'original',hairColor:'original',skinColor:'original',eyeColor:'original',eyeStyle:'original'};
const profiles=[{...raw,skinColor:'ebony',hairColor:'silver',eyeColor:'green'},
                {...raw,skinColor:'porcelain',hairColor:'pink',eyeColor:'amber'}];
const opt={action:'idle',direction:'north',consumer:'world'},coatIds=[158,165,172,179];
const player=(appearance96,coat,boots)=>({classId:'fighter',appearance96,equipment:{
 coat:{def:coat},legs:{def:133},...(boots?{boots:{def:boots}}:{})}});
const prep=(player,source)=>api.prepareConfiguration([{player,source,options:opt}],{resolve:q=>q});
function pixel(prepared,player){
 let c;a(prepared.draw({save(){},restore(){},drawImage(out){c=out;}},player,{...opt,progress:.5}));
 return Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
}
const select=(record,keep,suffix)=>{
 const direction='north',d=record.pack.directions[direction];
 return {...record,id:record.id+':'+suffix,pack:{...record.pack,directions:{north:{...d,layers:d.layers.filter(keep)}}}};
};
(async()=>{
 await api.ready;let selected=0,rendered=0;
 for(const boots of [undefined,9,148])for(const coat of coatIds)for(const look of profiles){
  const before=player(raw,coat,boots),after=player(look,coat,boots),save=JSON.stringify(after);
  const x=api.selectVisual(before,opt),y=api.selectVisual(after,opt);
  a(y?.id.includes(':verified-north-palette:'),JSON.stringify([coat,boots,y?.id]));
  a(!api.selectVisual(after,{...opt,action:'walk'})?.id.includes(':verified-north-palette:'));
  a.deepEqual(x.pack,y.pack);a.deepEqual(x.equipment,y.equipment);a.deepEqual(x.slotRoutes,y.slotRoutes);
  a.equal(y.colorAppearance.skin,look.skinColor);a.equal(y.colorAppearance.hairColor,look.hairColor);a.equal(y.colorAppearance.eyeColor,look.eyeColor);
  a.equal(Object.keys(y.paletteSourceMasks).length,7);a.equal(Object.keys(y.baseMaterialSources).length,1);
  const auth=new Set([...Object.keys(y.paletteSourceMasks),...Object.keys(y.baseMaterialSources)]), tagged=l=>(l.frames||[l.source]).some(h=>auth.has(h));
  const cloth=l=>/^coat/.test(l.id)||l.id==='original-neck-coverage-only-collar'||l.id.startsWith('own133-')||l.id.startsWith('boot');
  a(!y.pack.directions.north.layers.some(l=>cloth(l)&&tagged(l)));
  selected++;
  if(process.env.SELECT_ONLY)continue;
  const group=await Promise.all([[before,x],[after,y],
    [before,select(x,tagged,'authority-proof')],
    [before,select(x,cloth,'cloth-proof')],[after,select(y,cloth,'cloth-proof')]].map(([p,r])=>prep(p,r)));
  try{
   const [p0,p1,zone,bareCloth,dressedCloth]=group.map((q,i)=>pixel(q,i===1||i===4?after:before));
   a.deepEqual(bareCloth,dressedCloth,'cloth/fur, collar, trousers and boots must be pixel exact');
   let changes=0,lower=0,head=0;
   for(let i=0;i<p0.length;i+=4){
    a.equal(p0[i+3],p1[i+3]);
    if(p0.readUInt32LE(i)===p1.readUInt32LE(i))continue;
    a(zone[i+3],'changed outside anatomy/hair authority');
    const row=Math.floor(i/4/512);if(row>330)lower++;if(row<140)head++;
    changes++;
   }
   a(changes>1000);a(lower>250);a(head>500);
   a.equal(JSON.stringify(after),save);
   a.deepEqual(pixel(group[0],before),p0);
   rendered++;
  }finally{for(const q of group)q.release();}
  global.gc?.();
 }
 a.equal(selected,24);if(!process.env.SELECT_ONLY)a.equal(rendered,24);
 console.log({selected,rendered,clothFurExact:true,walkExcluded:true});
})().catch(e=>{console.error(e);process.exitCode=1});
