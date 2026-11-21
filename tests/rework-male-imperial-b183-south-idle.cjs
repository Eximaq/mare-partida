'use strict';
const a=require('node:assert/strict'),base=require('node:path').resolve(__dirname,'..');
const {make,cv}=require(base+'/tests/rework-integration-support.cjs'),A=require(base+'/character-appearance.js');
const load=require(base+'/tools/rework-hd-test-loader.cjs').create(base);
const o={consumer:'world',action:'idle',direction:'south',time:0,x:200,y:400};
const look={gender:'masculino',hairColor:'blue',eyeColor:'blue',hairStyle:'original'};
const actor=(skinColor,boots=true)=>A.apply({classId:'sword',equipment:{weapon:{def:0},coat:{def:179},legs:{def:182},...(boots?{boots:{def:183}}:{})}},{...look,skinColor});
const capture=(bundle,actor)=>{
 let im; a(bundle.draw({save(){},restore(){},drawImage(i){im=i;}},actor,o));a.equal(im.width,768);a.equal(im.height,768);
 return {im,rgba:im.getContext('2d').getImageData(128,128,512,512).data};
};
(async()=>{
 const api=make();await api.ready;let paletteBoot=null;
 for(const tone of ['light','ebony']){
  const b=actor(tone,false),p=actor(tone),q=api.selectVisual(p,o),r=api.selectVisual(b,o);a.equal(q?.ownImperial183SouthIdle,true);
  a.deepEqual(q.plan,r.plan);a.deepEqual(q.colorAppearance,r.colorAppearance);a.deepEqual(q.pack.pivot,r.pack.pivot);a.deepEqual(q.pack.directions.south.clip,r.pack.directions.south.clip);
  const layers=q.pack.directions.south.layers,baseLayers=r.pack.directions.south.layers;
  a.deepEqual(layers.slice(0,baseLayers.length),baseLayers);
  const boots=layers.slice(baseLayers.length),c=cv.createCanvas(512,512),cx=c.getContext('2d');
  for(const l of [...boots].sort((a,b)=>a.depth-b.depth)){cx.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+l.source+'.png'),0,0);}
  const raw=cx.getImageData(0,0,512,512).data;
  const cfg=await api.prepareConfiguration([{player:p,options:o}]),cfg0=await api.prepareConfiguration([{player:b,options:o}]);
  a.equal(cfg.coverage.length,1);const on=capture(cfg,p),off=capture(cfg0,b),protect=[];let n=0;
  for(let i=0;i<raw.length;i+=4){
   const same=on.rgba.slice(i,i+4).every((v,j)=>v===off.rgba[i+j]);const y=Math.floor(i/4/512);
   if(!raw[i+3])a(same,'off-boot RGBA changed at '+i/4);
   if(!same)n++;
   if(y>390&&raw[i+3]===255&&on.rgba.slice(i,i+4).every((v,j)=>v===raw[i+j]))protect.push(i);
  }
  console.log("sample",n,protect.length);a(n>1000);a(protect.length>100);if(paletteBoot)a.deepEqual(protect,paletteBoot);paletteBoot=protect;
  cfg.release();cfg0.release();console.log(tone,n,'visible changes confined to B183 alpha footprint;',protect.length,'opaque sole/cuff native RGBA verified');
 }
 for(const [p,extra] of [[actor('light'),{action:'walk'}],[actor('light'),{direction:'east'}],[actor('light'),{consumer:'preview'}],[{...actor('light'),equipment:{...actor('light').equipment,gloves:{def:180}}},{}]])a(!api.selectVisual(p,{...o,...extra})?.ownImperial183SouthIdle);
 console.log('PASS actual prepared World; same weapon/head/skin/clock, all outside boot alpha exact for both tones.');
})().catch(e=>{console.error(e);process.exit(1)});
