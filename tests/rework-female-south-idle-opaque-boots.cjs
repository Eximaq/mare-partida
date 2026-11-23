'use strict';
const path=require('node:path'),a=require('node:assert/strict'),R=process.env.STAGE||path.resolve(__dirname,'..'),r=f=>require(R+'/'+f);
const {make,cv}=r('tests/rework-integration-support.cjs'),A=r('character-appearance'),db=r('tools/rework-modular-outfits-hd/index.json'),load=r('tools/rework-hd-test-loader.cjs').create(R),{items}=r('item-catalog').create({forge:r('forge-system'),prison:r('prison-system'),haki:r('haki-system'),akuma:r('akuma-system'),hakiProgression:r('haki-progression')});
const dirs={north:[8,9,134,141,148,155,162,176,183],south:[8,9,134,141,148,155,162,169]};
const looks=[{skinColor:'light'},{skinColor:'ebony',hairStyle:'hair-cropped',hairColor:'blue'}],api=make();
const C=(w=512)=>cv.createCanvas(w,w),pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
async function draw(actor,options,source){
 const b=await api.prepareConfiguration([{player:actor,options,source}],{resolve:x=>x});
 try{let c;a.equal(b.coverage[0]?.frames,1,JSON.stringify(b.coverage));a(b.draw({save(){},restore(){},drawImage(q){c=q;}},actor,{...options,progress:.5}));return [c.width,pixels(c)];}
 finally{b.release();}
}
const options={consumer:'world',action:'idle',direction:'south'};
function unarmed(source,frontDepth){
 const d=source.pack.directions.south;
 const pack={...source.pack,directions:{south:{...d,layers:d.layers.map(l=>l.id.startsWith('boot')&&l.depth>0?{...l,depth:frontDepth}:l)}}};
 return {...source,id:source.id+':without-weapon:'+frontDepth,states:source.states.map(x=>({...x,parts:[]})),pack,baseRecord:{...source.baseRecord,pack}};
}
(async()=>{
 await api.ready;
 let proof=0,rendered=0;
 const lookMatrix=process.env.ALL_TONES?Object.keys(A.skins).map(skinColor=>skinColor==='ebony'?looks[1]:{skinColor}):looks;
 for(const look of lookMatrix){
  const actor=(boot,w=114)=>A.commit({classId:w==null?'gunner':items[w].type,equipment:{...(w==null?{}:{weapon:{def:w}}),...(boot==null?{}:{boots:{def:boot}})}},{gender:'feminino',...look},()=>true);
  const off=actor(null),base=api.selectVisual(off,options),[W,pristine]=await draw(off,options,base);
  a.equal(W,512);
  const c=C(),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
  for(const f of base.states[0].parts){
   ctx.save();ctx.transform(...f.matrix);a(!f.sourceClip);ctx.drawImage(await load(f.url),0,0);ctx.restore();
  }
  const weapon=pixels(c);c.width=1;
  for(const boot of dirs.south){
   const on=actor(boot),saved=JSON.stringify(on),source=api.selectVisual(on,options);
   a(source?.id.endsWith(':opaque-foreground'),'missing signed contact: '+boot);
   a.deepEqual(source.states,base.states);a.deepEqual(source.colorAppearance,base.colorAppearance);a.deepEqual(source.omitted,[]);
   a.equal(source.slotRoutes.boots.item,boot);a.equal(source.slotRoutes.weapon.item,114);
   a.deepEqual(source.pack.pivot,base.pack.pivot);a.deepEqual(source.pack.directions.south.clip,base.pack.directions.south.clip);
   const donor=db.records.find(x=>x.id===`frozen-v47-female-151-boot${boot}-south-idle`),
    own=donor.pack.directions.south.layers.filter(l=>l.id.startsWith('boot'+boot+'-'));
   a.deepEqual(source.pack.directions.south.layers,[...base.pack.directions.south.layers,...own.map(l=>l.depth===45?{...l,depth:2.01}:l)]);
   const mask=C(),mc=mask.getContext('2d');
   for(const l of own)mc.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+l.source+'.png'),0,0);
   const b=pixels(mask);mask.width=1;
   const [,result]=await draw(on,options,source),[,native]=await draw(on,options,unarmed(source,2.01)),[,signed]=await draw(on,options,unarmed(source,45));
   a(native.equals(signed),'naked front/rear read, calf or sole changed at native depth');
   let contacts=0,sole=0,changed=0;
   for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const i=(y*512+x)*4, bootPixel=b[i+3];
    if(weapon[i+3]){
     a.equal(result.readUInt32LE(i),pristine.readUInt32LE(i),'full weapon support must be byte-identical');
     if(bootPixel){a.equal(weapon[i+3],255);a(y<=345);contacts++;}
    }
    if(!bootPixel)a.equal(result.readUInt32LE(i),pristine.readUInt32LE(i),'unowned body or personalization pixel changed');
    else {
     for(let oy=-2;oy<=2;oy++)for(let ox=-2;ox<=2;ox++){
      const w=weapon[((y+oy)*512+x+ox)*4+3];a(w===0||w===255,'uncertain blending near contact');
     }
     if(y>=430){a.equal(result.readUInt32LE(i),signed.readUInt32LE(i),'sole must match original signed boot');sole++;}
     if(result.readUInt32LE(i)!==pristine.readUInt32LE(i))changed++;
    }
   }
   a(contacts>0&&sole>0&&changed>100);a.equal(JSON.stringify(on),saved);proof+=contacts;rendered++;
   global.gc?.();
  }
  a(pristine.equals((await draw(off,options,api.selectVisual(off,options)))[1]));
  a(!api.selectVisual(actor(134,74),options)?.id.includes(':opaque-foreground'),'semi-transparent contact must stay unresolved');
 }
 a.equal(rendered,lookMatrix.length*dirs.south.length);
 console.log('PASS',rendered,'exact South opaque overlaps,',proof,'pixel witnesses');
})().catch(e=>{console.error(e);process.exitCode=1;});
