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
const authorized=[["north",3,176],["north",112,176],["north",73,183],["north",74,183],["south",13,141],["south",71,141],["south",73,141],["south",13,169],["south",71,169],["south",73,169],["south",13,8],["north",4,176],["north",113,176],["north",114,176],["north",116,176],["north",74,134],["south",71,148],["south",72,148],["south",73,148],["south",74,148],["south",71,155],["south",73,155],["south",71,162],["south",72,162],["south",73,162],["south",71,9],["south",72,9],["south",73,9],["south",74,9],["north",13,141],["north",72,141],["north",13,148],["north",72,148],["north",13,155],["north",72,155],["north",13,162],["north",72,162],["north",13,8],["north",72,8],["north",13,9],["north",72,9],["south",5,134],["south",4,141],["south",4,169],["south",4,8],["north",110,183],["north",32,176],["north",0,134],["north",0,176],["north",0,183]],unresolved=[["north",2,176],["north",73,176],["south",72,141],["south",72,155],["north",71,155],["north",71,9]];
(async()=>{
 await api.ready;
 for(const [direction,boots] of Object.entries(dirs)){
  const options={consumer:'world',direction,action:'idle'};
  let tested=0;
  for(const look of looks){
   const projections=new Map();
   const registry={};
   for(const [dir,w,b] of unresolved.filter(t=>t[0]===direction)){
    const guard=A.commit({classId:items[w].type,equipment:{weapon:{def:w},boots:{def:b}}},{gender:'feminino',...look},()=>true);
    a(!api.selectVisual(guard,options)?.id.includes(':pose-own-female-idle-boot:'),'separation below the guard margin must stay unresolved');
   }
   for(const w of [...new Set(authorized.filter(t=>t[0]===direction).map(t=>t[1]))]){
    const actor=(boot)=>A.commit({classId:items[w].type,equipment:{weapon:{def:w},boots:boot==null?null:{def:boot}}},{gender:'feminino',...look},()=>true);
    const off=actor(null),base=api.selectVisual(off,options);
    if(base?.hdKind!=='female-equipment')continue;
    const parts=base.states?.[0]?.parts||[];
    const outcomes=authorized.filter(t=>t[0]===direction&&t[1]===w).map(([, ,boot])=>[boot,api.selectVisual(actor(boot),options)]);
    a(outcomes.every(([,s])=>s?.id.includes(':pose-own-female-idle-boot:')),'missing signed tight support for '+[direction,w]);
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
      if(pre.readUInt32LE(n)!==result.readUInt32LE(n)){a(owned,'unrelated image pixel changed: '+[direction,w,boot,x,y]);changed++;}
      for(let j=0;j<4;j++)max=Math.max(max,Math.abs(expected[n+j]-result[n+j]));
     }
     a(max<=2,'native front/rear depth mismatched manual composition '+[direction,w,boot,max]);
     a(changed>250);a.equal(JSON.stringify(on),saved);tested++;maskC.width=out.width=copy.width=1;global.gc?.();
    }
    a(pre.equals((await draw(off,options,api.selectVisual(off,options)))[1]),'unequip changed the original carry');
   }
  }
  a.equal(tested,looks.length*authorized.filter(t=>t[0]===direction).length);console.log('PASS',direction,tested);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
