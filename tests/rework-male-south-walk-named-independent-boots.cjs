'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),path=require('node:path');
const {make,cv}=require('./rework-integration-support.cjs');
const load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..'));
test('every own named male South walk head stays exact while fitting the authored boot',async()=>{
 const api=make(),A=MareCharacterAppearance;await api.ready;
 const masks=new Map(),styles=Object.keys(A.choices.hairStyle).filter(s=>s.startsWith('hair-'));
 a.equal(styles.length,12);
 const o={consumer:'world',direction:'south',action:'walk',x:256,y:405};
 const capture=async(p,pose)=>{let bc;a(await api.prepare(p,pose),JSON.stringify(api.snapshot()));a(api.draw({save(){},restore(){},drawImage(c){bc=c;}},p,pose));return new Uint32Array(bc.getContext('2d').getImageData(0,0,512,512).data.buffer);};
 let rendered=0;
 for(const hairStyle of styles){
  const skinColor=hairStyle==='hair-spiky'?'copper':hairStyle==='hair-long'?'ebony':'light';
  let p;A.commit({classId:'brawler',equipment:{boots:{def:9},head:null,weapon:null}},{...A.defaults,hairStyle,hairColor:'blue',skinColor},s=>{p=JSON.parse(JSON.stringify(s));return true;});
  const off={...p,equipment:{}},on=api.selectVisual(p,o),bare=api.selectVisual(off,o);
  a(on?.registeredPaletteBody);a.equal(on.headRecord.id,bare.headRecord.id);a.deepEqual(on.headLook,bare.headLook);
  a.deepEqual(on.colorAppearance,bare.colorAppearance);a.deepEqual(on.omitted,[]);a.equal(on.slotRoutes.boots.quality,'hd');
  a(!api.selectVisual(p,{...o,action:'idle'})?.registeredPaletteBody,'native named idle lower is not registered to these boots');
  const ds=on.pack.directions.south,boots=ds.layers.filter(l=>l.id.startsWith('boot9-'));
  for(let f=0;f<ds.clip.frames;f++){
   const pose={...o,progress:(f+.125)/ds.clip.frames},x=await capture(off,pose),y=await capture(p,pose);
   if(!masks.has(f)){
    const img=new Map(await Promise.all(boots.map(async l=>[l.frames[f],await load('tools/rework-modular-outfits-hd/assets/'+l.frames[f]+'.png')])));
    const tile=cv.createCanvas(512,512),ctx=tile.getContext('2d'),pack={...on.pack,directions:{south:{...ds,layers:boots}}};
    ReworkAccessoryVendor.compositor.render(ctx,pack,img,{direction:'south',frame:f,density:4});
    masks.set(f,new Uint32Array(ctx.getImageData(0,0,512,512).data.buffer));
   }
   let changed=0;const alpha=masks.get(f);
   for(let j=0;j<x.length;j++)if(x[j]!==y[j]){a(alpha[j]>>>24,hairStyle+'/'+f+' changed outside boot');changed++;}
   a(changed>100);rendered++;
  }
  for(const s of Object.keys(A.skins))a(api.selectVisual({...p,appearance96:{...p.appearance96,skinColor:s}},o)?.registeredPaletteBody);
 }
 a.equal(rendered,192);
});
