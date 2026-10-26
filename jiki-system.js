'use strict';
((root)=>{
 if(typeof module!=='undefined')require('./jiki-data.js');
 const {rules,effects}=root.MareJikiData,images=new Map();
 const chargeValues=ms=>{const seconds=Math.min(6,Math.max(1,Math.floor(Math.max(0,ms)/1000+1e-6)));return {seconds,multiplier:2+(seconds-1)*.5,scale:Math.min(1.5,1+(seconds-1)*.3),progress:Math.min(1,Math.max(0,ms)/rules.chargeDuration)};};
 function frame(kind,elapsed=0,phase='once'){let list=effects[kind].frames,t=Math.max(0,elapsed);if(kind==='charge')return list.at(-1);if(phase==='flight')list=list.slice(0,rules.flightFrames);if(phase==='impact')list=list.slice(rules.flightFrames);const duration=list.reduce((n,f)=>n+f.duration,0);if(phase==='flight')t%=duration;else if(t+1e-6>=duration)return null;for(const f of list){if(t+1e-6<f.duration)return f;t-=f.duration;}return list[0];}
 function image(url){if(!images.has(url)){const im=new Image();im.src=url;images.set(url,im);}return images.get(url);}
 function preload(){for(const fx of Object.values(effects))image(fx.image);}
 function draw(c,kind,x,y,elapsed,{width=96,height=width,phase='once',angle=0}={}){const f=frame(kind,elapsed,phase),im=image(effects[kind].image);if(!f||!im.complete||!im.naturalWidth)return false;c.save();c.imageSmoothingEnabled=false;c.translate(x,y);c.rotate(angle);c.drawImage(im,f.x,f.y,f.w,f.h,-width/2,-height/2,width,height);c.restore();return true;}
 function projectile(kind,origin,point,targetId,values={}){return {kind,x:origin.x,y:origin.y,origin:{...origin},point:{...point},targetId,travel:0,elapsed:0,done:false,...values};}
 function step(p,dt,enemies,clear){if(p.done)return null;const speed=p.kind==='mass'?rules.massSpeed:rules.rocketSpeed,target=p.kind==='rocket'?enemies.find(m=>String(m.id)===String(p.targetId)&&m.alive!==false&&m.hp>0):null;p.elapsed+=Math.max(0,dt);if(p.kind==='rocket'&&!target){p.done=true;return {hit:false};}let budget=Math.min(speed*Math.max(0,dt),rules.range-p.travel);while(budget>1e-6&&!p.done){const goal=target||p.point,dx=goal.x-p.x,dy=goal.y-p.y,d=Math.hypot(dx,dy);p.angle=Math.atan2(dy,dx);if(d<=(target?rules.hitRadius:1)){if(!target&&clear(p,goal)){p.x=goal.x;p.y=goal.y;}p.done=true;return {hit:true,target};}const step=Math.min(4,budget,d),to={x:p.x+dx/d*step,y:p.y+dy/d*step};if(!clear(p,to)){p.done=true;return {hit:p.kind==='mass',blocked:true};}p.x=to.x;p.y=to.y;p.travel+=step;budget-=step;}
 if(p.travel>=rules.range-1e-6||p.elapsed>=2){p.done=true;return {hit:p.kind==='mass'};}return null;}
 root.MareJiki={rules,effects,chargeValues,frame,preload,draw,projectile,step};if(typeof module!=='undefined')module.exports=root.MareJiki;
})(globalThis);
