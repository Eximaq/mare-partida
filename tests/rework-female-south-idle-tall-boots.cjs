'use strict';
const path=require('node:path'),a=require('node:assert/strict'),R=process.env.STAGE||path.resolve(__dirname,'..'),r=f=>require(R+'/'+f);
const {make,cv}=r('tests/rework-integration-support.cjs'),A=r('character-appearance'),db=r('tools/rework-modular-outfits-hd/index.json'),load=r('tools/rework-hd-test-loader.cjs').create(R),{items}=r('item-catalog').create({forge:r('forge-system'),prison:r('prison-system'),haki:r('haki-system'),akuma:r('akuma-system'),hakiProgression:r('haki-progression')});
const dirs={south:[176,183]};
const looks=[{skinColor:'light'},{skinColor:'ebony',hairStyle:'hair-cropped',hairColor:'blue'}],api=make();
const C=(w=512)=>cv.createCanvas(w,w),pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
async function draw(actor,options,source){
 const b=await api.prepareConfiguration([{player:actor,options,source}],{resolve:x=>x});
 try{let c;a.equal(b.coverage[0]?.frames,1,JSON.stringify(b.coverage));a(b.draw({save(){},restore(){},drawImage(q){c=q;}},actor,{...options,progress:.5}));return [c.width,pixels(c)];}
 finally{b.release();}
}
(async()=>{
 await api.ready;
 for(const [direction,boots] of Object.entries(dirs)){
  const options={consumer:'world',direction,action:'idle'};
  let tested=0;
  for(const look of looks){
   const projections=new Map();
   const registry={};
   for(const item of [176,183]){
    const guard=A.commit({classId:items[114].type,equipment:{weapon:{def:114},boots:{def:item}}},{gender:'feminino',...look},()=>true);
    a(!api.selectVisual(guard,options)?.id.includes(':opaque-foreground'),'tall shaft outside opaque proof');
   }
   for(const w of Object.keys(items).map(Number).filter(i=>['brawler','strategist','sword','rogue','cyborg','healer','gunner'].includes(items[i]?.type))){
    const actor=(boot)=>A.commit({classId:items[w].type,equipment:{weapon:{def:w},boots:boot==null?null:{def:boot}}},{gender:'feminino',...look},()=>true);
    const off=actor(null),base=api.selectVisual(off,options);
    if(base?.hdKind!=='female-equipment')continue;
    const parts=base.states?.[0]?.parts||[];
    const outcomes=boots.map(boot=>[boot,api.selectVisual(actor(boot),options)]).filter(([,s])=>s?.id.includes(':pose-own-female-idle-boot:'));
    if(!outcomes.length)continue;
    const [width,pre]=await draw(off,options,base),pad=(width-512)/2;
    a.equal(width,512+2*(base.paddingPhysical||0));
    for(const [boot,source] of outcomes){
     const on=actor(boot),saved=JSON.stringify(on),donor=db.records.find(x=>x.id===`frozen-v47-female-151-boot${boot}-${direction}-idle`),
      own=donor.pack.directions[direction].layers.filter(l=>l.id.startsWith('boot'+boot+'-'));
     a.deepEqual(source.states,base.states);a.deepEqual(source.colorAppearance,base.colorAppearance);
     a.deepEqual(source.omitted,[]);a.equal(source.slotRoutes.weapon.item,w);a.equal(source.slotRoutes.boots.item,boot);
     const {layers,...geometry}=source.pack.directions[direction],d=base.pack.directions[direction];
     a.deepEqual(geometry,Object.fromEntries(Object.entries(d).filter(([k])=>k!=='layers')));a.deepEqual(layers,[...d.layers,...own]);
     
     if(!registry[boot])registry[boot]=await Promise.all(own.map(l=>load('tools/rework-modular-outfits-hd/assets/'+l.source+'.png')));
     const maskC=C(),mc=maskC.getContext('2d'),out=C(width),oc=out.getContext('2d');
     const bootImages=registry[boot];bootImages.forEach(im=>mc.drawImage(im,0,0));
     let alpha=pixels(maskC), changed=0;
     const nakedActor=A.commit({classId:'brawler',equipment:{boots:{def:boot}}},{gender:'feminino',...look},()=>true),
      nakedSource=api.selectVisual(nakedActor,options);
     a(nakedSource?.authoredPantsLayer&&nakedSource.authoredPantsLayer.item==null&&!nakedSource.equipment.pants);
     const [,ownBoot]=await draw(nakedActor,options,nakedSource);
     const nativeWeaponAlpha=new Uint8Array(512*512);
      for(const part of parts){
       const key=JSON.stringify([part.url,part.matrix,part.sourceClip]);
       if(!projections.has(key)){
        const P=C(),pc=P.getContext('2d');pc.imageSmoothingEnabled=false;pc.transform(...part.matrix);
        if(part.sourceClip){pc.beginPath();pc.rect(...part.sourceClip);pc.clip();}
        pc.drawImage(await load(part.url),0,0);
        projections.set(key,pixels(P));P.width=1;
       }
       const weapon=projections.get(key);
       for(let i=3;i<alpha.length;i+=4)if(weapon[i]){a.equal(alpha[i],0,'measured native weapon and boot share a pixel');nativeWeaponAlpha[i>>>2]=1;}
      }
     const [resultWidth,result]=await draw(on,options,source);a.equal(resultWidth,width);
     own.forEach((l,i)=>{if(l.depth<0)oc.drawImage(bootImages[i],pad,pad);});
     const copy=C(width),cc=copy.getContext('2d'),tile=cc.createImageData(width,width);tile.data.set(pre);cc.putImageData(tile,0,0);
     oc.drawImage(copy,0,0);own.forEach((l,i)=>{if(l.depth>0)oc.drawImage(bootImages[i],pad,pad);});
     const expected=pixels(out);let max=0;
     for(let y=0;y<width;y++)for(let x=0;x<width;x++){
      const n=(y*width+x)*4,k=((y-pad)*512+(x-pad))*4,
       owned=x>=pad&&y>=pad&&x<pad+512&&y<pad+512&&alpha[k+3];
      if(nativeWeaponAlpha[k>>>2]&&x>=pad&&y>=pad&&x<pad+512&&y<pad+512)a.equal(pre.readUInt32LE(n),result.readUInt32LE(n),'strict weapon RGBA');
      if(owned&&y-pad>=430)a.equal(result.readUInt32LE(n),ownBoot.readUInt32LE(k),'signed sole changed');
      if(pre.readUInt32LE(n)!==result.readUInt32LE(n)){a(owned,'unrelated image pixel changed: '+[direction,w,boot,x,y]);changed++;}
      for(let j=0;j<4;j++)max=Math.max(max,Math.abs(expected[n+j]-result[n+j]));
     }
     a(max<=2,'native front/rear depth mismatched manual composition '+[direction,w,boot,max]);
     a(changed>250);a.equal(JSON.stringify(on),saved);tested++;maskC.width=out.width=copy.width=1;global.gc?.();
    }
    a(pre.equals((await draw(off,options,api.selectVisual(off,options)))[1]),'unequip changed the original carry');
   }
  }
  a(tested>=24,'insufficient fixture count');console.log('PASS',direction,tested);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
