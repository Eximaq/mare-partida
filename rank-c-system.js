'use strict';
((root)=>{
 if(typeof module!=='undefined')require('./rank-c-data.js');
 const {rules,effects}=root.MareRankCData,images=new Map();let partyProvider=null;
 const visible=(entity,view)=>!!view&&entity.x>=view.x&&entity.y>=view.y&&entity.x<=view.x+view.width&&entity.y<=view.y+view.height;
 function cleanse(entity){
  for(const key of ['talentControl','talentPoison','talentSlow','wolfBleed','poison','bleed','bleeding','stun','freeze','frozen','root','hanaStunFrom','hanaStunUntil'])delete entity[key];
  for(const key of ['slow','stunUntil','frozenUntil','rootUntil','doruRootUntil','betaRootUntil'])entity[key]=0;
  entity.isRooted=false;entity.isStunned=false;entity.isFrozen=false;entity.isImmobilized=false;
  if(entity.debuffs instanceof Map||entity.debuffs instanceof Set)entity.debuffs.clear();else if(entity.debuffs)entity.debuffs=Array.isArray(entity.debuffs)?[]:{};
 }
 function healParty(self,members,view,now=Date.now()){
  const selected=[self],seen=new Set([String(self.id)]);
  if(self.partyId)for(const m of members||[])if(m&&m.id!=null&&!seen.has(String(m.id))&&m.partyId===self.partyId&&m.instance===self.instance&&m.alive!==false&&m.hp>0&&visible(m,view)){selected.push(m);seen.add(String(m.id));}
  for(const m of selected){const status=m.status||m;cleanse(status);m.hp=Math.min(m.maxHP,m.hp+Math.max(0,m.maxHP)*rules.horu.heal);status.horuSpeedUntil=now+rules.horu.speedDuration;}
  return selected;
 }
 function mark(target,now=Date.now()){target.hasMatoMark=true;target.matoMarkUntil=now+rules.mato.markDuration;target.matoMarkedAt=now;target.matoCharges=rules.mato.charges;}
 const marked=(target,now=Date.now())=>!!target&&target.alive!==false&&target.hp!==0&&target.hasMatoMark===true&&target.matoMarkUntil>now;
 function clearMark(target){target.hasMatoMark=false;target.matoMarkUntil=0;target.matoCharges=0;}
 function projectile(origin,direction,target,attack,homing,map){const length=Math.hypot(...direction)||1;return {x:origin.x,y:origin.y,dx:direction[0]/length,dy:direction[1]/length,targetId:homing?target.id:null,attack,homing,travel:0,elapsed:0,done:false,ttl:homing?Math.hypot(map.width,map.height)/rules.mato.speed*8+10:rules.mato.range/rules.mato.speed+1};}
 function segmentDistance(a,b,m){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((m.x-a.x)*dx+(m.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(m.x-a.x-dx*t,m.y-a.y-dy*t);}
 function stepProjectile(p,dt,mobs,clear,onHit){
  if(p.done)return;dt=Math.min(Math.max(0,dt),Math.max(0,p.ttl-p.elapsed));p.elapsed+=dt;
  let target=p.homing?mobs.find(m=>String(m.id)===String(p.targetId)&&m.alive!==false&&m.hp!==0):null;if(p.homing&&!target){p.done=true;return;}
  let budget=rules.mato.speed*Math.max(0,dt);if(!p.homing)budget=Math.min(budget,rules.mato.range-p.travel);
  while(budget>1e-8&&!p.done){
   if(target){const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy);if(d<=rules.mato.hitRadius){p.done=true;onHit(target,p);break;}p.dx=dx/d;p.dy=dy/d;}
   const step=Math.min(8,budget),from={x:p.x,y:p.y},to={x:p.x+p.dx*step,y:p.y+p.dy*step};if(!p.homing&&!clear(from,to)){p.done=true;break;}
   const hits=(target?[target]:mobs.filter(m=>m.alive!==false&&m.hp!==0)).filter(m=>segmentDistance(from,to,m)<=rules.mato.hitRadius).sort((a,b)=>Math.hypot(a.x-from.x,a.y-from.y)-Math.hypot(b.x-from.x,b.y-from.y));
   p.x=to.x;p.y=to.y;p.travel+=step;budget-=step;
   if(hits.length){p.done=true;onHit(hits[0],p);}
  }
  if(p.elapsed>=p.ttl||(!p.homing&&p.travel>=rules.mato.range-1e-8))p.done=true;
 }
 function image(url){if(!images.has(url)){const im=new Image();im.src=url;images.set(url,im);}return images.get(url);}
 function preload(){for(const f of Object.values(effects))image(f.image);}
 function frame(kind,elapsed,loop=true){const fx=effects[kind];if(!loop&&elapsed>=fx.duration)return null;let t=Math.max(0,elapsed)%fx.duration;for(const f of fx.frames){if(t<f.duration)return f;t-=f.duration;}return fx.frames[0];}
 function draw(c,kind,x,y,elapsed,{width=64,height=width,loop=true}={}){const f=frame(kind,elapsed,loop);if(!f)return false;const im=image(effects[kind].image);if(!im.complete||!im.naturalWidth)return false;c.save();c.imageSmoothingEnabled=false;c.drawImage(im,f.x,f.y,f.w,f.h,Math.round(x-width/2),Math.round(y-height/2),width,height);c.restore();return true;}
 const controlled=(entity,worldTime=0)=>entity.talentControl?.remaining>0||entity.isStunned||entity.isFrozen||entity.isRooted||entity.doruRootUntil>worldTime||entity.stunUntil>Date.now()||entity.frozenUntil>Date.now();
 const api={controlled,rules,effects,visible,cleanse,healParty,mark,marked,clearMark,projectile,stepProjectile,preload,frame,draw,setPartyProvider(provider){if(provider!==null&&typeof provider!=='function')throw TypeError('Party provider must be a function');partyProvider=provider;},partyMembers(context){return partyProvider?.(context)||[];}};
 root.MareRankC=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
