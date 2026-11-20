'use strict';const p=require('node:path'),fs=require('node:fs'),a=require('node:assert/strict');
const {make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance.js');
const ds=['north','south','east','west'],ws=[12,13,71,72,73,74];
const original={gender:'feminino',skinColor:'original',hairStyle:'original',hairColor:'original',eyeColor:'original'};
const actual=A.normalize(original),edited=A.normalize({...original,skinColor:'ebony',hairColor:'pink',eyeColor:'green'});
const fixture=process.env.KAIZOKU_APPROVED_P22_FRAMES;
function capture(api,who,o,f){
 const c=cv.createCanvas(900,900),t=c.getContext('2d'),old=t.drawImage.bind(t);let raster;
 t.drawImage=(im,...x)=>{raster=im;return old(im,...x);};
 a(api.draw(t,who,{...o,x:440,y:700,progress:(f+.25)/8}));
 a.equal(raster.height,640);a.equal(raster.width,640);
 const pixels=Buffer.from(raster.getContext('2d').getImageData(0,0,640,640).data);c.width=c.height=0;return pixels;
}
async function expected(file){
 const c=cv.createCanvas(640,640),t=c.getContext('2d');t.drawImage(await cv.loadImage(file),0,0);
 return Buffer.from(t.getImageData(0,0,640,640).data);
}
(async()=>{
 const api=make();await api.ready;let frames=0,fixtureFrames=0;
 for(const direction of ds)for(const def of ws){
  const o={consumer:'world',action:'attack-daggers',direction};
  const source={appearance96:original,classId:'rogue',equipment:{weapon:{def}}};
  const equipped={...source,equipment:{...source.equipment,pants:{def:22}}};
  const base=api.selectVisual(source,o),alt=api.selectVisual(equipped,o);a(base);
  a(alt,'approved P22 overlay inactive '+def+' '+direction);a.notEqual(alt.id,base.id);
  a.deepEqual(alt.states,base.states);a.deepEqual(alt.pack.directions[direction].poses,base.pack.directions[direction].poses);a.deepEqual(alt.pack.directions[direction].clip,base.pack.directions[direction].clip);a.deepEqual(alt.pack.pivot,base.pack.pivot);
  const invalid=[{...equipped,appearance96:actual},{...equipped,appearance96:edited},
   {...equipped,equipment:{...equipped.equipment,pants:{def:22,variant:'other'}}},
   {...equipped,equipment:{...equipped.equipment,coat:{def:6}}}];
  for(const buyer of invalid)a.notEqual(api.selectVisual(buyer,o)?.id,alt.id);
  a.notEqual(api.selectVisual(equipped,{...o,consumer:'preview'})?.id,alt.id);
  for(let f=0;f<8;f++){
   const opt={...o,progress:(f+.25)/8};
   a(await api.prepareStablePose(source,opt));const x=capture(api,source,o,f);
   a(await api.prepareStablePose(equipped,opt),JSON.stringify(api.snapshot()));const y=capture(api,equipped,o,f);
   a(await api.prepareStablePose(source,opt));const z=capture(api,source,o,f);
   a(x.equals(z),'removing Calça 22 failed to restore Original');
   a(!x.equals(y),'equipping Calça 22 did not change the pose');
   let n=0;
   for(let i=0;i<x.length;i+=4)if(x.readUInt32LE(i)!==y.readUInt32LE(i)){const row=Math.floor(i/4/640);a(row>=290&&row<510,'visual delta outside body-clothing area');n++;}
   a(n>500);
   if(fixture){
    for(const [kind,got] of [['original',x],['preview',y]]){
     const dir=p.join(fixture,direction),file=p.join(dir,`${def}-${f}-${kind}.png`);
     const bytes=await expected(file);let max=0,over=0;
     for(let j=0;j<got.length;j++){const d=Math.abs(got[j]-bytes[j]);if(d>max)max=d;if(d>1)over++;}
     a.equal(over,0,direction+'/'+def+'/'+f+'/'+kind+' greater than 1 RGBA; max='+max);fixtureFrames++;
    }
   }
   frames++;
  }
  global.gc?.();
 }
 a.equal(frames,192);if(fixture)a.equal(fixtureFrames,384);
 console.log('P22s passes: 24 exact routes /',frames,'native equip-remove frame comparisons and',fixtureFrames,'approved preview fixture comparisons');
})().catch(e=>{console.error(e);process.exitCode=1});
