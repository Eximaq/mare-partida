'use strict';
module.exports=async page=>page.evaluate(async()=>{
 const q=__review96v3,issues=[],counts={samples:0,opaquePixels:0,restoredHair:0,baldChoices:0,open:0,partial:0,full:0,extraHairStyles:0},masks=new Map();
 const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
 async function mask(head,body,dir,action,frame,size){
  const canonical=dir==='west'?'east':dir,key=[head.id,body,dir,action,frame].join(':');if(masks.has(key))return masks.get(key);
  const r=q.appearanceRigs.clips[body][action][canonical],old=r.rest.find(j=>j.label==='NECK'),now=r.poses[frame].find(j=>j.label==='NECK'),c=document.createElement('canvas');c.width=c.height=128;c.getContext('2d').drawImage(await q.image(head.layers[body][canonical]),0,0);
  const source=MareAppearance96.adjustHead(pixels(c),q.catalog.headAdjustments?.[head.id]?.[body]?.[canonical],r.rest),socket={x:Math.round((now.x-old.x)*128),y:Math.round((now.y-old.y)*128),angle:0};
  let data=MareAppearance96.attach(source,'head',r.rest,r.poses[frame],socket,(size-128)/2,size,size).full;
  if(dir==='west'){const flip=new Uint8ClampedArray(data.length);for(let y=0;y<size;y++)for(let x=1;x<size;x++)flip.set(data.subarray((y*size+x)*4,(y*size+x+1)*4),(y*size+size-x)*4);data=flip;}
  masks.set(key,data);return data;
 }
 const heads=q.catalog.styles.filter(s=>s.kind==='head');
 for(const head of heads)for(const body of ['masculino','feminino'])for(const dir of ['south','north','east','west'])for(const[action,frame]of [['idle',0],['walk',3],['attack-sword',4],['attack-focus',5]]){
  const look={head:head.id,hair:'hair-long',hairColor:'brown',face:'face-calm',skin:'light',torso:'original',gloves:'original',pants:'original',boots:'original',weapon:'original'},a=await q.render(body,action,dir,frame,[],look),styled=pixels(a),bald=pixels(await q.render(body,action,dir,frame,[],{...look,hair:'none'})),colour=pixels(await q.render(body,action,dir,frame,[],{...look,hairColor:'pink'})),hidden=pixels(await q.render(body,action,dir,frame,[],{...look,hideHeadgear:true})),bare=pixels(await q.render(body,action,dir,frame,[],{...look,head:'original'})),mode=MareHeadgear.resolve(head.itemId,{model:head}).hairHideMode;
  if(mode==='full'){if(!same(styled,bald)||!same(styled,colour))issues.push({kind:'hair-through-closed-piece',head:head.id,body,dir,action});counts.full++;}
  else {if(same(styled,bald)||same(styled,colour))issues.push({kind:'missing-exposed-hair',head:head.id,body,dir,action});counts[mode==='none'?'open':'partial']++;}
  if(!same(hidden,bare))issues.push({kind:'hair-not-restored',head:head.id,body,dir,action});counts.restoredHair++;
  const noHairHidden=pixels(await q.render(body,action,dir,frame,[],{...look,hair:'none',hideHeadgear:true})),noHairBare=pixels(await q.render(body,action,dir,frame,[],{...look,hair:'none',head:'original'}));
  if(!same(noHairHidden,noHairBare))issues.push({kind:'invented-hair-for-bald-choice',head:head.id,body,dir,action});counts.baldChoices++;
  const opaque=await mask(head,body,dir,action,frame,a.width);for(let i=0;i<opaque.length;i+=4)if(opaque[i+3]){if(![0,1,2,3].every(k=>styled[i+k]===bald[i+k]))issues.push({kind:'hair-over-opaque-equipment',head:head.id,body,dir,action,pixel:i/4});counts.opaquePixels++;}
  counts.samples++;if(issues.length>20)return {counts,issues};
 }
 for(const body of ['masculino','feminino'])for(const dir of ['south','north','east','west'])for(const[action,frame]of [['idle',0],['walk',3],['attack-sword',4]])for(const hair of ['hair-swept','hair-spiky','hair-long']){
  const look={head:'item-164',hair,hairColor:'purple',face:'face-calm',skin:'light',torso:'original',gloves:'original',pants:'original',boots:'original',weapon:'original'},a=pixels(await q.render(body,action,dir,frame,[],look)),b=pixels(await q.render(body,action,dir,frame,[],{...look,hair:'none'}));
  if(same(a,b))issues.push({kind:'missing-open-tiara-hairstyle',body,dir,action,hair});counts.extraHairStyles++;
 }
 return {counts,issues};
});
