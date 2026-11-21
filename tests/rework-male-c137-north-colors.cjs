'use strict';
const assert=require('node:assert/strict'),{make,cv}=require('./rework-integration-support.cjs');
const api=make(),raw={gender:'masculino',hairStyle:'original',hairColor:'original',skinColor:'original',eyeColor:'original',eyeStyle:'original'};
const look={...raw,skinColor:'ebony',hairColor:'silver',eyeColor:'green'};
const fs=require('node:fs');
const cuffs=[
 'd383b7148a8226b5cd7706249db11e14b1932689c3c9a5bcafcf5f0c0ef78db9',
 '58a31b7aeb417bfadd1362702e8c8814cbcd196da65cf9946a6ab3ca3ccaccf3'
];
const flat=(src,color)=>{
 const c=cv.createCanvas(src.width,src.height),ctx=c.getContext('2d');
 ctx.fillStyle=color;ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(src,0,0);
 return {c,p:Buffer.from(ctx.getImageData(0,0,c.width,c.height).data)};
};
const sheet=cv.createCanvas(4*185,4*220),sc=sheet.getContext('2d');
sc.imageSmoothingEnabled=false;
const prep=(player,source,options)=>api.prepareConfiguration([{player,source,options}],{resolve:q=>q});
const take=(prepared,player,opt,i,len)=>{
 let c;assert(prepared.draw({save(){},restore(){},drawImage(out){c=out;}},player,{...opt,progress:(i+.25)/len}));
 return {c,pixels:Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data)};
};
const player=(appearance96,coat,boots)=>({classId:'fighter',appearance96,equipment:{coat:{def:coat},legs:{def:133},...(boots?{boots:{def:boots}}:{})}});
(async()=>{await api.ready;let count=0,rendered=0,residual=0,maxResidualAlpha=0,maxOpaqueDelta=0;
for(const action of ['idle','walk'])for(const boots of [undefined,9,148])for(const coat of [137]){
 const o={direction:'north',action,consumer:'world'},a=player(raw,coat,boots),b=player(look,coat,boots);
 const original=api.selectVisual(a,o),saved=api.selectVisual(b,o);
 assert(saved?.id.includes(':verified-north-palette:'),JSON.stringify({action,coat,boots,id:saved?.id}));assert.deepEqual(saved.pack,original.pack);
 assert.deepEqual(saved.equipment,original.equipment);
 assert.equal(saved.colorAppearance.eyeColor,'green');assert.equal(saved.colorAppearance.skin,'ebony');assert.equal(saved.colorAppearance.hairColor,'silver');
 assert.equal(Object.keys(saved.paletteSourceMasks).length,7);
 assert.equal(Object.keys(saved.baseMaterialSources).length,saved.pack.directions.north.clip.frames+2);
 for(const h of cuffs)assert.equal(saved.baseMaterialSources[h],'anatomy');
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
   const backgrounds=['#69729a','#647056'];
   const flatImages=backgrounds.map(color=>[flat(before.c,color),flat(after.c,color),color]);
   for(let j=0;j<after.pixels.length;j+=4){
    assert.equal(after.pixels[j+3],before.pixels[j+3]);
    const xx=j/4%512,yy=Math.floor(j/4/512);
    if(yy>=165&&yy<231&&xx>=158&&xx<357&&(xx<=193||xx>=319)){
     const [R,G,B,A]=before.pixels.subarray(j,j+4);
     if(R>=240&&B<=15&&A>=1&&A<=8){
      residual++;maxResidualAlpha=Math.max(maxResidualAlpha,A);
      assert(A<=2,'unexpected visible halo in sleeve margins');
      assert.equal(before.pixels.readUInt32LE(j),after.pixels.readUInt32LE(j),'palette changes transparent fringe');
      for(const [orig,profile,color] of flatImages){
       const bg=Buffer.from(color.slice(1),'hex');
       assert.equal(profile.p.readUInt32LE(j),orig.p.readUInt32LE(j));
       for(let k=0;k<3;k++)maxOpaqueDelta=Math.max(maxOpaqueDelta,Math.abs(profile.p[j+k]-bg[k]));
      }
     }
    }
    if(before.pixels.readUInt32LE(j)===after.pixels.readUInt32LE(j))continue;
    assert(mask[j+3],'unowned materials changed: '+j);
    const y=Math.floor(j/4/before.c.width);
    if(y>=330)foot++;else if(y<140)head++;else handsOrNeck++;
    change++;
   }
   assert(change>5000);assert(foot>2000);assert(head>1000);if(coat===137)assert(handsOrNeck>500);
   assert.deepEqual(take(q0,a,o,i,d.clip.frames).pixels,before.pixels);
   if(process.env.PRINT&&boots===9){
    if(action==='walk'){
     const x=i%4*185,y=Math.floor(i/4)*220;
     sc.drawImage(flatImages[0][1].c,145,56,218,396,x,y,185,205);
     sc.fillStyle='#444d65';sc.fillRect(x,y+205,185,15);
     sc.fillStyle='white';sc.fillText('F'+i,x+4,y+216);
    }
    if(action==='idle')fs.writeFileSync(process.env.PRINT+'/idle-opaque.png',flatImages[0][1].c.toBuffer('image/png'));
   }
   for(const [o,p] of flatImages){o.c.width=o.c.height=p.c.width=p.c.height=1;}
   rendered++;
  }
 }finally{q0.release();q1.release();auth.release();}
 assert.equal(JSON.stringify(b),save);global.gc?.();
}
if(!process.env.SELECT_ONLY){
 assert.equal(rendered,51);assert(residual>1000);assert(maxOpaqueDelta<=2);
 if(process.env.PRINT)fs.writeFileSync(process.env.PRINT+'/walk-opaque-all16.png',sheet.toBuffer('image/png'));
}
console.log({count,rendered,residual,maxResidualAlpha,maxOpaqueDelta});
})().catch(e=>{console.error(e);process.exitCode=1});
