/* Native-pixel offsets, scoped to one synchronous HD composition. */
(function(root){
'use strict';
const reference='36c68a69254c6dbf3c7e31f61a7c69109f173e77';
const slots=['coat','legs','boots','gloves','head','weapon'];
const alias={torso:'coat',pants:'legs'};
const empty=()=>({schema:1,reference,space:'native-screen-px',revision:0,records:[]});
const fields=['body','weapon','receiver','action','direction','slot','item','part'];
// For clothing, weapon is an import witness. Equivalent rigs share the offset.
const key=r=>JSON.stringify(fields.map(f=>f==='weapon'&&r.slot!=='weapon'?null:r[f]));
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
function mirrorRecord(r,t,from,to){
 const lateral=['east','west'];
 if(!lateral.includes(r.direction)||!lateral.includes(t.direction)||t.direction===r.direction||
  ['slot','item','body','weapon','action'].some(k=>r[k]!==t[k])||r.receiver.split('@').slice(0,2).join('@')!==t.receiver.split('@').slice(0,2).join('@')||
  !from.length||from.length!==to.length)throw Error('As poses laterais são incompatíveis.');
 const phaseMap=new Map(),reverse=new Map();
 for(let i=0;i<from.length;i++){
  const a=from[i].phase,b=to[i].phase;
  if(phaseMap.has(a)&&phaseMap.get(a)!==b||reverse.has(b)&&reverse.get(b)!==a)throw Error('As fases dos dois lados não correspondem.');
  phaseMap.set(a,b);reverse.set(b,a);
 }
 const remap=(rows,convert)=>Object.fromEntries(Object.entries(rows).map(([k,v])=>{
  if(!phaseMap.has(+k))throw Error('Fase lateral sem correspondência.');
  return [phaseMap.get(+k),convert(v)];
 }));
 const xy=([x,y])=>[x?-x:0,y],mirrorStyle=s=>({...s,...(s.angle?{angle:-s.angle}:{})});
 const {limits,...identity}=t;
 return {...identity,cycle:xy(r.cycle),phases:remap(r.phases,xy),...(r.style?{style:{cycle:mirrorStyle(r.style.cycle),phases:remap(r.style.phases,mirrorStyle)}}:{})};
}
function validate(m){
 keys(m,Object.keys(empty()));
 if(![1,2].includes(m.schema)||m.space!==empty().space||!/^[a-f0-9]{40}$/.test(m.reference)||!Number.isSafeInteger(m.revision)||m.revision<0||!Array.isArray(m.records))throw Error('Versão ou coordenadas incompatíveis.');
 const seen=new Set();
 for(const r of m.records){
  keys(r,[...fields,'source','cycle','phases',...(m.schema===2&&Object.hasOwn(r,'style')?['style']:[])]);
  if(r.style!==undefined){
   keys(r.style,['cycle','phases']);checkStyle(r.style.cycle);
   if(!object(r.style.phases))throw Error('Fases visuais inválidas.');
   for(const [f,v] of Object.entries(r.style.phases)){if(!/^(0|[1-9]\d*)$/.test(f)||!Number.isSafeInteger(+f))throw Error('Fase visual inválida.');checkStyle(v);}
  }
  if(!slots.includes(r.slot)||!['male','female'].includes(r.body)||!['north','south','east','west'].includes(r.direction)||
   !Number.isSafeInteger(r.item)||r.item<0||!(r.weapon===null||Number.isSafeInteger(r.weapon)&&r.weapon>=0)||
   ![r.receiver,r.action,r.part].every(v=>typeof v==='string'&&v.length>0&&v.length<=512)||!/^[a-f0-9]{64}$/.test(r.source)||
   !pair(r.cycle)||!object(r.phases)||Object.entries(r.phases).some(([k,p])=>!/^(0|[1-9]\d*)$/.test(k)||!Number.isSafeInteger(+k)||!pair(p)))throw Error('Item, posição ou fase inválida.');
  if(seen.has(key(r)))throw Error('Ajuste duplicado.');seen.add(key(r));
 }
 return m;
}
function delta(r,f){const p=r?.phases[f]||[0,0];return [p[0]+(r?.cycle[0]||0),p[1]+(r?.cycle[1]||0)];}
let active=null;
function scoped(context,paint){const previous=active;active=context;try{return paint();}finally{active=previous;}}
const alphaBounds=new WeakMap();
function bounds(image,make){
 const immutable=typeof image.getContext!=='function';let box=immutable&&alphaBounds.get(image);if(box)return box;
 const tmp=make(image.width,image.height),c=tmp.getContext('2d');c.drawImage(image,0,0);
 const {data}=c.getImageData(0,0,tmp.width,tmp.height);
 let left=tmp.width,right=0,top=tmp.height,bottom=0;
 for(let y=0;y<tmp.height;y++)for(let x=0;x<tmp.width;x++)if(data[(y*tmp.width+x)*4+3]){
  left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);
 }
 tmp.width=tmp.height=1;box=[left,top,right,bottom];if(immutable)alphaBounds.set(image,box);return box;
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
 for(const [part,style] of [['*',d.whole],[d.part,d.local]]){
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
function blit(ctx,slot,part,source,img,args,sign=1,original=null,underlay=null){
 if(!active||!active.items.has(slot))return ctx.drawImage(img,...args);
 const {capture,phase,descriptors,make,offsets}=active;
 if(capture){
  let parts=descriptors.get(slot);if(!parts)descriptors.set(slot,parts=new Map());
  let p=parts.get(part);if(!p)parts.set(part,p={phases:new Map(),sources:new Map()});
  const box=extent(ctx,img,args,make);
  if(box){
   const w=ctx.canvas.width,h=ctx.canvas.height,lim=limits(box,w,h,sign);
   p.phases.set(phase,intersect(p.phases.get(phase),lim));
   let g=active.geometry.get(slot);if(!g)active.geometry.set(slot,g=new Map());
   for(const id of [part,'*']){const k=plane(id,phase,w,h,sign);g.set(k,union(g.get(k),box));}
  }
  if(!p.sources.has(phase))p.sources.set(phase,new Set());
  const {a,b,c,d,e,f}=ctx.getTransform();
  p.sources.get(phase).add(JSON.stringify([source,img.width,img.height,args,sign,[a,b,c,d,e,f]]));
 }else{
  const d=offsets.get(JSON.stringify([slot,part,phase]));
  if(d&&active.hidden?.has(d.layer)){if(underlay)ctx.drawImage(underlay,...args);return;}
  if(d&&(d[0]||d[1]||oriented(d.whole)||oriented(d.local))){
   if(underlay)ctx.drawImage(underlay,...args);
   ctx.save();try{setMatrix(ctx,d,sign);ctx.imageSmoothingEnabled=false;ctx.drawImage(img,...args);}finally{ctx.restore();}
   return;
  }
 }
 ctx.drawImage(original||img,...args);
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
function session(r,player,options,make){
 const plan=r.independentPlan,body=['feminino','female'].includes(player.appearance96?.gender)?'female':'male';
 const items=new Map(),layers=new Map(),descriptors=new Map(),offsets=new Map();
 for(const slot of slots){
  const v=player.equipment?.[slot],id=v?.def??v;
  if(Number.isSafeInteger(id)&&!(slot==='weapon'&&options.weaponless)&&!(slot==='head'&&player.preferences?.hideHeadgear)&&!r.omitted?.includes(slot))items.set(slot,id);
 }
 for(const [name,pass] of plan?.passes||[]){
  for(const l of [...(pass?.layers||[]),...(pass?.decorator?.own?.cloth?[pass.decorator.own.cloth]:[])]){
   if(pass.repair?.includes(l.id)||pass.daggerTorso?.repair?.includes(l.id))continue;
   layers.set(l.id,{slot:alias[name]||name,sources:new Set(l.frames||[l.source])});
  }
 }
 const meta={body,action:r.resolvedAction||r.action,direction:r.direction,weapon:items.get('weapon')??null};
 const geometry=new Map(),members=new Map(),depthByPhase=new Map();
 let targets=[],lookup=new Map();
 function visit(phase,capture,fn){
  const context={phase,capture,make,items,layers,descriptors,offsets,geometry,members,sign:plan?.base?.base?.mirrorX||plan?.base?.mirrorX?-1:1};
  const paint=(hidden,mark)=>scoped({...context,hidden,mark,materialCache:new Map()},fn);
  const depths=!capture&&depthByPhase.get(phase);
  return depths?.length?lowerLayers(paint,depths):paint();
 }
 async function finish(info,clock=[],fps=info.fps){
  const receiver=info.width+'x'+info.height+'@'+info.pivot.x+','+info.pivot.y;
  for(const [slot,parts] of descriptors){
   const all=new Map(),signatures=[],firstTarget=targets.length;
   for(const [part,data] of parts){
    const identity=[part,receiver,clock,fps,[...data.sources].map(([p,s])=>[p,[...s].sort()])];
    signatures.push(identity);
    for(const [phase,lim] of data.phases)all.set(phase,intersect(all.get(phase),lim));
    if(data.phases.size)targets.push({...meta,receiver,slot,item:items.get(slot),part,source:await digest(identity),limits:Object.fromEntries(data.phases)});
   }
   if(all.size){
    const signature=await digest(signatures.sort((a,b)=>a[0].localeCompare(b[0])));
    const rig=receiver+'@'+signature.slice(0,16);
    for(const t of targets.slice(firstTarget))t.receiver=rig;
    targets.push({...meta,receiver:rig,slot,item:items.get(slot),part:'*',source:signature,limits:Object.fromEntries(all)});
   }
  }
  lookup=new Map(targets.map(t=>[key(t),t]));
 }
 function configure(manifest,strict=false){
  const selected=manifest.records.filter(a=>a.body===body&&(a.weapon===meta.weapon||a.slot!=='weapon'&&lookup.has(key(a)))&&a.action===meta.action&&a.direction===r.direction&&items.get(a.slot)===a.item);
  const accepted=new Map(),errors=[],invalid=new Set();
  for(const a of selected){
   const t=lookup.get(key(a));
   if(!t||a.source!==t.source||[...Object.keys(a.phases),...Object.keys(a.style?.phases||{})].some(f=>!Object.hasOwn(t.limits,f))){invalid.add(a.slot);errors.push('Fonte, receptor ou fase incompatível • '+a.slot+' #'+a.item);continue;}
   accepted.set(key(t),a);
  }
  const next=new Map();
  for(const t of targets.filter(v=>v.part!=='*')){
   const whole=accepted.get(key({...t,part:'*'})),part=accepted.get(key(t));if(!whole&&!part)continue;
   for(const [f,b] of Object.entries(t.limits)){
    const a=delta(whole,f),p=delta(part,f),v=[a[0]+p[0],a[1]+p[1]];
    if(v[0]<b[0]||v[0]>b[1]||v[1]<b[2]||v[1]>b[3]){invalid.add(t.slot);errors.push('Deslocamento recorta '+t.part+' na fase '+f);break;}
    const parent=styleAt(whole,f),local=styleAt(part,f),g=geometry.get(t.slot);
    Object.assign(v,{whole:parent,local,part:t.part,phase:+f,geometry:g,layer:local.layer??parent.layer??'native'});
    if(!['native','body'].includes(v.layer)&&!members.get(+f)?.has(v.layer)){invalid.add(t.slot);errors.push('A pose não separa esse membro na fase '+f);break;}
    if(oriented(parent)||oriented(local)){
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
 return {visit,finish,configure,availableLayers,get targets(){return targets;},get moved(){return [...offsets.values()].some(v=>v[0]||v[1]||oriented(v.whole)||oriented(v.local)||v.layer!=='native');}};
}
function offset(slot,part){return active&&!active.capture?active.offsets.get(JSON.stringify([slot,part,active.phase]))||[0,0]:[0,0];}
const api={empty,validate,slots,key,layerNames,mirrorRecord,styleAt,session,blit,material,layer,offset,localClip,original:paint=>scoped(null,paint),get materialCache(){return active?.materialCache;},get active(){return !!active;}};
root.MareHDPosition=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
