'use strict';
const A=require('node:assert/strict'),P=require('node:path'),R=P.resolve(__dirname,'..'),{make,cv}=require('./rework-integration-support.cjs');
const api=make(), APP=require('../character-appearance'),inv=require('../item-catalog').create({
 forge:require('../forge-system'),prison:require('../prison-system'),haki:require('../haki-system'),akuma:require('../akuma-system'),hakiProgression:require('../haki-progression')
}).items, load=require('../tools/rework-hd-test-loader.cjs').create(R), root=require('../../female-north-boot-disjoint.json');
const opts={consumer:'world',action:'walk',direction:'north'},srcs=new Map();
const save=(id,boots,tone)=>JSON.parse(JSON.stringify(APP.commit({classId:inv[id].type,equipment:{weapon:{def:id},...(boots?{boots:{def:boots}}:{})}},{gender:'feminino',skinColor:tone},()=>true)));
const mask=async (layers,tick)=>{
 const key=layers.map(l=>l.frames[tick]).join(',');
 if(!srcs.has(key)){
  const c=cv.createCanvas(512,512),x=c.getContext('2d');
  for(const l of layers)x.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+l.frames[tick]+'.png'),0,0);
  const z=x.getImageData(0,0,512,512).data,m=new Uint8Array(512*512);
  for(let i=0;i<m.length;i++)m[i]=z[4*i+3];
  c.width=1;srcs.set(key,m);
 }
 return srcs.get(key);
};
const draw=(run,save,tick)=>{
 let image;A(run.draw({save(){},restore(){},drawImage(c){image=c}},save,{...opts,progress:(tick+.1)/40}));
 return image;
};
const buf=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
(async()=>{await api.ready;let constructed=0,held=0,draws=0;
for(const e of root.rows)for(const boot of root.boots){
 const p=save(e.weapon,boot,'light'),r=api.selectVisual(p,opts),eligible=e.pass.includes(boot);
 if(!eligible){A(!r?.northLayers?.lower?.disjointBootOnly);held++;continue;}
 A(r?.northLayers?.lower?.disjointBootOnly,e.weapon+' B'+boot);
 A.equal(r.slotRoutes.boots.item,boot);A.equal(r.slotRoutes.weapon.item,e.weapon);
 A.equal(r.northLayers.body.states[0].parts.length,e.parts);
 constructed++;
}
const plan=process.env.ALL==='1'?root.rows.flatMap(e=>e.pass.map(boot=>[e.weapon,boot,e.parts])):
 [[67,9,1],[70,9,1],[69,9,1],[110,8,2],[3,9,2],[114,148,2],[74,9,2]]
 .filter(([id,b])=>root.rows.some(x=>x.weapon===id&&x.pass.includes(b)));
for(const [id,boot,parts] of plan)for(const tone of (process.env.ALL==='1'?['light']:['light','ebony'])){
 const p=save(id,boot,tone),p0=save(id,null,tone),r=api.selectVisual(p,opts);
 A(r?.northLayers?.lower?.disjointBootOnly);A.equal(r.northLayers.body.states[0].parts.length,parts);
 const exact={...r,id:r.id+':without-boot-validation-only',northLayers:{...r.northLayers,lower:null}};
 const x=await api.prepareConfiguration([{player:p,options:opts}]);
 const y=await api.prepareConfiguration([{player:p0,options:opts}],{resolve:({player,options})=>({player,options,source:exact})});
 try{for(let i=0;i<40;i++){
   const a=draw(x,p,i),b=draw(y,p0,i),av=buf(a),bv=buf(b);
   A.equal(a.width,b.width);A.equal(a.height,b.height);
   A.equal(a.width,512+2*root.rows.find(z=>z.weapon===id).padding);
   const pad=(a.width-512)/2,f=await mask(r.northLayers.lower.gear,i);
   let changes=0;
   for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){
    const n=(y*a.width+x)*4;
    if(av.readUInt32LE(n)===bv.readUInt32LE(n))continue;
    A(x>=pad&&x<pad+512&&y>=pad&&y<pad+512&&f[(y-pad)*512+x-pad]>0,'change outside own boots alpha');changes++;
   }
   A(changes>40);draws++;
 }}finally{x.release();y.release();}
 console.log('PASS',id,boot,parts,tone,40);
 global.gc?.();
}
console.log('PASS structural',constructed,'disjoint /',held,'atomic holds;',draws,'actual dressed vs clean HD native World tick witnesses');
})().catch(e=>{console.error(e);process.exitCode=1});
