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
    layers.some(l=>!['top','underArms'].includes(l.slot)||l.frames&&(l.frames.length!==o.clip.frames||l.frames.some(f=>!f))))return null;
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
 return {...record,states,id:record.id+'-coat'+coat+'-native',pack:combined,baseRecord:{...base,pack:combined,sourceRefs:[...base.sourceRefs,...refs]},outfitSources:refs,outfitSourceId:outfit.id,skinRepairLayers:layers.filter(l=>l.id.startsWith('original-neck-coverage-only')).map(l=>l.id),sourceRasterPadding:outfit.sourceRasterPadding};
}
function attachSwordCoat(record,outfit,coat){
 if(record.item!==0||record.action!=='attack-sword'||!outfit||
    outfit.equipment.torso!==coat||Object.keys(outfit.equipment).length!==1)return null;
 const {direction,baseRecord:base}=record,pack=base.pack,d=pack.directions[direction],o=outfit.pack.directions[direction];
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 if(!same(pack.frame,outfit.pack.frame)||!same(pack.pivot,outfit.pack.pivot)||pack.density!==outfit.pack.density||
    d.clip.frames!==o.clip.frames||d.clip.fps!==o.clip.fps||d.clip.contactFrame!==o.clip.contactFrame||
    !same(d.rest.NECK,o.rest.NECK)||!same(d.rest.NOSE,o.rest.NOSE))return null;
 const layers=o.layers.filter(l=>!l.id.startsWith('base:'));
 const refs=[...new Set(layers.map(l=>l.source))];
 if(!layers.length||layers.some(l=>!['top','underArms'].includes(l.slot)||l.frames||
    !['fixed','rigid'].includes(l.binding.kind))||refs.some(sha=>!outfit.sourceRefs.includes(sha)||
    base.sourceRefs.includes(sha)||outfit.sourceRasterPadding?.[sha]?.offset!==64))return null;
 const rest={...d.rest},poses=d.poses.map(pose=>({...pose}));
 // Retarget the authored sleeve pair around the shoulder without moving
 // the base anatomy, the sword attachment, or the donor garment pixels.
 for(const {binding} of layers){
  if(binding.kind==='fixed')continue;
  const {a,b}=binding;
  const first=o.poses[0],point=first[a];
  if(!point||!first[b]||!o.rest[a]||!o.rest[b])return null;
  const distance=side=>Math.hypot(point.x-first[side+'_SHOULDER'].x,point.y-first[side+'_SHOULDER'].y);
  if(!first.LEFT_SHOULDER||!first.RIGHT_SHOULDER)return null;
  const side=distance('LEFT')<distance('RIGHT')?'LEFT':'RIGHT';
  const shoulder=side+'_SHOULDER',elbow=side+'_ELBOW';
  if(!d.poses.every(pose=>pose[shoulder]&&pose[elbow])||!o.poses.every(pose=>pose[a]&&pose[b]&&pose[shoulder]&&pose[elbow]))return null;
  rest[a]=o.rest[a];rest[b]=o.rest[b];
  for(let i=0;i<poses.length;i++){
   const src=o.poses[i],dest=poses[i],from=src[shoulder],to=dest[shoulder];
   const angle=Math.atan2(dest[elbow].y-to.y,dest[elbow].x-to.x)-Math.atan2(src[elbow].y-from.y,src[elbow].x-from.x);
   const sin=Math.sin(angle),cos=Math.cos(angle);
   for(const key of [a,b]){
    const x=src[key].x-from.x,y=src[key].y-from.y;
    dest[key]={x:to.x+x*cos-y*sin,y:to.y+x*sin+y*cos};
   }
  }
 }
 const combined={...pack,directions:{...pack.directions,[direction]:{...d,rest,poses,layers:[...d.layers,...layers]}}};
 return {...record,id:record.id+'-coat'+coat+'-native-sword',pack:combined,baseRecord:{...base,pack:combined,sourceRefs:[...base.sourceRefs,...refs]},
  outfitSources:refs,outfitSourceId:outfit.id,sourceRasterPadding:outfit.sourceRasterPadding};
}
function attachPants168(record,outfit){
 if(!outfit||outfit.equipment.pants!==168||Object.keys(outfit.equipment).length!==1)return null;
 const {direction,baseRecord:base}=record,pack=base.pack,d=pack.directions[direction],o=outfit.pack.directions[direction];
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const stride=d.clip.frames/o.clip.frames,frameAt=i=>Math.floor(i/stride);
 if(!equal(pack.frame,outfit.pack.frame)||!equal(pack.pivot,outfit.pack.pivot)||pack.density!==outfit.pack.density||
    !Number.isInteger(stride)||stride<1||d.clip.loop!==o.clip.loop||d.clip.fps!==o.clip.fps*stride||
    !Object.entries(o.rest).every(([key,point])=>equal(point,d.rest[key]))||
    !d.poses.every((pose,i)=>Object.entries(o.poses[frameAt(i)]).every(([key,point])=>equal(point,pose[key]))))return null;
 const index=d.layers.findIndex(layer=>layer.id==='shorts'&&layer.slot==='pants');
 const pants=o.layers.find(layer=>layer.id==='pants168-independent'&&layer.slot==='pants');
 if(index<0||!pants||pants.depth!==d.layers[index].depth||
    record.states.some(state=>state.hideBaseLayers?.includes('shorts')||state.baseMasks?.shorts))return null;
 const frames=layer=>Array.from({length:d.clip.frames},(_,i)=>layer.frames?.[frameAt(i)]||layer.source);
 for(const donor of o.layers.filter(layer=>layer!==pants)){
  const target=d.layers.find(layer=>layer.id===donor.id);
  if(!target)return null;
  const {frames:_,...a}=target,{frames:__,...b}=donor;
  if(!equal(a,b)||!frames(donor).every((sha,i)=>sha===(target.frames?.[i]||target.source)))return null;
 }
 const layers=d.layers.map((layer,i)=>i===index?{...pants,...(pants.frames?{frames:frames(pants)}:{})}:layer);
 const refs=[...new Set([pants.source,...(pants.frames||[])].filter(Boolean))];
 if(!refs.length||refs.some(sha=>!outfit.sourceRefs.includes(sha)||base.sourceRefs.includes(sha)))return null;
 const combined={...pack,directions:{...pack.directions,[direction]:{...d,layers}}};
 return {...record,id:record.id+'-pants168-native',pack:combined,baseRecord:{...base,pack:combined,sourceRefs:[...base.sourceRefs,...refs]},
  outfitSources:[...(record.outfitSources||[]),...refs],outfitSourceId:outfit.id,coatSourceId:record.outfitSourceId};
}
const asset=(r,sha)=>'tools/'+(r.outfitSources?.includes(sha)?'rework-modular-outfits-hd':'rework-base-hd')+'/assets/'+sha+'.png';
function create(index,{outfits,appearanceRegistry,vendor=root.ReworkAccessoryVendor?.compositor,makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h})}={}){if(index?.schema!=='female-native-equipment-registration-v1'||!vendor)throw Error('Missing female equipment sources');return {
 resolve({item,body,action,direction,appearance={},equipment={}}={}){if(item==null||!index.records.some(r=>r.item===Number(item))||!['female','feminino'].includes(body))return null;const extra=Object.entries(equipment).filter(([k,v])=>k!=='weapon'&&v!=null&&!['none','original'].includes(v));const clothing=extra.filter(([slot])=>slot!=='head'),head=extra.find(([slot])=>slot==='head')?.[1];if(clothing.some(([slot])=>!['coat','legs','pants'].includes(slot))||clothing.filter(([slot])=>slot!=='coat').length>1)return null;if(equipment.weapon!=null&&Number(equipment.weapon?.def??equipment.weapon)!==Number(item))return null;const customized=['hair','hairStyle','skin','skinColor','hairColor','face','eyeStyle','eyeColor'].some(k=>appearance[k]&&appearance[k]!=='original'&&!((k==='eyeColor')&&appearance[k]==='blue'));if(['attack','punch','shoot','focus','cast'].includes(action))action=index.records.find(r=>r.item===Number(item)&&r.action.startsWith('attack-'))?.action||action;const r=index.records.find(r=>r.item===Number(item)&&r.body==='female'&&r.action===action&&r.direction===direction);if(!r)return null;const coat=clothing.find(([slot])=>slot==='coat')?.[1],pants=clothing.find(([slot])=>slot!=='coat')?.[1];
 let combined={...r,pack:r.baseRecord.pack};
 if(coat!=null){
  const def=Number(coat.def??coat);
  const outfit=outfits?.records.find(row=>row.id==='female-torso'+def+'-'+direction+'-frozen-'+(['attack-unarmed','attack-sword'].includes(action)?'attack':action)+'-native');
  combined=action==='attack-sword'?attachSwordCoat(r,outfit,def):attachIsolatedCoat(r,outfit,def);
 }
 if(combined&&pants!=null){
  const def=Number(pants.def??pants),outfit=def===168&&outfits?.records.find(row=>row.id==='female-pants168-'+action+'-'+direction);
  combined=attachPants168(combined,outfit);
 }
 if(!combined)return null;if(!customized&&head==null)return combined;const material=appearanceRegistry?.resolve(combined.baseRecord,{hair:appearance.hair||appearance.hairStyle,head:head?.def??head,appearance});if(!material)return null;return {...combined,id:combined.id+':'+material.id,material,colorAppearance:appearance};},
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
    const uses=d.layers.filter(layer=>(layer.frames?.[frame]||layer.source)===sha&&layer.slot!=='headBase');
    const kind=uses.length&&uses.every(layer=>r.skinRepairLayers?.includes(layer.id))?'mixed':skin.ownership(uses);
    if(!image||!kind)continue;
    const tile=frameCanvas(image.width,image.height),c=tile.getContext('2d');c.drawImage(image,0,0);
    const data=c.getImageData(0,0,tile.width,tile.height);data.data.set(api.recolor(data.data,skin.mask(data.data,tile.width,kind),ramp));
    c.putImageData(data,0,0);map.set(sha,tile);
   }
  }
 }const pad=r.paddingPhysical||0;ctx.canvas.width=p.frame.width*4+pad*2;ctx.canvas.height=p.frame.height*4+pad*2;ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.imageSmoothingEnabled=false;ctx.save();ctx.translate(pad,pad);const ops=[...d.layers.filter(l=>!r.states[frame].hideBaseLayers?.includes(l.id)).map(layer=>({depth:layer.depth,layer})),...r.states[frame].parts.map(part=>({depth:part.depth,part}))];for(const op of ops.sort((a,b)=>a.depth-b.depth)){if(op.layer){const mask=r.states[frame].baseMasks?.[op.layer.id],tile=mask?frameCanvas(p.frame.width*4,p.frame.height*4):null,c=tile?tile.getContext('2d'):ctx;vendor.render(c,{...p,directions:{[r.direction]:{...d,layers:[op.layer]}}},map,{direction:r.direction,frame,density:4,clear:false});if(mask){c.globalCompositeOperation='destination-out';c.drawImage(images.get(mask),0,0);ctx.drawImage(tile,0,0)}}else{ctx.save();ctx.transform(...op.part.matrix);if(op.part.sourceClip){ctx.beginPath();ctx.rect(...op.part.sourceClip);ctx.clip()}ctx.drawImage(images.get(op.part.url),0,0);ctx.restore()}}ctx.restore();return {width:ctx.canvas.width,height:ctx.canvas.height,physicalScale:1,density:4,pivot:{x:p.pivot.x*4+pad,y:p.pivot.y*4+pad},frames:d.clip.frames,fps:d.clip.fps,source:r.id,sourceBaseId:r.sourceBaseId}}};}
const api={create};root.MareReworkFemaleEquipmentHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
