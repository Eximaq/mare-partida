'use strict';
// Offline registration. Every animation retains the shared integer head socket.
const SIZE=128,blank=()=>new Uint8ClampedArray(SIZE*SIZE*4);
function shift(data,dy){const out=blank();for(let y=0;y<SIZE;y++){const yy=y+dy;if(yy>=0&&yy<SIZE)out.set(data.subarray(y*SIZE*4,(y+1)*SIZE*4),yy*SIZE*4);}return out;}
function faceMask(faces,margin=1){const mask=new Uint8Array(SIZE*SIZE);for(const data of faces)for(let p=0;p<mask.length;p++)if(data[p*4+3]){const x=p%SIZE,y=p>>7;for(let dy=-margin;dy<=margin;dy++)for(let dx=-margin;dx<=margin;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<SIZE&&yy<SIZE)mask[yy*SIZE+xx]=1;}}return mask;}
function overlaps(data,mask){return mask.some((v,p)=>v&&data[p*4+3]);}
function cleanIslands(data,min=5){
 const out=new Uint8ClampedArray(data),seen=new Uint8Array(SIZE*SIZE);
 for(let p=0;p<seen.length;p++){
  if(seen[p]||!out[p*4+3])continue;const group=[p];seen[p]=1;
  for(let k=0;k<group.length;k++){const x=group[k]%SIZE,y=group[k]>>7;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,q=yy*SIZE+xx;if(xx<0||yy<0||xx>=SIZE||yy>=SIZE||seen[q]||!out[q*4+3])continue;seen[q]=1;group.push(q);}}
  if(group.length<min)for(const q of group)out.fill(0,q*4,q*4+4);
 }
 return out;
}
function corsair(source,direction){
 const out=blank(),side=direction==='east',rear=direction==='north';
 // Source-panel regions separate the cap/feather/ties from the mannequin.
 // The opaque blue rear brim must not be cut using the guide's face mask.
 for(let y=0;y<56;y++)for(let x=0;x<SIZE;x++){
  const p=y*SIZE+x,i=p*4;if(!source[i+3])continue;
  const face=rear?y>=45&&x>=59:side?y>=37&&x>=63:y>=40&&x>=53&&x<=73;
  if(face||y>=44&&!(rear?x<59:side?x<62:x>72))continue;
  const r=source[i],g=source[i+1],b=source[i+2];
  // Only the annotated mannequin below the brim; never cream/gold above it.
  if(y>=40&&r>130&&g/r>.52&&g/r<.87&&b/r>.42&&b/r<.72)continue;
  out.set(source.subarray(i,i+4),i);
 }
 return out;
}
function rearTiara(source,body){
 // Retain the authored rear gold band, excluding the filled scalp above it.
 const out=blank(),top=body==='masculino'?32:26,bottom=body==='masculino'?44:37,kept=new Set();
 let x0=128,x1=-1;
 for(let y=top;y<=bottom;y++)for(let x=0;x<SIZE;x++){
  const i=(y*SIZE+x)*4,r=source[i],g=source[i+1],b=source[i+2];
  if(!source[i+3]||r>130&&g/r>.52&&g/r<.87&&b/r>.42&&b/r<.72)continue;
  kept.add(i);x0=Math.min(x0,x);x1=Math.max(x1,x);
 }
 for(let y=0;y<11;y++)for(let x=0;x<31;x++){
  const sx=x0+Math.floor(x*(x1-x0+1)/31),sy=top+Math.floor(y*(bottom-top+1)/11),i=(sy*SIZE+sx)*4;
  if(kept.has(i))out.set(source.subarray(i,i+4),((25+y)*SIZE+49+x)*4);
 }
 return out;
}
function fit({id,body,direction,source,registered,head,faces}){
 let pixels=cleanIslands(id===129?corsair(source,direction):id===164&&direction==='north'?rearTiara(source,body):registered);
 const mask=faceMask(faces),hood=id===136;let lift=0;
 if(direction!=='north'&&!hood){
  while(overlaps(pixels,mask)&&lift<14){pixels=shift(pixels,-1);lift++;}
  if(overlaps(pixels,mask))throw Error('Headgear still covers eyes: '+id+'/'+body+'/'+direction);
 }
 if(hood&&direction!=='north'){
  // The opening follows the real face, retaining side folds and lower scarf.
  for(let p=0;p<SIZE*SIZE;p++){const y=p>>7;if(mask[p]||head[p*4+3]&&y>=30&&y<=47)pixels.fill(0,p*4,p*4+4);}
  pixels=cleanIslands(pixels,40);
  if(overlaps(pixels,mask))throw Error('Hood aperture covers eyes');
 }
 return {pixels,registration:{version:'head-aperture-v1',lift,aperture:hood?'canonical-face':'all-eye-styles',rearBand:id===164&&direction==='north'}};
}
module.exports={fit,faceMask,overlaps};
