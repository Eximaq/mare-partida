'use strict';
((root)=>{
 if(typeof module!=='undefined')require('./combat-vfx-data.js');
 const data=root.MareCombatVfxData,images=new Map();
 function image(kind){const asset=data.effects[kind];if(!asset||typeof Image==='undefined')return null;if(!images.has(kind)){const im=new Image();im.src=asset.image;images.set(kind,im);}return images.get(kind);}
 function preload(){Object.keys(data.effects).forEach(image);}
 function frame(kind,elapsed,{start=0,end=null,loop=false,staticFrame=null}={}){
  const effect=data.effects[kind];if(!effect||!Number.isFinite(elapsed)||elapsed<0)return null;
  if(staticFrame!==null)return Math.max(0,Math.min(effect.frames.length-1,staticFrame));
  const last=Math.min(effect.frames.length-1,end??effect.frames.length-1),first=Math.max(0,start),duration=effect.frames.slice(first,last+1).reduce((s,f)=>s+f.duration,0);if(!duration)return null;
  let time=loop?elapsed%duration:elapsed;if(time>=duration)return null;for(let i=first;i<=last;i++){if(time<effect.frames[i].duration)return i;time-=effect.frames[i].duration;}return last;
 }
 function draw(c,kind,x,y,elapsed,{width=64,height=width,angle=0,...options}={}){const index=frame(kind,elapsed,options),im=image(kind);if(index===null||!im?.complete||!im.naturalWidth)return false;const f=data.effects[kind].frames[index];c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(x),Math.round(y));if(angle)c.rotate(angle);c.drawImage(im,f.x,f.y,f.w,f.h,-width/2,-height/2,width,height);c.restore();return true;}
 function classify({classId,fruitId,skillKey,category,exclusive=false,source='fruit',name='',damageType}={}){
  if(exclusive||source==='fruit'&&data.exclusiveFruitImpacts.includes(fruitId))return null;
  const alias={cutting:'sword',slashing:'sword',blunt:'punch',magical:'mage',piercing:'dagger',explosive:'explosion'};category=alias[category]||category;
  if(category&&data.effects[category])return category;
  if(source==='class')return data.classHits[classId]||'punch';
  const skills=data.fruitSkillHits?.[fruitId];if(skills&&Object.hasOwn(skills,String(skillKey)))return skills[String(skillKey)];
  if(data.fruitHits[fruitId])return data.fruitHits[fruitId];
  if(/explos|bomba|detona|artillery|meteor/i.test(name))return 'explosion';
  if(/cort|lâmina|slash|asura/i.test(name))return 'sword';
  if(/adaga|garra|mordida/i.test(name))return 'dagger';
  return damageType==='elemental'||damageType==='magic'?'mage':'punch';
 }
 function projectile(kind,origin,targetId,meta={}){if(!data.flightEnds[kind])throw Error('Invalid projectile kind');return {kind,x:origin.x,y:origin.y,origin:{...origin},targetId,phase:'flight',elapsed:0,age:0,angle:0,...meta};}
 function step(p,dt,{target,clear=()=>true,valid=()=>true,authorize=()=>true,onHit=()=>{}}={}){
  if(p.phase==='done')return;p.age+=dt;
  if(p.phase==='impact'){p.elapsed+=dt*1000;if(frame(p.kind,p.elapsed,{start:data.flightEnds[p.kind]})===null)p.phase='done';return;}
  if(!valid(p)||!target||target.alive===false||target.isUntargetable||target.isInvulnerable||p.age>data.maxFlight){p.phase='done';return;}
  if(p.phase==='waiting')return;
  const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy),amount=Math.min(d,Math.max(0,dt)*data.projectileSpeed),next={x:p.x+(d?dx/d*amount:0),y:p.y+(d?dy/d*amount:0)};
  if(!clear(p,next)){p.phase='done';return;}p.x=next.x;p.y=next.y;p.angle=Math.atan2(dy,dx);p.elapsed+=dt*1000;
  if(d-amount<=data.hitRadius){
   const accept=ok=>{if(ok===false||p.phase==='done'||!valid(p)){p.phase='done';return;}p.phase='impact';p.elapsed=0;onHit(p);};
   try{const result=authorize(p);if(result?.then){p.phase='waiting';result.then(accept).catch(()=>{p.phase='done';});}else accept(result);}catch{p.phase='done';}
  }
 }
 function drawProjectile(c,p){if(p.phase==='done')return false;const end=data.flightEnds[p.kind];return draw(c,p.kind,p.x,p.y,p.elapsed,{start:p.phase==='impact'?end:0,end:p.phase==='impact'?null:end-1,loop:p.phase==='flight',staticFrame:p.phase==='waiting'?end-1:null,angle:p.phase==='impact'?0:p.angle});}
 function layout(x,y,{height=74,barWidth=60,nameWidth=0}={}){const head=y-height,barY=head-36;return {x,y,head,barY,nameY:barY-7,chestY:y-height*.45,iconX:x+Math.max(barWidth/2,nameWidth/2)+13,iconY:barY+3,ccY:head-14};}
 function statuses(entity={},now=0,epoch=Date.now(),extra={}){
  const remaining=entity.talentControl?.remaining>0,stunned=(remaining&&entity.talentControl.type==='stun')||entity.ryuStunUntil>now||entity.bisonStunUntil>now||(entity.hanaStunFrom<=now&&entity.hanaStunUntil>now),bound=(remaining&&entity.talentControl.type!=='stun')||entity.betaRootUntil>now||entity.doruRootUntil>now;
  const cc=[];if(stunned||extra.stun||entity.isStunned===true&&!['ryuStunUntil','bisonStunUntil','hanaStunUntil'].some(k=>k in entity)&&!entity.talentControl)cc.push('stun');if(bound||extra.bind||entity.isImmobilized===true&&!['hanaStunUntil','betaRootUntil','doruRootUntil'].some(k=>k in entity)||entity.isRooted===true&&!['betaRootUntil','doruRootUntil'].some(k=>k in entity))cc.push('bind');
  const icons=[];if(entity.talentWear?.remaining>0||entity.zoanDefense?.remaining>0||entity.hakiDebuff>0||entity.empRemaining>0||entity.kobuDebuffUntil>epoch||extra.armorDown)icons.push('armorDown');if(extra.armorUp)icons.push('armorUp');if(extra.buff||entity.kobuBuffUntil>epoch||entity.horuSpeedUntil>epoch)icons.push('buff');return {cc:[...new Set(cc)],icons:[...new Set(icons)]};
 }
 function drawStatuses(c,box,status,now){status.icons.forEach((kind,i)=>draw(c,kind,box.iconX+i*21,box.iconY,0,{width:data.statusSize,staticFrame:0}));status.cc.forEach((kind,i)=>draw(c,kind,box.x+(i-(status.cc.length-1)/2)*28,box.ccY,now*1000,{width:data.ccSize,loop:true}));}
 if(typeof Image!=='undefined')preload();
 const api={data,frame,draw,preload,classify,projectile,step,drawProjectile,layout,statuses,drawStatuses};root.MareCombatVfx=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
