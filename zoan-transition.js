'use strict';
/* Cosmetic observer shared by every Zoan; time is in world seconds. */
((root)=>{
 if(typeof module!=='undefined')require('./zoan-transition-data.js');
 const data=root.MareZoanTransitionData;let image=null;
 function preload(){if(!image&&typeof Image!=='undefined'){image=new Image();image.src=data.image;}return image;}
 function profile(fruit,transformed,multiplier=1){const zoan=fruit?.family==='zoan'&&transformed,v=fruit?.transformationVisual||{},size=zoan?128:74;return {form:zoan?fruit.id:'human',width:Math.max(1,Number(v.width)||size)*multiplier,height:Math.max(1,Number(v.height)||size)*multiplier};}
 function create(){return {previous:null,effect:null};}
 function observe(state,next,now){
  const previous=state.previous;state.previous={...next};
  if(previous&&previous.form!==next.form)state.effect={started:now,from:previous.form,to:next.form,width:Math.max(previous.width,next.width),height:Math.max(previous.height,next.height)};
  if(state.effect&&(now-state.effect.started)*1000+1e-6>=data.duration)state.effect=null;
  return state.effect;
 }
 function clear(state){state.previous=null;state.effect=null;}
 function frame(elapsed){if(!Number.isFinite(elapsed)||elapsed<0||elapsed+1e-6>=data.duration)return null;let t=elapsed;for(const f of data.frames){if(t+1e-6<f.duration)return f;t-=f.duration;}return null;}
 function bodyAlpha(state,now){const e=state?.effect;if(!e)return 1;const progress=(now-e.started)*1000/data.duration;return Math.max(0,Math.min(1,(progress-.25)/.45));}
 function layout(effect,x,y){const b=data.cover,scale=Math.max(effect.width/b.w,effect.height/b.h)*data.padding;return {x:x-(b.x+b.w/2)*scale,y:y+8-(b.y+b.h)*scale,scale};}
 function draw(c,state,x,y,now){const e=state?.effect;if(!e)return false;const f=frame((now-e.started)*1000),im=preload();if(!f||!im?.complete||!im.naturalWidth)return false;const box=layout(e,x,y);c.save();c.imageSmoothingEnabled=false;c.drawImage(im,f.x,f.y,f.w,f.h,Math.round(box.x),Math.round(box.y),Math.round(f.w*box.scale),Math.round(f.h*box.scale));c.restore();return true;}
 preload();root.MareZoanTransition={data,preload,profile,create,observe,clear,frame,bodyAlpha,layout,draw};if(typeof module!=='undefined')module.exports=root.MareZoanTransition;
})(globalThis);
