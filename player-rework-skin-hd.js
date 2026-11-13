/* Skin ownership for the native body packs. Mixed sources need a material boundary. */
(function(root){
'use strict';
const anatomy = new Set([
 'skin-arms-phase','torso','armRight','armLeft','handRight','handLeft','armNear','handNear',
 'underbody','legs','upper-arm-far','forearm-hand-far','upper-arm-near','forearm-hand-near',
 'legs-anatomy','torso-anatomy','chest-neck-rigid','arms-phase','arms','left-leg','right-leg',
 'legs-base','pelvis','left-upper','left-forearm','left-hand','right-upper','right-forearm','right-hand'
]);
const femaleHairSkinZones = {
 south:[[299,170,310,184],[341,185,356,210],[288,216,341,226]],
 north:[[310,222,336,233]],
 east:[[307,194,322,215],[343,171,354,187],[315,215,338,233],[337,201,365,228]]
};
femaleHairSkinZones.west=femaleHairSkinZones.east.map(([x0,y0,x1,y1])=>[639-x1,y0,639-x0,y1]);

function tone(r,g,b){
 const light=.2126*r+.7152*g+.0722*b;
 return light<70?1:light<112?2:light<157?3:light<202?4:5;
}
function isWarmSkin(r,g,b){
 return r>34 && r-g>=8 && r-b>=15 && g>b*1.08 && g>r*.30;
}
function ownership(layers){
 if(!layers.length)return null;
 if(layers.every(layer=>anatomy.has(layer.id)&&['body','foreground'].includes(layer.slot)))return 'anatomy';
 if(layers.every(layer=>layer.slot==='headBase'&&['headBase','head-clean','head-coherent-r1'].includes(layer.id)))return 'anatomy';
 if(layers.every(layer=>layer.id==='lower-redrawn'&&layer.slot==='pants'))return 'mixed';
 if(layers.every(layer=>layer.slot==='face'&&layer.id==='face'))return 'mixed';
 return null;
}
function mask(data,width,kind,zones){
 const result=new Uint8Array(data.length/4);
 for(let p=0;p<result.length;p++){
  const i=p*4,r=data[i],g=data[i+1],b=data[i+2];
  if(!data[i+3] || (kind!=='anatomy'&&!isWarmSkin(r,g,b)))continue;
  if(zones){
   const x=p%width,y=Math.floor(p/width);
   if(!zones.some(([x0,y0,x1,y1])=>x>=x0&&x<=x1&&y>=y0&&y<=y1))continue;
  }
  result[p]=tone(r,g,b);
 }
 return result;
}
const api={ownership,mask,isWarmSkin,tone,femaleHairSkinZones};
root.MareNativeSkinHD=api;
if(typeof module!=='undefined')module.exports=api;
})(globalThis);
