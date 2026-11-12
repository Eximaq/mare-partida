/* Original density4 weapon sources. No legacy donor, resizing or guessed outfit binding. */
(function(root){'use strict';
function create(index,{vendor=root.ReworkAccessoryVendor,prefix='tools/rework-weapon-layers-hd/',makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h})}={}){
 if(index?.schema!=='native-hd-weapon-layers-v1'||!vendor?.compositor)throw Error('Missing native weapon dependencies');
 const resource=url=>{const p=new URL(url,'https://native.invalid/'+prefix).pathname.slice(1);if(!/^tools\/(rework-weapon-layers-hd|rework-modular-outfits-hd)\/assets\/[a-f0-9]{64}\.png$/.test(p))throw Error('Invalid native weapon source path');return p;};
 const body=b=>({masculino:'male',feminino:'female'})[b]||b;
 function resolve({item,body:b,action='attack',direction,appearance={},equipment={}}={}){
  const allowed=[1,67,68,69,70].includes(Number(item))?["attack","attack-sword"]:[109,111,117].includes(Number(item))?['attack','punch','attack-unarmed']:[4,5,113,114,115,116].includes(Number(item))?['attack','shoot','attack-firearm']:[17,122].includes(Number(item))?['attack','focus','attack-focus','cast']:[];
  if(!allowed.includes(action))return null;if([1,67,68,69,70].includes(Number(item))&&[appearance.skin,appearance.skinColor,appearance.hair,appearance.hairStyle,appearance.hairColor,appearance.eyeColor].some(v=>v&&v!=="original"))return null;
  const equippedWeapon=equipment.weapon&&typeof equipment.weapon==='object'?equipment.weapon.def:equipment.weapon;
  if(equippedWeapon!=null&&Number(equippedWeapon)!==Number(item))return null;
  const r=index.records.find(r=>r.item===Number(item)&&r.body===body(b)&&r.direction===direction&&r.originalAppearanceCompatible!==false);if(!r)return null;
  if(r.interfaceSkinLocked&&[appearance.skin,appearance.skinColor].some(v=>v&&v!=='original'))return null;
  for(const slot of ['torso','coat','pants','legs','gloves','boots','cloak','head'])if(equipment[slot]!=null&&!['original','none'].includes(equipment[slot]))return null;
  if([4,5,113,114,115,116].includes(r.item))for(const k of ['skin','skinColor','hairColor','eyeColor'])if(appearance[k]&&!['original'].includes(appearance[k]))return null;
  if(appearance.face&&!['original','face-gentle'].includes(appearance.face))return null;
  // Cosmetics are composed separately only after caller hides the authored head slots.
  if([4,5,113,114,115,116].includes(r.item)&&[appearance.hair,appearance.hairStyle,appearance.head].some(v=>v&&!['original','none'].includes(v)))return null;
  if([109,111,117,17,122].includes(r.item)&&[appearance.hair,appearance.hairStyle].some(v=>v&&v!=='original'))return null;
  return r.basePack?{...r,colorAppearance:appearance}:r;
 }
 function requiredFiles(r,{frame}={}){if(!r)return [];const states=frame===undefined?r.states:[r.states[frame]];if(states.some(s=>!s))throw Error('Invalid native weapon frame');const files=new Set();for(const s of states){for(const l of [...s.layers,...(s.attachment?[s.attachment]:[])]){files.add(resource(l.url));if(l.mask)files.add(resource(l.mask.url));}if(r.basePack){const d=r.basePack.pack.directions[r.direction];for(const l of d.layers){const key=l.frames?.[Number(s.state)]||l.source,url=r.basePack.images[key];if(!url)throw Error('Missing authored base frame reference');files.add(resource(url));}}}return [...files];}
 function render(ctx,r,images,{frame=0,state,hiddenSlots=[],appearance=r?.colorAppearance||{}}={}){
  if(!r)throw Error('Missing native weapon source');let s=state===undefined?r.states[frame]:r.states.find(s=>s.state===String(state));if(!s)throw Error('Unapproved native weapon state');
  if([4,5,113,114,115,116].includes(r.item)&&!r.hairSeparated&&hiddenSlots.length)throw Error('115 backing has baked head/hair; hiding slots is unsupported');
  if(hiddenSlots.some(x=>!['hair','face','headBase'].includes(x)))throw Error('Only independent head slots may be hidden');
  const recolored=!!r.basePack&&['skin','skinColor','hairColor','eyeColor'].some(k=>appearance[k]&&appearance[k]!=='original');
  const renderOffset=r.renderOffsetPhysical??[0,0];if(!Array.isArray(renderOffset)||renderOffset.length!==2||renderOffset.some(v=>!Number.isInteger(v)||v<0))throw Error('Native render offset must be two nonnegative integers');if(renderOffset.some(Boolean)&&(!r.basePack||!s.attachment||s.layers.some(l=>l.operation!=='source-over')||s.canvasRoundingPatch?.length))throw Error('Padded native attachments cannot contain coordinate-addressed RGBA patches');
  const [w,h]=r.nativeCanvas;ctx.canvas.width=w;ctx.canvas.height=h;ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=false;ctx.save();ctx.translate(...renderOffset);try{
  const image=a=>{const im=images.get(resource(a.url))||images.get(a.url);if(!im)throw Error('Missing original asset '+a.url);return im;};
  if(r.basePack){const p=r.basePack.pack,d=p.directions[r.direction],map=new Map();for(const key of new Set(d.layers.filter(l=>!hiddenSlots.includes(l.slot)).map(l=>l.frames?.[Number(s.state)]||l.source))){const url=r.basePack.images[key],im=images.get(resource(url))||images.get(url);if(!im)throw Error('Missing base asset '+url);map.set(key,im);}
   const pack={...p,directions:{[r.direction]:{...d,layers:d.layers.filter(l=>!hiddenSlots.includes(l.slot))}}};
   if(recolored){if(!root.MareReworkBaseHD)throw Error('Native palette renderer unavailable');const base=root.MareReworkBaseHD.create({schema:'rework-full-hd-v1',records:[]},{vendor,prefix:''});base.render(ctx,{id:r.id,pack,direction:r.direction,sourceRefs:[...map.keys()]},map,{frame:Number(s.state),appearance,makeCanvas});}
   else if(s.attachment){const dir=pack.directions[r.direction],at=s.attachment,ops=dir.layers.map(layer=>({depth:layer.depth,layer}));ops.push({depth:at.depth,attachment:at});for(const op of ops.sort((a,b)=>a.depth-b.depth)){if(op.layer){const one={...pack,directions:{[r.direction]:{...dir,layers:[op.layer]}}};vendor.compositor.render(ctx,one,map,{direction:r.direction,frame:Number(s.state),density:4,clear:false});}else{ctx.save();ctx.transform(...at.matrix);if(at.mirrorX){ctx.translate(at.size[0],0);ctx.scale(-1,1);}ctx.drawImage(image(at),0,0);ctx.restore();}}}
   else vendor.compositor.render(ctx,pack,map,{direction:r.direction,frame:Number(s.state),density:4});
  }
  for(const l of [...s.layers].sort((a,b)=>a.depth-b.depth)){
   if(l.operation==='source-over'){ctx.save();if(l.mirrorX){ctx.translate(w,0);ctx.scale(-1,1);}ctx.drawImage(image(l),0,0);ctx.restore();}
   else if(l.operation==='replace-rgba-under-mask'){
    if((hiddenSlots.length||recolored)&&l.role!=='authored-hand-and-orb')continue; // never reintroduce authored head pixels into a dynamic head composition
    const scratch=makeCanvas(w,h),sc=scratch.getContext('2d');sc.drawImage(image(l),0,0);const patch=sc.getImageData(0,0,w,h).data;sc.clearRect(0,0,w,h);sc.drawImage(image(l.mask),0,0);const mask=sc.getImageData(0,0,w,h).data,out=ctx.getImageData(0,0,w,h);for(let i=0;i<out.data.length;i+=4)if(mask[i]>0)out.data.set(patch.subarray(i,i+4),i);ctx.putImageData(out,0,0);
   }else throw Error('Unsupported atomic operation');
  }
  if(!hiddenSlots.length&&!recolored&&s.canvasRoundingPatch?.length){const out=ctx.getImageData(0,0,w,h);for(const [pixel,red,green,blue,alpha] of s.canvasRoundingPatch){const i=pixel*4;out.data[i]=red;out.data[i+1]=green;out.data[i+2]=blue;out.data[i+3]=alpha;}ctx.putImageData(out,0,0);}
  return {width:w,height:h,density:4,pivot:{x:r.pivot[0]*4+renderOffset[0],y:r.pivot[1]*4+renderOffset[1]},source:r.id,state:s.state,frames:r.states.length,timeline:r.timeline,fps:r.fps,physicalScale:1,hairSeparated:r.hairSeparated,roundingCorrection:!hiddenSlots.length&&!recolored,roundingTolerance:hiddenSlots.length?1:0};}finally{ctx.restore();}
 }
 return {resolve,requiredFiles,render};
}
const api={create};root.MareReworkWeaponNativeHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
