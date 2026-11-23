'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),R=path.resolve(process.env.KAIZOKU_REPO||path.join(__dirname,'..'));
if(process.env.KAIZOKU_CANDIDATE){
 const Module=require('node:module'),f=R+'/player-rework-native-hd.js',m=new Module(f);
 m.filename=f;m.paths=Module._nodeModulePaths(R);require.cache[f]=m;
 m._compile(fs.readFileSync(process.env.KAIZOKU_CANDIDATE,'utf8'),f);m.loaded=true;
}
const {make}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance.js'),api=make();
const m=f=>require(R+'/'+f+'.js'),{items}=m('item-catalog').create({forge:m('forge-system'),prison:m('prison-system'),haki:m('haki-system'),akuma:m('akuma-system'),hakiProgression:m('haki-progression')});
const def=t=>({def:t});
function actor(tone,w,classId='healer'){
 return {classId,appearance96:A.normalize({gender:'masculino',hairColor:'black',eyeColor:'blue',skinColor:tone}),
  equipment:{weapon:w===null?null:def(w),legs:def(22)}};
}
const opts={consumer:'world',direction:'south',action:'walk'},hidden={...opts,action:'attack-unarmed',weaponless:true};
const parts=r=>r.plan.parts.map(q=>q.source.sha256);
function capture(b,p,o,f,ticks){
 let c;a(b.draw({save(){},restore(){},drawImage(image){c=image;}},p,{...o,progress:(f+.25)/ticks}));
 return Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
}
(async()=>{await api.ready;let selections=0,renders=0;
 a.equal(items[31].type,'healer');a.equal(items[125].type,'healer');a.equal(items[16].type,'strategist');
 for(const tone of Object.keys(A.skins))for(const action of ['idle','walk']){
  const [x,y,p]=[31,125,null].map(id=>actor(tone,id)),o={...opts,action},beforeX=JSON.stringify(x),beforeY=JSON.stringify(y);
  const r=api.selectVisual(x,o),s=api.selectVisual(y,o),u=api.selectVisual(p,hidden);
  a(r?.focusCarryP22&&s?.focusCarryP22&&u);
  a.deepEqual(r.pack,s.pack);a.deepEqual(r.colorAppearance,s.colorAppearance);
  a.notDeepEqual(parts(r),parts(s));
  for(const [entry,result] of [[x,r],[y,s]]){
   const w=entry.equipment.weapon.def,solo=api.selectVisual({...entry,equipment:{weapon:def(w)}},o);
   a.deepEqual(result.plan,solo.plan);a.equal(result.slotRoutes.weapon.source,solo.id);
   a.equal(result.slotRoutes.weapon.item,w);a.equal(result.slotRoutes.legs.item,22);
   a.equal(result.slotRoutes.legs.source,result.outfitOverlay.sourceRecord);
   a.deepEqual(result.omitted,[]);
   a(!api.selectVisual({...entry,classId:'strategist'},o)?.focusCarryP22,'same category, wrong exact class');
   a.deepEqual(api.selectVisual(entry,hidden),u);
  }
  a.deepEqual(r.slotRoutes.legs,s.slotRoutes.legs);
  a.equal(u.slotRoutes?.weapon,undefined);a.equal(u.equipment?.pants,22);
  a.deepEqual(api.selectVisual(x,o),r);a.deepEqual(api.selectVisual(y,o),s);
  a.equal(JSON.stringify(x),beforeX);a.equal(JSON.stringify(y),beforeY);selections+=2;
  if(process.env.SELECT_ONLY||tone!=='ebony'||action!=='walk')continue;
  const all=[r,s].flatMap(q=>[q,{...q,id:q.id+':parts-off-proof',plan:{...q.plan,parts:[]}}]);
  const bundles=[];
  try{
   for(const [i,source] of all.entries())bundles.push(await api.prepareConfiguration([{player:i<2?x:y,options:o,source}],{resolve:q=>q}));
   const frames=r.pack.directions.south.clip.frames;
   for(let f=0;f<frames;f++){
    const out=bundles.map((b,i)=>capture(b,i<2?x:y,o,f,frames));
    a(!out[0].equals(out[2]),'wearing different weapon must change rendered output');
    a(out[1].equals(out[3]),'removing only weapon/hand operations must leave same rendered body and trousers');
    renders++;
   }
  }finally{bundles.forEach(b=>b.release());global.gc?.();}
 }
 console.log('PASS independent weapon source and stable P22:',selections,'selections,',renders,'rendered South walk steps');
})().catch(e=>{console.error(e);process.exitCode=1});
