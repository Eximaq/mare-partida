'use strict';
((root)=>{
 if(typeof module!=='undefined')require('./rank-c-expansion-data.js');
 const {rules,effects,clips}=root.MareRankCExpansionData,images=new Map(),directions={front:'south',back:'north',left:'west',right:'east'};
 const has=id=>Object.values(rules).some(r=>r.id===id),visible=(p,v)=>!!v&&p.x>=v.x&&p.y>=v.y&&p.x<=v.x+v.width&&p.y<=v.y+v.height;
 function image(url){if(!images.has(url)){const im=new Image();im.src=url;images.set(url,im);}return images.get(url);}
 function preload(){for(const ds of Object.values(clips))for(const c of Object.values(ds))image(c.image);for(const fx of Object.values(effects))image(fx.image);}
 function clip(action,direction){return clips[action]?.[directions[direction]||direction]||clips.idle.south;}
 function status(action='idle',direction='front'){const im=image(clip(action,direction).image);return !im.complete?'loading':im.naturalWidth?'ready':'failed';}
 // Exported animation cells include transparent padding; preserve the native 64px pixel scale.
 function drawActor(c,x,y,{action='idle',direction='front',time=0,progress=null,height=64}={}){const cl=clip(action,direction),im=image(cl.image),i=Number.isFinite(progress)?Math.min(cl.frames-1,Math.floor(Math.max(0,progress)*cl.frames)):Math.floor(Math.max(0,time)*cl.fps)%cl.frames;if(!im.complete||!im.naturalWidth)return false;const scale=height/64,size=cl.size*scale;c.save();c.imageSmoothingEnabled=false;c.drawImage(im,i*cl.size,0,cl.size,cl.size,Math.round(x-size/2),Math.round(y-cl.feet[i]*scale),size,size);c.restore();return true;}
 function effectFrame(kind,elapsed,mode='loop'){
  const fx=effects[kind];let list=fx.frames,t=Math.max(0,elapsed);
  if(mode==='flight')list=list.slice(0,kind==='breath'?7:15);
  if(mode==='impact')list=list.slice(kind==='breath'?7:15);
  if(kind==='revolution'&&t>=list.slice(0,10).reduce((s,f)=>s+f.duration,0)){t-=list.slice(0,10).reduce((s,f)=>s+f.duration,0);list=list.slice(10,17);}
  const duration=list.reduce((s,f)=>s+f.duration,0);if(mode==='hold'&&t>=duration)return list.at(-1);if(mode==='impact'&&t>=duration)return null;t%=duration;for(const f of list){if(t<f.duration)return f;t-=f.duration;}return list[0];
 }
 function drawEffect(c,kind,x,y,elapsed,{width=64,height=width,mode='loop',mirror=false}={}){const f=effectFrame(kind,elapsed,mode),im=image(effects[kind].image);if(!f||!im.complete||!im.naturalWidth)return false;c.save();c.translate(Math.round(x),Math.round(y));c.imageSmoothingEnabled=false;const paint=()=>c.drawImage(im,f.x,f.y,f.w,f.h,-width/2,-height/2,width,height);paint();if(mirror){c.scale(-1,1);paint();}c.restore();return true;}
 const flagArea=(p,v)=>({x:p.x-v.width/2,y:p.y-v.height/2,width:v.width,height:v.height});
 const affected=(flag,entity,view,now)=>flag.until>now&&entity.alive!==false&&visible(flag,view||{x:entity.x-flag.view.width/2,y:entity.y-flag.view.height/2,width:flag.view.width,height:flag.view.height});
 const inSplash=(center,entity)=>Math.abs(center.x-entity.x)<=rules.bomu.splash&&Math.abs(center.y-entity.y)<=rules.bomu.splash;
 const explosionImmune=(fruit,type)=>fruit===rules.bomu.id&&type==='explosion';
 const api={rules,effects,clips,has,visible,preload,status,drawActor,clip,effectFrame,drawEffect,flagArea,affected,inSplash,explosionImmune};root.MareRankCExpansion=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
