'use strict';
/* Visual adapter for the existing renderers. No combat clock, callback or save data. */
((root)=>{
 const reactions=new WeakMap(),images=new Map(),lastDraw=new Map(),HURT_SECONDS=.18;
 const directions={front:'south',back:'north',left:'west',right:'east'};
 const fruits={akuma_tori_albatroz:'tori',akuma_tori_phoenix:'phoenix',akuma_uma_uma:'uma',akuma_inu_dachshund:'inu',akuma_neko_leopard:'neko',akuma_ushi_giraffe:'ushi',akuma_inu_wolf:'wolf',akuma_ryu_ryu:'ryu',akuma_ushi_bison:'bison'};
 const data=()=>root.MareSpriteCombatV2Data||{};
 const errors=new Map(),assetBase=typeof document!=='undefined'&&document.currentScript?.src?new URL('.',document.currentScript.src):null;
 const assetVersion=typeof document!=='undefined'&&document.currentScript?.src?new URL(document.currentScript.src).searchParams.get('v')||'current-player-v2-20261030':'current-player-v2-20261030';
 function resourceURL(file){if(!assetBase)return file;const target=new URL(file,assetBase);target.searchParams.set('revision',assetVersion);return target.href;}
 function reportMissing(component,asset,action=null,direction=null,code='missing-current-resource'){
  const key=[asset,action,direction,code].join(':');if(errors.has(key))return;
  const detail={component,asset,resolved:typeof asset==='string'&&asset.startsWith('assets/')?resourceURL(asset):asset,action,direction,code,status:'failed'};errors.set(key,detail);while(errors.size>24)errors.delete(errors.keys().next().value);console.error('[current-player-sprite]',detail);
 }

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
  action=key==='phoenix'&&action==='dash'?'dash':aliases[action]||action;
  // Authored locomotion aliases remain valid. Playable forms never borrow an unrelated action.
  const requested=entry.clips[action]?.[facing];
  const locomotion=['walk','run'].includes(action)?(entry.clips.walk?.[facing]||entry.clips.run?.[facing]):null;
  return {entry,clip:requested||locomotion||(Object.values(fruits).includes(key)?null:entry.clips.idle[facing]||entry.clips.idle.south),requested:!!requested,action,facing};
 }
 function image(url,context={}){
  if(!/^assets\/sprites-combat-v2\/[a-z0-9-]+\/[a-zA-Z0-9_.-]+\.png$/.test(url)){reportMissing(context.consumer||'sprite-combat-v2',String(url),context.action,context.direction,'invalid-current-path');return null;}
  if(!images.has(url)){
   const im=new Image(),notify=()=>{if(typeof window!=='undefined')window.dispatchEvent(new Event('mare-zoan-sprite-ready'));};
   im.addEventListener?.('load',notify);im.addEventListener?.('error',()=>{reportMissing(context.consumer||'sprite-combat-v2',url,context.action,context.direction,'image-load');notify();});im.src=resourceURL(url);images.set(url,im);
  }return images.get(url);
 }
 function preload(key){const entry=data()[key];if(entry)for(const [action,ds]of Object.entries(entry.clips))for(const [direction,c]of Object.entries(ds))image(c.image,{consumer:'current-sprite-preload:'+key,action,direction});}
 function status(key,action,direction){const r=resolve(key,action,direction);if(!r?.clip){reportMissing('current-sprite:'+key,key,action,direction);return 'missing';}const im=image(r.clip.image,{consumer:'current-sprite:'+key,action:r.action,direction:r.facing});if(!im)return 'failed';if(!im.complete)return 'loading';if(im.naturalWidth===r.clip.size*r.clip.frames&&im.naturalHeight===r.clip.size)return 'ready';reportMissing('current-sprite:'+key,r.clip.image,r.action,r.facing,'image-dimensions');return 'failed';}
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
  lastDraw.set(key,{action,direction});
  const r=resolve(key,action,direction);if(!r?.clip){reportMissing('current-sprite:'+key,key,action,direction);return false;}
  const clip=r.clip,im=image(clip.image,{consumer:'current-sprite:'+key,action:r.action,direction:r.facing});
  if(!im||!im.complete)return false;
  if(im.naturalWidth!==clip.size*clip.frames||im.naturalHeight!==clip.size){reportMissing('current-sprite:'+key,clip.image,r.action,r.facing,'image-dimensions');return false;}
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
  // PR177 native Hurt backport; keep catalog contributions from main conflict-free.
  // Register the approved clip, never substitute another action or overwrite authored Hurt.
  const phoenix=data().phoenix;
  if(phoenix&&!phoenix.clips.hurt)phoenix.clips.hurt={"south":{"image":"assets/sprites-combat-v2/phoenix/hurt-south.png","size":132,"frames":4,"fps":22.22222222222222,"loop":false,"bounds":[[21,25,111,113],[16,28,115,110],[22,34,111,111],[33,33,99,108]],"anchor":[66,113],"source_animation":"Recoil briefly from a frontal hit, contract the wings, then recover the original pose in place.","playback_start":0,"playback_frames":4,"playback_seconds":0.18}};
  const art=root.MareZoanArt;
  if(art){const original=art.draw,oldStatus=art.status,oldTiming=art.attackTiming;art.draw=function(c,id,x,y,o={}){const key=fruits[id];if(!key||!data()[key]){reportMissing('player-transformation',id,o.action,o.direction);return false;}return draw(c,key,x,y,{...o,...(key==='ryu'?{height:data().ryu.worldHeight*(o.scale??1)}:{})});};art.status=(id,a,d)=>fruits[id]?status(fruits[id],a,d):'missing';
   // Original logical metadata remains authoritative, independent of image loading.
   art.attackTiming=(id,d='front')=>data()[fruits[id]]?.logical_attack?.[directions[d]||d]||oldTiming(id,d);
  }
  for(const [name,key,mode]of [['MareNeko','neko','scale'],['MareUshi','ushi','scale'],['MareWolf','wolf','scale'],['MareRyu','ryu','world'],['MareRankCExpansion','bison','height']]){
   const system=root[name];if(!system)continue;
   const original=system.drawActor,oldStatus=system.status,oldPreload=system.preload;
   system.drawActor=function(c,x,y,o={}){const entry=data()[key];if(!entry){reportMissing('player-transformation',key,o.action,o.direction);return false;}const height=mode==='world'?entry.worldHeight*(o.scale??1):mode==='height'?entry.legacyHeight*(o.height??64)/64:null;return draw(c,key,x,y,{...o,height});};
   system.status=(a,d)=>status(key,a,d);
   system.preload=()=>{if(data()[key])preload(key);oldPreload({actors:false});};
  }
  if(root.MareNewIslandArt){const old=root.MareNewIslandArt.monster;root.MareNewIslandArt.monster=(c,m,t)=>data()[m.type]?.monster?monster(c,m,t):old(c,m,t);}
  if(root.MareRareRenderer){const old=root.MareRareRenderer.monster;root.MareRareRenderer.monster=(c,m,t)=>m.type==='cocox'&&data().cocox?monster(c,m,t):old(c,m,t);}
  if(root.MareHoya){const system=root.MareHoya,old=system.drawActor,oldPreload=system.preload;system.drawActor=(c,g,t)=>{if(!data().hoya)return old(c,g,t);const p=g.clock.snapshot(),reaction=hurtProgress(g,t);return draw(c,'hoya',g.x,g.y,{action:reaction!==null?'hurt':p.locked?'attack':g.walking>0?'walk':'idle',direction:g.direction,time:t,progress:reaction??(p.locked?p.progress:null),hitRatio:p.hitFrameRatio,height:data().hoya.worldHeight*g.scale*(data().hoya.world_scale??1)});};system.preload=()=>{preload('hoya');oldPreload({actors:false});};}
 }
 root.MareSpriteCombatV2={hurt,hurtProgress,resolve,draw,monster,status,visualStatus(key,action,direction){const p=lastDraw.get(key);return status(key,p?.action||action,p?.direction||direction);},preload,frameAt,install,fruits,HURT_SECONDS,reportMissing,diagnostics:()=>[...errors.values()]};
 install();
})(globalThis);
