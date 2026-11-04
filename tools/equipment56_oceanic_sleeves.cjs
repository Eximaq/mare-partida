'use strict';
// Registration of the authored sleeves of item 165. The isolated robe has
// flared arms away from the body's rest bones; sampling at those body bones
// used to pick up the robe's dark outside contour instead of its white fabric.
const surface=require('./paper-doll-96-v3/surface.js');
const SIZE=128;
const authored={
 masculino:{
  south:{RIGHT:[[58,56],[55,66],[52,76]],LEFT:[[80,56],[81,66],[81,77]]},
  north:{LEFT:[[57,56],[54,66],[52,77]],RIGHT:[[79,56],[81,66],[81,78]]},
  east:{LEFT:[[58,58],[59,67],[59,78]],RIGHT:[[58,58],[59,67],[59,78]]}
 },
 feminino:{
  south:{RIGHT:[[56,54],[55,64],[54,73]],LEFT:[[76,54],[77,64],[78,73]]},
  north:{LEFT:[[55,54],[54,64],[53,72]],RIGHT:[[72,54],[74,64],[74,72]]},
  east:{LEFT:[[63,54],[63,64],[64,73]],RIGHT:[[63,54],[63,64],[64,73]]}
 }
};
// The garment body must not carry a second, static copy of the flared sleeves
// into a raised-arm pose. Bounds are measured in this item's authored panels.
const bodyRegions={
 masculino:{south:{left:60,right:77,top:60,bottom:80,dx:-4},north:{left:59,right:77,top:60,bottom:81,dx:-4},east:{left:67,right:128,top:60,bottom:80,dx:0}},
 feminino:{south:{left:59,right:73,top:58,bottom:76,dx:-2},north:{left:57,right:71,top:58,bottom:76,dx:0},east:{left:69,right:128,top:56,bottom:76,dx:-2}}
};
function fit(source,points,body,direction){
 const config=authored[body]?.[direction];if(!config||source.length!==SIZE*SIZE*4)throw Error('Invalid oceanic sleeve input');
 const joints=Object.fromEntries(points.map(j=>[j.label,{x:j.x*SIZE,y:j.y*SIZE}])),parts={};
 for(const side of ['LEFT','RIGHT'])for(const [part,start,end,index]of [['upper',' SHOULDER',' ELBOW',0],['lower',' ELBOW',' ARM',1]]){
  const from=surface.axis(...config[side].slice(index,index+2).map(([x,y])=>({x,y}))),to=surface.axis(joints[side+start],joints[side+end]),out=new Uint8ClampedArray(source.length);
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
   const q=to.at(x+.5,y+.5);if(q.along< -2||q.along>to.length+2||Math.abs(q.across)>5.5)continue;
   const t=Math.max(0,Math.min(1,q.along/to.length)),p=from.point(t*from.length,q.across*.85);let best=Infinity,found=-1;
   for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
    const sx=Math.round(p.x)+dx,sy=Math.round(p.y)+dy;if(sx<0||sx>=SIZE||sy<0||sy>=SIZE)continue;
    const i=(sy*SIZE+sx)*4;if(!source[i+3])continue;
    const contour=Math.max(source[i],source[i+1],source[i+2])<70;
    const d=dx*dx+dy*dy+(contour&&Math.abs(q.across)<3?25:0);
    if(d<best){best=d;found=i;}
   }
   if(found>=0)out.set(source.subarray(found,found+4),(y*SIZE+x)*4);
  }
  parts[side+part]=out;
 }
 const region=bodyRegions[body][direction],full=new Uint8ClampedArray(source.length),drape=new Uint8ClampedArray(source.length);
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  const xx=x+region.dx;if(xx<0||xx>=SIZE)continue;
  const i=(y*SIZE+x)*4,target=(y*SIZE+xx)*4;full.set(source.subarray(i,i+4),target);
  if(y>=region.top&&y<region.bottom&&(x<=region.left||x>=region.right))continue;
  drape.set(source.subarray(i,i+4),target);
 }
 parts.DRAPE=drape;
 return {full,parts};
}
module.exports={fit};
