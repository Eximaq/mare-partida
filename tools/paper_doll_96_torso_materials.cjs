'use strict';
// Shirt materials own fabric colours only; anatomy is supplied by frozen masks.
const palettes={
  6:{ink:[8,12,20],main:[[13,19,30],[25,35,52],[38,52,75],[60,78,109],[94,115,144]],collar:[[119,120,110],[193,192,173],[237,234,213]],metal:[[56,70,87],[103,121,138],[174,192,205]]},
  7:{ink:[8,14,17],main:[[12,18,24],[26,37,42],[42,58,61],[66,82,83],[101,117,112]],collar:[[76,85,80],[133,144,133],[196,205,187]],metal:[[50,66,71],[101,124,130],[167,188,193]]}
};
function clean(source,itemId,points,direction){
 const palette=palettes[itemId];if(!palette)throw Error('A new torso material requires an explicit palette');
 const joints=Object.fromEntries(points.map(p=>[p.label,{x:p.x*128,y:p.y*128}])),hipY=(joints['LEFT HIP'].y+joints['RIGHT HIP'].y)/2,neck=joints.NECK,out=new Uint8ClampedArray(source.length),indexed=new Set([palette.ink,...palette.main,...palette.collar,...palette.metal].map(c=>c.join(',')));
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const i=(y*128+x)*4;if(source[i+3]<128)continue;
  if(indexed.has(Array.from(source.subarray(i,i+3)).join(','))){out.set([...source.subarray(i,i+3),255],i);continue;}
  const [r,g,b]=source.subarray(i,i+3),light=.2126*r+.7152*g+.0722*b;
  const shade=light<38?0:light<65?1:light<95?2:light<140?3:4;
  let colour=Math.max(r,g,b)<32?palette.ink:palette.main[shade];
  if(light>145&&Math.min(r,g,b)>95&&Math.max(r,g,b)-Math.min(r,g,b)<70&&y<=neck.y+2&&Math.abs(x-neck.x)<8)colour=palette.collar[light<175?0:light<215?1:2];
  else if(direction==='south'&&Math.abs(x-neck.x)<3&&y>neck.y+3&&y<hipY-3&&Math.max(r,g,b)-Math.min(r,g,b)<36&&light>100)colour=palette.metal[light<140?0:light<190?1:2];
  out.set([...colour,255],i);
 }
 return out;
}
const allowed=itemId=>[palettes[itemId].ink,...palettes[itemId].main,...palettes[itemId].collar,...palettes[itemId].metal];
module.exports={clean,allowed,palettes};
