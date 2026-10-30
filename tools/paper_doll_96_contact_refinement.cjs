/* Refine estimator limb labels against the original pose guide and native silhouette. */
'use strict';
function refineContacts(measured,guide,pixels,width,height,padding=0){
  if(pixels.length!==width*height*4||measured.length!==18||guide.length!==18)throw Error('Invalid contact inputs');
  const out=measured.map(p=>({...p})),g=Object.fromEntries(guide.map(p=>[p.label,p])),changes=[];
  const pt=p=>({x:p.x*128+padding,y:p.y*128+padding});
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const nearest=point=>{let best=Infinity,found=null;for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){const x=Math.round(point.x)+dx,y=Math.round(point.y)+dy;if(x<0||y<0||x>=width||y>=height||pixels[(y*width+x)*4+3]<100)continue;const d=Math.hypot(x-point.x,y-point.y);if(d<best){best=d;found={x,y};}}return {distance:best,point:found};};
  for(const suffix of ['SHOULDER','HIP','ELBOW','ARM','KNEE','LEG']){
    const li=out.findIndex(p=>p.label==='LEFT '+suffix),ri=out.findIndex(p=>p.label==='RIGHT '+suffix),l=out[li],r=out[ri];
    const direct=distance(pt(l),pt(g[l.label]))+distance(pt(r),pt(g[r.label]));
    const swapped=distance(pt(r),pt(g[l.label]))+distance(pt(l),pt(g[r.label]));
    if(swapped+2<direct){out[li]={...r,label:l.label};out[ri]={...l,label:r.label};changes.push({joint:suffix,reason:'paired-label-swap'});}
    const collapsed=distance(pt(out[li]),pt(out[ri]))<3&&distance(pt(g[l.label]),pt(g[r.label]))>6;
    for(const i of [li,ri]){
      const p=out[i],target=g[p.label],error=distance(pt(p),pt(target)),near=nearest(pt(target)),current=nearest(pt(p));
      if((error>7||collapsed&&error>3||current.distance>3)&&near.distance<=3){
        const q=near.distance<=1?pt(target):near.point;
        out[i]={...p,x:(q.x-padding)/128,y:(q.y-padding)/128};changes.push({joint:p.label,reason:collapsed?'collapsed-contact':current.distance>3?'outside-silhouette':'guide-divergence',distance:error});
      }
      // Depth follows the labelled guide; the blank-face estimator often swaps it.
      out[i].z_index=target.z_index||0;
    }
  }
  return {points:out,changes};
}
function cleanDetached(layers,width,height,contacts,minArea=32,radius=6){
  if(!layers.length||layers.some(p=>p.length!==width*height*4))throw Error('Invalid native layers');
  const output=layers.map(p=>new Uint8ClampedArray(p)),occupied=new Uint8Array(width*height),seen=new Uint8Array(width*height),removed=[];
  for(let p=0;p<occupied.length;p++)if(layers.some(a=>a[p*4+3]>0))occupied[p]=1;
  for(let start=0;start<occupied.length;start++){
    if(!occupied[start]||seen[start])continue;const group=[start];seen[start]=1;
    for(let n=0;n<group.length;n++){const p=group[n],x=p%width,y=Math.floor(p/width);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,i=yy*width+xx;if(xx<0||yy<0||xx>=width||yy>=height||seen[i]||!occupied[i])continue;seen[i]=1;group.push(i);}}
    if(group.length>=minArea||group.some(p=>contacts.some(j=>Math.hypot(p%width-j.x,Math.floor(p/width)-j.y)<=radius)))continue;
    for(const p of group){for(const a of output)a.fill(0,p*4,p*4+4);removed.push(p);}
  }
  return {layers:output,removed};
}
module.exports={refineContacts,cleanDetached};
