'use strict';
const a=require('node:assert/strict'),{make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance');
const I=require('../tools/rework-weapon-layers-hd/index.json'),load=require('../tools/rework-hd-test-loader.cjs').create(require('node:path').resolve(__dirname,'..'));
const api=make(),Z='tools/rework-weapon-layers-hd/';
const save=(def,skin,cl='gunner',other={},cos={})=>JSON.parse(JSON.stringify(A.commit({classId:cl,equipment:{weapon:{def},...other}},{skinColor:skin,...cos},()=>true)));
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const pixel=async url=>{const t=cv.createCanvas(640,640),x=t.getContext('2d');x.drawImage(await load(Z+url),0,0);const b=pix(t);t.width=1;return b;};
(async()=>{await api.ready;let n=0,frames=0,armorWitness=0;for(const item of [114])for(const direction of ['east','west']){
 const opts={action:'attack',direction,consumer:'world'},old=I.records.find(r=>r.id==='pistolas'+item+'-'+direction+'-native-original-source');
 const neutral=save(item,'light'),r0=api.selectVisual(neutral,opts);a(r0?.ownW114SideTone);a.equal(r0.fps,12);a.deepEqual(r0.timeline,old.timeline);
 const refs=await Promise.all(r0.states.map(async(s,i)=>{const v=await pixel(old.states[i].approved.url),m=await pixel(s.staffSouthRanks);
  const p=[];let hair=0,eyes=0,gear=0;
  for(let k=0;k<m.length;k+=4){const r=m[k];a(r<=15);if(r){a(v[k+3]>0);p.push([k,r]);if(r>=11)eyes++;else if(r>=6)hair++;}else if(k/4/640>229&&(v[k+3]>0))gear++;}
  a.equal(hair,4040);a.equal(eyes,18);a(gear>3000);armorWitness+=gear;return {v,m,p};}));
 for(const tone of Object.keys(A.skins)){
  const player=save(item,tone),before=JSON.stringify(player),r=api.selectVisual(player,opts);a.equal(r?.ownW114SideTone,tone);a.equal(r.fps,12);a.deepEqual(r.pivot,[80,128]);a.deepEqual(r.timeline,old.timeline);
  a.equal(api.selectVisual(player,{...opts,action:'attack-firearm'})?.id,r.id);
  a(await api.prepareClip(player,opts));
  const copies=[],ramp=[...A.skins[tone].ramp,...A.hairs.black.ramp,...A.eyes.blue.ramp].map(x=>Buffer.from(x.slice(1),'hex'));
  for(let tick=0;tick<8;tick++){
   let c;a(api.draw({save(){},restore(){},drawImage(x){c=x}},player,{...opts,progress:(tick+.1)/8}));a.equal(c.width,640);
   const x=pix(c),phase=Number(old.timeline[tick]);n++;
   if(copies[phase]){a(x.equals(copies[phase]));continue;}
   copies[phase]=x;frames++;
   const {v,m,p}=refs[phase];let count=0;
   for(let k=0;k<x.length;k+=4){
    a.equal(x[k+3],v[k+3],'alpha phase '+phase+'/'+k);
    if(!m[k])a.equal(x.readUInt32LE(k),v.readUInt32LE(k),'outside exact source material '+[item,direction,phase,k].join('/'));
    if(x.readUInt32LE(k)!==v.readUInt32LE(k))count++;
   }
   for(const [k,s] of p)if(x[k+3]===255)a.deepEqual(x.subarray(k,k+3),ramp[s-1]);
   a(count>6000);
  }
  a.equal(JSON.stringify(player),before);
 }
 const x=save(item,'ebony');
 for(const opt of [{consumer:'portrait'},{direction:'north'},{direction:'south'},{action:'walk'},{weaponless:true},{variant:'different'}])a(!api.selectVisual(x,{...opts,...opt})?.ownW114SideTone);
 for(const p of [save(item,'ebony','cyborg'),save(item,'ebony','gunner',{coat:{def:151}}),save(item,'ebony','gunner',{weapon:{def:item,variant:'special'}}),save(item,'ebony','gunner',{}, {eyeStyle:'face-almond'})])a(!api.selectVisual(p,opts)?.ownW114SideTone);
 const colors={hairColor:'blue',eyeColor:'green'},colored=save(item,'ebony','gunner',{},colors);
 const signed=api.selectVisual(colored,{...opts,action:'attack-firearm'});
 a.deepEqual(signed?.pistolColors,{hair:'blue',eyes:'green'});a.notEqual(signed.id,r0.id);
 const bundle=await api.prepareConfiguration([{player:colored,options:{...opts,action:'attack-firearm'}}]);
 try{
  const ramp=[...A.skins.ebony.ramp,...A.hairs.blue.ramp,...A.eyes.green.ramp].map(s=>Buffer.from(s.slice(1),'hex'));
  for(let i=0;i<8;i++){
   let image;a(bundle.draw({save(){},restore(){},drawImage(c){image=c;}},colored,{...opts,action:'attack-firearm',progress:(i+.25)/8}));
   const rendered=pix(image),{v,m,p}=refs[i];
   for(const [at,rank] of p)if(v[at+3]===255)a.deepEqual(rendered.subarray(at,at+3),ramp[rank-1]);
   for(let j=0;j<v.length;j+=4)if(!m[j])a.equal(rendered.readUInt32LE(j),v.readUInt32LE(j));
  }
 }finally{bundle.release();}
 console.log(item,direction,'PASS 64 native ticks, separate SHA source palette only');global.gc?.();
}
a.equal(n,128);a.equal(frames,128);console.log('PASS',n,frames,armorWitness);
})().catch(e=>{console.error(e);process.exitCode=1;});
