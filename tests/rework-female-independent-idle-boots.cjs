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
(async()=>{
 await api.ready;
 for(const [direction,boots] of Object.entries(dirs)){
  const options={consumer:'world',direction,action:'idle'};
  let tested=0;
  for(const look of looks){
   const bounds=new Map(),projections=new Map();
   const measure=async(part)=>{
    const im=await load(part.url),A=cv.createCanvas(im.width,im.height);A.getContext('2d').drawImage(im,0,0);
    const bytes=pixels(A),b=[im.width,im.height,0,0];
    for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(bytes[(y*im.width+x)*4+3]){
     b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x+1);b[3]=Math.max(b[3],y+1);
    }
    A.width=1;return b;
   };
   const registry={};
   const guard=A.commit({classId:items[74].type,equipment:{weapon:{def:74},boots:{def:134}}},{gender:'feminino',...look},()=>true);
   a(!api.selectVisual(guard,{...options,direction:'south'})?.id.includes(':pose-own-female-idle-boot:'),'projected translucent overlap must not pass without authority');
   a(!api.selectVisual(guard,{...options,direction:'east'})?.id.includes(':pose-own-female-idle-boot:'),'no lateral idle registration');
   for(const w of (process.env.ALL||process.env.RASTER_EXPANSION)?Object.keys(items).map(Number).filter(i=>['brawler','strategist','sword','rogue','cyborg','healer','gunner'].includes(items[i]?.type)):[1,2,15,17,67,69,118,128]){
    const actor=(boot)=>A.commit({classId:items[w].type,equipment:{weapon:{def:w},boots:boot==null?null:{def:boot}}},{gender:'feminino',...look},()=>true);
    const off=actor(null),base=api.selectVisual(off,options);
    if(base?.hdKind!=='female-equipment')continue;
    const parts=base.states?.[0]?.parts||[];
    if(process.env.RASTER_EXPANSION){
     for(const part of parts)if(!bounds.has(part.sha256))bounds.set(part.sha256,await measure(part));
    }
    const outcomes=boots.map(boot=>[boot,api.selectVisual(actor(boot),options)]).filter(([,q])=>q?.id.includes(':pose-own-female-idle-boot:')&&!q.id.endsWith(':opaque-foreground'));
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
     if(process.env.RASTER_EXPANSION){
      let bootTop=512;
      for(let i=3;i<alpha.length;i+=4)if(alpha[i])bootTop=Math.min(bootTop,i>>>11);
      const blocked=parts.some(part=>{
       const [x0,y0,x1,y1]=bounds.get(part.sha256),m=part.matrix;
       return Math.max(...[x0,x1].flatMap(x=>[y0,y1].map(y=>m[1]*x+m[3]*y+m[5])))+2>=bootTop;
      });
      if(!blocked){maskC.width=out.width=1;continue;}
      for(const part of parts){
       const key=JSON.stringify([part.url,part.matrix,part.sourceClip]);
       if(!projections.has(key)){
        const P=C(),pc=P.getContext('2d');pc.imageSmoothingEnabled=false;pc.transform(...part.matrix);
        if(part.sourceClip){pc.beginPath();pc.rect(...part.sourceClip);pc.clip();}
        pc.drawImage(await load(part.url),0,0);
        projections.set(key,pixels(P));P.width=1;
       }
       const weapon=projections.get(key);
       for(let i=3;i<alpha.length;i+=4)if(alpha[i])a.equal(weapon[i],0,'measured native weapon and boot share a pixel');
      }
     }
     const [resultWidth,result]=await draw(on,options,source);a.equal(resultWidth,width);
     own.forEach((l,i)=>{if(l.depth<0)oc.drawImage(bootImages[i],pad,pad);});
     const copy=C(width),cc=copy.getContext('2d'),tile=cc.createImageData(width,width);tile.data.set(pre);cc.putImageData(tile,0,0);
     oc.drawImage(copy,0,0);own.forEach((l,i)=>{if(l.depth>0)oc.drawImage(bootImages[i],pad,pad);});
     const expected=pixels(out);let max=0;
     for(let y=0;y<width;y++)for(let x=0;x<width;x++){
      const n=(y*width+x)*4,k=((y-pad)*512+(x-pad))*4,
       owned=x>=pad&&y>=pad&&x<pad+512&&y<pad+512&&alpha[k+3];
      if(pre.readUInt32LE(n)!==result.readUInt32LE(n)){a(owned,'unrelated image pixel changed: '+[direction,w,boot,x,y]);changed++;}
      for(let j=0;j<4;j++)max=Math.max(max,Math.abs(expected[n+j]-result[n+j]));
     }
     a(max<=2,'native front/rear depth mismatched manual composition '+[direction,w,boot,max]);
     a(changed>250);a.equal(JSON.stringify(on),saved);tested++;maskC.width=out.width=copy.width=1;global.gc?.();
    }
    a(pre.equals((await draw(off,options,api.selectVisual(off,options)))[1]),'unequip changed the original carry');
   }
  }
  a(tested>(process.env.RASTER_EXPANSION?70:80),'insufficient fixture count');console.log('PASS',direction,tested);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
