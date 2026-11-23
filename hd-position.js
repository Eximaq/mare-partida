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
function validate(m){
 keys(m,Object.keys(empty()));
 if(m.schema!==1||m.space!==empty().space||!/^[a-f0-9]{40}$/.test(m.reference)||!Number.isSafeInteger(m.revision)||m.revision<0||!Array.isArray(m.records))throw Error('Versão ou coordenadas incompatíveis.');
 const seen=new Set();
 for(const r of m.records){
  keys(r,[...fields,'source','cycle','phases']);
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
function limits(ctx,img,args,make,sign){
 const [sx,sy,sw,sh,x,y,w,h]=args.length===8?args:[0,0,img.width,img.height,...args.slice(0,2),...(args.length===4?args.slice(2):[img.width,img.height])];
 let [l,t,r,b]=bounds(img,make);l=Math.max(l,sx);t=Math.max(t,sy);r=Math.min(r,sx+sw);b=Math.min(b,sy+sh);
 if(r<=l||b<=t)return null;
 const m=ctx.getTransform(),points=[];
 for(const u of [l,r])for(const v of [t,b]){
  const a=x+(u-sx)*w/sw,j=y+(v-sy)*h/sh;points.push([m.a*a+m.c*j+m.e,m.b*a+m.d*j+m.f]);
 }
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 // Existing approved art may already touch an edge. Moving further out is forbidden.
 const lo=Math.min(0,-Math.floor(Math.min(...xs))),hi=Math.max(0,ctx.canvas.width-Math.ceil(Math.max(...xs)));
 return [sign===1?lo:-hi,sign===1?hi:-lo,Math.min(0,-Math.floor(Math.min(...ys))),Math.max(0,ctx.canvas.height-Math.ceil(Math.max(...ys)))];
}
const intersect=(a,b)=>a?[Math.max(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[2],b[2]),Math.min(a[3],b[3])]:b;
function blit(ctx,slot,part,source,img,args,sign=1,original=null,underlay=null){
 if(!active||!active.items.has(slot))return ctx.drawImage(img,...args);
 const {capture,phase,descriptors,make,offsets}=active;
 if(capture){
  let parts=descriptors.get(slot);if(!parts)descriptors.set(slot,parts=new Map());
  let p=parts.get(part);if(!p)parts.set(part,p={phases:new Map(),sources:new Map()});
  const lim=limits(ctx,img,args,make,sign);
  if(lim)p.phases.set(phase,intersect(p.phases.get(phase),lim));
  if(!p.sources.has(phase))p.sources.set(phase,new Set());
  const {a,b,c,d,e,f}=ctx.getTransform();
  p.sources.get(phase).add(JSON.stringify([source,img.width,img.height,args,sign,[a,b,c,d,e,f]]));
 }else{
  const d=offsets.get(JSON.stringify([slot,part,phase]));
  if(d&&(d[0]||d[1])){
   if(underlay)ctx.drawImage(underlay,...args);
   const m=ctx.getTransform();ctx.save();try{ctx.setTransform(m.a,m.b,m.c,m.d,m.e+sign*d[0],m.f+d[1]);ctx.drawImage(img,...args);}finally{ctx.restore();}
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
function layer(ctx,l,img,args){
 if(l.positionOwner&&l.positionSource)return blit(ctx,l.positionOwner,l.positionPart||l.id,l.positionSource,img,args,active.sign);
 const owner=active?.layers.get(l.id);
 if(owner&&owner.sources.has(l.source))return blit(ctx,owner.slot,l.id,l.source,img,args,active.sign);
 ctx.drawImage(img,...args);
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
 let targets=[],lookup=new Map();
 const visit=(phase,capture,fn)=>scoped({phase,capture,make,items,layers,descriptors,offsets,materialCache:new Map(),sign:plan?.base?.base?.mirrorX||plan?.base?.mirrorX?-1:1},fn);
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
   if(!t||a.source!==t.source||Object.keys(a.phases).some(f=>!Object.hasOwn(t.limits,f))){invalid.add(a.slot);errors.push('Fonte, receptor ou fase incompatível • '+a.slot+' #'+a.item);continue;}
   accepted.set(key(t),a);
  }
  const next=new Map();
  for(const t of targets.filter(v=>v.part!=='*')){
   const whole=accepted.get(key({...t,part:'*'})),part=accepted.get(key(t));if(!whole&&!part)continue;
   for(const [f,b] of Object.entries(t.limits)){
    const a=delta(whole,f),p=delta(part,f),v=[a[0]+p[0],a[1]+p[1]];
    if(v[0]<b[0]||v[0]>b[1]||v[1]<b[2]||v[1]>b[3]){invalid.add(t.slot);errors.push('Deslocamento recorta '+t.part+' na fase '+f);break;}
    next.set(JSON.stringify([t.slot,t.part,+f]),v);
   }
  }
  if(errors.length&&strict)throw Error(errors.join('\n'));
  offsets.clear();
  // A stale source affects only its owner. Strict edits above are atomic.
  for(const [k,v] of next)if(!invalid.has(JSON.parse(k)[0]))offsets.set(k,v);
  return errors;
 }
 return {visit,finish,configure,get targets(){return targets;},get moved(){return [...offsets.values()].some(v=>v[0]||v[1]);}};
}
function offset(slot,part){return active&&!active.capture?active.offsets.get(JSON.stringify([slot,part,active.phase]))||[0,0]:[0,0];}
const api={empty,validate,slots,key,session,blit,material,layer,offset,get materialCache(){return active?.materialCache;},get active(){return !!active;}};
root.MareHDPosition=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
