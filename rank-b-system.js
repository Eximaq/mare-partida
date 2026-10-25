'use strict';
((root)=>{
 if(typeof module!=='undefined')require('./rank-b-data.js');
 const {rules,effects}=root.MareRankBData,images=new Map();
 const has=id=>Object.values(rules).some(r=>r.id===id),visible=(e,v)=>!!v&&e.x>=v.x&&e.y>=v.y&&e.x<=v.x+v.width&&e.y<=v.y+v.height;
 const reduction=(amount,{equipped,physical=true,hasHaki=false}={})=>equipped===rules.beta.id&&physical&&!hasHaki?amount*(1-rules.beta.physicalDamageReduction):amount;
 const rooted=(m,now)=>!!m&&m.betaRootUntil>now,stunned=(m,now)=>!!m&&m.hanaStunFrom<=now&&m.hanaStunUntil>now;
 const chokeLead=effects.choke.frames.slice(0,rules.hana.holdFrame-1).reduce((n,f)=>n+f.duration,0),chokeEnd=effects.choke.duration+rules.hana.holdDuration-effects.choke.frames[rules.hana.holdFrame-1].duration;
 function frame(kind,elapsed,loop=false){const fx=effects[kind];let t=Math.max(0,elapsed);if(kind==='choke'){if(t>=chokeEnd)return null;if(t>=chokeLead&&t<chokeLead+rules.hana.holdDuration)return fx.frames[rules.hana.holdFrame-1];if(t>=chokeLead+rules.hana.holdDuration)t-=rules.hana.holdDuration-fx.frames[rules.hana.holdFrame-1].duration;}else if(loop)t%=fx.duration;else if(t>=fx.duration)return null;for(const f of fx.frames){if(t<f.duration)return f;t-=f.duration;}return null;}
 function due(job,elapsed){const times=job.kind==='punch'?Array.from({length:4},(_,i)=>effects.punch.duration*(i+1)/4):Array.from({length:5},(_,i)=>chokeLead+(i+1)*1000),hits=[];job.next ||= 0;while(job.next<times.length&&elapsed+1e-6>=times[job.next])hits.push(job.next++);return hits;}
 function image(url){if(!images.has(url)){const im=new Image();im.src=url;images.set(url,im);}return images.get(url);}
 function preload(){for(const fx of Object.values(effects))image(fx.image);}
 function draw(c,kind,x,y,elapsed,{width=64,height=width,loop=false}={}){const f=frame(kind,elapsed,loop),im=image(effects[kind].image);if(!f||!im.complete||!im.naturalWidth)return false;c.save();c.imageSmoothingEnabled=false;c.drawImage(im,f.x,f.y,f.w,f.h,Math.round(x-width/2),Math.round(y-height/2),width,height);c.restore();return true;}
 function drawLegs(c,entity,elapsed){const v=rules.beta.legVfx;c.save();c.beginPath();c.rect(entity.x-v.width/2,entity.y-40,v.width,52);c.clip();const ok=draw(c,'slime',entity.x,entity.y-v.lift,elapsed,{width:v.width,height:v.height,loop:true});c.restore();return ok;}
 function drawTether(c,from,to,elapsed){const dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy);if(len<1)return false;const f=frame('tether',elapsed,true),im=image(effects.tether.image);if(!im.complete||!im.naturalWidth)return false;c.save();c.translate(from.x,from.y-22);c.rotate(Math.atan2(dy,dx));c.imageSmoothingEnabled=false;c.drawImage(im,f.x,f.y,f.w,f.h,0,-16,len,32);c.restore();return true;}
 function drawBurst(c,at,elapsed){if(elapsed>=effects.burst.duration)return;for(let i=0;i<8;i++){const angle=i*Math.PI/4;c.save();c.translate(at.x,at.y);c.rotate(angle);draw(c,'burst',64,0,elapsed,{width:128,height:128});c.restore();}}
 // Constant-speed linear interpolation delegates collision resolution to the existing navigator.
 function glide(entity,goal,speed,dt,nav){const dx=goal.x-entity.x,dy=goal.y-entity.y,d=Math.hypot(dx,dy);if(d<1e-6)return 0;const t=Math.min(1,Math.max(0,speed*dt)/d),x=entity.x,y=entity.y;nav.move(entity,dx*t,dy*t);const moved=Math.hypot(entity.x-x,entity.y-y);if(moved>.01){entity.walking=.2;entity.facing=dx<0?-1:dx>0?1:entity.facing;entity.direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'back':'front');}return moved;}
 function followGlide(entity,path,speed,dt,nav){let budget=Math.max(0,speed*dt);while(path.length&&budget>1e-6){const goal=path[0],d=Math.hypot(goal.x-entity.x,goal.y-entity.y);if(d<.5){path.shift();continue;}const step=Math.min(d,budget),moved=glide(entity,goal,speed,step/speed,nav);budget-=step;if(moved<.01)break;if(Math.hypot(goal.x-entity.x,goal.y-entity.y)<.5)path.shift();}if(budget<speed*dt)entity.walking=.2;}
 const api={rules,effects,has,visible,reduction,rooted,stunned,chokeLead,chokeEnd,frame,due,preload,draw,drawLegs,drawTether,drawBurst,glide,followGlide};root.MareRankB=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
