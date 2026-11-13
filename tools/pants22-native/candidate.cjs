'use strict';
// Offline candidate only. Never modifies the production indexes or approved PNGs.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const cv=require('@napi-rs/canvas');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function audit(folder=__dirname,manifest=JSON.parse(fs.readFileSync(path.join(folder,'MANIFEST.json')))){
 const sources=[];for(const spec of manifest.layers){const file=path.join(folder,spec.file),bytes=fs.readFileSync(file);if(sha(bytes)!==spec.sha256)throw Error('Source hash mismatch: '+spec.file);const image=await cv.loadImage(bytes);if(image.width!==512||image.height!==512)throw Error('Source dimensions mismatch');sources.push({...spec,width:image.width,height:image.height});}
 return {valid:true,productionEnabled:false,manifest,sources};
}
module.exports={audit};

// Inverse map into the original texture: nearest texel, never recenter by alpha bounds.
function warpStrip(image,{source,target,widthScale=1,canvas=512}){
 if(source.length!==target.length||source.length<2||!(widthScale>0))throw Error('Invalid strip anchors');
 const input=cv.createCanvas(image.width,image.height);input.getContext('2d').drawImage(image,0,0);
 const src=input.getContext('2d').getImageData(0,0,image.width,image.height).data,out=cv.createCanvas(canvas,canvas),ctx=out.getContext('2d'),data=ctx.createImageData(canvas,canvas);
 for(let k=0;k<target.length-1;k++){const a=target[k],b=target[k+1],u=source[k],v=source[k+1];if(b.y<=a.y||v.y<=u.y)throw Error('Nonmonotonic strip');
 for(let y=Math.max(0,Math.ceil(a.y));y<Math.min(canvas,Math.ceil(b.y));y++){const t=(y-a.y)/(b.y-a.y),sy=Math.floor(u.y+t*(v.y-u.y)),sc=u.x+t*(v.x-u.x),dc=a.x+t*(b.x-a.x);if(sy<0||sy>=image.height)continue;
 for(let x=0;x<canvas;x++){const sx=Math.floor(sc+(x-dc)/widthScale);if(sx<0||sx>=image.width)continue;const si=(sy*image.width+sx)*4,di=(y*canvas+x)*4;data.data.set(src.subarray(si,si+4),di);}}}
 ctx.putImageData(data,0,0);return out;
}
module.exports.warpStrip=warpStrip;
