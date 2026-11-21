'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path'),{make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance');
const R=p.dirname(__dirname),I=require('../tools/rework-weapon-layers-hd/index.json'),load=require('../tools/rework-hd-test-loader.cjs').create(R),api=make(),o={action:'attack-focus',direction:'north',consumer:'world'};
const ctl=(tone,eq={weapon:{def:121}},cl='strategist',look={})=>JSON.parse(JSON.stringify(A.commit({id:'relicary121',classId:cl,equipment:eq},{skinColor:tone,...look},()=>true)));
const get=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const px=async url=>{const c=cv.createCanvas(640,640);c.getContext('2d').drawImage(await load('tools/rework-weapon-layers-hd/'+url),0,0);return get(c);};
(async()=>{await api.ready;
const stock=I.records.find(r=>r.id==='relicary121-north-original-base17-native-item-candidate');
const hw=global.MareReworkWeaponNativeHD.create(I,{vendor:global.ReworkAccessoryVendor,makeCanvas:cv.createCanvas});
const board=cv.createCanvas(1280,480),g=board.getContext('2d');g.fillStyle='#414c5b';g.fillRect(0,0,1280,480);g.imageSmoothingEnabled=false;
let n=0,gear=0,body=0;const bare=await px(stock.states[0].attachment.url),authority=new Map();
for(const tone of Object.keys(A.skins)){
 const saved=ctl(tone), r=api.selectVisual(saved,o);a(r?.staff121NorthOwnMaterial);a.equal(api.selectVisual(saved,{...o,action:'attack'})?.id,r.id);a.deepEqual(r.timeline,stock.timeline);a.equal(r.fps,12);a.deepEqual(r.pivot,stock.pivot);a(await api.prepareClip(saved,o));
 const att=await px(r.states[0].attachment.url); let own=0;
 for(let i=0;i<att.length;i+=4){
  a.equal(att[i+3],bare[i+3]);
  if(att.readUInt32LE(i)!==bare.readUInt32LE(i)){
   const x=i/4%640,y=Math.floor(i/4/640);
   a(x>=356&&x<=378&&y>=299&&y<=324, x+'/'+y);own++;
  }else if(att[i+3]&& (i/4%640<356||i/4%640>378))gear++;
 }
 a(own>=240&&own<=320,own);
 for(let i=0;i<8;i++){
  const at=r.states[i].attachment,bt=stock.states[i].attachment;
  for(const k of ['matrix','depth','sourceGrip','targetGrip','size'])a.deepEqual(at[k],bt[k]);
  const oldCanvas=cv.createCanvas(640,640), ims=new Map(await Promise.all(hw.requiredFiles(stock,{frame:i}).map(async x=>[x,await load(x)])));
  hw.render(oldCanvas.getContext('2d'),{...stock,colorAppearance:r.colorAppearance},ims,{frame:i});
  let out;a(api.draw({save(){},restore(){},drawImage(c){out=c;}},saved,{...o,progress:(i+.15)/8}));a.equal(out.width,640);
  const b=get(out),old=get(oldCanvas),[,,,,dx,dy]=at.matrix;let changes=0;
  for(let k=0;k<b.length;k+=4){
   a.equal(b[k+3],old[k+3]);
   if(b.readUInt32LE(k)!==old.readUInt32LE(k)){const x=k/4%640,y=Math.floor(k/4/640);a(x>=354+dx&&x<=380+dx&&y>=297+dy&&y<=326+dy);changes++;}
  }
  a(changes>0,changes);n++;
  if(tone==='light')authority.set(i,b);
  if(authority.has(i)&&tone!=='light'){const oo=authority.get(i);for(let k=0;k<b.length;k+=4){const x=k/4%640;if(x<340&&b.readUInt32LE(k)!==oo.readUInt32LE(k))body++;}}
  const part=['light','porcelain','ebony'].indexOf(tone);if(part>=0)g.drawImage(out,0,0,640,640,i*160,part*160,160,160);
 }
}
for(const v of [{consumer:'portrait'},{direction:'south'},{action:'idle'},{weaponless:true},{variant:'other'}])a(!api.selectVisual(ctl('ebony'),{...o,...v})?.staff121NorthOwnMaterial);
for(const q of [ctl('ebony',{weapon:{def:121},boots:{def:155}}),ctl('ebony',undefined,'healer'),ctl('ebony',undefined,'strategist',{hairColor:'brown'}),ctl('ebony',{weapon:{def:121,variant:'other'}})])a(!api.selectVisual(q,o)?.staff121NorthOwnMaterial,JSON.stringify(q));
a.equal(n,64);a(body>3000);a(gear>2000,gear);
if(process.env.PREVIEW_OUT)fs.writeFileSync(process.env.PREVIEW_OUT,board.toBuffer('image/png'));
console.log('PASS W121 North',n,'normal World ticks, unchanged existing attachment and body pose, guarded hardware',gear);
})().catch(e=>{console.error(e);process.exitCode=1});
