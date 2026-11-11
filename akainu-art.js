/* Presentation only: authoritative combat is owned by the server worker. */
(function(root){
 'use strict';
 const data=root.KaizokuAkainuArtData,images=new Map(),hurt=new WeakMap();let clock=null;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function image(path){if(!images.has(path)){const img=new Image();img.src=path;images.set(path,img);}return images.get(path);}
 function sync(stamp){const value=Date.parse(stamp);if(Number.isFinite(value))clock={server:value,received:performance.now()};}
 function now(){return clock?clock.server+clamp(performance.now()-clock.received,0,1000):0;}
 function pose(m,at=now()){
  const direction=data.clips.idle[m.emberFacing]?m.emberFacing:({front:'south',back:'north',left:'west',right:'east'}[m.direction]||'south');
  let action='idle',frame=0,alpha=1;const a=m.action;
  if(!m.alive||m.hp<=0){action='hurt';frame=1;alpha=clamp(1-(at-(m.defeatedAt||at))/data.death.fadeMs,0,1);}
  else if(a){action=a.kind==='aoe'?'aoe':'punch';const release=action==='aoe'?4:3;
   frame=at<a.impactAt?Math.floor(clamp((at-a.startedAt)/Math.max(1,a.impactAt-a.startedAt),0,.999)*release):at<a.impactAt+160?release:action==='aoe'?5:4;
  }else if(hurt.get(m)>at){action='hurt';frame=clamp(Math.floor((180-(hurt.get(m)-at))/60),0,2);}
  else if(m.moving){action='walk';frame=Math.floor((m.emberElapsed||0)*data.clips.walk[direction].fps)%data.clips.walk[direction].frames;}
  const clip=data.clips[action][direction];return {action,clip,frame:clamp(frame,0,clip.frames-1),alpha,scale:data.worldHeight/data.bodyHeight};
 }
 function observe(m,oldHp,at=now()){if(Number.isFinite(oldHp)&&m.hp<oldHp&&m.hp>0&&!m.action&&!(hurt.get(m)>at))hurt.set(m,at+180);}
 function draw(ctx,m,x=m.x,y=m.y,at=now(),scaleOverride=null){
  const p=pose(m,at),c=p.clip,img=image(c.image);if(!img.complete||!img.naturalWidth||p.alpha<=0)return true;
  const s=scaleOverride??p.scale;ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=p.alpha;
  ctx.drawImage(img,p.frame*c.size,c.row*c.size,c.size,c.size,Math.round(x-c.anchor[0]*s),Math.round(y-c.anchor[1]*s),Math.round(c.size*s),Math.round(c.size*s));ctx.restore();return true;
 }
 function ground(ctx,m,at=now()){
  if(!m.alive)return;const a=m.action;if(!a||a.kind!=='aoe')return;const center=a.center,r=a.radius;
  ctx.save();
  if(at<a.impactAt){const progress=clamp((at-a.startedAt)/Math.max(1,a.impactAt-a.startedAt),0,1);
   ctx.fillStyle='rgba(183,40,22,.18)';ctx.strokeStyle='#ffce77';ctx.lineWidth=3;ctx.beginPath();ctx.arc(center.x,center.y,r,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.strokeStyle='#ff652c';ctx.lineWidth=5;ctx.beginPath();ctx.arc(center.x,center.y,r-5,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);ctx.stroke();
  }
  const v=data.vfx,img=image(v.image),frame=at<a.impactAt?Math.min(5,Math.floor((at-a.startedAt)/Math.max(1,a.impactAt-a.startedAt)*6)):Math.min(23,6+Math.floor((at-a.impactAt)/850*18)),size=r*2.15,s=size/v.size;
  if(img.complete&&img.naturalWidth){ctx.imageSmoothingEnabled=false;ctx.globalAlpha=at<a.impactAt?.65:1;ctx.drawImage(img,(frame%v.columns)*v.size,Math.floor(frame/v.columns)*v.size,v.size,v.size,Math.round(center.x-v.anchor[0]*s),Math.round(center.y-v.anchor[1]*s),Math.round(size),Math.round(size));}
  ctx.restore();
 }
 root.KaizokuAkainuArt=Object.freeze({pose,draw,ground,sync,now,observe});
})(globalThis);
