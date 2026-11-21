'use strict';
const a=require('node:assert/strict'),p=require('node:path'),crypto=require('node:crypto'),{make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance'),I=require('../tools/rework-weapon-layers-hd/index.json'),load=require('../tools/rework-hd-test-loader.cjs').create(p.resolve(__dirname,'..')),api=make();
const px=im=>{const c=cv.createCanvas(640,640),ctx=c.getContext('2d');ctx.drawImage(im,0,0);return Buffer.from(ctx.getImageData(0,0,640,640).data);};
const save=(tone,weapon,cl='healer',more={})=>JSON.parse(JSON.stringify(A.commit({id:'w31-ed',classId:cl,equipment:{weapon:{def:weapon},...more}},{skinColor:tone},()=>true)));
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{await api.ready;let n=0;
for(const d of ['east','west']){
 const o={direction:d,action:'attack-focus',consumer:'world'},ref=I.orderedAttackProfiles.find(r=>r.id==='authored-ordered-31-'+d),light=[];
 const own=await Promise.all(ref.states.map(async s=>{
  const [gear,...top]=await Promise.all(s.layers.slice(9).map(async l=>px(await load('tools/rework-weapon-layers-hd/'+l.url))));const q=[];
  for(let j=0;j<gear.length;j+=4)if(gear[j+3]===255&&top.every(l=>!l[j+3]))q.push([j,gear.readUInt32LE(j)]);
  a(q.length>0);return q;
 }));
 for(const tone of ['light',...Object.keys(A.skins).filter(k=>k!=='light')]){
  const saved=save(tone,31),before=JSON.stringify(saved),r=api.selectVisual(saved,o);a(r?.orderedAttack);a.equal(Boolean(r.ownW31Side),tone!=='light');a.equal(r.fps,12);a.equal(r.contactTick,4);a.deepEqual(r.timeline,ref.timeline);a.deepEqual(r.pivot,[80,128]);
  for(let f=0;f<8;f++)a.deepEqual(r.states[f].layers[9],ref.states[f].layers[9]);
  const h=await api.prepareConfiguration([{player:saved,source:r,options:o}],{resolve:x=>x});
  const frames=new Set();
  for(let f=0;f<8;f++){
   let im;a(h.draw({save(){},restore(){},drawImage(i){im=i}},saved,{...o,progress:(f+.21)/8}));
   const pix=Buffer.from(im.getContext('2d').getImageData(0,0,640,640).data);
   for(const [j,data] of own[f])a.equal(pix.readUInt32LE(j),data);
   if(tone==='light')light[f]=pix;else{a.notEqual(digest(pix),digest(light[f]));for(let j=3;j<pix.length;j+=4)a.equal(pix[j],light[f][j]);}
   frames.add(digest(pix));n++;
  }
  a.equal(frames.size,8);a.equal(JSON.stringify(saved),before);h.release();global.gc?.();console.log(d,tone,'own gear and all 8 native states');
 }
 for(const q of [save('ebony',31,'strategist'),save('ebony',31,'healer',{coat:{def:151}}),save('ebony',31,'healer',{weapon:{def:31,variant:'other'}}),save('ebony',16)])a(!api.selectVisual(q,o)?.ownW31Side);
 for(const q of [{direction:'north'},{direction:'south'},{action:'walk'},{consumer:'portrait'},{weaponless:true}])a(!api.selectVisual(save('ebony',31),{...o,...q})?.ownW31Side);
}
a.equal(n,128);console.log('PASS',n);})().catch(e=>{console.error(e);process.exitCode=1;});
