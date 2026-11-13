/* Original density4 weapon sources. No legacy donor, resizing or guessed outfit binding. */
(function(root){'use strict';
// Exact M151/head157 SOUTH pilot. Silver hair belongs to the full-occlusion helmet.
const rifle115V5={
  "id": "rifle115-v5-south-native-layers",
  "sourceArchiveSHA256": "d87a8ccc05a8aff100db2c7454dd40355c7dfef65e7fbc45d164005f3535d585",
  "equipment": {
    "weapon": 115,
    "coat": 151,
    "head": 157
  },
  "body": "male",
  "direction": "south",
  "states": [
    {
      "state": "0",
      "base": "912ba2e7d1c232e1aa0c472afa006880bae11276d200bc407594de13394ebcb7",
      "layers": [
        "912ba2e7d1c232e1aa0c472afa006880bae11276d200bc407594de13394ebcb7",
        "5f100d6014552b0fa4f27241bfa00ebf2501d634920df7dbcfa3b1355fa6bd34",
        "2b0a0afd2eff70d6d29b84604ae5527f88d823efc571df3e9bfc209bb961495c"
      ],
      "approved": "48c7151a6fda41172727b4f539c13f80c497a0304877dbca08c3f098ed825711"
    },
    {
      "state": "1",
      "base": "8cf33bba9d700b01d879200a44839b1469d1d25faf73d6ae374bbc12fdaa534a",
      "layers": [
        "8cf33bba9d700b01d879200a44839b1469d1d25faf73d6ae374bbc12fdaa534a",
        "027998619d3bbe8a8a6f0fc681871f513368bb412db1f8f3da0109df5cd70255",
        "5e3eb24a1259061d7f33e4482e75ef07ea3571399ac18b89e84c1b1f2c8d722b"
      ],
      "approved": "d8ea2c8e1e547d69b5ff4e3fa3e9110b62a1d021390a351331eace11d7f72ad6"
    },
    {
      "state": "2",
      "base": "2617aaaa30c1bdf49e856bca4204ea74ad14372d1c82171b33b3717858e2ba5b",
      "layers": [
        "2617aaaa30c1bdf49e856bca4204ea74ad14372d1c82171b33b3717858e2ba5b",
        "c2f1ee6a19191710f695d5f5a0060eafc88c136f85d8da89c2fed074171be9f2",
        "b98738f93241a0b024b6ae3224a5e8ff41518ba0f223e54475ac3a86b946fe0f"
      ],
      "approved": "896d004933054b6b155f9486377c593d6dbe5037a9a64323ebc8342b02603c92"
    },
    {
      "state": "4",
      "base": "1797589d357b337d9f839354cac56c851ea28a0fff0aac80b3de294462ef9f36",
      "layers": [
        "1797589d357b337d9f839354cac56c851ea28a0fff0aac80b3de294462ef9f36",
        "7e95db4ca4be629d75754cb2087ae7c4992fbc33bc2f451f92b8bf7b7199c503",
        "4927da87477534aa97a9a51bb745c5dc8454d104be86edbba4f50632983e5b81"
      ],
      "approved": "2d5686f855c57c2110e0de8bfc13b17680465717c49455402a8c8635e13f177a"
    },
    {
      "state": "R",
      "base": "0086f923b45b4039e930b153a9ef84972090c9588b246a328c3f9bd3f8111b6b",
      "layers": [
        "0086f923b45b4039e930b153a9ef84972090c9588b246a328c3f9bd3f8111b6b",
        "a758cb006c50f4703a7243c73e7f72ba007a40f11c15b6105fe37e5a9f720899",
        "f75dd7e4c1b03034d54099682cf2160e237fcaaf0b8b0699a8932afac44c893c"
      ],
      "approved": "4708e536a799ebe62b63a0f5fc0fc4af1cd9fce3586cff829f71c265d5542fe5"
    }
  ]
};
function create(index,{vendor=root.ReworkAccessoryVendor,prefix='tools/rework-weapon-layers-hd/',makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h})}={}){
 if(index?.schema!=='native-hd-weapon-layers-v1'||!vendor?.compositor)throw Error('Missing native weapon dependencies');
 const resource=url=>{const p=new URL(url,'https://native.invalid/'+prefix).pathname.slice(1);if(!/^tools\/(rework-weapon-layers-hd|rework-modular-outfits-hd|rework-base-hd)\/assets\/[a-f0-9]{64}\.png$/.test(p))throw Error('Invalid native weapon source path');return p;};
 const body=b=>({masculino:'male',feminino:'female'})[b]||b;
 function resolve({item,body:b,action='attack',direction,appearance={},equipment={},allowExactComposite=true}={}){
  if(item==null)return null;
  const allowed=[12,13,71,72,73,74].includes(Number(item))?["attack","attack-daggers"]:[0,1,67,68,69,70].includes(Number(item))?["attack","attack-sword"]:[14,110,112,2,3,15,109,111,117,118,119,120].includes(Number(item))?['attack','punch','attack-unarmed']:[4,5,113,114,115,116].includes(Number(item))?['attack','shoot','attack-firearm']:[123,124,125,126,127,128,16,121,17,122,31,32].includes(Number(item))?['attack','focus','attack-focus','cast']:[];
  if(!allowed.includes(action)&&!(Number(item)===115&&action==='idle'))return null;if([0,1,67,68,69,70].includes(Number(item))&&[appearance.skin,appearance.skinColor,appearance.hair,appearance.hairStyle,appearance.hairColor,appearance.eyeColor].some(v=>v&&v!=="original"))return null;
  const equippedWeapon=equipment.weapon&&typeof equipment.weapon==='object'?equipment.weapon.def:equipment.weapon;
  if(equippedWeapon!=null&&Number(equippedWeapon)!==Number(item))return null;
  if(allowExactComposite&&Number(item)===115&&body(b)==='male'&&direction==='south'){
   const id=v=>Number(v&&typeof v==='object'?v.def:v);
   const visible=Object.entries(equipment).filter(([k,v])=>v!=null&&!['none','original'].includes(v)&&!['necklace','ring','belt','charm','akuma_no_mi'].includes(k));
   const exact=visible.every(([k,v])=>Object.hasOwn(rifle115V5.equipment,k)&&id(v)===rifle115V5.equipment[k])&&id(equipment.coat)===151&&id(equipment.head)===157;
   const palette=[appearance.skin,appearance.skinColor].every(v=>!v||['original','light'].includes(v))&&[appearance.face,appearance.eyeStyle].every(v=>!v||v==='original')&&(!appearance.eyeColor||['original','blue'].includes(appearance.eyeColor));
   // The baked head is registered to the reference hair selection and palette.
   const hair=(appearance.hair??appearance.hairStyle)==='hair-spiky'&&(!appearance.hairColor||['black','original'].includes(appearance.hairColor));
   const pilot=index.records.find(r=>r.id===rifle115V5.id);
   if(exact&&palette&&hair&&pilot&&pilot.item===115&&pilot.body==='male'&&pilot.direction==='south'&&pilot.density===4&&JSON.stringify(pilot.nativeCanvas)==='[640,640]'&&JSON.stringify(pilot.pivot)==='[80,128]'&&pilot.fps===24&&JSON.stringify(pilot.timeline)===JSON.stringify(['0','1','2','4','R','4','2','1','0'].flatMap((s,i)=>Array([8,3,3,4,2,3,4,4,12][i]).fill(s)))&&pilot.sourceArchiveSHA256===rifle115V5.sourceArchiveSHA256&&pilot.states.length===rifle115V5.states.length&&rifle115V5.states.every(expected=>{
    const s=pilot.states.find(s=>s.state===expected.state);
    return s?.atomic===true&&s.requiredBaseSHA256===expected.base&&s.approved?.sha256===expected.approved&&s.layers.length===3&&s.layers.every((l,i)=>l.sha256===expected.layers[i]&&l.url==='assets/'+expected.layers[i]+'.png'&&l.operation==='source-over')&&s.layers[0].sha256===s.requiredBaseSHA256;
   }))return {...pilot,timeline:action==='idle'?['0']:pilot.timeline,exactComposite:true,colorAppearance:{},equipmentContract:rifle115V5.equipment};
  }
  if(action==='idle')return null;
  const r=index.records.find(r=>r.item===Number(item)&&r.body===body(b)&&r.direction===direction&&r.originalAppearanceCompatible!==false);if(!r)return null;
  if(r.interfaceSkinLocked&&[appearance.skin,appearance.skinColor].some(v=>v&&v!=='original'))return null;
  for(const slot of ['torso','coat','pants','legs','gloves','boots','cloak','head'])if(equipment[slot]!=null&&!['original','none'].includes(equipment[slot]))return null;
  if([123,124,125,126,127,128,2,3,4,5,12,13,14,16,31,32,110,121,71,72,73,74,113,114,115,116,118,119,120].includes(r.item))for(const k of ['skin','skinColor','hairColor','eyeColor'])if(appearance[k]&&!['original'].includes(appearance[k])&&!(r.paletteSupport?.includes(k==='skinColor'?'skin':k)))return null;
  if(appearance.face&&!['original','face-gentle'].includes(appearance.face))return null;
  // Cosmetics are composed separately only after caller hides the authored head slots.
  if([123,124,125,126,127,128,2,3,4,5,12,13,14,16,31,32,110,121,71,72,73,74,113,114,115,116,118,119,120].includes(r.item)&&[appearance.hair,appearance.hairStyle,appearance.head].some(v=>v&&!['original','none'].includes(v)))return null;
  if([112,15,109,111,117,17,122].includes(r.item)&&[appearance.hair,appearance.hairStyle].some(v=>v&&v!=='original'))return null;
  return {...r,colorAppearance:appearance};
 }
 function requiredFiles(r,{frame}={}){if(!r)return [];const states=frame===undefined?r.states:[r.states[frame]];if(states.some(s=>!s))throw Error('Invalid native weapon frame');const files=new Set();for(const s of states){for(const l of [...s.layers,...(s.attachment?[s.attachment]:[])]){files.add(resource(l.url));if(l.mask)files.add(resource(l.mask.url));if(l.paletteMask)files.add(resource(l.paletteMask.url));}if(r.basePack){const d=r.basePack.pack.directions[r.direction];for(const l of d.layers){const key=l.frames?.[Number(s.state)]||l.source,url=r.basePack.images[key];if(!url)throw Error('Missing authored base frame reference');files.add(resource(url));}}}return [...files];}
 function render(ctx,r,images,{frame=0,state,hiddenSlots=[],appearance=r?.colorAppearance||{}}={}){
  if(!r)throw Error('Missing native weapon source');let s=state===undefined?r.states[frame]:r.states.find(s=>s.state===String(state));if(!s)throw Error('Unapproved native weapon state');
  if([123,124,125,126,127,128,2,3,4,5,12,13,14,16,31,32,110,121,71,72,73,74,113,114,115,116,118,119,120].includes(r.item)&&!r.hairSeparated&&hiddenSlots.length)throw Error('115 backing has baked head/hair; hiding slots is unsupported');
  if(hiddenSlots.some(x=>!['hair','face','headBase'].includes(x)))throw Error('Only independent head slots may be hidden');
  const recolored=!!(r.basePack||r.paletteSupport)&&['skin','skinColor','hairColor','eyeColor','face'].some(k=>appearance[k]&&appearance[k]!=='original');
  const renderOffset=r.renderOffsetPhysical??[0,0];if(!Array.isArray(renderOffset)||renderOffset.length!==2||renderOffset.some(v=>!Number.isInteger(v)||v<0))throw Error('Native render offset must be two nonnegative integers');if(renderOffset.some(Boolean)&&(!r.basePack||!s.attachment||s.layers.some(l=>l.operation!=='source-over')||s.canvasRoundingPatch?.length))throw Error('Padded native attachments cannot contain coordinate-addressed RGBA patches');
  const [w,h]=r.nativeCanvas;ctx.canvas.width=w;ctx.canvas.height=h;ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=false;ctx.save();ctx.translate(...renderOffset);try{
  const image=a=>{const im=images.get(resource(a.url))||images.get(a.url);if(!im)throw Error('Missing original asset '+a.url);return im;};
  if(r.basePack){const p=r.basePack.pack,d=p.directions[r.direction],map=new Map();for(const key of new Set(d.layers.filter(l=>!hiddenSlots.includes(l.slot)).map(l=>l.frames?.[Number(s.state)]||l.source))){const url=r.basePack.images[key],im=images.get(resource(url))||images.get(url);if(!im)throw Error('Missing base asset '+url);
   const pad=r.sourceRasterPadding?.[key];
   if(pad!==undefined){
    if(im.width+2*pad!==p.frame.width*4||im.height+2*pad!==p.frame.height*4)throw Error('Invalid padded equipment source '+url);
    const tile=makeCanvas(p.frame.width*4,p.frame.height*4);
    tile.getContext('2d').drawImage(im,pad,pad);
    map.set(key,tile);
   }else map.set(key,im);}
   const pack={...p,directions:{[r.direction]:{...d,layers:d.layers.filter(l=>!hiddenSlots.includes(l.slot))}}};
   if(recolored&&!s.attachment){if(!root.MareReworkBaseHD)throw Error('Native palette renderer unavailable');const base=root.MareReworkBaseHD.create({schema:'rework-full-hd-v1',records:[]},{vendor,prefix:''});base.render(ctx,{id:r.id,pack,direction:r.direction,sourceRefs:[...map.keys()]},map,{frame:Number(s.state),appearance,makeCanvas});}
   else if(s.attachment){const dir=pack.directions[r.direction],at=s.attachment,ops=dir.layers.map(layer=>({depth:layer.depth,layer}));ops.push({depth:at.depth,attachment:at});for(const op of ops.sort((a,b)=>a.depth-b.depth)){if(op.layer){const one={...pack,directions:{[r.direction]:{...dir,layers:[op.layer]}}};ctx.save();if(r.mirrorLayerIDs?.includes(op.layer.id)){ctx.translate(p.frame.width*4,0);ctx.scale(-1,1);}if(recolored){const tile=makeCanvas(w,h),base=root.MareReworkBaseHD.create({schema:'rework-full-hd-v1',records:[]},{vendor,prefix:''});base.render(tile.getContext('2d'),{id:r.id,pack:one,direction:r.direction,sourceRefs:[...map.keys()]},map,{frame:Number(s.state),appearance,makeCanvas});ctx.drawImage(tile,0,0);}else vendor.compositor.render(ctx,one,map,{direction:r.direction,frame:Number(s.state),density:4,clear:false});ctx.restore();}else{ctx.save();ctx.transform(...at.matrix);if(at.mirrorX){ctx.translate(at.size[0],0);ctx.scale(-1,1);}ctx.drawImage(image(at),0,0);ctx.restore();}}}
   else vendor.compositor.render(ctx,pack,map,{direction:r.direction,frame:Number(s.state),density:4});
  }
  const paletteImage=l=>{const original=image(l);if(!recolored||!l.paletteMask)return original;const api=root.MareAppearance96;if(!api)throw Error('Native material palette API unavailable');const tile=makeCanvas(original.width,original.height),tc=tile.getContext('2d');tc.drawImage(original,0,0);const pixels=tc.getImageData(0,0,tile.width,tile.height);tc.clearRect(0,0,tile.width,tile.height);tc.drawImage(image(l.paletteMask),0,0);const material=tc.getImageData(0,0,tile.width,tile.height).data;let rgba=pixels.data;for(const [channel,ramp]of [[0,api.skins[appearance.skin||appearance.skinColor]?.ramp],[1,api.hairs[appearance.hairColor]?.ramp]]){if(!ramp)continue;const mask=new Uint8Array(rgba.length/4);for(let p=0;p<mask.length;p++)mask[p]=material[p*4+channel];rgba=api.recolor(rgba,mask,ramp);}pixels.data.set(rgba);tc.putImageData(pixels,0,0);return tile;};
  for(const l of [...s.layers].sort((a,b)=>a.depth-b.depth)){
   if(l.operation==='source-over'){ctx.save();if(l.mirrorX){ctx.translate(w,0);ctx.scale(-1,1);}let tile=paletteImage(l);
    const ramp=l.skinOnly&&root.MareAppearance96?.skins[appearance.skin||appearance.skinColor]?.ramp;
    if(ramp){const c=makeCanvas(w,h),cx=c.getContext('2d');cx.drawImage(tile,0,0);const d=cx.getImageData(0,0,w,h),api=root.MareAppearance96;d.data.set(api.recolor(d.data,root.MareNativeSkinHD.mask(d.data,w,'anatomy'),ramp));cx.putImageData(d,0,0);tile=c;}
    ctx.drawImage(tile,0,0);ctx.restore();}
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
