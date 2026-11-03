'use strict';
// Immutable geometry only. A zero blocked-cell count proves an entire rectangle
// open; a nonzero count is inconclusive and must fall back to the exact solver.
function terrainMaskIndex(mask,width,height){
 const {cols,rows,step,bits}=mask;
 if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<1||rows<1||cols*rows>4000000||!Number.isFinite(step)||step<=0||cols*step!==width||rows*step!==height||typeof bits!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(bits))throw Error('Invalid static terrain mask');
 const bytes=Buffer.from(bits,'base64');if(bytes.length!==Math.ceil(cols*rows/8))throw Error('Invalid static terrain mask length');
 const stride=cols+1,prefix=new Int32Array(stride*(rows+1));
 for(let y=0;y<rows;y++){let blocked=0;for(let x=0;x<cols;x++){const i=y*cols+x;blocked+=bytes[i>>3]&(1<<(i&7))?0:1;prefix[(y+1)*stride+x+1]=prefix[y*stride+x+1]+blocked;}}
 return {open(x0,y0,x1,y1){
  if(![x0,y0,x1,y1].every(Number.isFinite)||x0<0||y0<0||x1>=width||y1>=height||x1<x0||y1<y0)return false;
  const l=Math.floor(x0/step),t=Math.floor(y0/step),r=Math.floor(x1/step)+1,b=Math.floor(y1/step)+1;
  return prefix[b*stride+r]-prefix[t*stride+r]-prefix[b*stride+l]+prefix[t*stride+l]===0;
 }};
}
module.exports={terrainMaskIndex};
