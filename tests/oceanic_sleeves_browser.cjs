'use strict';
// Checks the shared renderer on every existing movement family, not a replica.
module.exports=async page=>page.evaluate(async()=>{
 const q=__review96v3,issues=[],counts={frames:0,anchoredComponents:0,coveredArmPixels:0},look={head:'original',hair:'none',face:'none',skin:'light',torso:'item-165',pants:'original',boots:'original',gloves:'original',weapon:'original'};
 for(const body of ['masculino','feminino'])for(const dir of ['south','north','east','west'])for(const action of ['idle','walk','attack-sword','attack-unarmed','attack-firearm','attack-daggers','attack-focus','attack-tech']){
  const r=q.appearanceRigs.clips[body][action][dir];for(let frame=0;frame<r.poses.length;frame++){
   const c=await q.render(body,action,dir,frame,[],look),w=c.width,h=c.height,d=c.getContext('2d').getImageData(0,0,w,h).data,bare=await q.render(body,action,dir,frame,[],{...look,torso:'original'}),bp=bare.getContext('2d').getImageData(0,0,w,h).data,seen=new Uint8Array(w*h),neck=r.poses[frame].find(j=>j.label==='NECK').y*128+(w-128)/2;
   const dark=await q.render(body,action,dir,frame,[],{...look,skin:'ebony'}),dp=dark.getContext('2d').getImageData(0,0,w,h).data,pad=(w-128)/2,j=Object.fromEntries(r.poses[frame].map(j=>[j.label,{x:j.x*128+pad,y:j.y*128+pad}])),bones=['LEFT','RIGHT'].flatMap(side=>[MareSurface96.axis(j[side+' SHOULDER'],j[side+' ELBOW']),MareSurface96.axis(j[side+' ELBOW'],j[side+' ARM'])]);
   for(let y=Math.ceil(neck+4);y<h;y++)for(let x=0;x<w;x++){
    const i=(y*w+x)*4;if(!bp[i+3]||!MareAppearance96.isSkin(bp[i],bp[i+1],bp[i+2])||['LEFT','RIGHT'].some(side=>Math.hypot(x-j[side+' ARM'].x,y-j[side+' ARM'].y)<7))continue;
    if(!bones.some(axis=>{const v=axis.at(x+.5,y+.5);return v.along>1&&v.along<axis.length-1&&Math.abs(v.across)<2.5;}))continue;
    counts.coveredArmPixels++;if([0,1,2].some(k=>d[i+k]!==dp[i+k]))issues.push({body,dir,action,frame,kind:'exposed-skin-inside-sleeve',x,y});
   }
   for(let n=0;n<w*h;n++){
    if(seen[n]||!d[n*4+3])continue;const group=[n];seen[n]=1;
    for(let k=0;k<group.length;k++)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const x=group[k]%w+dx,y=Math.floor(group[k]/w)+dy,p=y*w+x;
     if(x<0||y<0||x>=w||y>=h||seen[p]||!d[p*4+3])continue;seen[p]=1;group.push(p);
    }
    if(group.some(p=>bp[p*4+3]))counts.anchoredComponents++;
    else if(group.every(p=>Math.floor(p/w)>neck+1))issues.push({body,dir,action,frame,kind:'floating-garment',pixels:group.length});
   }
   counts.frames++;
  }
 }
 return {counts,issues};
});
