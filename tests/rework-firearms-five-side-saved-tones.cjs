'use strict';const a=require('assert/strict'),p=require('path'),R=p.dirname(__dirname),{make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance'),index=require('../tools/rework-weapon-layers-hd/index.json'),load=require('../tools/rework-hd-test-loader.cjs').create(R),api=make();
const asset='tools/rework-weapon-layers-hd/',id=def=>({def}),tones=Object.keys(A.skins),raw=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const actor=(def,skinColor,x={},equipment={},classId='gunner')=>JSON.parse(JSON.stringify(A.commit({id:'normal',classId,equipment:{weapon:id(def),...equipment}},{skinColor,...x},()=>true)));
(async()=>{await api.ready;const n=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas}),V=global.ReworkAccessoryVendor.compositor;let checked=0;
const ids=process.env.WEAPONS?.split(',').map(Number)||[4,5,113,115,116]; for(const item of ids)for(const direction of ['east','west']){
 const o={direction,action:'attack-firearm',consumer:'world'},light=actor(item,'light'),ref=api.selectVisual(light,o),orig=index.records.find(x=>x.id===ref.id.split(':')[0]);
 a(ref.ownedSideFirearmIris&&!ref.ownedFirearmSideTone);a.deepEqual(ref.states,orig.states);a.deepEqual(ref.basePack,orig.basePack);a.equal(ref.fps,12);a.equal(ref.timeline.length,8);
 const frames=await Promise.all(ref.states.map(async (_,frame)=>new Map(await Promise.all(n.requiredFiles(ref,{frame}).map(async u=>[u,await load(u)])))));
 const emit=(r,f,map=frames[f])=>{const c=cv.createCanvas(640,640);n.render(c.getContext('2d'),r,map,{frame:f});const b=raw(c);c.width=1;return b;};
 const without=(f,key)=>{const map=new Map(frames[f]),source=map.get(key);map.set(key,cv.createCanvas(source.width,source.height));return map;};
 const base=ref.states.map((s,f)=>{const at=s.attachment,pack=ref.basePack.pack,d=pack.directions[direction],under=d.layers.find(l=>l.id==='underbody'),body=n.requiredFiles(ref,{frame:f}).find(x=>x.endsWith((under.frames?.[f]||under.source)+'.png')),v=emit(ref,f);
  a(v.equals(emit(ref,f,without(f,body))),'generated backing has visible impact');
  const k=asset+at.url,c=cv.createCanvas(640,640),ctx=c.getContext('2d');ctx.transform(...at.matrix);if(at.mirrorX){ctx.translate(at.size[0],0);ctx.scale(-1,1);}ctx.drawImage(frames[f].get(k),0,0);return {pixels:v,gear:raw(c),bare:emit(ref,f,without(f,k)),k};});
 for(const t of tones){
  const x=actor(item,t),snapshot=JSON.stringify(x),r=api.selectVisual(x,o);a.equal(r?.id,ref.id);a.equal(r.colorAppearance.skin,t);a.equal(!!r.ownedFirearmSideTone,t!=='light');a.deepEqual(r.states,ref.states);
  a.equal(api.selectVisual(x,{...o,action:'attack'})?.id,r.id);
  const q=await api.prepareConfiguration([{player:x,options:o}]);try{for(let f=0;f<8;f++){
   const b=emit(r,f),z=base[f],body=emit(r,f,without(f,z.k));let c;a(q.draw({save(){},restore(){},drawImage(z){c=z}},x,{...o,progress:(f+.2)/8}));a(raw(c).equals(b));let moves=0,gear=0,visible=0;
   for(let j=0;j<b.length;j+=4){a.equal(b[j+3],z.pixels[j+3]);const v=b.readUInt32LE(j),old=z.pixels.readUInt32LE(j),g=z.gear.readUInt32LE(j),oldBody=z.bare.readUInt32LE(j),newBody=body.readUInt32LE(j);if(g&&old!==oldBody)visible++;if(old!==v){moves++;a(oldBody!==newBody,'modified outside body');}if((g>>>24)===255&&g===old&&g!==oldBody){a.equal(v,g);gear++;}}
   if(t==='light')a.equal(moves,0);else a(moves>1000);a(visible>50);checked++;
  }}finally{q.release();}a.equal(JSON.stringify(x),snapshot);global.gc?.();
 }
 const x=actor(item,'ebony');for(const [p,opts] of [[x,{...o,consumer:'portrait'}],[x,{...o,weaponless:true}],[x,{...o,action:'walk'}],[actor(item,'ebony',{eyeColor:'green'}),o],[actor(item,'ebony',{hairColor:'brown'}),o],[actor(item,'ebony',{}, {coat:id(151)}),o],[actor(item,'ebony',{}, {weapon:{def:item,variant:'other'}}),o],[actor(item,'ebony',{}, {},'sword'),o]])a(!api.selectVisual(p,opts)?.ownedFirearmSideTone);
 console.log('PASS',item,direction,64,'real saved phases');
}
a.equal(checked,ids.length*128);console.log('PASS',checked);
})().catch(e=>{console.error(e);process.exitCode=1});
