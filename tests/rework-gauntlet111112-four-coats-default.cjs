'use strict';
const ad=require('node:assert/strict'),p=require('node:path'),R=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..'));
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),old=make(),A=require(R+'/character-appearance');
if(process.env.CANDIDATE)global.MareReworkWeaponNativeHD=require(p.resolve(process.env.CANDIDATE,'player-rework-weapon-native-hd'));
const api=make(),M=global.MareReworkModularOutfitsHD,load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),fs=require('node:fs');
const index=require(R+'/tools/rework-weapon-layers-hd/index.json'),V=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});
const hm={east:'fc4d94176143c1a1bace649e35262ec9f5e5b5aae0e7e932d2eeb1f882c5359a',west:'fccea53415dc2acf040461dcc81b112d6275bf0dddf888b4f9d947ad552324c1'};
const approved=[151,158,165,179],fringes={151:[4,72],158:[12,55],165:[9,33],179:[0,79]};
const iw=f=>'tools/rework-weapon-layers-hd/'+f,read=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const alpha=img=>{const c=cv.createCanvas(640,640);c.getContext('2d').drawImage(img,0,0);return read(c);};
const o=(d,a='attack-unarmed')=>({direction:d,action:a,consumer:'world'});
const actor=(i,look={},classId='brawler',extras={})=>JSON.parse(JSON.stringify(A.commit({id:'true-save',classId,equipment:{weapon:{def:i},...extras}},look,()=>true)));
(async()=>{await Promise.all([api.ready,old.ready]);let checked=0;
for(const item of [111,112]) for(const direction of ['east','west']) for(const n of approved){
 const options=o(direction),same=actor(item),brown=actor(item,{hairColor:'brown',eyeColor:'brown'},'brawler',{coat:{def:n}});
 const memo=JSON.stringify(same),bare=api.select(same,options),orig=api.select(brown,options);
 if(process.env.CANDIDATE)ad.deepEqual(bare,old.select(same,options));
 same.equipment.coat={def:n};const coat=api.select(same,options);
 ad(coat?.ownedGauntletCoatHead);ad.deepEqual(coat.states,orig.states);ad.deepEqual(coat.timeline,bare.timeline);ad.deepEqual(coat.pivot,[80,128]);ad.equal(coat.fps,12);
 ad.deepEqual(coat.equipmentContract,{weapon:item,coat:n});
 for(const q of [actor(item,{},'cyborg',{coat:{def:n}}),actor(item,{skinColor:'ebony'},'brawler',{coat:{def:n}}),actor(item,{eyeColor:'green'},'brawler',{coat:{def:n}}),actor(item,{},'brawler',{coat:{def:n,variant:'extra'}}),actor(item,{},'brawler',{coat:{def:n},legs:{def:182}}),actor(item,{},'brawler',{coat:{def:137}}),actor(item,{},'brawler',{coat:{def:n},boots:{def:9}})])ad(!api.select(q,options)?.ownedGauntletCoatHead);
 for(const row of [o(direction,'attack-tech'),o(direction,'walk'),o('north'),o('south')])ad(!api.select(same,row)?.ownedGauntletCoatHead);
 if(process.env.SELECT_ONLY)continue;
 const mask=alpha(await load('tools/rework-modular-outfits-hd/assets/'+hm[direction]+'.png'));
 const hair=new Set(Array.from({length:640*640},(_,i)=>i).filter(i=>mask[i*4]).map(i=>i+1280));
 const iris=new Set(M.sideIrisSamples(direction).map(([x,y])=>x+64+(y+66)*640));ad.equal(hair.size,4040);ad.equal(iris.size,18);
 const draw=async(q,f)=>{
  let raster;const ctx={save(){},restore(){},drawImage(c){raster=c;}};
  ad(await api.prepareClip(q,options));ad(api.draw(ctx,q,{...options,x:320,y:512,progress:(f+.1)/8}));
  ad(raster?.width===640&&raster.height===640);return read(raster);
 };
 for(let f=0;f<8;f++){
  const [body,C,G]=coat.states[f].layers;ad.deepEqual(body,bare.states[f].layers[0]);ad.equal(G.sha256,bare.states[f].layers[1].sha256);
  const [cloth,gear]=await Promise.all([C,G].map(k=>load(iw(k.url))));
  const Cbuf=alpha(cloth),Gbuf=alpha(gear);
  const under={...bare,id:bare.id+':only-head-test-oracle',states:bare.states.map(s=>({...s,layers:[s.layers[0]]}))};
  const imgs=new Map(await Promise.all(V.requiredFiles(under,{frame:f}).map(async x=>[x,await load(x)])));
  const comp=cv.createCanvas(640,640),cx=comp.getContext('2d');V.render(cx,under,imgs,{frame:f});
  cx.drawImage(cloth,0,0);cx.drawImage(gear,0,0);
  const colored=await draw(same,f),original=await draw(brown,f);
  ad(colored.equals(read(comp)),'expected pre-coat ordering '+[item,direction,f]);
  const next=approved[(approved.indexOf(n)+1)%approved.length];
  same.equipment.coat={def:next};const switched=api.select(same,options);
  ad(switched?.ownedGauntletCoatHead);ad.deepEqual(switched.equipmentContract,{weapon:item,coat:next});
  ad.deepEqual(switched.states[f].layers[0],body);ad.deepEqual(switched.states[f].layers[2],G);
  const nextCloth=alpha(await load(iw(switched.states[f].layers[1].url))),nextRender=await draw(same,f);
  let swapped=0;
  for(let i=0;i<nextRender.length;i+=4)if(nextRender.readUInt32LE(i)!==colored.readUInt32LE(i)){
   ad(Cbuf[i+3]||nextCloth[i+3],'switch changed outside either coat');ad.equal(Gbuf[i+3],0,'switch changed weapon/hand');swapped++;
  }
  ad(swapped>0,'coat switch did not change visible cloth');
  delete same.equipment.coat;ad.deepEqual(api.select(same,options),bare);ad.equal(JSON.stringify(same),memo);
  const removed=await draw(same,f);
  same.equipment.coat={def:n};ad.deepEqual(api.select(same,options),coat);
  ad((await draw(same,f)).equals(colored),'remount is not reversible');
  let hidden=0,partial=0,gearCount=0,count=0;
  for(let v=0;v<640*640;v++){
   const k=v*4,ca=Cbuf[k+3],ga=Gbuf[k+3],b=removed.readUInt32LE(k),u=colored.readUInt32LE(k),br=original.readUInt32LE(k);
   if(!ca||ga>0)ad.equal(u,b,'delta outside own coat or under weapon');
   if(ga)gearCount++;
   ad.equal(colored[k+3],original[k+3]);
   if(ca===255&&hair.has(v)){ad.equal(u,br);hidden++;}
   else if(ca>0&&hair.has(v))partial++;
   if(!hair.has(v)&&!iris.has(v))ad.equal(u,br);
   if(b!==u)count++;
  }
  ad(hidden===fringes[n][0]&&partial===fringes[n][1]&&count>10000&&gearCount>1000);
  checked++;
 }
 console.log('PASS',item,direction,n,'8 same-actor coat-on/switch/off/on own phases');global.gc?.();
}
if(!process.env.SELECT_ONLY)ad.equal(checked,128);
console.log('PASS',checked,'coat/body/gear ordered phases');
})().catch(e=>{console.error(e);process.exitCode=1});
