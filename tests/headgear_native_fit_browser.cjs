'use strict';
// Exercises the actual shared compositor, not a replica of the fit algorithm.
module.exports=async page=>page.evaluate(async()=>{
 const q=__review96v3,issues=[],heads=q.catalog.styles.filter(s=>s.kind==='head'&&s.headRegistration),faces=q.catalog.styles.filter(s=>s.kind==='face'),counts={frames:0,facePixels:0,restoredHair:0};
 const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data,extents=new Map();
 for(const body of ['masculino','feminino'])for(const dir of ['south','north','east','west'])for(const action of ['idle','walk','attack-sword','attack-unarmed','attack-firearm','attack-daggers','attack-focus','attack-tech']){
  const r=q.appearanceRigs.clips[body][action][dir],rest=r.rest,old=rest.find(j=>j.label==='NECK');
  for(let frame=0;frame<r.poses.length;frame++){
   const face=faces[frame%faces.length],look={hair:'hair-wavy',hairColor:'purple',face:face.id,skin:frame%2?'ebony':'light',head:'original',torso:'original',gloves:'original',pants:'original',boots:'original',cloak:'original',weapon:'original'};
   const bare=await q.render(body,action,dir,frame,[],look),bp=pixels(bare),newNeck=r.poses[frame].find(j=>j.label==='NECK'),dx=Math.round((newNeck.x-old.x)*128),dy=Math.round((newNeck.y-old.y)*128),pad=(bare.width-128)/2;
   const fc=document.createElement('canvas');fc.width=fc.height=128;fc.getContext('2d').drawImage(await q.image(face.layers[body][dir]),0,0);const fp=pixels(fc),eyes=[];
   for(let n=0;n<16384;n++)if(fp[n*4+3])eyes.push({x:n%128+dx+pad,y:(n>>7)+dy+pad});
   for(const head of heads){
    const file=head.layers[body][dir];let box=extents.get(file);
    if(!box){const hc=document.createElement('canvas');hc.width=hc.height=128;hc.getContext('2d').drawImage(await q.image(file),0,0);const src=pixels(hc);box={x0:128,y0:128,x1:-1,y1:-1};for(let n=0;n<16384;n++)if(src[n*4+3]){box.x0=Math.min(box.x0,n%128);box.x1=Math.max(box.x1,n%128);box.y0=Math.min(box.y0,n>>7);box.y1=Math.max(box.y1,n>>7);}extents.set(file,box);}
    if(box.x0+dx+pad<0||box.y0+dy+pad<0||box.x1+dx+pad>=bare.width||box.y1+dy+pad>=bare.height)issues.push({kind:'headgear-clipped',head:head.id,body,dir,action,frame});
    const dressed=await q.render(body,action,dir,frame,[],{...look,head:head.id}),hp=pixels(dressed);
    for(const eye of eyes){const i=(eye.y*bare.width+eye.x)*4;if([0,1,2,3].some(k=>bp[i+k]!==hp[i+k]))issues.push({head:head.id,body,dir,action,frame,eye});counts.facePixels++;}
    counts.frames++;
    if(action==='idle'&&frame===0){const hidden=await q.render(body,action,dir,frame,[],{...look,head:head.id,hideHeadgear:true});if(hidden.toDataURL()!==bare.toDataURL())issues.push({kind:'hair-not-restored',head:head.id,body,dir});counts.restoredHair++;}
   }
   if(issues.length>20)return {counts,issues};
  }
 }
 return {counts,issues};
});
