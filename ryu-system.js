'use strict';
((root)=>{
 if(typeof module!=='undefined')require('./ryu-data.js');
 const {rules,clips}=root.MareRyuData,images=new Map(),directions={front:'south',back:'north',left:'west',right:'east'};
 const clip=(action='idle',direction='front')=>clips[action]?.[directions[direction]||direction]||clips.idle.south;
 function image(url){if(!images.has(url)){const im=new Image();im.addEventListener?.('load',()=>{if(typeof window!=='undefined')window.dispatchEvent(new Event('mare-zoan-sprite-ready'));});im.src=url;images.set(url,im);}return images.get(url);}
 function preload({actors=true}={}){if(actors)for(const dirs of Object.values(clips))for(const c of Object.values(dirs))image(c.image);}
 function status(action='idle',direction='front'){const im=image(clip(action,direction).image);return !im.complete?'loading':im.naturalWidth?'ready':'failed';}
 function drawActor(c,x,y,{action='idle',direction='front',time=0,scale=1,progress=null}={}){
  const p=clip(action,direction),im=image(p.image);if(!im.complete||!im.naturalWidth)return false;
  const frame=Number.isFinite(progress)?Math.min(p.frames-1,Math.floor(Math.max(0,Math.min(1,progress))*p.frames)):['idle','walk'].includes(action)?Math.floor(Math.max(0,time)*p.fps)%p.frames:Math.min(p.frames-1,Math.floor(Math.max(0,time)*p.fps));
  // Animation cells contain extra transparent padding; preserve the idle pixel scale.
  const factor=rules.worldSize*scale/clip('idle',direction).size,size=p.size*factor;c.save();c.imageSmoothingEnabled=false;c.drawImage(im,frame*p.size,0,p.size,p.size,Math.round(x-size/2),Math.round(y-p.feet[frame]*factor),size,size);c.restore();return true;
 }
 function reduction(target={},hasHaki=false){if(hasHaki)return 0;const id=target.fruitId||target.equippedFruitId||target.fruit?.id;return id==='akuma_beta_beta'?.3:Math.max(0,Math.min(1,Number(target.physicalDamageReduction)||0));}
 const mitigate=(amount,target,hasHaki=false)=>Math.max(1,Math.floor(amount*(1-reduction(target,hasHaki))));
 const damage=(attack,armor,multiplier,penetration=0,target={},hasHaki=false)=>mitigate(Math.max(1,Math.floor(attack*multiplier-armor*(1-penetration)*.3)),target,hasHaki);
 const stunned=(target,now)=>Number(target?.ryuStunUntil)>now;
 function stun(target,now){target.ryuStunUntil=Math.max(target.ryuStunUntil||0,now+3);target.isStunned=true;target.moving=0;target.telegraph=null;}
 const skill=key=>rules.skills.find(s=>s.key===String(key));
 const action=key=>String(key)==='1'?'bite':'tail';
 const timing=(key,direction)=>{const c=clip(action(key),direction);return {duration:c.frames/c.fps,impact:c.impact_frame/c.fps};};
 const api={rules,clips,clip,preload,status,drawActor,reduction,mitigate,damage,stunned,stun,skill,action,timing};root.MareRyu=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
