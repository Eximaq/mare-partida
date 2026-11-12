(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ReworkHairMask=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
// HD adaptation of appearance.js clipHairCrown, applied after rigid pose raster.
function restoreAboveLine(after,before,width,height,{matrix,nose,hairline,density=4,offsetX=0,offsetY=0}){
 if(after.length!==before.length||after.length!==width*height*4||!Number.isFinite(hairline))throw Error('Invalid crown mask');
 const nx=nose.x*density,ny=nose.y*density,poseX=(matrix[0]*nose.x+matrix[2]*nose.y+matrix[4])*density,poseY=(matrix[1]*nose.x+matrix[3]*nose.y+matrix[5])*density;
 const angle=Math.atan2(matrix[1],matrix[0]),cs=Math.cos(angle),sn=Math.sin(angle),sx=poseX-nx,sy=poseY-ny,line=hairline*density;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const dx=x+.5+offsetX*density-sx-nx,dy=y+.5+offsetY*density-sy-ny,nativeY=ny-dx*sn+dy*cs;if(nativeY<line){const i=(y*width+x)*4;after.set(before.subarray(i,i+4),i);}}
 return after;
}
return {restoreAboveLine};});
