/* Exact source modules isolated to avoid replacing runtime globals. */
(function(root){
const modules={};
modules["hair-mask"]=(function(){const module={exports:{}};const require=name=>{if(name!=="./hair-mask.js")throw Error("Unknown vendor dependency");return modules["hair-mask"]};
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ReworkHairMask=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
// HD adaptation of appearance.js clipHairCrown, applied after rigid pose raster.
function restoreAboveLine(after,before,width,height,{matrix,nose,hairline,density=4,offsetX=0,offsetY=0}){
 if(after.length!==before.length||after.length!==width*height*4||!Number.isFinite(hairline))throw Error('Invalid crown mask');
 const nx=nose.x*density,ny=nose.y*density,poseX=(matrix[0]*nose.x+matrix[2]*nose.y+matrix[4])*density,poseY=(matrix[1]*nose.x+matrix[3]*nose.y+matrix[5])*density;
 const angle=Math.atan2(matrix[1],matrix[0]),cs=Math.cos(angle),sn=Math.sin(angle),sx=poseX-nx,sy=poseY-ny,line=hairline*density;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const dx=x+.5+offsetX*density-sx-nx,dy=y+.5+offsetY*density-sy-ny,nativeY=ny-dx*sn+dy*cs;if(nativeY<line){const i=(y*width+x)*4;after.set(before.subarray(i,i+4),i);}}
 return after;
}
return {restoreAboveLine};});

return module.exports;})();
modules["compositor"]=(function(){const module={exports:{}};const require=name=>{if(name!=="./hair-mask.js")throw Error("Unknown vendor dependency");return modules["hair-mask"]};
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ModularPilot=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const HairMask=typeof module==='object'&&module.exports?require('./hair-mask.js'):globalThis.ReworkHairMask;
const order=['underArms','body','headBase','pants','top','face','hair','foreground'];
const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
function point(m,p){return {x:m[0]*p.x+m[2]*p.y+m[4],y:m[1]*p.x+m[3]*p.y+m[5]};}
function transform(a,b,c,d,stretch){
 if(![a,b,c,d].every(valid))throw Error('Missing annotated anchor');
 const u={x:b.x-a.x,y:b.y-a.y},v={x:d.x-c.x,y:d.y-c.y},l=Math.hypot(u.x,u.y),n=Math.hypot(v.x,v.y);
 if(l<.01||n<.01)throw Error('Degenerate anatomical bone');
 const ux=u.x/l,uy=u.y/l,vx=v.x/n,vy=v.y/n,s=stretch?n/l:1;
 const m=[vx*s*ux+vy*uy,vy*s*ux-vx*uy,vx*s*uy-vy*ux,vy*s*uy+vx*ux,0,0];
 m[4]=c.x-m[0]*a.x-m[2]*a.y;m[5]=c.y-m[1]*a.x-m[3]*a.y;return m;
}
const bone=(a,b,c,d)=>transform(a,b,c,d,true),rigid=(a,b,c,d)=>transform(a,b,c,d,false);
function sample(clip,time,progress=null){
 if(!Number.isInteger(clip.frames)||clip.frames<1||!Number.isFinite(clip.fps)||clip.fps<=0||!Number.isFinite(time))throw Error('Invalid clip clock');
 const f=Number.isFinite(progress)?Math.floor(Math.max(0,Math.min(1,progress))*clip.frames):Math.floor(Math.max(0,time)*clip.fps);
 return clip.loop?f%clip.frames:Math.min(clip.frames-1,f);
}
function plan(pack,direction,frame){
 const dir=pack.directions?.[direction];if(!dir)throw Error('Missing authored direction: '+direction);
 const pose=dir.poses?.[frame];if(!pose)throw Error('Missing annotated pose: '+frame);
 const ids=new Set();return dir.layers.map((layer,i)=>{
  if(ids.has(layer.id)||!layer.id||!order.includes(layer.slot))throw Error('Invalid or duplicate layer identity');ids.add(layer.id);
  if(['belt','cloak','cloakFront'].includes(layer.slot))throw Error('Disabled equipment slot');
  const binding=layer.binding;if(!binding)throw Error('Missing explicit layer binding');
  let matrix,anchors=[];
  if(binding.kind==='fixed')matrix=[1,0,0,1,0,0];
  else if(['bone','rigid'].includes(binding.kind)){
   const a=dir.rest?.[binding.a],b=dir.rest?.[binding.b],c=pose[binding.a],d=pose[binding.b];matrix=(binding.kind==='bone'?bone:rigid)(a,b,c,d);anchors=[{name:binding.a,source:a,target:c},{name:binding.b,source:b,target:d}];
  }else throw Error('Unsupported binding '+binding.kind);
  const anchorErrors=anchors.map(a=>({joint:a.name,error:Math.hypot(point(matrix,a.source).x-a.target.x,point(matrix,a.source).y-a.target.y)}));
  return {...layer,matrix,source:layer.frames?.[frame]||layer.source,depth:layer.depthTrack?.[frame]??layer.depth??order.indexOf(layer.slot),ordinal:i,registration:{id:layer.id,kind:binding.kind,anchorErrors,maxAnchorError:Math.max(0,...anchorErrors.map(x=>x.error))}};
 }).sort((a,b)=>a.depth-b.depth||a.ordinal-b.ordinal);
}
function contactProgress(progress,hitRatio,contactFrame,frames){
 if(!Number.isFinite(progress)||!Number.isFinite(hitRatio)||hitRatio<=0||hitRatio>=1||!Number.isInteger(contactFrame)||contactFrame<1||contactFrame>=frames)throw Error("Invalid explicit contact mapping");
 const p=Math.max(0,Math.min(1,progress)),r=contactFrame/frames;return p<=hitRatio?p/hitRatio*r:r+(p-hitRatio)/(1-hitRatio)*(1-r);
}
function render(ctx,pack,images,{direction='south',frame=null,time=0,progress=null,hitRatio=null,density=4,feet=null,clear=true,hidden=[]}={}){
 const size=pack.frame?.width,validSize=(size===128&&pack.pivot?.x===64&&pack.pivot?.y===112)||(size===160&&pack.pivot?.x===80&&pack.pivot?.y===128)||(size===256&&pack.pivot?.x===128&&pack.pivot?.y===176);
 if(![1,2,4].includes(density)||pack.density!==4||!validSize||pack.frame?.height!==size)throw Error('Pilot expects density4: cell128/pivot64,112 or padded160/pivot80,128 or padded256/pivot128,176');
 const raster=size*4;
 const dir=pack.directions?.[direction];if(!dir)throw Error('Missing authored direction');
 if(dir.renderMirrorFrom){const from=dir.renderMirrorFrom,source=pack.directions[from];if(from===direction||!source||source.renderMirrorFrom)throw Error('Invalid or cyclic whole-character mirror');let surface;if(ctx.canvas.ownerDocument){surface=ctx.canvas.ownerDocument.createElement('canvas');surface.width=ctx.canvas.width;surface.height=ctx.canvas.height;}else if(typeof OffscreenCanvas!=='undefined')surface=new OffscreenCanvas(ctx.canvas.width,ctx.canvas.height);else if(typeof require==='function')surface=require('@napi-rs/canvas').createCanvas(ctx.canvas.width,ctx.canvas.height);else throw Error('Isolated mirror surface unavailable');let sourcePack=pack;if(dir.headgearPolicy?.previewOverride&&source.headgearPolicy){sourcePack={...pack,directions:{...pack.directions,[from]:{...source,headgearPolicy:{...source.headgearPolicy,mode:dir.headgearPolicy.mode,headAdjustment:{...dir.headgearPolicy.headAdjustment,x:-(dir.headgearPolicy.headAdjustment?.x||0)},hairlineOffset:dir.headgearPolicy.hairlineOffset}}}};}const result=render(surface.getContext('2d'),sourcePack,images,{direction:from,frame,time,progress,hitRatio,density,feet,clear:true,hidden});if(clear)ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);const foot=feet||pack.pivot;ctx.save();ctx.translate(2*foot.x*density,0);ctx.scale(-1,1);ctx.drawImage(surface,0,0);ctx.restore();return {...result,direction,renderMirrorFrom:from,wholeCharacterMirror:true};}
 if(Number.isFinite(progress)&&Number.isFinite(hitRatio)&&!dir.clip.loop)progress=contactProgress(progress,hitRatio,dir.clip.contactFrame,dir.clip.frames);
 frame=frame??sample(dir.clip,time,progress);const layers=plan(pack,direction,frame).filter(l=>!hidden.includes(l.slot));
 for(const l of layers){const img=images instanceof Map?images.get(l.source):images[l.source];if(!img||img.width!==raster||img.height!==raster)throw Error('Missing or incompatible source raster: '+l.source);}
 if(clear)ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
 const foot=feet||pack.pivot;ctx.save();ctx.imageSmoothingEnabled=false;ctx.scale(density,density);ctx.translate(foot.x-pack.pivot.x,foot.y-pack.pivot.y);
 const policy=dir.headgearPolicy,gearVisible=policy&&layers.some(l=>l.id===policy.gearId);
 for(const l of layers){const isHair=gearVisible&&policy.hairIds.includes(l.id);if(isHair&&policy.mode==='full')continue;
 const before=isHair&&policy.mode==='partial'?ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height):null;
 const img=images instanceof Map?images.get(l.source):images[l.source];ctx.save();ctx.transform(...l.matrix);if(gearVisible&&l.id===policy.gearId&&policy.headAdjustment&&(policy.headAdjustment.x!==0||policy.headAdjustment.y!==0||policy.headAdjustment.scale!==100)){const a=policy.headAdjustment,n=policy.noseTrack?.[frame]||policy.nose,shift={x:n.x-policy.nose.x,y:n.y-policy.nose.y},center={x:dir.rest.NECK.x+shift.x,y:dir.rest.NECK.y-20+shift.y};ctx.translate(center.x+a.x,center.y+a.y);ctx.scale(a.scale/100,a.scale/100);ctx.translate(-center.x,-center.y);}ctx.drawImage(img,0,0,raster,raster,0,0,size,size);ctx.restore();
 if(before){if(!HairMask)throw Error('Headgear hair mask module required');const after=ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height);const matrix=[...l.matrix];matrix[4]+=foot.x-pack.pivot.x;matrix[5]+=foot.y-pack.pivot.y;HairMask.restoreAboveLine(after.data,before.data,ctx.canvas.width,ctx.canvas.height,{matrix,nose:policy.noseTrack?.[frame]||policy.nose,hairline:(()=>{const a=policy.headAdjustment||{x:0,y:0,scale:100},n=policy.noseTrack?.[frame]||policy.nose,center=dir.rest.NECK.y-20+n.y-policy.nose.y,line=policy.hairlineTrack?.[frame]??policy.hairline;if(a.scale===100&&a.y===0&&!policy.hairlineOffset)return line;return center+(line-center)*a.scale/100+a.y+(policy.hairlineOffset||0);})(),density,offsetX:policy.offsetX||0,offsetY:policy.offsetY||0});ctx.putImageData(after,0,0);}
 }
 ctx.restore();return {direction,frame,density,logicalFrame:pack.frame,pivot:pack.pivot,registration:layers.map(l=>l.registration),productionReady:false,limitations:['Affine bone/rigid preview only; material ownership and equipment masks require authored sources and review.']};
}
return {order,point,bone,rigid,sample,contactProgress,plan,render};
});

return module.exports;})();
modules["hairPreview"]=(function(){const module={exports:{}};const require=name=>{if(name!=="./hair-mask.js")throw Error("Unknown vendor dependency");return modules["hair-mask"]};
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HairPreview=api;})(globalThis,function(){
'use strict';
function prepare(entry,direction,images,a,makeCanvas){const pack=JSON.parse(JSON.stringify(entry.pack)),d=pack.directions[direction],ids=entry.hairLayers[direction].map(l=>l.id),out=new Map(images),center={x:entry.pivots[direction].x*4,y:entry.pivots[direction].y*4},s=a.scale/100;
for(const l of d.layers.filter(l=>ids.includes(l.id))){const setting=a.layers[l.id]||{visible:true,depthOffset:0};l.depth+=setting.depthOffset;if(a.hideHair||!setting.visible)continue;if(!a.x&&!a.y&&a.scale===100)continue;
const img=images.get(l.source),c=makeCanvas(img.width,img.height),ctx=c.getContext('2d');ctx.drawImage(img,0,0);const rgba=ctx.getImageData(0,0,c.width,c.height).data;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(rgba[(y*c.width+x)*4+3]){const nx=center.x+(x-center.x)*s+a.x*4,ny=center.y+(y-center.y)*s+a.y*4;if(nx<0||ny<0||nx+s>c.width||ny+s>c.height)throw Error('Ajuste cortaria cabelo na borda. Reduza escala/deslocamento.');}ctx.clearRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;ctx.translate(center.x+a.x*4,center.y+a.y*4);ctx.scale(s,s);ctx.translate(-center.x,-center.y);ctx.drawImage(img,0,0);l.source='preview:'+l.id;out.set(l.source,c);}
d.layers=d.layers.filter(l=>!ids.includes(l.id)||(!a.hideHair&&(a.layers[l.id]?.visible!==false)));pack.productionReady=false;return {pack,images:out};}
return {prepare};});

return module.exports;})();
modules["headPreview"]=(function(){const module={exports:{}};const require=name=>{if(name!=="./hair-mask.js")throw Error("Unknown vendor dependency");return modules["hair-mask"]};
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HeadPreview=api;})(globalThis,function(){
'use strict';
function imagesForHair(pack,direction,images,a,makeCanvas){const d=pack.directions[direction],p=d.headgearPolicy,out=new Map(images);if(!a.hairX&&!a.hairY&&a.hairScale===100)return out;const center={x:d.rest.NECK.x*4,y:(d.rest.NECK.y-20)*4},s=a.hairScale/100;
for(const l of d.layers.filter(l=>p.hairIds.includes(l.id))){if(l.frames)throw Error('Editor estático não suporta cabelo por fase');const img=images.get(l.source),canvas=makeCanvas(img.width,img.height),ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const rgba=ctx.getImageData(0,0,img.width,img.height).data;for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++)if(rgba[(y*img.width+x)*4+3]){const nx=center.x+(x-center.x)*s+a.hairX*4,ny=center.y+(y-center.y)*s+a.hairY*4;if(nx<0||ny<0||nx+s>img.width||ny+s>img.height)throw Error('Ajuste cortaria cabelo na borda da célula. Reduza deslocamento/escala.');}ctx.clearRect(0,0,img.width,img.height);ctx.imageSmoothingEnabled=false;ctx.translate(center.x+a.hairX*4,center.y+a.hairY*4);ctx.scale(s,s);ctx.translate(-center.x,-center.y);ctx.drawImage(img,0,0);out.set(l.source,canvas);}return out;}
return {imagesForHair};});

return module.exports;})();
modules["hairFemale"]=(function(){const module={exports:{}};const require=name=>{if(name!=="./hair-mask.js")throw Error("Unknown vendor dependency");return modules["hair-mask"]};
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HairPresets=api;})(globalThis,function(){
'use strict';
const schema='r1-hair-fit-adjustments-v1';
function exact(v,keys){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))throw Error('Campos desconhecidos ou objeto inválido');}
function defaults(){return {x:0,y:0,scale:100,hideHair:false,layers:{}};}
function adjustment(v,e,d){exact(v,['x','y','scale','hideHair','layers']);const a={...defaults(),...v};for(const k of ['x','y','scale']){const lo=k==='scale'?50:-64,hi=k==='scale'?150:64;if(!Number.isFinite(a[k])||a[k]<lo||a[k]>hi)throw Error('Valor fora do intervalo: '+k);}if(typeof a.hideHair!=='boolean')throw Error('Ocultar cabelo deve ser booleano');const ids=e.hairLayers[d].map(x=>x.id);exact(a.layers,ids);const layers={};for(const [id,l] of Object.entries(a.layers)){exact(l,['visible','depthOffset']);if(typeof l.visible!=='boolean'||!Number.isFinite(l.depthOffset)||l.depthOffset< -32||l.depthOffset>32)throw Error('Camada inválida');layers[id]={visible:l.visible,depthOffset:l.depthOffset};}return {...a,layers};}
function target(e,d){if(!e.directions.includes(d))throw Error('Direção indisponível');return {snapshot:e.id,packSHA256:e.packSHA256,body:e.body,style:e.style,direction:d};}
function key(t){return JSON.stringify([t.snapshot,t.packSHA256,t.body,t.style,t.direction]);}
function validateTarget(t,c){exact(t,['snapshot','packSHA256','body','style','direction']);const e=c.entries.find(e=>e.id===t.snapshot);if(!e||key(t)!==key(target(e,t.direction)))throw Error('Fonte/hash/alvo incompatível. Não há migração automática.');return e;}
function exportFile(c,records){return {schema,previewOnly:true,catalogVersion:c.version,catalogSHA256:c.sha256,createdAt:new Date().toISOString(),adjustments:Object.values(records).map(r=>{const e=validateTarget(r.target,c);return {target:{...r.target},adjustment:adjustment(r.adjustment,e,r.target.direction)};})};}
function importFile(v,c){exact(v,['schema','previewOnly','catalogVersion','catalogSHA256','createdAt','adjustments']);if(v.schema!==schema||v.previewOnly!==true||v.catalogVersion!==c.version||v.catalogSHA256!==c.sha256||!Array.isArray(v.adjustments)||v.adjustments.length>48)throw Error('Arquivo incompatível com esta bancada de cabelos');const out={};for(const r of v.adjustments){exact(r,['target','adjustment']);const e=validateTarget(r.target,c),k=key(r.target);if(out[k])throw Error('Alvo duplicado');out[k]={target:{...r.target},adjustment:adjustment(r.adjustment,e,r.target.direction)};}return out;}
return {schema,defaults,adjustment,target,key,exportFile,importFile};});

return module.exports;})();
modules["hairMale"]=(function(){const module={exports:{}};const require=name=>{if(name!=="./hair-mask.js")throw Error("Unknown vendor dependency");return modules["hair-mask"]};
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HairPresets=api;})(globalThis,function(){
'use strict';
const schema='r1-male-hair-hd-fit-adjustments-v2';
function exact(v,keys){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))throw Error('Campos desconhecidos ou objeto inválido');}
function defaults(){return {x:0,y:0,scale:100,hideHair:false,layers:{}};}
function adjustment(v,e,d){exact(v,['x','y','scale','hideHair','layers']);const a={...defaults(),...v};for(const k of ['x','y','scale']){const lo=k==='scale'?50:-64,hi=k==='scale'?150:64;if(!Number.isFinite(a[k])||a[k]<lo||a[k]>hi)throw Error('Valor fora do intervalo: '+k);}if(typeof a.hideHair!=='boolean')throw Error('Ocultar cabelo deve ser booleano');const ids=e.hairLayers[d].map(x=>x.id);exact(a.layers,ids);const layers={};for(const [id,l] of Object.entries(a.layers)){exact(l,['visible','depthOffset']);if(typeof l.visible!=='boolean'||!Number.isFinite(l.depthOffset)||l.depthOffset< -32||l.depthOffset>32)throw Error('Camada inválida');layers[id]={visible:l.visible,depthOffset:l.depthOffset};}if(!a.hideHair){const b=e.sourceBounds512[d],p=e.pivots[d],s=a.scale/100; if(b&&(p.x*4+(b[0]-p.x*4)*s+a.x*4<0||p.y*4+(b[1]-p.y*4)*s+a.y*4<0||p.x*4+(b[2]-p.x*4)*s+a.x*4>512||p.y*4+(b[3]-p.y*4)*s+a.y*4>512))throw Error('Ajuste cortaria cabelo na borda. Reduza escala/deslocamento.');} return {...a,layers};}
function target(e,d){if(!e.directions.includes(d))throw Error('Direção indisponível');return {snapshot:e.id,packSHA256:e.packSHA256,body:e.body,style:e.style,direction:d};}
function key(t){return JSON.stringify([t.snapshot,t.packSHA256,t.body,t.style,t.direction]);}
function validateTarget(t,c){exact(t,['snapshot','packSHA256','body','style','direction']);const e=c.entries.find(e=>e.id===t.snapshot);if(!e||key(t)!==key(target(e,t.direction)))throw Error('Fonte/hash/alvo incompatível. Não há migração automática.');return e;}
function exportFile(c,records){return {schema,previewOnly:true,catalogVersion:c.version,catalogSHA256:c.sha256,createdAt:new Date().toISOString(),adjustments:Object.values(records).map(r=>{const e=validateTarget(r.target,c);return {target:{...r.target},adjustment:adjustment(r.adjustment,e,r.target.direction)};})};}
function importFile(v,c){exact(v,['schema','previewOnly','catalogVersion','catalogSHA256','createdAt','adjustments']);if(v.schema!==schema||v.previewOnly!==true||v.catalogVersion!==c.version||v.catalogSHA256!==c.sha256||!Array.isArray(v.adjustments)||v.adjustments.length>48)throw Error('Arquivo incompatível com esta bancada de cabelos');const out={};for(const r of v.adjustments){exact(r,['target','adjustment']);const e=validateTarget(r.target,c),k=key(r.target);if(out[k])throw Error('Alvo duplicado');out[k]={target:{...r.target},adjustment:adjustment(r.adjustment,e,r.target.direction)};}return out;}
return {schema,defaults,adjustment,target,key,exportFile,importFile};});

return module.exports;})();
modules["headFemale"]=(function(){const module={exports:{}};const require=name=>{if(name!=="./hair-mask.js")throw Error("Unknown vendor dependency");return modules["hair-mask"]};
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HeadPresets=api;})(globalThis,function(){
'use strict';
const schema='r1-headgear-adjustments-v1';
const defaults=Object.freeze({gearX:0,gearY:0,gearScale:100,hairX:0,hairY:0,hairScale:100,lineOffset:0,policy:'calibrated',hideHair:false});
function exact(v,keys){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))throw Error('Campos desconhecidos ou objeto inválido');}
function adjustment(v){exact(v,Object.keys(defaults));const x={...defaults,...v};for(const k of Object.keys(defaults).filter(k=>!['policy','hideHair'].includes(k))){const lo=k.endsWith('Scale')?50:-64,hi=k.endsWith('Scale')?150:64;if(!Number.isFinite(x[k])||x[k]<lo||x[k]>hi)throw Error('Valor inválido: '+k);}if(typeof x.hideHair!=='boolean')throw Error('hideHair deve ser booleano');if(!['calibrated','original','none','partial','full'].includes(x.policy))throw Error('Política inválida');return x;}
function target(entry,direction){if(!entry.directions.includes(direction))throw Error('Direção não disponível');return {snapshot:entry.id,packSHA256:entry.packSHA256,item:entry.item,body:entry.body,style:entry.style,direction};}
function key(t){return JSON.stringify([t.snapshot,t.packSHA256,t.item,t.body,t.style,t.direction]);}
function validateTarget(t,catalog){exact(t,['snapshot','packSHA256','item','body','style','direction']);const e=catalog.entries.find(e=>e.id===t.snapshot);if(!e||key(t)!==key(target(e,t.direction)))throw Error('Snapshot/hash/alvo incompatível; não migre ajustes automaticamente');return t;}
function exportFile(catalog,records){return {schema,previewOnly:true,catalogVersion:catalog.version,catalogSHA256:catalog.sha256,createdAt:new Date().toISOString(),adjustments:Object.values(records).map(r=>({target:validateTarget(r.target,catalog),adjustment:adjustment(r.adjustment)}))};}
function importFile(v,catalog){exact(v,['schema','previewOnly','catalogVersion','catalogSHA256','createdAt','adjustments']);if(v.schema!==schema||v.previewOnly!==true||v.catalogSHA256!==catalog.sha256||v.catalogVersion!==catalog.version||!Array.isArray(v.adjustments)||v.adjustments.length>2000)throw Error('Preset incompatível com esta versão da bancada');const result={};for(const r of v.adjustments){exact(r,['target','adjustment']);const t=validateTarget(r.target,catalog),k=key(t);if(result[k])throw Error('Alvo duplicado');result[k]={target:{...t},adjustment:adjustment(r.adjustment)};}const visibility={};for(const r of Object.values(result)){const k=JSON.stringify([r.target.item,r.target.body,r.target.direction]);if(k in visibility&&visibility[k]!==r.adjustment.hideHair)throw Error('Decisões de ocultação conflitantes para o mesmo item/corpo/direção');visibility[k]=r.adjustment.hideHair;}for(const [k,hideHair]of Object.entries(visibility)){const [item,body,direction]=JSON.parse(k);for(const e of catalog.entries.filter(e=>e.item===item&&e.body===body&&e.directions.includes(direction))){const t=target(e,direction),id=key(t);if(!result[id])result[id]={target:t,adjustment:{...defaults,hideHair}};}}return result;}
function apply(pack,direction,v,entry){const a=adjustment(v),copy=JSON.parse(JSON.stringify(pack)),d=copy.directions[direction];if(!d?.headgearPolicy||d.renderMirrorFrom)throw Error('Contrato estático independente requerido');const p=d.headgearPolicy,prior=p.headAdjustment||{x:0,y:0,scale:100};p.headAdjustment={x:prior.x+a.gearX,y:prior.y+a.gearY,scale:prior.scale*a.gearScale/100};p.hairlineOffset=(p.hairlineOffset||0)+a.lineOffset;p.mode=a.policy==='calibrated'?p.mode:a.policy==='original'?entry.originalPolicy:a.policy;if(!['none','partial','full'].includes(p.mode))throw Error('Política original indisponível');p.previewOverride=true;if(a.hideHair)d.layers=d.layers.filter(l=>!p.hairIds.includes(l.id));copy.productionReady=false;return copy;}
return {schema,defaults,adjustment,target,key,exportFile,importFile,apply};});

return module.exports;})();
modules["headMale"]=(function(){const module={exports:{}};const require=name=>{if(name!=="./hair-mask.js")throw Error("Unknown vendor dependency");return modules["hair-mask"]};
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HeadPresets=api;})(globalThis,function(){
'use strict';
const schema='male-current-art-headgear-adjustments-v1';
const defaults=Object.freeze({gearX:0,gearY:0,gearScale:100,hairX:0,hairY:0,hairScale:100,lineOffset:0,policy:'calibrated',hideHair:false});
function exact(v,keys){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))throw Error('Campos desconhecidos ou objeto inválido');}
function adjustment(v){exact(v,Object.keys(defaults));const x={...defaults,...v};for(const k of Object.keys(defaults).filter(k=>!['policy','hideHair'].includes(k))){const lo=k.endsWith('Scale')?50:-64,hi=k.endsWith('Scale')?150:64;if(!Number.isFinite(x[k])||x[k]<lo||x[k]>hi)throw Error('Valor inválido: '+k);}if(typeof x.hideHair!=='boolean')throw Error('hideHair deve ser booleano');if(!['calibrated','original','none','partial','full'].includes(x.policy))throw Error('Política inválida');return x;}
function target(entry,direction){if(!entry.directions.includes(direction))throw Error('Direção não disponível');return {snapshot:entry.id,packSHA256:entry.packSHA256,item:entry.item,body:entry.body,style:entry.style,direction};}
function key(t){return JSON.stringify([t.snapshot,t.packSHA256,t.item,t.body,t.style,t.direction]);}
function validateTarget(t,catalog){exact(t,['snapshot','packSHA256','item','body','style','direction']);const e=catalog.entries.find(e=>e.id===t.snapshot);if(!e||key(t)!==key(target(e,t.direction)))throw Error('Snapshot/hash/alvo incompatível; não migre ajustes automaticamente');return t;}
function exportFile(catalog,records){return {schema,previewOnly:true,catalogVersion:catalog.version,catalogSHA256:catalog.sha256,createdAt:new Date().toISOString(),adjustments:Object.values(records).map(r=>({target:validateTarget(r.target,catalog),adjustment:adjustment(r.adjustment)}))};}
function importFile(v,catalog){exact(v,['schema','previewOnly','catalogVersion','catalogSHA256','createdAt','adjustments']);if(v.schema!==schema||v.previewOnly!==true||v.catalogSHA256!==catalog.sha256||v.catalogVersion!==catalog.version||!Array.isArray(v.adjustments)||v.adjustments.length>2000)throw Error('Preset incompatível com esta versão da bancada');const result={};for(const r of v.adjustments){exact(r,['target','adjustment']);const t=validateTarget(r.target,catalog),k=key(t);if(result[k])throw Error('Alvo duplicado');result[k]={target:{...t},adjustment:adjustment(r.adjustment)};}const visibility={};for(const r of Object.values(result)){const k=JSON.stringify([r.target.item,r.target.body,r.target.direction]);if(k in visibility&&visibility[k]!==r.adjustment.hideHair)throw Error('Decisões de ocultação conflitantes para o mesmo item/corpo/direção');visibility[k]=r.adjustment.hideHair;}for(const [k,hideHair]of Object.entries(visibility)){const [item,body,direction]=JSON.parse(k);for(const e of catalog.entries.filter(e=>e.item===item&&e.body===body&&e.directions.includes(direction))){const t=target(e,direction),id=key(t);if(!result[id])result[id]={target:t,adjustment:{...defaults,hideHair}};}}return result;}
function apply(pack,direction,v,entry){const a=adjustment(v),copy=JSON.parse(JSON.stringify(pack)),d=copy.directions[direction];if(!d?.headgearPolicy||d.renderMirrorFrom)throw Error('Contrato estático independente requerido');const p=d.headgearPolicy,prior=p.headAdjustment||{x:0,y:0,scale:100};p.headAdjustment={x:prior.x+a.gearX,y:prior.y+a.gearY,scale:prior.scale*a.gearScale/100};p.hairlineOffset=(p.hairlineOffset||0)+a.lineOffset;p.mode=a.policy==='calibrated'?p.mode:a.policy==='original'?entry.originalPolicy:a.policy;if(!['none','partial','full'].includes(p.mode))throw Error('Política original indisponível');p.previewOverride=true;if(a.hideHair)d.layers=d.layers.filter(l=>!p.hairIds.includes(l.id));copy.productionReady=false;return copy;}
return {schema,defaults,adjustment,target,key,exportFile,importFile,apply};});

return module.exports;})();
root.ReworkAccessoryVendor=modules;if(typeof module!=="undefined"&&module.exports)module.exports=modules;
})(globalThis);