/* Eye shape uses only the eye-region pixels of known native head sources. */
(function(root){
'use strict';
const styles = {
 'face-calm': {open:.65,slope:0,brow:1.5},
 'face-resolute': {open:.83,slope:3,brow:-1},
 'face-almond': {open:.95,slope:-1,brow:0,taper:5},
 'face-focused': {open:1.13,slope:0,brow:-2}
};
const maleSources = {
 "6c19bf77a6d9364d1f720d6a0096a014065ccd5d4ad35a8a53c80e3f93dbf13a": {
  "direction": "south",
  "boxes": [
   [
    292,
    187,
    316,
    213
   ],
   [
    326,
    187,
    349,
    213
   ]
  ]
 },
 "81ce2c74c6e8e05f2745223cdea70cfecee5b0ff49e4bcbf8d6ed25d62e72449": {
  "direction": "south",
  "boxes": [
   [
    228,
    123,
    252,
    149
   ],
   [
    262,
    123,
    285,
    149
   ]
  ]
 },
 "8909af0e687972ad9153da86adb4e8374b47aaab46a1f751c344023446ba39dc": {
  "direction": "east",
  "boxes": [
   [
    266,
    121,
    286,
    141
   ]
  ]
 },
 "9add51bf7602618f2e937cf31d851346a02afc248da8490ae5ea7ea322fabde2": {
  "direction": "east",
  "boxes": [
   [
    330,
    185,
    350,
    205
   ]
  ]
 },
 "0dc6cfcac5a2cf85ea30b0d88bdfd08e3fb7574110b115fb230ff8adce03b464": {
  "direction": "west",
  "boxes": [
   [
    290,
    185,
    310,
    205
   ]
  ]
 }
};
const femaleBoxes = {
 south: [[294,177,315,202],[326,177,347,202]],
 east: [[334,181,354,203]],
 west: [[286,181,306,203]]
};
function supports(style) { return Object.hasOwn(styles,style); }
function maleSource(record) {
 const layers = record.pack.directions[record.direction].layers.filter(layer => layer.slot === 'face');
 if (record.direction === 'north') return layers.length === 0 ? {north:true} : null;
 if (layers.length !== 1 || !maleSources[layers[0].source] ||
     layers[0].frames?.some(source => source !== layers[0].source)) return null;
 return {source:layers[0].source,...maleSources[layers[0].source]};
}
function reshape(context, style, direction, boxes) {
 if (!supports(style) || !boxes) return;
 const shape = styles[style];
 const {width,height} = context.canvas;
 const result = context.getImageData(0,0,width,height);
 const original = new Uint8ClampedArray(result.data);
 for (const [index,[left,top,right,bottom]] of boxes.entries()) {
  const side = direction === 'south' ? (index === 0 ? 1 : -1) : direction === 'east' ? 1 : -1;
  const center = top + (bottom-top)*.73;
  for (let y=top; y<=bottom; y++) for (let x=left; x<=right; x++) {
   const u = (x-left)/(right-left), v = (y-top)/(bottom-top);
   const edge = Math.min(1,(x-left)/4,(right-x)/4,(y-top)/3,(bottom-y)/3);
   const eye = Math.max(0,1-Math.abs(v-.7)*2.5);
   const brow = Math.max(0,1-Math.abs(v-.24)*4.3);
   const slant = (u-.5)*shape.slope*side + Math.abs(u-.5)*(shape.taper||0);
   const offset = edge*((y-center)*(1/shape.open-1)*eye-slant*eye-shape.brow*brow);
   const sampleY = Math.max(top,Math.min(bottom,Math.round(y+offset)));
   const from = (sampleY*width+x)*4, to = (y*width+x)*4;
   // Keep the source silhouette and its antialiased edge.
   if (original[from+3] === 255 && original[to+3] === 255)
    result.data.set(original.subarray(from,from+3),to);
  }
 }
 context.putImageData(result,0,0);
}
function recolorIris(context,expression,color){
 const ramp=root.MareCharacterAppearance?.eyes[color]?.ramp,api=root.MareAppearance96;
 if(!ramp||!api||!expression?.boxes)return;
 const {width,height}=context.canvas;
 const data=context.getImageData(0,0,width,height),mask=api.materialMask(data.data,'iris');
 for(let i=0;i<mask.length;i++)if(mask[i]){
  const x=i%width,y=Math.floor(i/width);
  if(!expression.boxes.some(([l,t,r,b])=>x>=l&&x<=r&&y>=t&&y<=b))mask[i]=0;
 }
 data.data.set(api.recolor(data.data,mask,ramp));
 context.putImageData(data,0,0);
}
const api = {supports,maleSource,reshape,recolorIris,femaleBoxes};
root.MareReworkEyeStylesHD = api;
if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
