'use strict';
((root)=>{
 if(typeof module!=='undefined')require('./wolf-data.js');
 const {rules,clips,effects}=root.MareWolfData,visuals=Object.freeze({worldScale:112/64,labelLift:32}),images=new Map(),directions={front:'south',back:'north',left:'west',right:'east'};
 function auraActive({equipped,transformed,hp,until},now=Date.now()){return equipped===rules.id&&transformed&&hp>0&&until>now;}
 const cycle=speed=>Math.max(.15,1/Math.max(.35,speed)),leech=(actual,active)=>active?Math.max(0,actual)*rules.lifesteal:0;
 const damage=(attack,armor,multiplier)=>Math.max(1,Math.floor(attack*multiplier-armor*.30));
 function dueTicks(bleed,now){const ticks=[];while(bleed.nextTick<=5&&now-bleed.started>=bleed.nextTick-1e-9)ticks.push(bleed.nextTick++);return ticks;}
 function frameIndex(action,time,duration=.75){const step=Math.max(0,Math.floor(time*12+1e-8));if(action==='charge')return step<3?step:3+(step-3)%6;if(action==='finish')return 9+Math.min(3,step);if(action==='walk')return step%8;if(action==='attack')return Math.min(8,Math.floor(Math.max(0,time)/duration*9));return 0;}
 function image(url){if(!images.has(url)){const im=new Image();im.addEventListener?.('load',()=>{if(typeof window!=='undefined')window.dispatchEvent(new Event('mare-zoan-sprite-ready'));});im.src=url;images.set(url,im);}return images.get(url);}
 function clipFor(action,direction){return clips[['charge','finish'].includes(action)?'charge':action]?.[directions[direction]||direction]||clips.idle.south;}
 function preload({actors=true}={}){if(actors)for(const dirs of Object.values(clips))for(const c of Object.values(dirs))image(c.image);for(const f of Object.values(effects))image(f.image);}
 function status(action='idle',direction='front'){const im=image(clipFor(action,direction).image);return !im.complete?'loading':im.naturalWidth?'ready':'failed';}
 function drawActor(c,x,y,{action='idle',direction='front',time=0,scale=1,duration=.75,progress=null}={}){const clip=clipFor(action,direction),im=image(clip.image),frame=Number.isFinite(progress)?Math.min(clip.frames-1,Math.floor(Math.max(0,Math.min(1,progress))*clip.frames+1e-9)):frameIndex(action,time,duration);if(!im.complete||!im.naturalWidth)return false;c.save();c.imageSmoothingEnabled=false;c.drawImage(im,frame*clip.size,0,clip.size,clip.size,Math.round(x-clip.size*scale/2),Math.round(y-clip.feet[frame]*scale),Math.round(clip.size*scale),Math.round(clip.size*scale));c.restore();return true;}
 function effectFrame(kind,elapsed){const fx=effects[kind];let t=Math.max(0,elapsed)%fx.duration;for(const f of fx.frames){if(t<f.duration)return f;t-=f.duration;}return fx.frames[0];}
 function drawEffect(c,kind,x,y,elapsed){const fx=effects[kind],im=image(fx.image),f=effectFrame(kind,elapsed);if(!im.complete||!im.naturalWidth)return false;const scale=kind==='aura'?1.8:1.25,scaleY=kind==='aura'?2.3:scale,lift=kind==='aura'?72:48;c.save();c.imageSmoothingEnabled=false;c.drawImage(im,f.x,f.y,f.w,f.h,Math.round(x-fx.anchor.x*scale),Math.round(y-lift-fx.anchor.y*scaleY),Math.round(f.w*scale),Math.round(f.h*scaleY));c.restore();return true;}
 root.MareWolf={rules,clips,effects,visuals,auraActive,cycle,leech,damage,dueTicks,frameIndex,preload,status,drawActor,effectFrame,drawEffect};
 if(typeof module!=='undefined')module.exports=root.MareWolf;
})(globalThis);
