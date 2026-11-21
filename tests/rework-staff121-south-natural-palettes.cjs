'use strict';
const a=require('node:assert/strict'),p=require('node:path'),fs=require('node:fs'),C=require('node:crypto'),R=p.dirname(__dirname),{make,cv}=require('./rework-integration-support.cjs'),api=make(),A=require('../character-appearance'),load=require('../tools/rework-hd-test-loader.cjs').create(R),o={direction:'south',action:'attack-focus',consumer:'world'},prefix='tools/rework-weapon-layers-hd/';
const save=(tone,eq={weapon:{def:121}},cl='strategist')=>A.commit({id:'w121-south',classId:cl,equipment:eq},{skinColor:tone},()=>true),cv640=()=>cv.createCanvas(640,640),px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const capture=(actor,i)=>{let c;a(api.draw({save(){},restore(){},drawImage(s){c=s;}},actor,{...o,progress:(i+.25)/8}));a.equal(c.width,640);return c;};
(async()=>{await api.ready;const neutral=save('light'),r=api.selectVisual(neutral,o);a(r?.approvedFocusSouth&&r.staff121SouthSkin);a(await api.prepareClip(neutral,o));
const original=r.timeline.map((_,i)=>px(capture(neutral,i)));let count=0;const board=cv.createCanvas(900,700),g=board.getContext('2d');g.fillStyle='#304355';g.fillRect(0,0,900,700);
for(const tone of Object.keys(A.skins)){
 const actor=save(tone),q=api.selectVisual(actor,o);a(q?.approvedFocusSouth);a.equal(!!q.staff121SouthSkin,true);
 a.equal(q.fps,12);a.deepEqual(q.pivot,[80,128]);a.deepEqual(q.timeline,r.timeline);
 a(await api.prepareClip(actor,o));const fingerprints=new Set();
 for(let f=0;f<8;f++){
  const c=capture(actor,f),b=px(c),old=original[f];fingerprints.add(C.createHash('sha256').update(b).digest('hex'));let changed=0,signedGear=0;
  const s=q.states[f];a.equal(s.approved.sha256,r.states[f].approved.sha256);
  if(tone!=='light'){
   a.deepEqual(s.layers.map(x=>x.role),['body','gear','hand']);
   const layers=await Promise.all(s.layers.map(async x=>{const q=cv640();q.getContext('2d').drawImage(await load(prefix+x.url),0,0);const b=px(q);q.width=1;return b;}));
   const [skin,gear,hand]=layers;
   for(let i=0;i<b.length;i+=4){
    a.equal(b[i+3],old[i+3]);const delta=b.readUInt32LE(i)!==old.readUInt32LE(i);if(delta)changed++;
    if(gear[i+3]===255&&!hand[i+3]){a.equal(b.readUInt32LE(i),old.readUInt32LE(i));signedGear++;}
    if(gear[i+3]&&!hand[i+3]&&!skin[i+3]){for(let k=0;k<3;k++)a(Math.abs(b[i+k]-old[i+k])*b[i+3]/255<=1);}
   }a(changed>7000&&signedGear>0,JSON.stringify({tone,f,changed,signedGear}));
  }
  if(['light','ebony'].includes(tone)&&[0,4,7].includes(f)){
   const i=[0,4,7].indexOf(f),y=tone==='light'?0:350;g.drawImage(c,157,150,300,350,300*i,y,300,350);g.fillStyle='#fff';g.fillText(tone+' F'+f,300*i+6,y+13);
  }count++;
 }
 a.equal(fingerprints.size,8);
}
const x=save('ebony');
for(const t of [{consumer:'portrait'},{action:'idle'},{direction:'east'},{weaponless:true}])a(!api.selectVisual(x,{...o,...t})?.staff121SouthSkin);
for(const q of [save('ebony',{weapon:{def:31}}),save('ebony',{weapon:{def:121,variant:'other'}}),save('ebony',{weapon:{def:121},boots:{def:9}}),save('ebony',undefined,'gunner')])a(!api.selectVisual(q,o)?.staff121SouthSkin);
a.equal(count,64);if(process.env.PREVIEW_OUT)fs.writeFileSync(process.env.PREVIEW_OUT,board.toBuffer('image/png'));console.log('PASS 64 actual saved South renders, alpha and own shaft exact, no clock change.');
})().catch(e=>{console.error(e);process.exitCode=1;});
