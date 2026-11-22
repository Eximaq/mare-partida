'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path');
const R=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..'));
if(process.env.KAIZOKU_CANDIDATE){
 const Module=require('node:module'),f=R+'/player-rework-native-hd.js',m=new Module(f);
 m.filename=f;m.paths=Module._nodeModulePaths(R);require.cache[f]=m;
 m._compile(fs.readFileSync(process.env.KAIZOKU_CANDIDATE,'utf8'),f);m.loaded=true;
}
const {make}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance.js'),n=make();
const W=require(R+'/paper-doll-96-lobby.js'),cat=require(R+'/tools/paper-doll-96-v3/weapons.json');
const original=id=>({def:id});
const north=process.env.DIRECTION==='north',ticks=north?8:30;
const o={direction:north?'north':'south',action:'attack-firearm',consumer:'world'};
const draw=(b,x,i)=>{let c;a(b.draw({save(){},restore(){},drawImage(image){c=image;}},x,{...o,progress:(i+.25)/ticks}));
 return Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);};
(async()=>{await n.ready;
 for(const skinColor of ['light','ebony']){
  const appearance96=A.normalize({gender:'masculino',hairColor:'black',eyeColor:'blue',skinColor});
  const actor=(equipment)=>({classId:'gunner',appearance96,equipment:{weapon:original(114),...equipment}});
  const cases=north?[
   [{legs:original(21),boots:original(9),coat:original(151)},{legs:original(21),boots:original(9)},['coat']],
   [{legs:original(182),boots:original(9)},{boots:original(9)},['legs']],
   [{legs:original(182)},{},['legs']]
  ]:[
   [{legs:original(22),boots:original(9),coat:original(151),gloves:original(26)},
    {legs:original(22),boots:original(9)},['coat','gloves']],
   [{legs:original(182),boots:original(9)}, {boots:original(9)},['legs']],
   [{legs:original(182)}, {},['legs']]
  ];
  for(const [all,kept,missing] of cases){
   const x=actor(all),y=actor(kept),before=JSON.stringify(x),r=n.selectVisual(x,o),ref=n.selectVisual(y,o);
   a.equal(r?.slotFallback,'signed-pose-omit','missing class-specific visual must not downgrade the equipped firearm');
   a.deepEqual(r.omitted.slice().sort(),missing);a.deepEqual(r.states,ref.states);a.deepEqual(r.timeline,ref.timeline);a.deepEqual(r.colorAppearance,ref.colorAppearance);
   for(const [key,v] of Object.entries(kept))a.deepEqual(r.slotRoutes[key],ref.slotRoutes[key]);
   for(const key of missing)a.deepEqual(r.slotRoutes[key],{item:all[key].def,quality:'missing',reason:'no-signed-pose-pass'});
   a.equal(r.slotRoutes.weapon.item,114);a.equal(r.slotRoutes.weapon.quality,'hd');
   for(const action of ['attack','skill'])a.deepEqual(W.selectWorldHD(n,cat,x,{...o,action}),r);
   const forged={...r,omitted:[...r.omitted,'weapon'],slotRoutes:{...r.slotRoutes,weapon:{item:114,quality:'missing',reason:'no-signed-pose-pass'}}};
   const invalid={selectVisual:(_p,opts)=>opts.action==='attack-firearm'?forged:null};
   a.equal(W.selectWorldHD(invalid,cat,x,{...o,action:'attack'}),null);
   a.equal(JSON.stringify(x),before);
   if(process.env.SELECT_ONLY==='1')continue;
   const c0=await n.prepareConfiguration([{player:y,options:o}]),c1=await n.prepareConfiguration([{player:x,options:o}]);
   try{a.deepEqual(c1.coverage[0].omitted.slice().sort(),missing);for(let i=0;i<ticks;i++)a(draw(c0,y,i).equals(draw(c1,x,i)));}finally{c0.release();c1.release();global.gc?.();}
  }
  a(!n.selectVisual(actor({legs:{def:182,variant:'other'}}),o)?.slotFallback);
  a.equal(n.selectVisual(actor({legs:original(182),boots:original(9)}),{...o,direction:'east'})?.slotRoutes?.boots?.item,9);
  a(!n.selectVisual(actor({legs:original(182)}),{...o,consumer:'portrait'})?.slotFallback);
  a(!n.selectVisual(actor({legs:original(182)}),{...o,weaponless:true})?.slotFallback);
  console.log('PASS W114',o.direction,skinColor,process.env.SELECT_ONLY==='1'?'metadata only':(ticks*3)+' exact rendered ticks','pending slots preserved as missing; proof outside omitted slots byte-identical');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
