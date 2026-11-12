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
