'use strict';
const path=require('node:path'),a=require('node:assert/strict'),R=process.env.STAGE||path.resolve(__dirname,'..'),r=f=>require(R+'/'+f);
const {make,cv}=r('tests/rework-integration-support.cjs'),A=r('character-appearance'),db=r('tools/rework-modular-outfits-hd/index.json'),load=r('tools/rework-hd-test-loader.cjs').create(R),{items}=r('item-catalog').create({forge:r('forge-system'),prison:r('prison-system'),haki:r('haki-system'),akuma:r('akuma-system'),hakiProgression:r('haki-progression')});
const dirs={north:[8,9,134,141,148,155,162,176,183],south:[8,9,134,141,148,155,162,169]};
const looks=[{skinColor:'light'},{skinColor:'ebony',hairStyle:'hair-cropped',hairColor:'blue'}],api=make();
const C=(w=512)=>cv.createCanvas(w,w),pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
async function draw(actor,options,source){
 const b=await api.prepareConfiguration([{player:actor,options,source}],{resolve:x=>x});
 try{let c;a.equal(b.coverage[0]?.frames,1,JSON.stringify(b.coverage));a(b.draw({save(){},restore(){},drawImage(q){c=q;}},actor,{...options,progress:.5}));return [c.width,pixels(c)];}
 finally{b.release();}
}
const options={consumer:'world',direction:'north',action:'idle'},pairs=[
 [2,8,25],[3,9,26],[14,134,131],[15,141,138],[17,148,145],
 [31,155,152],[15,162,159],[15,176,166],[31,183,173],[2,9,180]
];
(async()=>{
 await api.ready;let cases=0;
 for(const look of looks)for(const [w,b,g] of pairs){
  const actor=(boots,gloves)=>A.commit({classId:items[w].type,equipment:{weapon:{def:w},...(boots==null?{}:{boots:{def:boots}}),...(gloves==null?{}:{gloves:{def:gloves}})}},{gender:'feminino',...look},()=>true);
  const dressed=actor(b,g),bootOnly=actor(b,null),gloveOnly=actor(null,g),naked=actor(null,null),saved=JSON.stringify(dressed);
  const R=api.selectVisual(dressed,options),B=api.selectVisual(bootOnly,options),G=api.selectVisual(gloveOnly,options),N=api.selectVisual(naked,options);
  a(R?.id.includes(':independent-north-idle-boot:'),'missing independent triple '+[w,b,g]);
  a.equal(R.slotRoutes.boots.item,b);a.equal(R.slotRoutes.gloves.item,g);a.equal(R.slotRoutes.weapon.item,w);a.deepEqual(R.omitted,[]);
  a.deepEqual(R.slotRoutes.boots,B.slotRoutes.boots);a.deepEqual(R.slotRoutes.gloves,G.slotRoutes.gloves);
  a.deepEqual(R.states,N.states);a.deepEqual(R.colorAppearance,N.colorAppearance);
  a.deepEqual(R.pack.directions.north.clip,N.pack.directions.north.clip);a.deepEqual(R.pack.pivot,N.pack.pivot);
  const [width,combined]=await draw(dressed,options,R),[,boots]=await draw(bootOnly,options,B),[,gloves]=await draw(gloveOnly,options,G),[,plain]=await draw(naked,options,N);
  const boundary=300+(width-512)/2;let glovesSupport=0,bootsSupport=0;
  for(let i=0;i<combined.length;i+=4){
   const y=Math.floor(i/(width*4));
   a.equal(combined.readUInt32LE(i),(y<boundary?gloves:boots).readUInt32LE(i),'retained exact rendered pixel at '+[w,b,g,y]);
   if(y<boundary){a.equal(boots.readUInt32LE(i),plain.readUInt32LE(i));if(gloves.readUInt32LE(i)!==plain.readUInt32LE(i))glovesSupport++;}
   else{a.equal(gloves.readUInt32LE(i),plain.readUInt32LE(i));if(boots.readUInt32LE(i)!==plain.readUInt32LE(i))bootsSupport++;}
  }
  a(glovesSupport>100&&bootsSupport>200);a.equal(JSON.stringify(dressed),saved);
  const unsupported={...dressed,equipment:{...dressed.equipment,gloves:{def:g,variant:'unverified'}}};
  a(!api.selectVisual(unsupported,options)?.id.includes(':independent-north-idle-boot:'),'unsupported sibling must not be ignored');
  cases++;global.gc?.();
 }
 a.equal(cases,20);console.log('PASS',cases,'actual full-pixel independent North idle boot + glove + weapon compositions');
})().catch(e=>{console.error(e);process.exitCode=1;});
