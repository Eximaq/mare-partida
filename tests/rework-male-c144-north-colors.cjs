'use strict';
const assert=require('node:assert/strict'),{make,cv}=require('./rework-integration-support.cjs');
const api=make(),raw={gender:'masculino',hairStyle:'original',hairColor:'original',skinColor:'original',eyeColor:'original',eyeStyle:'original'};
const look={...raw,skinColor:'ebony',hairColor:'silver',eyeColor:'green'};
const fs=require('node:fs');
const prep=(player,source,options)=>api.prepareConfiguration([{player,source,options}],{resolve:q=>q});
const take=(prepared,player,opt,i,len)=>{
 let c;assert(prepared.draw({save(){},restore(){},drawImage(out){c=out;}},player,{...opt,progress:(i+.25)/len}));
 return {c,pixels:Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data)};
};
const player=(appearance96,coat,boots)=>({classId:'fighter',appearance96,equipment:{coat:{def:coat},legs:{def:133},...(boots?{boots:{def:boots}}:{})}});
(async()=>{await api.ready;let count=0,rendered=0;
for(const action of ['idle','walk'])for(const boots of [undefined,9,148])for(const coat of [144]){
 const o={direction:'north',action,consumer:'world'},a=player(raw,coat,boots),b=player(look,coat,boots);
 const original=api.selectVisual(a,o),saved=api.selectVisual(b,o);
 assert(saved?.id.includes(':verified-north-palette:'),JSON.stringify({action,coat,boots,id:saved?.id}));assert.deepEqual(saved.pack,original.pack);
 assert.deepEqual(saved.equipment,original.equipment);
 assert.equal(saved.colorAppearance.eyeColor,'green');assert.equal(saved.colorAppearance.skin,'ebony');assert.equal(saved.colorAppearance.hairColor,'silver');
 assert.equal(Object.keys(saved.paletteSourceMasks).length,7);
 assert.equal(Object.keys(saved.baseMaterialSources).length,saved.pack.directions.north.clip.frames);
 count++;
 if(process.env.SELECT_ONLY)continue;
 const save=JSON.stringify(b),d=saved.pack.directions.north,owned=new Set([...Object.keys(saved.paletteSourceMasks),...Object.keys(saved.baseMaterialSources)]);
 const layerProof={...original,id:original.id+':authority-proof',pack:{...original.pack,directions:{north:{...d,
  layers:d.layers.filter(l=>(l.frames||[l.source]).some(h=>owned.has(h)))}}}};
 const q0=await prep(a,original,o),q1=await prep(b,saved,o),auth=await prep(a,layerProof,o);
 try{
  for(let i=0;i<d.clip.frames;i++){
   const before=take(q0,a,o,i,d.clip.frames),after=take(q1,b,o,i,d.clip.frames),mask=take(auth,a,o,i,d.clip.frames).pixels;
   let change=0,foot=0,head=0,handsOrNeck=0;
   for(let j=0;j<after.pixels.length;j+=4){
    assert.equal(after.pixels[j+3],before.pixels[j+3]);
    if(before.pixels.readUInt32LE(j)===after.pixels.readUInt32LE(j))continue;
    assert(mask[j+3],'unowned materials changed: '+j);
    const y=Math.floor(j/4/before.c.width);
    if(y>=330)foot++;else if(y<140)head++;else handsOrNeck++;
    change++;
   }
   assert(change>5000);assert(foot>2000);assert(head>1000);assert(handsOrNeck>500);
   assert.deepEqual(take(q0,a,o,i,d.clip.frames).pixels,before.pixels);
   if(process.env.PRINT&&boots===9&&coat===144&&i===0){
    fs.writeFileSync(process.env.PRINT+'/'+action+'-saved.png',after.c.toBuffer('image/png'));
    fs.writeFileSync(process.env.PRINT+'/'+action+'-original.png',before.c.toBuffer('image/png'));
   }
   rendered++;
  }
 }finally{q0.release();q1.release();auth.release();}
 assert.equal(JSON.stringify(b),save);global.gc?.();
}
console.log({count,rendered});
})().catch(e=>{console.error(e);process.exitCode=1});
