'use strict';const a=require('assert/strict'),p=require('path'),R=p.dirname(__dirname),{make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance'),index=require('../tools/rework-weapon-layers-hd/index.json'),load=require('../tools/rework-hd-test-loader.cjs').create(R),api=make();
const opt={direction:'north',action:'attack-firearm',consumer:'world'},id=def=>({def}),tones=Object.keys(A.skins),raw=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const saved=(def,skinColor,x={},equipment={},classId='gunner')=>JSON.parse(JSON.stringify(A.commit({id:'normal',classId,equipment:{weapon:id(def),...equipment}},{skinColor,...x},()=>true)));
const slot=(x,o=opt)=>api.selectVisual(x,o);
(async()=>{await api.ready;const native=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});let checked=0,phases=0,opaqueTotal=0;
for(const item of [5,116]){
 const light=saved(item,'light'),ref=slot(light),original=index.records.find(x=>x.id===ref.id),ordinary=saved(item,'light',{},{weapon:id(item)});
 a.deepEqual(ref.states,original.states);a.equal(ref.fps,24);a.equal(ref.timeline.length,48);a.equal(ref.states.length,3);
 const maps=await Promise.all(ref.states.map(async (_,frame)=>new Map(await Promise.all(native.requiredFiles(ref,{frame}).map(async u=>[u,await load(u)])))));
 const emit=(r,f)=>{const c=cv.createCanvas(640,640);native.render(c.getContext('2d'),r,maps[f],{frame:f});const b=raw(c);c.width=1;return b;};
 const base=ref.states.map((_,f)=>emit(ref,f));const protect=ref.states.map((s,f)=>{const c=cv.createCanvas(640,640),cx=c.getContext('2d'),get=l=>maps[f].get('tools/rework-weapon-layers-hd/'+l.url);cx.drawImage(get(s.layers[1]),0,0);cx.globalCompositeOperation='destination-out';for(const l of s.layers.slice(2))cx.drawImage(get(l),0,0);return raw(c);});
 const masks=ref.states.map((s,f)=>s.layers.filter(l=>l.paletteMask).map(l=>{const c=cv.createCanvas(640,640),x=c.getContext('2d');x.drawImage(maps[f].get('tools/rework-weapon-layers-hd/'+l.paletteMask.url),0,0);return raw(c);}));
 for(const tone of tones){
  const x=saved(item,tone),save=JSON.stringify(x),r=slot(x);a.equal(r?.id,ref.id);a.equal(r.colorAppearance.skin,tone);a.deepEqual(r.states,ref.states);a.deepEqual(r.timeline,ref.timeline);
  a.equal(slot(x,{...opt,action:'attack'})?.id,r.id);
  const q=await api.prepareConfiguration([{player:x,options:opt}]),real=[];
  try{
  for(let f=0;f<3;f++){const b=emit(r,f),z=base[f],own=protect[f];let changes=0,gear=0;
   for(let i=0;i<b.length;i+=4){a.equal(b[i+3],z[i+3]);if(b.readUInt32LE(i)!==z.readUInt32LE(i)){a(masks[f].some(m=>m[i]));changes++;}if(own[i+3]===255){a.equal(b.readUInt32LE(i),z.readUInt32LE(i));a.equal(b.readUInt32LE(i),own.readUInt32LE(i));gear++;}}
   if(tone==='light')a.equal(changes,0);else a(changes>1000);opaqueTotal+=gear;real.push(b);phases++;
  }
  for(let k=0;k<48;k++){let c;a(q.draw({save(){},restore(){},drawImage(z){c=z}},x,{...opt,progress:(k+.2)/48}));a(raw(c).equals(real[Number(r.timeline[k])]));checked++;}
  }finally{q.release();}
  a.equal(JSON.stringify(x),save);global.gc?.();
 }
 const newTone=saved(item,'ebony');
 for(const [x,o] of [[newTone,{...opt,consumer:'portrait'}],[newTone,{...opt,weaponless:true}],[newTone,{...opt,direction:'south'}],[newTone,{...opt,action:'walk'}],[saved(item,'ebony',{eyeColor:'green'}),opt],[saved(item,'ebony',{hairColor:'brown'}),opt],[saved(item,'ebony',{}, {weapon:{def:item,variant:'other'}}),opt],[saved(item,'ebony',{}, {coat:id(151)}),opt],[saved(item,'ebony',{}, {},'sword'),opt]])a.notEqual(slot(x,o)?.id,ref.id);
 console.log('PASS',item,8*48,'real North ticks');
}
a(opaqueTotal>0);a.equal(checked,768);a.equal(phases,48);console.log('PASS',checked,phases);
})().catch(e=>{console.error(e);process.exitCode=1});
