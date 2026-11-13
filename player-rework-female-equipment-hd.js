(function(root){'use strict';
const skinMaterials=root.MareNativeSkinHD||(typeof require==='function'?require('./player-rework-skin-hd.js'):null);
function attachIsolatedCoat(record,outfit,coat){
 if(!['idle','walk','attack-unarmed'].includes(record.action)||!outfit||outfit.equipment.torso!==coat||Object.keys(outfit.equipment).length!==1)return null;
 const dir=record.direction,base=record.baseRecord,pack=base.pack,d=pack.directions[dir],o=outfit.pack.directions[dir];
 const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 // The female carry clip has eight states and the original garment has
 // forty ticks over the same second. Keep all garment frames and hold
 // each authored weapon transform for the corresponding five ticks.
 const stride=o.clip.frames/d.clip.frames;
 if(!eq(pack.frame,outfit.pack.frame)||!eq(pack.pivot,outfit.pack.pivot)||pack.density!==outfit.pack.density||
    !Number.isInteger(stride)||stride<1||d.clip.loop!==o.clip.loop||record.states.length!==d.clip.frames||
    record.action!=='idle'&&o.clip.fps!==d.clip.fps*stride||!Object.entries(d.rest).every(([key,point])=>eq(point,o.rest[key])))return null;
 const sourceFrame=i=>Math.floor(i/stride);
 const original=o.layers.filter(l=>l.id.startsWith('base:'));
 const layers=o.layers.filter(l=>!l.id.startsWith('base:'));
 if(original.length!==d.layers.length||o.poses.length!==o.clip.frames||!layers.length||
    layers.some(l=>!l.id.startsWith('coat'+coat+'-')||!['top','underArms'].includes(l.slot)||l.frames&&(l.frames.length!==o.clip.frames||l.frames.some(f=>!f))))return null;
 for(const [index,layer] of d.layers.entries()){
  const {frames, ...source}=layer,{frames:donorFrames,...donor}=original[index];
  if(!eq(source,{...donor,id:donor.id.slice(5)})||!!frames!==!!donorFrames||
     donorFrames&&(donorFrames.length!==o.clip.frames||!donorFrames.every((sha,i)=>sha===frames[sourceFrame(i)])))return null;
 }
 if(!o.poses.every((pose,i)=>Object.entries(d.poses[sourceFrame(i)]).every(([key,point])=>eq(point,pose[key]))))return null;
 const refs=[...new Set(layers.flatMap(l=>l.frames||[l.source]))];
 if(refs.some(sha=>!outfit.sourceRefs.includes(sha)||base.sourceRefs.includes(sha)))return null;
 const combined={...pack,directions:{...pack.directions,[dir]:{...o,clip:record.action==='idle'?d.clip:o.clip,layers:[...original.map(l=>({...l,id:l.id.slice(5)})),...layers]}}};
 const states=o.poses.map((_,i)=>record.states[sourceFrame(i)]);
 return {...record,states,id:record.id+'-coat'+coat+'-native',pack:combined,baseRecord:{...base,pack:combined,sourceRefs:[...base.sourceRefs,...refs]},outfitSources:refs,outfitSourceId:outfit.id,sourceRasterPadding:outfit.sourceRasterPadding};
}
const asset=(r,sha)=>'tools/'+(r.outfitSources?.includes(sha)?'rework-modular-outfits-hd':'rework-base-hd')+'/assets/'+sha+'.png';
function create(index,{outfits,appearanceRegistry,vendor=root.ReworkAccessoryVendor?.compositor,makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h})}={}){if(index?.schema!=='female-native-equipment-registration-v1'||!vendor)throw Error('Missing female equipment sources');return {
 resolve({item,body,action,direction,appearance={},equipment={}}={}){if(item==null||!index.records.some(r=>r.item===Number(item))||!['female','feminino'].includes(body))return null;const extra=Object.entries(equipment).filter(([k,v])=>k!=='weapon'&&v!=null&&!['none','original'].includes(v));const clothing=extra.filter(([slot])=>slot!=='head'),head=extra.find(([slot])=>slot==='head')?.[1];if(clothing.length>1||clothing.length===1&&clothing[0][0]!=='coat')return null;if(equipment.weapon!=null&&Number(equipment.weapon?.def??equipment.weapon)!==Number(item))return null;const customized=['hair','hairStyle','skin','skinColor','hairColor','face','eyeStyle','eyeColor'].some(k=>appearance[k]&&appearance[k]!=='original'&&!((k==='eyeColor')&&appearance[k]==='blue'));if(['attack','punch','shoot','focus','cast'].includes(action))action=index.records.find(r=>r.item===Number(item)&&r.action.startsWith('attack-'))?.action||action;const r=index.records.find(r=>r.item===Number(item)&&r.body==='female'&&r.action===action&&r.direction===direction);if(!r)return null;const coat=Number(clothing[0]?.[1]?.def??clothing[0]?.[1]);const outfit=clothing.length&&outfits?.records.find(row=>row.id==='female-torso'+coat+'-'+direction+'-frozen-'+(action==='attack-unarmed'?'attack':action)+'-native');const combined=clothing.length?attachIsolatedCoat(r,outfit,coat):{...r,pack:r.baseRecord.pack};if(!combined)return null;if(!customized&&head==null)return combined;const material=appearanceRegistry?.resolve(combined.baseRecord,{hair:appearance.hair||appearance.hairStyle,head:head?.def??head,appearance});if(!material)return null;return {...combined,id:combined.id+':'+material.id,material,colorAppearance:appearance};},
 requiredFiles(r,{frame}={}){const d=r.baseRecord.pack.directions[r.direction],states=frame===undefined?r.states:[r.states[frame]];if(states.some(s=>!s))throw Error('Invalid female equipment frame');const refs=frame===undefined?r.baseRecord.sourceRefs:d.layers.map(l=>l.frames?.[frame]||l.source).filter(Boolean);return [...new Set([...refs.map(s=>asset(r,s)),...(r.material?appearanceRegistry.requiredFiles(r.material):[]),...states.flatMap(s=>[...s.parts.map(p=>p.url),...Object.values(s.baseMasks||{})])])]},
 render(ctx,r,images,{frame=0,makeCanvas:frameCanvas=makeCanvas}={}){let p=r.baseRecord.pack,d=p.directions[r.direction];
 const map=new Map(r.baseRecord.sourceRefs.map(s=>[s,images.get(asset(r,s))]));
 for(const [sha,padding] of Object.entries(r.sourceRasterPadding||{})){
  const image=map.get(sha);
  if(!image)continue;
  if(image.width!==padding.sourceSize||image.height!==padding.sourceSize||
     image.width+2*padding.offset!==p.frame.width*4||image.height+2*padding.offset!==p.frame.height*4)throw Error('Invalid female garment padding '+sha);
  const tile=frameCanvas(p.frame.width*4,p.frame.height*4);
  tile.getContext('2d').drawImage(image,padding.offset,padding.offset);
  map.set(sha,tile);
 }
 if(r.material){
  const head=d.layers.find(layer=>layer.slot==='headBase'),source='custom-head';
  const tile=appearanceRegistry.compose(r.baseRecord,r.material,images);
  const layers=d.layers.filter(layer=>!['headBase','face','hair'].includes(layer.slot)).concat({...head,source,frames:undefined});
  d={...d,layers};p={...p,directions:{...p.directions,[r.direction]:d}};map.set(source,tile);
  if(r.material.skinColor){
   const skin=skinMaterials,api=root.MareAppearance96,ramp=api.skins[r.material.skinColor].ramp;
   for(const [sha,image] of map){
    const kind=skin.ownership(d.layers.filter(layer=>(layer.frames?.[frame]||layer.source)===sha&&layer.slot!=='headBase'));
    if(!image||!kind)continue;
    const tile=frameCanvas(image.width,image.height),c=tile.getContext('2d');c.drawImage(image,0,0);
    const data=c.getImageData(0,0,tile.width,tile.height);data.data.set(api.recolor(data.data,skin.mask(data.data,tile.width,kind),ramp));
    c.putImageData(data,0,0);map.set(sha,tile);
   }
  }
 }const pad=r.paddingPhysical||0;ctx.canvas.width=p.frame.width*4+pad*2;ctx.canvas.height=p.frame.height*4+pad*2;ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.imageSmoothingEnabled=false;ctx.save();ctx.translate(pad,pad);const ops=[...d.layers.filter(l=>!r.states[frame].hideBaseLayers?.includes(l.id)).map(layer=>({depth:layer.depth,layer})),...r.states[frame].parts.map(part=>({depth:part.depth,part}))];for(const op of ops.sort((a,b)=>a.depth-b.depth)){if(op.layer){const mask=r.states[frame].baseMasks?.[op.layer.id],tile=mask?frameCanvas(p.frame.width*4,p.frame.height*4):null,c=tile?tile.getContext('2d'):ctx;vendor.render(c,{...p,directions:{[r.direction]:{...d,layers:[op.layer]}}},map,{direction:r.direction,frame,density:4,clear:false});if(mask){c.globalCompositeOperation='destination-out';c.drawImage(images.get(mask),0,0);ctx.drawImage(tile,0,0)}}else{ctx.save();ctx.transform(...op.part.matrix);if(op.part.sourceClip){ctx.beginPath();ctx.rect(...op.part.sourceClip);ctx.clip()}ctx.drawImage(images.get(op.part.url),0,0);ctx.restore()}}ctx.restore();return {width:ctx.canvas.width,height:ctx.canvas.height,physicalScale:1,density:4,pivot:{x:p.pivot.x*4+pad,y:p.pivot.y*4+pad},frames:d.clip.frames,fps:d.clip.fps,source:r.id,sourceBaseId:r.sourceBaseId}}};}
const api={create};root.MareReworkFemaleEquipmentHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
