'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {make,cv}=require('./rework-integration-support.cjs');

test('dark skin reaches the lower limbs on every native walking frame',async()=>{
 const native=make();
 await native.ready;
 for(const gender of ['masculino','feminino'])for(const direction of ['south','north','east','west']){
  const player={appearance96:{gender,hairStyle:'original',hairColor:'original',skinColor:'dark',eyeStyle:'original',eyeColor:'original'},equipment:{}};
  const options={action:'walk',direction,x:140,y:210};
  const source=native.select(player,options);
  assert(source,gender+'/'+direction);
  const clip=source.pack.directions[direction].clip;
  assert(await native.prepareClip(player,options));
  for(let frame=0;frame<clip.frames;frame++){
   const context=cv.createCanvas(280,240).getContext('2d');
   assert(native.draw(context,player,{...options,progress:(frame+.25)/clip.frames}));
   assert.equal(native.snapshot().last.frame,frame);
   const data=context.getImageData(80,182,120,30).data;
   let residual=0,dark=0;
   for(let i=0;i<data.length;i+=4){
    const [r,g,b,a]=data.subarray(i,i+4);
    if(a<200)continue;
    if(r>170&&r>g*1.23&&g>b*1.15)residual++;
    if(r>50&&r<=162&&r>g*1.23&&g>b*1.1)dark++;
   }
   const label=gender+'/'+direction+'/'+frame;
   assert.equal(residual,0,label+': light pixels in lower limbs');
   assert(dark>10,label+': dark skin absent');
  }
 }
});
