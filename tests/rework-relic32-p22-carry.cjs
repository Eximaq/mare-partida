'use strict';
const a=require('node:assert/strict'),path=require('node:path');
const R=path.resolve(process.env.KAIZOKU_REPO||path.join(__dirname,'..'));
const {make}=require(path.join(R,'tests/rework-integration-support.cjs')),A=require(path.join(R,'character-appearance.js')),api=make();
const save=(skinColor,equipment,look={})=>({classId:'healer',appearance96:A.normalize({gender:'masculino',hairStyle:'original',hairColor:'blue',eyeStyle:'original',eyeColor:'amber',skinColor,...look}),equipment});
const prep=(player,source,options)=>api.prepareConfiguration([{player,source,options}],{resolve:(q)=>q});
const W={weapon:{def:32}},on={...W,legs:{def:22}};
const directions=(process.env.SIDE?[process.env.SIDE]:['south','east','west']);
function mask(r,l){
 const d=r.pack.directions[r.direction],pack={...r.pack,directions:{[r.direction]:{...d,layers:[l]}}};
 return {...r,id:r.id+':garment-proof',pack,base:{...r.base,pack},plan:{...r.plan,parts:[]},relicEyes:null,colorAppearance:{}};
}
function draw(q,p,o,f,n){
 let c;a(q.draw({save(){},restore(){},drawImage(x){c=x}},p,{...o,x:0,y:0,progress:(f+.25)/n}));
 return new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
}
(async()=>{await api.ready;let rendered=0;
for(const direction of directions)for(const action of ['idle','walk']){
 const o={direction,action,consumer:'world'},first=save('light',on),r0=api.selectVisual(first,o),baseline=api.selectVisual(save('light',W),o);
 a(r0?.ownRelic32Pants22);a(baseline?.relic32SavedPalette);const d=baseline.pack.directions[direction],n=d.clip.frames,l=r0.pack.directions[direction].layers.at(-1);
 const qmask=await prep(first,mask(r0,l),o),mattes=Array.from({length:n},(_,f)=>draw(qmask,first,o,f,n));qmask.release();
 for(const skin of Object.keys(A.skins)){
  const p=save(skin,on),bare=save(skin,W),before=JSON.stringify(p),b=api.selectVisual(bare,o),r=api.selectVisual(p,o),next=r?.pack.directions[direction];
  a(r?.ownRelic32Pants22);a.deepEqual({...next,layers:next.layers.slice(0,-1)},d);a.deepEqual(next.layers.at(-1),l);
  a.equal(r.plan,b.plan);a.deepEqual(r.relicEyes,b.relicEyes);a.deepEqual(r.colorAppearance,b.colorAppearance);a.equal(r.colorAppearance.skin,skin);
  a.equal(r.slotRoutes?.legs?.item,22);a.equal(r.slotRoutes?.weapon?.item,32);a.deepEqual(r.omitted,[]);
  a.deepEqual(r.pack.pivot,b.pack.pivot);a.equal(r.base.mirrorX,b.base.mirrorX);
  const qs=[]; for(const [x,s] of [[bare,b],[p,r]])qs.push(await prep(x,s,o));
  try{for(let f=0;f<n;f++){
   const off=draw(qs[0],bare,o,f,n),wear=draw(qs[1],p,o,f,n),m=mattes[f];a.equal(off.length,wear.length);a.equal(off.length,m.length);
   let changed=0;for(let j=0;j<off.length;j++){
    if(off[j]!==wear[j]){a(m[j]>>>24,'outside owned pants matte '+[direction,action,skin,f,j]);changed++;}
    a((wear[j]>>>24)>=(off[j]>>>24),'lost body alpha '+[direction,action,skin,f,j]);
   }
   a(changed>2000,'pants layer not visible');rendered++;
  }}finally{qs.forEach(q=>q.release());}
  a.equal(JSON.stringify(p),before);global.gc?.();
 }
 for(const [p,q] of [
  [first,{...o,direction:'north'}],[first,{...o,consumer:'inventory'}],[first,{...o,action:'attack-focus'}],[first,{...o,weaponless:true}],
  [{...first,classId:'strategist'},o],[save('light',{...on,boots:{def:9}}),o],[save('light',{...W,legs:{def:21}}),o],
  [save('light',{...on,legs:{def:22,variant:'alternate'}}),o],[save('light',{...on,weapon:{def:32,variant:'alternate'}}),o],
  [save('light',on,{hairStyle:'hair-spiky'}),o],[save('light',on,{eyeStyle:'face-calm'}),o]
 ])a(!api.selectVisual(p,q)?.ownRelic32Pants22);
 console.log(direction,action,n*Object.keys(A.skins).length);
}
a.equal(rendered,directions.length*17*8);console.log('PASS Relic32+P22 actual World',rendered,'saved native poses');
})().catch(e=>{console.error(e);process.exitCode=1;});
