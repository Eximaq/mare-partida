'use strict';
const path=require('node:path'),a=require('node:assert/strict'),R=process.env.STAGE||path.resolve(__dirname,'..'),r=f=>require(R+'/'+f);
const {make,cv}=r('tests/rework-integration-support.cjs'),A=r('character-appearance'),db=r('tools/rework-modular-outfits-hd/index.json'),load=r('tools/rework-hd-test-loader.cjs').create(R),{items}=r('item-catalog').create({forge:r('forge-system'),prison:r('prison-system'),haki:r('haki-system'),akuma:r('akuma-system'),hakiProgression:r('haki-progression')});
const dirs={north:[8,9,134,141,148,155,162,176,183],south:[8,9,134,141,148,155,162,169]};
const looks=[{skinColor:'light'},{skinColor:'ebony',hairStyle:'hair-cropped',hairColor:'blue'}],api=make();
const C=(w=512)=>cv.createCanvas(w,w),pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const cases=[['idle',4,6],['idle',4,7],['idle',4,137],['walk',0,6],['walk',2,6],['walk',4,6]];
async function draw(actor,options,source,n){
 const b=await api.prepareConfiguration([{player:actor,options,source}],{resolve:x=>x});
 try{
  a.equal(b.coverage[0]?.frames,n,JSON.stringify(b.coverage));const frames=[];
  for(let i=0;i<n;i++){
   let c;a(b.draw({save(){},restore(){},drawImage(q){c=q;}},actor,{...options,progress:(i+.2)/n}));
   frames.push([c.width,pixels(c)]);
  }
  return frames;
 }finally{b.release();global.gc?.();}
}
(async()=>{
 await api.ready;let frames=0;
 for(const [action,w,coat] of cases){
  if(process.env.SAMPLE&&process.env.SAMPLE!==[action,w,coat].join('/'))continue;
  const skinColor=process.env.TONE||'light',options={consumer:'world',action,direction:'south'},n=action==='idle'?1:16;
  const actor=(c,b)=>A.commit({classId:items[w].type,equipment:{weapon:{def:w},...(c?{coat:{def:c}}:{}),...(b?{boots:{def:9}}:{})}},{gender:'masculino',skinColor},()=>true);
  const on=actor(coat,1),no=actor(null,0),shoe=actor(null,1),coatOnly=actor(coat,0),saved=JSON.stringify(on);
  const q=api.selectVisual(on,options),b=api.selectVisual(shoe,options),c=api.selectVisual(coatOnly,options),bare=api.selectVisual(no,options);
  a(q?.id.endsWith(':independent-south-b9-coat'),'missing signed independent three slots '+[action,w,coat,skinColor]);
  a.deepEqual(q.slotRoutes.boots,b.slotRoutes.boots);a.equal(q.slotRoutes.coat.item,coat);a.equal(q.slotRoutes.weapon.item,w);a.deepEqual(q.omitted,[]);
  a.deepEqual(q.plan,c.plan);a.deepEqual(q.colorAppearance,c.colorAppearance);a.deepEqual(q.pack.directions.south.clip,c.pack.directions.south.clip);a.deepEqual(q.pack.pivot,c.pack.pivot);
  const mixed=await draw(on,options,q,n),B=await draw(shoe,options,b,n),C0=await draw(coatOnly,options,c,n),N=await draw(no,options,bare,n);
  for(let f=0;f<n;f++){
   const [width,Q]=mixed[f],S=B[f][1],T=C0[f][1],R=N[f][1];a.equal(width,B[f][0]);a.equal(width,C0[f][0]);a.equal(width,N[f][0]);
   let coatPixels=0,bootPixels=0;
   for(let i=0;i<Q.length;i+=4){
    const x=Q.readUInt32LE(i),a0=R.readUInt32LE(i),b0=S.readUInt32LE(i),c0=T.readUInt32LE(i);
    a(!(b0!==a0&&c0!==a0),'coat and boot changes must be exclusive');
    if(b0!==a0)bootPixels++;
    if(c0!==a0)coatPixels++;
    a.equal(x,b0!==a0?b0:c0,'mixed RGBA must match isolated coat and boot '+[action,w,coat,f,i>>>2]);
   }
   a(coatPixels>100&&bootPixels>100);frames++;
  }
  a.equal(JSON.stringify(on),saved);
  const unsupported={...on,equipment:{...on.equipment,coat:{def:coat,variant:'unverified'}}};
  a(!api.selectVisual(unsupported,options)?.id.endsWith(':independent-south-b9-coat'));
  console.log('PASS',action,w,coat,skinColor,n);
 }
 a(frames>0);
})().catch(e=>{console.error(e);process.exitCode=1;});
