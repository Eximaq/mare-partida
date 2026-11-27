/* Native-pixel offsets, scoped to one synchronous HD composition. */
(function(root){
'use strict';
const reference='36c68a69254c6dbf3c7e31f61a7c69109f173e77';
const slots=['coat','legs','boots','gloves','head','weapon'];
const footLabels={'foot:left':'Bota esquerda','foot:right':'Bota direita','foot:near':'Bota próxima','foot:far':'Bota distante','foot:0':'Bota 1','foot:1':'Bota 2'};
function bootGroup(item,name){
 const match=/^(?:(?:equip-)?boot|firearm-(?:north|south|east|west)-boots-)(\d+)-(left|right|near|far|0|1)(?:-|$)/.exec(name)
  ||/^boot(\d+)-(?:mouth-rear|rear-mouth|screen|shell)-([01])$/.exec(name);
 if(!match||Number(match[1])!==item)return null;
 // Numbered source feet retain their authored identities through turns and crossed legs.
 return 'foot:'+match[2];
}
const alias={torso:'coat',pants:'legs'};
const empty=()=>({schema:1,reference,space:'native-screen-px',revision:0,records:[]});
const fields=['body','weapon','receiver','action','direction','slot','item','part'];
// For clothing, weapon is an import witness. Equivalent rigs share the offset.
const key=r=>JSON.stringify(fields.map(f=>f==='weapon'&&r.slot!=='weapon'?null:r[f]));
function samePart(a,b){
 return a.body===b.body&&a.action===b.action&&a.slot===b.slot&&a.item===b.item&&a.part===b.part;
}
// XY defaults describe a catalog item on the screen. Phase, style and rig overrides
// stay attached to the signed source that owns those pixels.
function gearOf(player,weaponless=false){return Object.fromEntries(slots.flatMap(s=>{
 const worn=player.equipment?.[s],id=worn?.def??worn;
 return Number.isSafeInteger(id)&&!(s==='weapon'&&weaponless)?[[s,id]]:[];
}));}
function sameGear(a,b){return !!a&&!!b&&slots.every(s=>a[s]===b[s]);}
function positionKey(r){
 return JSON.stringify([r.body,r.action,r.slot,r.item,r.part,r.range,
  r.range==='motion'?null:r.direction,r.range==='pose'?r.receiver:null,...(r.range==='outfit'?slots.map(s=>r.witness.gear[s]??null):[])]);
}
function sameTarget(t,r){
 return key(t)===key(r)&&t.source===r.source;
}
function targetKeyMatches(t,r){return key(t)===key(r)||!!t.legacyTarget&&key(t.legacyTarget)===key(r);}
function matches(t,r){return sameTarget(t,r)||!!t.legacyTarget&&sameTarget(t.legacyTarget,r);}
function localRecord(t,records){
 return records.find(r=>!r.range&&sameTarget(t,r))||(t.legacyTarget&&records.find(r=>!r.range&&sameTarget(t.legacyTarget,r)));
}
function positionFor(target,records,gear){
 let outfit,local,directional,motion,exactRecord;
 const transferable=target.part==='*'||Object.hasOwn(footLabels,target.part);
 for(const r of records){
  if(!samePart(r,target))continue;
  const exact=(r.receiver===target.receiver||r.receiver===target.legacyTarget?.receiver)&&r.direction===target.direction;
  if(exact&&!matches(target,r))continue;
  if(!transferable&&!exact&&r.source!==target.source)continue;
  if(r.range==='outfit'&&r.direction===target.direction&&sameGear(r.witness.gear,gear))outfit=r;
  else if(r.range==='pose'&&exact)local=r;
  else if(r.range==='direction'&&r.direction===target.direction)directional=r;
  else if(r.range==='motion'&&r.direction===target.direction)motion=r;
  else if(!r.range&&exact)exactRecord=r;
 }
 return outfit||local||directional||motion||exactRecord||null;
}
function legacyPositions(manifest){
 const groups=new Map(),configured=new Set();
 for(const r of manifest.records){
  const id=positionKey({...r,range:'direction'});
  if(r.range){configured.add(id);continue;}
  const prev=groups.get(id);
  if(prev===null)continue;
  if(prev&&(r.cycle[0]!==prev.cycle[0]||r.cycle[1]!==prev.cycle[1]))groups.set(id,null);
  else if(!prev)groups.set(id,r);
 }
 return [...groups].flatMap(([id,r])=>r&&r.cycle.some(Boolean)&&!configured.has(id)?[r]:[]);
}
function shareVerified(manifest,rows){
 if(!rows.length)return manifest;
 const additions=rows.map(r=>({...r,range:'direction',phases:{}}));
 for(const r of additions)delete r.style;
 return {...manifest,schema:3,revision:manifest.revision+1,records:[...manifest.records,...additions]};
}
function withPosition(manifest,t,range,cycle,witness){
 if(!['direction','outfit','pose'].includes(range))throw Error('Selecione uma direção para a posição do item.');
 const {limits,...identity}=t;
 const next={...identity,range,cycle:[...cycle],phases:{},...(witness?{witness}:{})};
 const records=manifest.records.filter(r=>{
  if(!samePart(r,t))return true;
  if(r.range)return positionKey(r)!==positionKey(next)&&!(range==='direction'&&r.range==='pose'&&targetKeyMatches(t,r));
  return true;
 });
 records.push(next);return {...manifest,schema:3,revision:manifest.revision+1,records};
}
// Keep the source direction of an old four-way copy. Untouched directions use the art.
function directionalDraft(manifest){
 const copies=manifest.records.filter(r=>r.range==='motion');
 if(!copies.length)return manifest;
 const records=manifest.records.filter(r=>r.range!=='motion');
 const existing=new Set(records.filter(r=>r.range==='direction').map(positionKey));
 for(const copy of copies){
  const row={...copy,range:'direction'};
  if(!existing.has(positionKey(row)))records.push(row);
 }
 return {...manifest,revision:manifest.revision+1,records};
}
const pair=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger);
const object=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
function keys(o,allowed){
 if(!object(o)||Object.keys(o).some(k=>!allowed.includes(k))||allowed.some(k=>!Object.hasOwn(o,k)))throw Error('Campos incompatíveis no manifesto.');
}
const layerNames={native:'Ordem original',body:'Atrás do corpo',hand:'Atrás do punho',forearm:'Atrás do antebraço',forearmHand:'Atrás do antebraço e punho',arm:'Atrás do braço'};
function checkStyle(value){
 if(!object(value)||Object.keys(value).some(k=>!['angle','flip','layer','size'].includes(k))||
  'angle' in value&&(!Number.isInteger(value.angle)||Math.abs(value.angle)>180)||
  'size' in value&&(!Number.isSafeInteger(value.size)||value.size<1)||
  'flip' in value&&typeof value.flip!=='boolean'||'layer' in value&&!Object.hasOwn(layerNames,value.layer))
  throw Error('Rotação, espelho ou camada inválida.');
}
function styleAt(r,phase){return {...r?.style?.cycle,...r?.style?.phases?.[phase]};}
function phaseTransfer(from,to){
 if(!from.length||from.length!==to.length)throw Error('Os ciclos têm quantidades de quadros diferentes.');
 const phaseMap=new Map(),reverse=new Map();
 for(let i=0;i<from.length;i++){
  const a=from[i].phase,b=to[i].phase;
  if(phaseMap.has(a)&&phaseMap.get(a)!==b||reverse.has(b)&&reverse.get(b)!==a)throw Error('As fases dos ciclos não correspondem.');
  phaseMap.set(a,b);reverse.set(b,a);
 }
 return (rows,convert)=>Object.fromEntries(Object.entries(rows).map(([k,v])=>{
  if(!phaseMap.has(+k))throw Error('Fase sem correspondência no destino.');
  return [phaseMap.get(+k),convert(v)];
 }));
}
// Only rewrite a catalog ID attached to an equipment name. A numbered panel or
// foot is a part identity, even if its number happens to equal the item's ID.
function partName(t){
 return t.part.replace(/(boot[s]?|pants|legs|coat|torso|gloves?|helmets?|headgear|head|weapon|sword|dagger|gun|staff|item)([-_]?)(\d+)(?=[-_]|$)/gi,
  (token,name,separator,id)=>Number(id)===t.item?name+separator+'{item}':token);
}
function unavailableCopyRecord(manifest,sources){
 const t=sources[0];
 if(!t)return null;
 return manifest.records.find(r=>!r.range&&r.slot===t.slot&&r.item===t.item&&r.body===t.body&&r.action===t.action&&r.direction===t.direction&&
  !sources.some(src=>src.part===r.part&&localRecord(src,manifest.records)));
}
// Map authored phases, never mutate either animation. Repeated destination phases
// use their first timeline position, so editing one held pose stays deterministic.
function copyPhases(from,to,adapt){
 try{
  if(from.fps!==to.fps)throw Error('As fases têm ritmos diferentes.');
  return phaseTransfer(from.clock,to.clock);
 }catch(e){
  if(!adapt||!from.clock.length||!to.clock.length)throw Error(e.message+' Ative “Adaptar fases” para distribuir os ajustes pelo ciclo.');
 }
 const mapping=new Map();
 for(const [tick,{phase}] of to.clock.entries()){
  const index=Math.round(tick*(from.clock.length-1)/Math.max(1,to.clock.length-1));
  if(!mapping.has(phase))mapping.set(phase,from.clock[index].phase);
 }
 return (rows,convert)=>Object.fromEntries([...mapping].filter(([,phase])=>Object.hasOwn(rows,phase))
  .map(([dest,source])=>[dest,convert(rows[source])]));
}
function copyItemDirection(manifest,from,to,slot,sourceId,destId,sourceGear,witness,{sourceRecords=manifest.records,adaptPhases=false}={}){
 const sources=from.targets.filter(t=>t.slot===slot&&t.item===sourceId);
 const targets=to.targets.filter(t=>t.slot===slot&&t.item===destId);
 if(!sources.length||!targets.length||['action','direction'].some(k=>sources[0][k]!==targets[0][k]))
  throw Error('As duas peças precisam ter desenho no mesmo movimento e direção.');
 const sameItem=sources[0].body===targets[0].body&&sourceId===destId;
 let next=manifest,remap,count=0;
 const seen=new Set();
 const missing=unavailableCopyRecord({records:sourceRecords},sources);
 if(missing)throw Error('A parte '+missing.part+' de #'+sourceId+' tem ajustes em outra montagem ('+missing.direction+').');
 for(const src of sources){
  const local=localRecord(src,sourceRecords),position=positionFor(src,sourceRecords,sourceGear);
  if(!local&&!position)continue;
  const foot=from.footFor(src),related=targets.filter(t=>to.footFor(t)===foot);
  let matchesPart=related.filter(t=>partName(t)===partName(src));
  // Lining panels may include the donor's material name in an otherwise
  // equivalent boot. Only a unique lining for the same authored foot qualifies.
  if(!matchesPart.length&&foot&&src.part.endsWith('-backing'))matchesPart=related.filter(t=>t.part.endsWith('-backing'));
  // A hand can own a different numbered grip on each weapon. Only match
  // a single authored part of the same hand on both sides.
  const hand=slot==='weapon'&&/^(left|right)-[0-9]+$/.exec(src.part)?.[1];
  if(!matchesPart.length&&hand&&sources.filter(t=>t.part.startsWith(hand+'-')).length===1)
   matchesPart=related.filter(t=>new RegExp('^'+hand+'-[0-9]+$').test(t.part));
  if(!matchesPart.length&&slot==='weapon'&&src.part!=='*'&&sources.length===2&&targets.length===2){
   const only=targets.find(t=>t.part!=='*'),side=only&&/^(left|right)-/.exec(only.part)?.[1];
   if(only&&(!hand||!side||hand===side))matchesPart=[only];
  }
  if(matchesPart.length!==1||seen.has(matchesPart[0]))throw Error('Sem parte correspondente para '+src.part+' em #'+destId+' ('+src.direction+').');
  const dest=matchesPart[0],{limits,...identity}=dest;seen.add(dest);
  const current=positionFor(dest,next.records,witness.gear),xy=position?.cycle??local.cycle;
  const sameBinding=sameItem&&matches(dest,src);
  // Identical signed bindings already share phase edits. Preserve the original
  // record, including its provenance, when only the equipment witness changes.
  if(sameBinding&&current===position){count++;continue;}
  if(sameItem&&!sameBinding&&local&&targetKeyMatches(dest,src))throw Error('A origem e o destino usam assinaturas incompatíveis para a mesma parte.');
  const keepDefault=sameItem||src.body!==dest.body&&current?.range==='direction';
  const scope=current?.range==='outfit'||sameBinding?'outfit':keepDefault?'pose':'direction';
  next=withPosition(next,dest,scope,xy,witness);
  if(sameBinding){count++;continue;}
  next.records=next.records.filter(r=>r.range||!targetKeyMatches(dest,r));
  if(local&&(Object.keys(local.phases).length||local.style)){
   if(Object.keys(local.phases).length||Object.keys(local.style?.phases||{}).length){
    remap??=copyPhases(from,to,adaptPhases);
   }
   const transfer=rows=>Object.keys(rows).length?remap(rows,v=>structuredClone(v)):{};
   next.records.push({...identity,witness,cycle:[0,0],phases:transfer(local.phases),
    ...(local.style?{style:{cycle:{...local.style.cycle},phases:transfer(local.style.phases)}}:{})});
  }
  count++;
 }
 if(!count)throw Error('Sem ajustes de origem compatíveis com esta montagem em '+sources[0].direction+'.');
 return next;
}
function mirrorRecord(r,t,from,to){
 const lateral=['east','west'];
 if(!lateral.includes(r.direction)||!lateral.includes(t.direction)||t.direction===r.direction||
  ['slot','item','body','weapon','action'].some(k=>r[k]!==t[k])||r.receiver.split('@').slice(0,2).join('@')!==t.receiver.split('@').slice(0,2).join('@')||
  !from.length||from.length!==to.length)throw Error('As poses laterais são incompatíveis.');
 const remap=phaseTransfer(from,to);
 const xy=([x,y])=>[x?-x:0,y],mirrorStyle=s=>({...s,...(s.angle?{angle:-s.angle}:{})});
 const {limits,...identity}=t;
 return {...identity,cycle:xy(r.cycle),phases:remap(r.phases,xy),...(r.style?{style:{cycle:mirrorStyle(r.style.cycle),phases:remap(r.style.phases,mirrorStyle)}}:{})};
}
function validate(m){
 keys(m,Object.keys(empty()));
 if(![1,2,3].includes(m.schema)||m.space!==empty().space||!/^[a-f0-9]{40}$/.test(m.reference)||!Number.isSafeInteger(m.revision)||m.revision<0||!Array.isArray(m.records))throw Error('Versão ou coordenadas incompatíveis.');
 const seen=new Set();
 for(const r of m.records){
  keys(r,[...fields,'source','cycle','phases',...(m.schema>=2&&Object.hasOwn(r,'style')?['style']:[]),...(m.schema===3?['range','witness'].filter(k=>Object.hasOwn(r,k)):[])]);
  if(Object.hasOwn(r,'range')&&(!['pose','outfit','direction','motion'].includes(r.range)||r.range==='outfit'&&!r.witness||m.reference!==reference||r.style!==undefined||!object(r.phases)||Object.keys(r.phases).length))throw Error('Alcance ou versão do ajuste de posição incompatível.');
  if(r.witness!==undefined){
   const w=r.witness;keys(w,['role','gear','look','hide']);
   if(typeof w.role!=='string'||!w.role||w.role.length>40||typeof w.hide!=='boolean'||!object(w.gear)||!object(w.look)||
    Object.entries(w.gear).some(([slot,id])=>!slots.includes(slot)||!Number.isSafeInteger(id)||id<0)||w.gear[r.slot]!==r.item||(w.gear.weapon??null)!==r.weapon||
    Object.entries(w.look).some(([k,v])=>!['gender','skinStyle','skinColor','hairStyle','hairColor','eyeStyle','eyeColor'].includes(k)||typeof v!=='string'||v.length>64)||
    w.look.gender!==(r.body==='male'?'masculino':'feminino'))throw Error('Configuração de origem inválida.');
  }
  if(r.style!==undefined){
   keys(r.style,['cycle','phases']);checkStyle(r.style.cycle);
   if(!object(r.style.phases))throw Error('Fases visuais inválidas.');
   for(const [f,v] of Object.entries(r.style.phases)){if(!/^(0|[1-9]\d*)$/.test(f)||!Number.isSafeInteger(+f))throw Error('Fase visual inválida.');checkStyle(v);}
  }
  if(!slots.includes(r.slot)||!['male','female'].includes(r.body)||!['north','south','east','west'].includes(r.direction)||
   !Number.isSafeInteger(r.item)||r.item<0||!(r.weapon===null||Number.isSafeInteger(r.weapon)&&r.weapon>=0)||
   ![r.receiver,r.action,r.part].every(v=>typeof v==='string'&&v.length>0&&v.length<=512)||!/^[a-f0-9]{64}$/.test(r.source)||
   !pair(r.cycle)||!object(r.phases)||Object.entries(r.phases).some(([k,p])=>!/^(0|[1-9]\d*)$/.test(k)||!Number.isSafeInteger(+k)||!pair(p)))throw Error('Item, posição ou fase inválida.');
  const id=r.range?positionKey(r):key(r);if(seen.has(id))throw Error('Ajuste duplicado.');seen.add(id);
 }
 return directionalDraft(m);
}
function delta(r,f){const p=r?.phases[f]||[0,0];return [p[0]+(r?.cycle[0]||0),p[1]+(r?.cycle[1]||0)];}
let active=null;
function scoped(context,paint){const previous=active;active=context;try{return paint();}finally{active=previous;}}
const alphaBounds=new WeakMap();
function bounds(image,make){
 const immutable=typeof image.getContext!=='function';let box=immutable&&alphaBounds.get(image);if(box)return box;
 const {width,height}=image;
 // Generated tiles are already 2D canvases. Read their alpha directly.
 let context=immutable?null:image.getContext('2d'),scratch;
 if(!context){scratch=make(width,height);context=scratch.getContext('2d');context.drawImage(image,0,0);}
 const {data}=context.getImageData(0,0,width,height);
 let left=width,right=0,top=height,bottom=0;
 for(let y=0;y<height;y++){
  const row=y*width*4+3;
  let x=0;
  while(x<width&&!data[row+x*4])x++;
  if(x===width)continue;
  left=Math.min(left,x);right=Math.max(right,x+1);
  top=Math.min(top,y);bottom=y+1;
  for(let k=width-1;k>=right;k--)if(data[row+k*4]){right=k+1;break;}
 }
 if(scratch)scratch.width=scratch.height=1;
 box=[left,top,right,bottom];if(immutable)alphaBounds.set(image,box);return box;
}
function extent(ctx,img,args,make){
 const [sx,sy,sw,sh,x,y,w,h]=args.length===8?args:[0,0,img.width,img.height,...args.slice(0,2),...(args.length===4?args.slice(2):[img.width,img.height])];
 let [l,t,r,b]=bounds(img,make);l=Math.max(l,sx);t=Math.max(t,sy);r=Math.min(r,sx+sw);b=Math.min(b,sy+sh);
 if(r<=l||b<=t)return null;
 const m=ctx.getTransform(),points=[];
 for(const u of [l,r])for(const v of [t,b]){
  const a=x+(u-sx)*w/sw,j=y+(v-sy)*h/sh;points.push([m.a*a+m.c*j+m.e,m.b*a+m.d*j+m.f]);
 }
 return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
}
function limits(box,w,h,sign){
 const lo=Math.min(0,-Math.floor(box[0])),hi=Math.max(0,w-Math.ceil(box[2]));
 return [sign===1?lo:-hi,sign===1?hi:-lo,Math.min(0,-Math.floor(box[1])),Math.max(0,h-Math.ceil(box[3]))];
}
const union=(a,b)=>a?[Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[2],b[2]),Math.max(a[3],b[3])]:b;
const plane=(part,phase,w,h,sign)=>JSON.stringify([part,phase,w,h,sign]);
function oriented(style){return !!(style?.angle||style?.flip||style?.size!==undefined&&style.size!==100);}
function around(style,box,sign){
 const x=(box[0]+box[2])/2,y=(box[1]+box[3])/2,theta=(style.angle||0)*sign*Math.PI/180;
 const scale=(style.size??100)/100,cos=Math.cos(theta)*scale,sin=Math.sin(theta)*scale,k=style.flip?-1:1;
 return [cos*k,sin*k,-sin,cos,x-cos*k*x+sin*y,y-sin*k*x-cos*y];
}
function matrices(d,w,h,sign){
 const out=[];
 for(const [part,style] of [['*',d.whole],[d.group,d.foot],[d.part,d.local]]){
  if(oriented(style)){const box=d.geometry.get(plane(part,d.phase,w,h,sign));if(box)out.push(around(style,box,sign));}
 }
 return out;
}
function setMatrix(ctx,d,sign){
 const m=ctx.getTransform();ctx.setTransform(1,0,0,1,sign*d[0],d[1]);
 for(const matrix of matrices(d,ctx.canvas.width,ctx.canvas.height,sign))ctx.transform(...matrix);
 ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);
}
function fits(d,box,w,h,sign){
 const transforms=matrices(d,w,h,sign).reverse(),epsilon=1e-6;
 for(const u of [box[0],box[2]])for(const v of [box[1],box[3]]){
  let x=u,y=v;
  for(const [a,b,c,f,e,g] of transforms)[x,y]=[a*x+c*y+e,b*x+f*y+g];
  x+=sign*d[0];y+=d[1];
  if(x<Math.min(0,box[0])-epsilon||x>Math.max(w,box[2])+epsilon||y<Math.min(0,box[1])-epsilon||y>Math.max(h,box[3])+epsilon)return false;
 }
 return true;
}
const intersect=(a,b)=>a?[Math.max(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[2],b[2]),Math.min(a[3],b[3])]:b;
function inspectingPart(slot,part){
 return !!active&&active.items.has(slot)&&(active.capture?(!active.captureSlots||active.captureSlots.has(slot)):active.offsets.has(JSON.stringify([slot,part,active.phase])));
}
function blit(ctx,slot,part,source,img,args,sign=1,original=null,underlay=null,ownerPart=part,sourceArgs=args){
 if(!active||!active.items.has(slot))return ctx.drawImage(img,...args);
 const {capture,phase,descriptors,make,offsets}=active;
 if(capture&&(!active.captureSlots||active.captureSlots.has(slot))){
  let parts=descriptors.get(slot);if(!parts)descriptors.set(slot,parts=new Map());
  let p=parts.get(part);if(!p)parts.set(part,p={phases:new Map(),sources:new Map()});
  const group=slot==='boots'?bootGroup(active.items.get(slot),ownerPart):null;
  if(p.group===undefined)p.group=group;else if(p.group!==group)p.group=null;
  const box=extent(ctx,img,args,make);
  if(box){
   const w=ctx.canvas.width,h=ctx.canvas.height,lim=limits(box,w,h,sign);
   p.phases.set(phase,intersect(p.phases.get(phase),lim));
   let g=active.geometry.get(slot);if(!g)active.geometry.set(slot,g=new Map());
   for(const id of group?[part,group,'*']:[part,'*']){const k=plane(id,phase,w,h,sign);g.set(k,union(g.get(k),box));}
  }
  if(!p.sources.has(phase))p.sources.set(phase,new Set());
  const {a,b,c,d,e,f}=ctx.getTransform();
  const signature=[source,img.width,img.height,sourceArgs,active.signatureSign??sign];
  p.sources.get(phase).add(JSON.stringify([...signature,[a,b,c,d,e,f]]));
  if(slot==='boots'){
   // Describe the same operation as a direct draw in the body's unpadded plane.
   // The original signature remains valid for drafts made on the larger canvas.
   const tile=active.tile;
   if(tile&&p.bodyReceiver!==null&&(p.bodyReceiver===undefined||p.bodyReceiver===tile.receiver)){
    p.bodyReceiver=tile.receiver;p.bodySources??=new Map();
    if(!p.bodySources.has(phase))p.bodySources.set(phase,new Set());
    const x=e-tile.inset,y=f-tile.inset;
    const matrix=tile.reflected?[-a,b,-c,d,tile.width-x,y]:[a,b,c,d,x,y];
    p.bodySources.get(phase).add(JSON.stringify([...signature,matrix]));
   }else p.bodyReceiver=null;
  }
 }else if(!capture){
  const d=offsets.get(JSON.stringify([slot,part,phase]));
  if(d&&active.hidden?.has(d.layer)){if(underlay)ctx.drawImage(underlay,...args);return;}
  if(d&&(d[0]||d[1]||oriented(d.whole)||oriented(d.foot)||oriented(d.local))){
   if(underlay)ctx.drawImage(underlay,...args);
   ctx.save();try{setMatrix(ctx,d,sign);ctx.imageSmoothingEnabled=false;ctx.drawImage(img,...args);}finally{ctx.restore();}
   return;
  }
 }
 if(typeof original==='function')original();else ctx.drawImage(original||img,...args);
}
// Material labels are encoded in the red channel of the signed skin map.
function material(ctx,slot,part,source,original,mask,args,sign=1){
 if(!active)return ctx.drawImage(original,...args);
 if(mask.width!==original.width||mask.height!==original.height)throw Error('Máscara incompatível com '+part);
 const make=active.make,gear=make(original.width,original.height),base=make(original.width,original.height);
 try{
  const g=gear.getContext('2d'),b=base.getContext('2d');g.drawImage(original,0,0);b.drawImage(mask,0,0);
  const art=g.getImageData(0,0,gear.width,gear.height),labels=b.getImageData(0,0,base.width,base.height);
  for(let i=0;i<art.data.length;i+=4){
   if(labels.data[i]){labels.data.set(art.data.subarray(i,i+4),i);art.data.fill(0,i,i+4);}
   else labels.data.fill(0,i,i+4);
  }
  g.putImageData(art,0,0);b.putImageData(labels,0,0);
  return blit(ctx,slot,part,source,gear,args,sign,original,base);
 }finally{gear.width=base.width=1;}
}
function localClip(ctx,rect,slot,part,sign=1){
 const d=active?.offsets.get(JSON.stringify([slot,part,active.phase])),m=ctx.getTransform();
 if(d&&!active.capture)setMatrix(ctx,d,sign);
 ctx.beginPath();ctx.rect(...rect);ctx.clip();
 if(d&&!active.capture)ctx.setTransform(m.a,m.b,m.c,m.d,m.e,m.f);
}
// These names are anatomy layers in the HD rig. A combined forearm/hand is a separate target.
function member(l){
 const id=l.id.toLowerCase().replace(/[-_ ]/g,'');
 if(/^(hand(left|right|near|far)|(left|right|near|far)hand)$/.test(id))return 'hand';
 if(/^(forearmhand(left|right|near|far)|(left|right|near|far)forearmhand)$/.test(id))return 'forearmHand';
 if(/^(forearm(left|right|near|far)|(left|right|near|far)forearm)$/.test(id))return 'forearm';
 if(/^(arm(left|right|near|far)|(left|right|near|far)upperarm|upperarm(left|right|near|far))$/.test(id))return 'arm';
}
function anatomy(ctx,id,img,args){
 if(!active||!id)return ctx.drawImage(img,...args);
 if(active.capture){
  if(!active.members.has(active.phase))active.members.set(active.phase,new Set());
  active.members.get(active.phase).add(id);
 }
 if(active.mark?.kind!==id)return ctx.drawImage(img,...args);
 const tile=active.make(img.width,img.height),c=tile.getContext('2d');
 try{c.drawImage(img,0,0);c.globalCompositeOperation='source-in';c.fillStyle=active.mark.color;c.fillRect(0,0,tile.width,tile.height);ctx.drawImage(tile,...args);}
 finally{tile.width=tile.height=1;}
}
function lowerLayers(paint,groups){
 const hiddenAll=new Set(groups),mattes=new Map();
 // Two opposite flat pigments recover the visible alpha of the authored limb
 // after all of its parent transforms, clipping, mirroring and other clothing.
 function matte(kind){
  if(mattes.has(kind))return mattes.get(kind);
  const tint=color=>{const {canvas}=paint(hiddenAll,{kind,color});try{return canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;}finally{canvas.width=canvas.height=1;}};
  const black=tint('#000'),white=tint('#fff'),mask=new Uint8Array(black.length/4);
  for(let i=0,j=0;i<black.length;i+=4,j++)mask[j]=Math.max(0,Math.round((white[i]-black[i])*white[i+3]/255));
  mattes.set(kind,mask);return mask;
 }
 function render(i,hidden){
  if(i===groups.length)return paint(hidden);
  const kind=groups[i],front=render(i+1,hidden),back=render(i+1,new Set([...hidden,kind]));
  try{
   const src=front.canvas,ctx=src.getContext('2d'),im=ctx.getImageData(0,0,src.width,src.height);
   const dst=im.data,base=back.canvas.getContext('2d').getImageData(0,0,src.width,src.height).data,mask=kind==='body'?null:matte(kind);
   for(let j=0,p=0;j<dst.length;j+=4,p++){
    const alpha=mask?mask[p]:base[j+3];
    if(!alpha)continue;
    for(let c=0;c<3;c++)dst[j+c]+=(base[j+c]-dst[j+c])*alpha/255;
   }
   ctx.putImageData(im,0,0);return front;
  }finally{back.canvas.width=back.canvas.height=1;}
 }
 return render(0,new Set());
}
// Keep the historical source signature. Only the screen-space editing transform
// and its clipping limits need the reflection that follows this intermediate tile.
function bodyPlane(pack,density,inset,reflected,paint){
 const width=pack.frame.width*density,height=pack.frame.height*density;
 const receiver=width+'x'+height+'@'+pack.pivot.x*density+','+pack.pivot.y*density;
 return scoped({...active,tile:{receiver,reflected,width,inset},signatureSign:active.sign,sign:reflected?-active.sign:active.sign},paint);
}
function layer(ctx,l,img,args){
 if(l.positionOwner&&l.positionSource)return blit(ctx,l.positionOwner,l.positionPart||l.id,l.positionSource,img,args,active.sign);
 const owner=active?.layers.get(l.id);
 if(owner&&owner.sources.has(l.source))return blit(ctx,owner.slot,l.id,l.source,img,args,active.sign);
 anatomy(ctx,member(l),img,args);
}
async function digest(value){
 const sum=await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));
 return Array.from(new Uint8Array(sum),v=>v.toString(16).padStart(2,'0')).join('');
}
function session(r,player,options,make,captureSlots=null){
 const plan=r.independentPlan,body=['feminino','female'].includes(player.appearance96?.gender)?'female':'male';
 const items=new Map(),layers=new Map(),descriptors=new Map(),offsets=new Map();
 for(const slot of slots){
  const v=player.equipment?.[slot],id=v?.def??v;
  if(Number.isSafeInteger(id)&&!(slot==='weapon'&&options.weaponless)&&!(slot==='head'&&(root.MareHeadgear?.hidden(player)??player.preferences?.hideHeadgear))&&!r.omitted?.includes(slot))items.set(slot,id);
 }
 for(const [name,pass] of plan?.passes||[]){
  for(const l of [...(pass?.layers||[]),...(pass?.decorator?.own?.cloth?[pass.decorator.own.cloth]:[])]){
   if(pass.repair?.includes(l.id)||pass.daggerTorso?.repair?.includes(l.id))continue;
   layers.set(l.id,{slot:alias[name]||name,sources:new Set(l.frames||[l.source])});
  }
 }
 const meta={body,action:r.resolvedAction||r.action,direction:r.direction,weapon:items.get('weapon')??null};
 const gear=gearOf(player,options.weaponless),geometry=new Map(),members=new Map(),depthByPhase=new Map();
 let targets=[],lookup=new Map();
 function visit(phase,capture,fn){
  const context={phase,capture,captureSlots,make,items,layers,descriptors,offsets,geometry,members,sign:plan?.base?.base?.mirrorX||plan?.base?.mirrorX?-1:1};
  const paint=(hidden,mark)=>scoped({...context,hidden,mark,materialCache:new Map()},fn);
  const depths=!capture&&depthByPhase.get(phase);
  return depths?.length?lowerLayers(paint,depths):paint();
 }
 async function describe(slot,parts,receiver,clock,fps,bodySpace=false){
   const all=new Map(),signatures=[],groups=new Map(),result=[];
   for(const [part,data] of parts){
    const identity=[part,receiver,clock,fps,[...(bodySpace?data.bodySources:data.sources)].map(([p,s])=>[p,[...s].sort()])];
    signatures.push(identity);
    if(data.group&&data.phases.size){
     const foot=groups.get(data.group)||{limits:new Map(),sources:[]};
     foot.sources.push(identity);
     for(const [phase,lim] of data.phases)foot.limits.set(phase,intersect(foot.limits.get(phase),lim));
     groups.set(data.group,foot);
    }
    for(const [phase,lim] of data.phases)all.set(phase,intersect(all.get(phase),lim));
    if(data.phases.size)result.push({...meta,receiver,slot,item:items.get(slot),part,source:await digest(identity),limits:Object.fromEntries(data.phases)});
   }
   if(all.size){
    const signature=await digest(signatures.sort((a,b)=>a[0].localeCompare(b[0])));
    const rig=receiver+'@'+signature.slice(0,16);
    for(const t of result)t.receiver=rig;
    // Virtual groups do not contribute to the existing pair or panel signatures.
    // Only offer a whole foot when all visible panels have an identified owner.
    if([...parts.values()].every(p=>!p.phases.size||p.group))for(const [part,foot] of groups){
     foot.sources.sort((a,b)=>a[0].localeCompare(b[0]));
     result.push({...meta,receiver:rig,slot,item:items.get(slot),part,source:await digest([part,foot.sources]),limits:Object.fromEntries(foot.limits)});
    }
    result.push({...meta,receiver:rig,slot,item:items.get(slot),part:'*',source:signature,limits:Object.fromEntries(all)});
   }
   return result;
 }
 async function finish(info,clock=[],fps=info.fps){
  const receiver=info.width+'x'+info.height+'@'+info.pivot.x+','+info.pivot.y;
  for(const [slot,parts] of descriptors){
   const original=await describe(slot,parts,receiver,clock,fps);
   const planes=new Set([...parts.values()].map(p=>p.bodyReceiver));
   const bodyReceiver=planes.size===1&&planes.values().next().value;
   if(!bodyReceiver){targets.push(...original);continue;}
   const canonical=await describe(slot,parts,bodyReceiver,clock,fps,true);
   for(const [i,t] of canonical.entries()){
    Object.defineProperty(t,'legacyTarget',{value:original[i]});targets.push(t);
   }
  }
  lookup=new Map();
  for(const t of targets){lookup.set(key(t),t);if(t.legacyTarget)lookup.set(key(t.legacyTarget),t);}
 }
 function originalOutfit(a){
  const w=a.witness;
  if(!w||w.role!==player.classId||w.hide!==!!player.preferences?.hideHeadgear||a.weapon!==meta.weapon)return false;
  if(Object.entries(w.look).some(([k,v])=>player.appearance96?.[k]!==v))return false;
  return sameGear(w.gear,gear);
 }
 function configure(manifest,strict=false){
  const selected=manifest.records.filter(a=>a.body===body&&a.action===meta.action&&a.direction===r.direction&&items.get(a.slot)===a.item&&
   (lookup.has(key(a))||originalOutfit(a)||manifest.schema<3&&a.weapon===meta.weapon));
  const accepted=new Map(),errors=[],invalid=new Set();
  for(const a of selected){
   const t=lookup.get(key(a));
   if(!t||!matches(t,a)||[...Object.keys(a.phases),...Object.keys(a.style?.phases||{})].some(f=>!Object.hasOwn(t.limits,f))){invalid.add(a.slot);errors.push('Fonte, receptor ou fase incompatível • '+a.slot+' #'+a.item);continue;}
   if(!a.range&&(!accepted.has(key(t))||sameTarget(t,a)))accepted.set(key(t),a);
  }
  const positions=manifest.records.filter(a=>a.body===body&&a.action===meta.action&&items.get(a.slot)===a.item&&a.direction===meta.direction);
  for(const t of targets){
   const p=positionFor(t,positions,gear);
   if(p){const k=key(t);accepted.set(k,{phases:{},...accepted.get(k),cycle:p.cycle});}
  }
  const next=new Map();
  for(const t of targets.filter(v=>v.part!=='*'&&!Object.hasOwn(footLabels,v.part))){
   const whole=accepted.get(key({...t,part:'*'})),part=accepted.get(key(t));
   const group=descriptors.get(t.slot).get(t.part).group,foot=group&&accepted.get(key({...t,part:group}));
   if(!whole&&!part&&!foot)continue;
   for(const [f,b] of Object.entries(t.limits)){
    const a=delta(whole,f),p=delta(part,f),s=delta(foot,f),v=[a[0]+p[0]+s[0],a[1]+p[1]+s[1]];
    if(v[0]<b[0]||v[0]>b[1]||v[1]<b[2]||v[1]>b[3]){invalid.add(t.slot);errors.push('Deslocamento recorta '+t.part+' na fase '+f);break;}
    const parent=styleAt(whole,f),shoe=styleAt(foot,f),local=styleAt(part,f),g=geometry.get(t.slot);
    Object.assign(v,{whole:parent,group,foot:shoe,local,part:t.part,phase:+f,geometry:g,layer:local.layer??shoe.layer??parent.layer??'native'});
    if(!['native','body'].includes(v.layer)&&!members.get(+f)?.has(v.layer)){invalid.add(t.slot);errors.push('A pose não separa esse membro na fase '+f);break;}
    if(oriented(parent)||oriented(shoe)||oriented(local)){
     for(const [k,box] of g){
      const [name,phase,w,h,sign]=JSON.parse(k);
      if(name===t.part&&phase===+f&&!fits(v,box,w,h,sign)){invalid.add(t.slot);errors.push('A transformação recorta '+t.part+' na fase '+f);break;}
     }
    }
    next.set(JSON.stringify([t.slot,t.part,+f]),v);
   }
  }
  if(errors.length&&strict)throw Error(errors.join('\n'));
  offsets.clear();depthByPhase.clear();
  // A stale source affects only its owner. Strict edits above are atomic.
  for(const [k,v] of next)if(!invalid.has(JSON.parse(k)[0])){
   offsets.set(k,v);
   if(v.layer!=='native'){
    const depths=depthByPhase.get(v.phase)||[];
    if(!depths.includes(v.layer))depths.push(v.layer);
    depthByPhase.set(v.phase,depths.sort((a,b)=>Object.keys(layerNames).indexOf(a)-Object.keys(layerNames).indexOf(b)));
   }
  }
  return errors;
 }
 function availableLayers(t,phase){
  const phases=phase==null?Object.keys(t.limits).map(Number):[phase];
  return Object.keys(layerNames).filter(n=>n==='native'||n==='body'||phases.every(f=>members.get(f)?.has(n)));
 }
 const footFor=t=>t?.slot==='boots'?(Object.hasOwn(footLabels,t.part)?t.part:descriptors.get('boots')?.get(t.part)?.group):null;
 return {visit,finish,configure,availableLayers,footFor,get targets(){return targets;},get moved(){return [...offsets.values()].some(v=>v[0]||v[1]||oriented(v.whole)||oriented(v.foot)||oriented(v.local)||v.layer!=='native');}};
}
function offset(slot,part){return active&&!active.capture?active.offsets.get(JSON.stringify([slot,part,active.phase]))||[0,0]:[0,0];}
const api={empty,validate,slots,key,matches,targetKeyMatches,localRecord,gearOf,positionKey,positionFor,samePart,withPosition,legacyPositions,shareVerified,layerNames,footLabels,unavailableCopyRecord,copyItemDirection,mirrorRecord,styleAt,session,inspectingPart,blit,material,layer,bodyPlane,offset,localClip,original:paint=>scoped(null,paint),get materialCache(){return active?.materialCache;},get active(){return !!active;}};
root.MareHDPosition=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
