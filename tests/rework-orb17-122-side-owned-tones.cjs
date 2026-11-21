'use strict';
const a=require('node:assert/strict'),p=require('node:path'),crypto=require('node:crypto'),{make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance'),I=require('../tools/rework-weapon-layers-hd/index.json'),load=require('../tools/rework-hd-test-loader.cjs').create(p.resolve(__dirname,'..')),api=make();
const px=im=>{const c=cv.createCanvas(640,640),ctx=c.getContext('2d');ctx.drawImage(im,0,0);return Buffer.from(ctx.getImageData(0,0,640,640).data);};
const save=(tone,w,cl='strategist',more={})=>JSON.parse(JSON.stringify(A.commit({id:'orb-tested',classId:cl,equipment:{weapon:{def:w},...more}},{skinColor:tone},()=>true)));
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{await api.ready;let n=0;
for(const w of [17,122])for(const d of ['east','west']){
 const o={direction:d,action:'attack-focus',consumer:'world'},ref=I.orderedAttackProfiles.find(r=>r.id==='authored-orb-'+w+'-'+d),light=[];
 const eyes=global.MareReworkModularOutfitsHD.sideIrisSamples(d), shift=[0,-1,0,0,1,1,1,1];a.equal(eyes.length,18);
 const own=await Promise.all(ref.states.map(async s=>{
  const [,g,m]=s.layers;const [gear,restore]=await Promise.all([g,m.mask].map(async l=>px(await load('tools/rework-weapon-layers-hd/'+l.url))));const q=[];
  for(let j=0;j<gear.length;j+=4)if(gear[j+3]===255&&!restore[j])q.push([j,gear.readUInt32LE(j)]);
  a(q.length>0);return q;
 }));
 for(const tone of ['light',...Object.keys(A.skins).filter(k=>k!=='light')]){
  const saved=save(tone,w),before=JSON.stringify(saved),r=api.selectVisual(saved,o);a(r?.['orb'+w+'ApprovedPreview'],JSON.stringify({w,d,tone,source:r?.id}));a.equal(r.ownOrbSideTone,tone==='light'?undefined:tone);a.equal(r.fps,12);a.equal(r.contactTick,4);a.deepEqual(r.timeline,['0','1','2','3','4','5','6',...Array(13).fill('7')]);a.deepEqual(r.pivot,[80,128]);
  for(let f=0;f<8;f++)a.deepEqual(r.states[f].layers,ref.states[f].layers);
  const h=await api.prepareConfiguration([{player:saved,source:r,options:o}],{resolve:x=>x});
  const frames=new Set();
  for(let f=0;f<8;f++){
   let im;a(h.draw({save(){},restore(){},drawImage(i){im=i}},saved,{...o,progress:(f+.1)/20}));
   const pix=Buffer.from(im.getContext('2d').getImageData(0,0,640,640).data);
   for(const [j,data] of own[f])a.equal(pix.readUInt32LE(j),data);
   if(tone==='light')light[f]=pix;else{
    a.notEqual(digest(pix),digest(light[f]));for(let j=3;j<pix.length;j+=4)a.equal(pix[j],light[f][j]);
    for(const [x,y] of eyes){const j=((y+64+shift[f])*640+x+64)*4;a.equal(pix.readUInt32LE(j),light[f].readUInt32LE(j));}
   }
   frames.add(digest(pix));n++;
  }
  a.equal(frames.size,8);a.equal(JSON.stringify(saved),before);h.release();global.gc?.();console.log(w,d,tone,'128 contract');
 }
 for(const q of [save('ebony',w,'healer'),save('ebony',w,'strategist',{coat:{def:151}}),save('ebony',w,'strategist',{weapon:{def:w,variant:'other'}}),save('ebony',16)])a(!api.selectVisual(q,o)?.ownOrbSideTone);
 for(const q of [{direction:'north'},{direction:'south'},{action:'walk'},{consumer:'portrait'},{weaponless:true}])a(!api.selectVisual(save('ebony',w),{...o,...q})?.ownOrbSideTone);
}
a.equal(n,256);console.log('PASS',n);})().catch(e=>{console.error(e);process.exitCode=1;});
