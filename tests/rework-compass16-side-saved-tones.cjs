'use strict';const a=require('assert/strict'),p=require('path'),R=p.dirname(__dirname),{make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance'),J=require('../tools/rework-weapon-layers-hd/index.json'),load=require('../tools/rework-hd-test-loader.cjs').create(R),api=make();
const W='tools/rework-weapon-layers-hd/',asset=h=>W+'assets/'+h+'.png',raw=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data),N=160*4;
const saved=(skinColor,x={},e={},klass='strategist')=>JSON.parse(JSON.stringify(A.commit({id:'w16-normal',classId:klass,equipment:{weapon:{def:16},...e}},{skinColor,...x},()=>true)));
(async()=>{await api.ready;const vendor=global.ReworkAccessoryVendor,C=global.MareReworkWeaponNativeHD.create(J,{makeCanvas:cv.createCanvas,vendor});let checked=0,hCount=0,aCount=0,sCount=0;
for(const direction of ['east','west']){
 const opt={action:'attack-focus',direction,consumer:'world'},old=saved('light'),ref=api.selectVisual(old,opt),ranks=api.selectVisual(saved('ebony'),opt);a(!ref.w16SideTone&&ranks.w16SideTone);a.deepEqual(ref.states,ranks.states);
 a.equal(ref.contactTick,4);a.equal(ref.fps,12);a.deepEqual(ref.timeline,['0','1','2','3','4','5','6','7']);
 const maps=await Promise.all(ref.states.map(async (_,frame)=>new Map(await Promise.all(C.requiredFiles(ranks,{frame}).map(async u=>[u,await load(u)])))));
 const emit=(r,f)=>{const c=cv.createCanvas(N,N);C.render(c.getContext('2d'),r,maps[f],{frame:f});const b=raw(c);c.width=1;return b;};
 const noWeapon=r=>({...r,states:r.states.map(s=>({...s,layers:s.layers.filter(l=>l.id!=='equipment')}))}),base=ref.states.map((s,f)=>{
 const c=cv.createCanvas(N,N);c.getContext('2d').drawImage(maps[f].get(W+s.layers.find(l=>l.id==='equipment').url),0,0);
 return {full:emit(ref,f),bare:emit(noWeapon(ref),f),gear:raw(c)};
 });
 for(const t of Object.keys(A.skins)){
  const x=saved(t),before=JSON.stringify(x),r=api.selectVisual(x,opt);a.equal(!!r.w16SideTone,t!=='light');a.deepEqual(r.states,ref.states);a.deepEqual(r.timeline,ref.timeline);
  for(const action of ['attack','skill'])a.equal(api.selectVisual(x,{...opt,action})?.id,r.id);
  const q=await api.prepareConfiguration([{player:x,options:opt}]);try{for(let f=0;f<8;f++){
   const pixels=emit(r,f),body=emit(noWeapon(r),f),z=base[f];let c;a(q.draw({save(){},restore(){},drawImage(y){c=y}},x,{...opt,progress:(f+.2)/8}));a(raw(c).equals(pixels));
   const dy=[0,-1,0,0,1,1,1,1][f];for(const [xx,yy,,,,,rank] of global.MareReworkModularOutfitsHD.sideIrisSamples(direction)){
    const k=((yy+64+dy)*640+xx+64)*4,n=parseInt(A.eyes.blue.ramp[rank-1].slice(1),16);a.deepEqual([...pixels.subarray(k,k+4)],[n>>>16,n>>>8&255,n&255,255]);hCount++;
   }
   let changes=0,visible=0;
   for(let j=0;j<pixels.length;j+=4){
    a.equal(pixels[j+3],z.full[j+3]);a.equal(body[j+3],z.bare[j+3]);
    const v=pixels.readUInt32LE(j),old=z.full.readUInt32LE(j),g=z.gear.readUInt32LE(j),oldbody=z.bare.readUInt32LE(j),newbody=body.readUInt32LE(j);
    if(v!==old){a.notEqual(newbody,oldbody,'modified outside held body domain');changes++;}
    if(g&&old!==oldbody)visible++;
    if((g>>>24)===255&&g===old&&g!==oldbody){a.equal(v,g);aCount++;}
   }
   if(t==='light')a.equal(changes,0);else a(changes>2500);a(visible>100);sCount+=visible;checked++;
  }}finally{q.release();}
  a.equal(JSON.stringify(x),before);global.gc?.();
 }
 const x=saved('ebony');for(const [q,o] of [[x,{...opt,consumer:'portrait'}],[x,{...opt,weaponless:true}],[x,{...opt,action:'walk'}],[x,{...opt,direction:'north'}],[saved('ebony',{hairStyle:'hair-bob'}),opt],[saved('ebony',{eyeColor:'green'}),opt],[saved('ebony',{}, {coat:{def:151}}),opt],[saved('ebony',{}, {weapon:{def:16,variant:'other'}}),opt],[saved('ebony',{}, {},'healer'),opt]])a(!api.selectVisual(q,o)?.w16SideTone);
 console.log(direction,'PASS 64 actual World frames, exact alpha/iris and immutable equipment');
}
a.equal(checked,128);a(aCount>0&&sCount>0);console.log('PASS',checked,'static shades and phase checks; iris',hCount,'opaque gear',aCount,'visible gear',sCount);
})().catch(e=>{console.error(e);process.exitCode=1});
