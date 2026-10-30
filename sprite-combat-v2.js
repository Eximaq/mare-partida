'use strict';
/* Visual adapter for the existing renderers. No combat clock, callback or save data. */
((root)=>{
 const reactions=new WeakMap(),images=new Map(),HURT_SECONDS=.18;
 const directions={front:'south',back:'north',left:'west',right:'east'};
 const fruits={akuma_tori_albatroz:'tori',akuma_uma_uma:'uma',akuma_inu_dachshund:'inu',akuma_neko_leopard:'neko',akuma_ushi_giraffe:'ushi',akuma_inu_wolf:'wolf',akuma_ryu_ryu:'ryu',akuma_ushi_bison:'bison'};
 const data=()=>root.MareSpriteCombatV2Data||{};
 function hurtProgress(actor,now){const start=reactions.get(actor);if(start===undefined)return null;const elapsed=now-start;if(elapsed<0||elapsed>=HURT_SECONDS){reactions.delete(actor);return null;}return elapsed/HURT_SECONDS;}
 function hurt(actor,damage,now,{protected:protectedAction=false}={}){
  if(!actor||!Number.isFinite(damage)||damage<=0||!Number.isFinite(now))return false;
  if(protectedAction){reactions.delete(actor);return false;}
  if(hurtProgress(actor,now)!==null)return false;
  reactions.set(actor,now);return true;
 }
 function resolve(key,action='idle',direction='front'){
  const entry=data()[key];if(!entry)return null;
  // The owner intentionally uses the native South reaction for damage from every facing.
  const facing=action==='hurt'?'south':directions[direction]||direction;
  const aliases={dash:'special',charge:'special',finish:'special',headbutt:'special',bite:'special',tail:'special-2'};
  action=aliases[action]||action;
  // Missing clips still fall back to the new Idle; no directions are fabricated.
  const requested=entry.clips[action]?.[facing];
  const locomotion=['walk','run'].includes(action)?(entry.clips.walk?.[facing]||entry.clips.run?.[facing]):null;
  return {entry,clip:requested||locomotion||entry.clips.idle[facing]||entry.clips.idle.south,requested:!!requested,action,facing};
 }
 function image(url){
  if(!images.has(url)){
   const im=new Image(),notify=()=>{if(typeof window!=='undefined')window.dispatchEvent(new Event('mare-zoan-sprite-ready'));};
   im.addEventListener?.('load',notify);im.addEventListener?.('error',notify);im.src=url;images.set(url,im);
  }return images.get(url);
 }
 function preload(key){const entry=data()[key];if(entry)for(const ds of Object.values(entry.clips))for(const c of Object.values(ds))image(c.image);}
 function status(key,action,direction){const r=resolve(key,action,direction);if(!r)return 'missing';const im=image(r.clip.image);return !im.complete?'loading':im.naturalWidth?'ready':'failed';}
 const clamp=n=>Math.max(0,Math.min(1,n));
 // Retiming is exclusively visual: map the unchanged logical hit ratio to the inspected contact pose.
 function frameAt(clip,{time=0,progress=null,hitRatio=null}={}){
  let p=Number.isFinite(progress)?clamp(progress):null;
  if(p!==null&&Number.isFinite(hitRatio)&&clip.impact_frame!==undefined){
   const contact=clip.impact_frame/clip.frames,r=clamp(hitRatio);
   p=p<=r?(r>0?p/r*contact:contact):contact+(p-r)/(1-r||1)*(1-contact);
  }
  if(clip.playback_frames){const index=p??clamp(time/clip.playback_seconds);return clip.playback_start+Math.min(clip.playback_frames-1,Math.floor(index*clip.playback_frames));}
  if(p!==null)return Math.min(clip.frames-1,Math.floor(p*clip.frames+1e-9));
  const step=Math.floor(Math.max(0,time)*clip.fps+1e-9);
  if(clip.loop){const start=clip.loop_start??0,end=clip.loop_end??clip.frames-1;return start+step%(end-start+1);}
  return Math.min(clip.frames-1,step);
 }
 function draw(c,key,x,y,{action='idle',direction='front',time=0,scale=1,height=null,progress=null,hitRatio=null,flash=false,fit=null}={}){
  const r=resolve(key,action,direction);if(!r)return false;
  let clip=r.clip,im=image(clip.image);
  if(!im.complete||!im.naturalWidth){clip=r.entry.clips.idle[r.facing]||r.entry.clips.idle.south;im=image(clip.image);if(!im.complete||!im.naturalWidth)return false;}
  const frame=frameAt(clip,{time,progress,hitRatio}),base=r.entry.clips.idle[r.facing]||r.entry.clips.idle.south;
  const b=base.bounds[0],extent=Math.max(b[2]-b[0],b[3]-b[1]);
  const reference=r.entry.idle_extent_ratio?extent/r.entry.idle_extent_ratio:b[3]-b[1];
  let factor=(height??r.entry.legacyHeight*scale)/reference;
  if(Number.isFinite(fit)&&fit>0)factor=Math.min(factor,fit/extent);
  const size=Math.round(clip.size*factor),foot=clip.anchor[1];
  c.save();c.imageSmoothingEnabled=false;if(flash)c.filter='brightness(1.5)';
  c.drawImage(im,frame*clip.size,0,clip.size,clip.size,Math.round(x-size/2),Math.round(y-foot*factor),size,size);c.restore();return true;
 }
 function monster(c,m,now){
  const entry=data()[m.type];if(!entry||!entry.monster)return false;
  const reaction=m.alive!==false?hurtProgress(m,now):null,attacking=m.attackAnim>0;
  const action=reaction!==null?'hurt':attacking?'attack':m.moving>0?'walk':'idle';
  const duration=m.type==='bananawani'?.9:.58;
  // Legacy mobs apply damage immediately. Begin at contact; never defer their damage.
  const clip=resolve(m.type,action,m.emberFacing||'south').clip;
  const progress=reaction??(attacking?(clip.impact_frame??0)/clip.frames+(1-m.attackAnim/duration)*(1-(clip.impact_frame??0)/clip.frames):null);
  return draw(c,m.type,m.x,m.y+3,{action,direction:m.emberFacing||'south',time:now+(m.bob||0),progress,height:entry.worldHeight*(entry.world_scale??1),flash:reaction!==null&&!resolve(m.type,'hurt',m.emberFacing||'south').requested});
 }
 function install(){
  const art=root.MareZoanArt;
  if(art){const original=art.draw,oldStatus=art.status,oldTiming=art.attackTiming;art.draw=function(c,id,x,y,o={}){const key=fruits[id];return key&&data()[key]?draw(c,key,x,y,{...o,...(key==='ryu'?{height:data().ryu.worldHeight*(o.scale??1)}:{})}):original(c,id,x,y,o);};art.status=(id,a,d)=>fruits[id]?status(fruits[id],a,d):oldStatus(id,a,d);
   // Original logical metadata remains authoritative, independent of image loading.
   art.attackTiming=(id,d='front')=>data()[fruits[id]]?.logical_attack?.[directions[d]||d]||oldTiming(id,d);
  }
  for(const [name,key,mode]of [['MareNeko','neko','scale'],['MareUshi','ushi','scale'],['MareWolf','wolf','scale'],['MareRyu','ryu','world'],['MareRankCExpansion','bison','height']]){
   const system=root[name];if(!system)continue;
   const original=system.drawActor,oldStatus=system.status,oldPreload=system.preload;
   system.drawActor=function(c,x,y,o={}){const entry=data()[key];if(!entry)return original(c,x,y,o);const height=mode==='world'?entry.worldHeight*(o.scale??1):mode==='height'?entry.legacyHeight*(o.height??64)/64:null;return draw(c,key,x,y,{...o,height});};
   system.status=(a,d)=>data()[key]?status(key,a,d):oldStatus(a,d);
   system.preload=()=>{if(data()[key])preload(key);oldPreload();};
  }
  if(root.MareNewIslandArt){const old=root.MareNewIslandArt.monster;root.MareNewIslandArt.monster=(c,m,t)=>data()[m.type]?.monster?monster(c,m,t):old(c,m,t);}
  if(root.MareRareRenderer){const old=root.MareRareRenderer.monster;root.MareRareRenderer.monster=(c,m,t)=>m.type==='cocox'&&data().cocox?monster(c,m,t):old(c,m,t);}
  if(root.MareHoya){const system=root.MareHoya,old=system.drawActor,oldPreload=system.preload;system.drawActor=(c,g,t)=>{if(!data().hoya)return old(c,g,t);const p=g.clock.snapshot(),reaction=hurtProgress(g,t);return draw(c,'hoya',g.x,g.y,{action:reaction!==null?'hurt':p.locked?'attack':g.walking>0?'walk':'idle',direction:g.direction,time:t,progress:reaction??(p.locked?p.progress:null),hitRatio:p.hitFrameRatio,height:data().hoya.worldHeight*g.scale*(data().hoya.world_scale??1)});};system.preload=()=>{preload('hoya');oldPreload();};}
 }
 root.MareSpriteCombatV2={hurt,hurtProgress,resolve,draw,monster,status,preload,frameAt,install,fruits,HURT_SECONDS};
 install();
})(globalThis);
