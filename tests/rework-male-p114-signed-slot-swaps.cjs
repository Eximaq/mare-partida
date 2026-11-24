'use strict';
const a=require('node:assert/strict'),p=require('node:path'),fs=require('node:fs');
const root=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..'));
if(process.env.SIGNED_SLOT_TRIAL){
 const Module=require('node:module');
 for(const file of ['player-rework-modular-outfits-hd.js','player-rework-native-hd.js']){
  const target=p.join(root,file),loaded=new Module(target);
  loaded.filename=target;loaded.paths=Module._nodeModulePaths(root);
  loaded._compile(fs.readFileSync(p.join(process.env.SIGNED_SLOT_TRIAL,file),'utf8'),target);
  loaded.loaded=true;require.cache[target]=loaded;
 }
}
const {make,cv}=require(p.join(root,'tests/rework-integration-support.cjs'));
const cosmetics=require(p.join(root,'character-appearance.js'));
const load=require(p.join(root,'tools/rework-hd-test-loader.cjs')).create(root);
const native=make();
const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const o={direction:'south',action:'attack-firearm',consumer:'world'};
const empty=()=>cv.createCanvas(640,640);
const frames=(bundle,actor,t,n)=>{
 let draw;
 a(bundle.draw({save(){},restore(){},drawImage(x){draw=x;}},actor,{...o,progress:(t+.25)/n}));
 return pixels(draw);
};
const countMaskedDiff=(x,y,domain)=>{
 let n=0;
 for(let i=0;i<x.length;i+=4){
  if(x[i]===y[i]&&x[i+1]===y[i+1]&&x[i+2]===y[i+2]&&x[i+3]===y[i+3])continue;
  a(domain[i+3]>0,'unrelated pixel changed at '+(i/4));
  n++;
 }
 return n;
};
(async()=>{
 await native.ready;
 for(const skinColor of ['light','ebony']){
  const appearance96=cosmetics.normalize({gender:'masculino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor});
  const actor=(legs,boots)=>({classId:'gunner',appearance96,equipment:{weapon:{def:114},...(legs?{legs:{def:legs}}:{}),...(boots?{boots:{def:boots}}:{})}});
  const actors=[actor(21,9),actor(22,9),actor(22),actor(null,9)];
  const sources=actors.map(p=>native.selectVisual(p,o)),[c21,c22,off,bootOnly]=sources;
  for(const row of sources){
   a(row.signedWeaponGarments);a.deepEqual(row.states,c21.states);a.deepEqual(row.timeline,c21.timeline);
   a.deepEqual(row.colorAppearance,c21.colorAppearance);a.deepEqual(row.pivot,c21.pivot);
   a.deepEqual(row.slotRoutes.weapon,c21.slotRoutes.weapon);a.deepEqual(row.omitted,[]);
  }
  a.equal(c21.slotRoutes.legs.item,21);
  a.equal(c22.slotRoutes.legs.item,22);
  a.deepEqual(c22.slotRoutes.legs,off.slotRoutes.legs);
  a.deepEqual(c22.slotRoutes.boots,bootOnly.slotRoutes.boots);
  const bundles=[];
  const sheet=empty(),ctx=sheet.getContext('2d'),imgs=new Map();
  const mask=async(hashes)=>{
   ctx.clearRect(0,0,640,640);
   for(const h of hashes){if(!imgs.has(h))imgs.set(h,await load('tools/rework-weapon-layers-hd/assets/'+h+'.png'));ctx.drawImage(imgs.get(h),0,0);}
   return pixels(sheet);
  };
  try{
   for(const player of actors)bundles.push(await native.prepareConfiguration([{player,options:o}]));
   for(let tick=0;tick<c21.timeline.length;tick++){
    const i=Number(c21.timeline[tick]),[p21,p22,p22Solo,boot]=sources.map(q=>q.signedWeaponGarments.phases[i]);
    a.deepEqual(p21.rear,boot.rear);a.deepEqual(p22.rear,boot.rear);
    a.deepEqual(p22.front,[...boot.front,...p22Solo.front]);
    const [a21,a22,bareFoot]=bundles.slice(0,3).map((b,j)=>frames(b,actors[j],tick,c21.timeline.length));
    const changedPants=countMaskedDiff(a21,a22,await mask([...p21.front.filter(h=>!boot.front.includes(h)),...p22Solo.front]));
    const changedBoot=countMaskedDiff(a22,bareFoot,await mask([...boot.front,...boot.rear]));
    a(changedPants>0&&changedBoot>0);
   }
   a.deepEqual(native.selectVisual(actor(21,9),o),c21);
   console.log('PASS 30 rendered ticks: swap P21→P22 with B9 kept, remove B9 with P22 kept, unchanged outside own alpha',skinColor);
  }finally{for(const b of bundles)b.release();sheet.width=1;global.gc?.();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
