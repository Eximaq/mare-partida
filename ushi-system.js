'use strict';
((root)=>{
  if(typeof module!=='undefined'){require('./ushi-rules.js');require('./ushi-art-data.js');}
  const rules=root.MareUshiRules,{clips,vfx}=root.MareUshiArtData;
  // Nominal 112px, 16px below the approved 128px Leopard; portraits fit separately.
  const visuals=Object.freeze({worldScale:112/64,labelLift:32});
  const directionNames={front:'south',back:'north',left:'west',right:'east'},images=new Map();
  function image(url){if(!images.has(url)){const im=new Image();im.addEventListener?.('load',()=>{if(typeof window!=='undefined')window.dispatchEvent(new Event('mare-zoan-sprite-ready'));});im.src=url;images.set(url,im);}return images.get(url);}
  function preload(){for(const dirs of Object.values(clips))for(const clip of Object.values(dirs))image(clip.image);image(vfx.image);}
  function status(action='idle',direction='front'){const clip=clips[action]?.[directionNames[direction]||direction]||clips.idle.south,im=image(clip.image);return !im.complete?'loading':im.naturalWidth?'ready':'failed';}
  function drawActor(c,x,y,{action='idle',direction='front',time=0,scale=1}={}){
    const clip=clips[action]?.[directionNames[direction]||direction]||clips.idle.south,im=image(clip.image);if(!im.complete||!im.naturalWidth)return false;
    const step=Math.max(0,Math.floor(time*clip.fps)),frame=['attack','headbutt'].includes(action)?Math.min(clip.frames-1,step):step%clip.frames;
    c.save();c.imageSmoothingEnabled=false;c.drawImage(im,frame*clip.size,0,clip.size,clip.size,Math.round(x-clip.size*scale/2),Math.round(y-clip.feet[frame]*scale),Math.round(clip.size*scale),Math.round(clip.size*scale));c.restore();return true;
  }
  function buffActive({equipped,transformed,hp,until},now=Date.now()){return equipped===rules.id&&transformed&&hp>0&&until>now;}
  const basicMultiplier=active=>active?1+rules.basicBonus:1;
  const receive=(amount,active)=>active?amount*(1-rules.mitigation):amount;
  const damage=(attack,armor)=>Math.max(1,Math.floor(attack*rules.skills[0].damage_multiplier-armor*(1-rules.penetration)*.30));
  const frontal=(hero,target,direction)=>((target.x-hero.x)*direction[0]+(target.y-hero.y)*direction[1])>=-1e-9;
  function knockback(hero,mob,clear){
    const dx=mob.x-hero.x,dy=mob.y-hero.y,length=Math.hypot(dx,dy),start={x:mob.x,y:mob.y};if(length<.001)return start;
    let from=start;
    for(let step=8;step<=rules.knockback;step+=8){const to={x:mob.x+dx/length*step,y:mob.y+dy/length*step};if(!clear(from,to))return start;from=to;}
    return from;
  }
  function vfxFrame(elapsed){let t=Math.max(0,elapsed)%vfx.duration;for(const f of vfx.frames){if(t<f.duration)return f;t-=f.duration;}return vfx.frames[0];}
  function drawBuff(c,x,y,elapsed){const frame=vfxFrame(elapsed),im=image(vfx.image);if(!im.complete||!im.naturalWidth)return false;const scale=2;c.save();c.imageSmoothingEnabled=false;c.drawImage(im,frame.x,frame.y,frame.w,frame.h,Math.round(x-vfx.anchor.x*scale),Math.round(y-56-vfx.anchor.y*scale),frame.w*scale,frame.h*scale);c.restore();return true;}
  root.MareUshi={rules,clips,vfx,visuals,preload,status,drawActor,buffActive,basicMultiplier,receive,damage,frontal,knockback,vfxFrame,drawBuff};
  if(typeof module!=='undefined')module.exports=root.MareUshi;
})(globalThis);
