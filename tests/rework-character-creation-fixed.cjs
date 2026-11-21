'use strict';
const a=require('node:assert/strict'),C=require('node:crypto'),{make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance.js');
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const hash=c=>C.createHash('sha256').update(pixels(c)).digest('hex');
const looks=[{}, {hairStyle:'hair-bob',hairColor:'pink',eyeStyle:'face-almond',eyeColor:'green',skinColor:'ebony'},{hairStyle:'hair-wavy',hairColor:'silver',eyeStyle:'original',eyeColor:'amber',skinColor:'warm'}];
(async()=>{
 const api=make();await api.ready;const c=cv.createCanvas(320,256),cx=c.getContext('2d');let count=0;
 const sheet=cv.createCanvas(1280,1536),g=sheet.getContext('2d');g.fillStyle='#243449';g.fillRect(0,0,sheet.width,sheet.height);
 for(const gender of ['masculino','feminino'])for(const direction of ['north','south','east','west']){
  const actual=new Set;
  for(const cosmetic of looks){
   const player={classId:'sword',factionId:'pirate',appearance96:A.normalize({gender,...cosmetic}),equipment:{coat:{def:6}}};
   const saved=JSON.stringify(player), o={action:'idle',direction,time:0,consumer:'character-creation'};
   const r=api.selectVisual(player,o);a(r?.id.startsWith((gender==='masculino'?'male':'female')+'-torso6-'+direction+'-frozen-idle-native:'));
   a(await api.prepareStablePose(player,o));cx.clearRect(0,0,320,256);
   a(api.draw(cx,player,{...o,x:160,y:232,previewFit:'creation'}));a.equal(c.width,320);a.equal(c.height,256);
   const snap=api.snapshot().last; a.equal(snap.source,r.id);a.equal(snap.consumer,'character-creation');a(snap.physicalScale>0&&snap.physicalScale<1);
   const rgba=pixels(c);
   let x0=320,x1=0,y0=256,y1=0,n=0;
   for(let i=3;i<rgba.length;i+=4){if(rgba[i]<8)continue;const p=i>>2,x=p%320,y=(p/320)|0;n++;x0=Math.min(x,x0);x1=Math.max(x,x1);y0=Math.min(y,y0);y1=Math.max(y,y1);}
   a(n>5000&&x0>=50&&x1<=270&&y0>=35&&y1<=249&&y1-y0>=172,JSON.stringify({direction,gender,n,x0,x1,y0,y1}));
   const dirs=['north','south','east','west'];const col=dirs.indexOf(direction),row=(gender==='feminino'?3:0)+looks.indexOf(cosmetic);
   g.drawImage(c,320*col,256*row);g.fillStyle='#fff';g.fillText(gender+' '+direction+' '+(cosmetic.hairStyle||'original'),320*col+14,256*row+18);
   actual.add(hash(c));a.equal(JSON.stringify(player),saved);count++;
  }
  a.equal(actual.size,3,'different drafts must change appearance');
 }
 const q={classId:'sword',appearance96:A.normalize({gender:'masculino'}),equipment:{coat:{def:6}}},ui={action:'idle',direction:'south',consumer:'appearance-preview'};
 a(await api.prepareStablePose(q,ui));const profile=cv.createCanvas(320,256);
 a(api.draw(profile.getContext('2d'),q,{...ui,previewFit:'creation',preview:true}));a.equal(api.snapshot().last.physicalScale,1);a(profile.width>320);a(profile.height>256);
 const world=cv.createCanvas(320,256);
 a(api.draw(world.getContext('2d'),q,{...ui,consumer:'world',previewFit:'creation',x:160,y:232}));a.equal(api.snapshot().last.physicalScale,105/374);a.equal(world.width,320);a.equal(world.height,256);
 a.equal(count,24);if(process.env.PREVIEW_OUT)require('node:fs').writeFileSync(process.env.PREVIEW_OUT,sheet.toBuffer('image/png'));console.log('PASS 24 validated native C6 creation poses at fixed 320x256, no clipping, distinct drafts, profile/world scale unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
