'use strict';
const a=require('node:assert/strict'),R=require('node:path').resolve(__dirname,'..'),{make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance');
const load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),catalog=require(R+'/tools/paper-doll-96-v3/weapons.json'),world=require(R+'/paper-doll-96-lobby.js'),api=make();
const slots=require(R+'/item-catalog').create({forge:require(R+'/forge-system'),prison:require(R+'/prison-system'),haki:require(R+'/haki-system'),akuma:require(R+'/akuma-system'),hakiProgression:require(R+'/haki-progression')});
const empty=Object.fromEntries([...slots.inventorySlotsLeft,...slots.inventorySlotsRight].map(s=>[s,null]));
const ids=[25,26,131,138,145,152,159,166,173,180];
const look=(tone,gloves)=>A.commit({classId:'brawler',equipment:{...empty,...(gloves?{gloves:{def:gloves}}:{})}},{gender:'masculino',skinColor:tone},()=>true);
const pixels=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
const draw=(b,p,o,f)=>{let c;a(b.draw({save(){},restore(){},drawImage(q){c=q;}},p,{...o,progress:(f+.25)/8}));return c;};
(async()=>{await api.ready;let count=0;
for(const direction of ['north','south','east','west'])for(const tone of Object.keys(A.skins)){
 const opts={direction,action:'attack-unarmed',consumer:'world'},off=look(tone),stock=api.selectVisual(off,opts);
 const r0=await api.prepareConfiguration([{player:off,options:opts}]),baseline=Array.from({length:8},(_,f)=>draw(r0,off,opts,f));
 try{for(const id of ids){
  const on=look(tone,id),save=JSON.stringify(on),r=api.selectVisual(on,opts);
  if(id===25&&['east','west'].includes(direction)){a(!r?.ownBarePunchGlove);continue;}
  a(r?.ownBarePunchGlove,JSON.stringify([direction,tone,id,r?.id]));a.equal(r.slotRoutes.gloves.item,id);
  a.deepEqual(r.pack,stock.pack);a.deepEqual(r.colorAppearance,stock.colorAppearance);
  for(const action of ['attack','skill'])a.equal(world.selectWorldHD(api,catalog,on,{...opts,action})?.id,r.id,action);
  if(!['light','ebony'].includes(tone))continue;
  const bundle=await api.prepareConfiguration([{player:on,options:opts}]);
  const pane=cv.createCanvas(640,640),mask=cv.createCanvas(640,640),report=[];
  try{for(let f=0;f<8;f++){
   const src=await load('tools/rework-modular-outfits-hd/assets/'+r.ownBarePunchGlove.frames[f]+'.png');
   const b=baseline[f],u=pixels(b),v=pixels(draw(bundle,on,opts,f)),cx=pane.getContext('2d'),mx=mask.getContext('2d');
   cx.clearRect(0,0,640,640);mx.clearRect(0,0,640,640);cx.drawImage(b,0,0);cx.drawImage(src,0,0);mx.drawImage(src,0,0);
   const want=pixels(pane),alpha=pixels(mask);let changes=0,added=0;
   a.deepEqual(v,want);
   for(let j=0;j<u.length;j++)if(u[j]!==v[j]){a(alpha[j]>>>24);changes++;if(!(u[j]>>>24))added++;}
   a(changes>100);report.push([changes,added]);count++;
  }
  // Same actor without the slot, from a fresh selection, must reproduce baseline.
  const offAgain=await api.prepareConfiguration([{player:look(tone),options:opts}]);
  try{a.deepEqual(pixels(draw(offAgain,look(tone),opts,4)),pixels(baseline[4]));}finally{offAgain.release();}
  }finally{bundle.release();pane.width=mask.width=1;}
  a.equal(JSON.stringify(on),save);console.log(direction,tone,id,JSON.stringify(report));
 }}finally{r0.release();}global.gc?.();
}
a.equal(count,608);console.log('PASS',count,'real Canvas punch frames');
})().catch(e=>{console.error(e);process.exitCode=1});
