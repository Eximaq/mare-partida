/* Luffy's complete visual: lazy RGBA atlases and presentation-only state. */
(function(root){
 'use strict';
 const animation=root.MareLuffyAnimation||(typeof require==='function'?require('./luffy-animation.js'):null);
 const base='assets/skins/visual-completo/luffy/',itemDef=246,maxImages=12,worldHeight=105;
 const warmParallel=2,maxParallel=4;
 const directions=['south','north','east','west'];
 const classes=new Set(['sword','brawler','gunner','rogue','cyborg','strategist','healer']);
 const equipped=player=>classes.has(player?.classId)&&player?.equipment?.visual_completo?.def===itemDef;
 function weaponIdOf(player){
  const weapon=player.equipment?.weapon,def=weapon?.def??weapon;
  return Number.isInteger(def)?def:null;
 }
 function inputFor(player,options){
  const weaponId=weaponIdOf(player);
  const input={classId:player.classId,weaponId,weaponEquipped:weaponId!==null,action:options.action||'idle',direction:options.direction||'south',time:options.time||0,progress:options.progress,hitFrameRatio:options.timing?.hitFrameRatio,skillIndex:options.skillIndex,freeHandPower:!!(options.freeHandPower||options.weaponless),weaponless:!!options.weaponless};
  if(['idle','combat-idle','walk','run','hurt'].includes(input.action))input.skillIndex=undefined;
  // A missing functional weapon still has a complete Luffy body. Class powers
  // use a bare-hand gesture until the corresponding focus is equipped.
  if(weaponId===null&&[0,1].includes(input.skillIndex)&&!input.freeHandPower&&player.classId!=='brawler'){
   input.clip=player.classId==='cyborg'&&input.skillIndex===1?'guard_brawler_bare':'cast_palm_shared';
  }
  return input;
 }
 function pose(data,player,options={}){
  if(!equipped(player)||player.zoanTransformed||options.action==='death'||!animation)return null;
  const p=animation.pose(data,inputFor(player,options));
  return p?{...p,action:p.clip}:null;
 }
 let atlas=null,pending=null,error=null,last=null,retryAtlasAt=0,active=null,warming=null;
 const images=new Map(),requests=new Map(),retryAt=new Map();
 const ownerOf=player=>player.characterId??player.id??null;
 const inWorld=consumer=>['world','world-silhouette','shared-lobby'].includes(consumer||'world');
 function report(problem){error=problem.message;console.error('[visual-completo-luffy]',error);}
 function validate(data){
  if(data?.skinId!=='visual_completo_luffy'||!Array.isArray(data.loadouts)||!data.clips||!data.sources)throw Error('Atlas Luffy inválido');
  for(const [id,clip] of Object.entries(data.clips))for(const direction of directions){
   const frames=clip.frames?.[direction];
   const d=clip.directions?.[direction],source=data.sources[d?.source];
   if(!source||!/^atlases\/[a-z0-9_/-]+\.png$/.test(source.file)||source.file.includes('..')||!Array.isArray(source.size)||source.size.length!==2||!source.size.every(n=>Number.isInteger(n)&&n>0)||!/^[a-f0-9]{64}$/.test(source.sha256)||!Number.isFinite(d.scale)||d.scale<=0||!Number.isFinite(d.bodyHeight)||d.bodyHeight<=0||!Array.isArray(frames)||frames.length!==8)throw Error('Clipe Luffy inválido: '+id+' / '+direction);
   for(const f of frames){
    const [x,y,w,h]=f.rect||[];
    if(![x,y,w,h].every(Number.isInteger)||x<0||y<0||w<=0||h<=0||x+w>source.size[0]||y+h>source.size[1]||f.anchor?.length!==2||!f.anchor.every(Number.isFinite))throw Error('Quadro Luffy inválido: '+id+' / '+direction);
   }
   const offsets=data.worldPresentation?.walkOffsets?.[id]?.[direction];
   if(offsets!==undefined&&(clip.kind!=='walk'||!Array.isArray(offsets)||offsets.length!==frames.length||
    offsets.some(x=>!Number.isInteger(x)||Math.abs(x)>d.bodyHeight/5)))throw Error('Encaixe da caminhada Luffy inválido: '+id+' / '+direction);
  }
  return data;
 }
 function loadAtlas(){
  if(atlas)return Promise.resolve(atlas);
  if(pending)return pending;
  if(Date.now()<retryAtlasAt)return Promise.resolve(null);
  pending=fetch(base+'atlas.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Atlas Luffy HTTP '+r.status);return r.json();}).then(data=>{atlas=validate(data);error=null;return atlas;}).catch(problem=>{retryAtlasAt=Date.now()+3000;report(problem);return null;}).finally(()=>{pending=null;});
  return pending;
 }
 function remember(key,image){
  images.delete(key);images.set(key,image);
  while(images.size>maxImages)images.delete(images.keys().next().value);
 }
 function viewSource(clip,direction){
  const e=clip.directions.east,w=clip.directions.west;
  // The supplied western strip is a pixel-exact mirror of the eastern one.
  const mirrored=direction==='west'&&atlas.worldPresentation?.mirrorWest===true&&
   !!atlas.sources[e.source].sourceSha256&&atlas.sources[e.source].sourceSha256===atlas.sources[w.source].sourceSha256&&
   e.frameSize?.[0]===w.frameSize?.[0]&&e.frameSize?.[1]===w.frameSize?.[1];
  return {key:clip.directions[mirrored?'east':direction].source,mirrored};
 }
 function sourceFor(key,full=false){
  const original=images.get(key);
  return full&&original?original:active?.images.get(key)||original;
 }
 async function worldRaster(image){
  if(typeof root.createImageBitmap==='function'&&image.naturalWidth%2===0&&image.naturalHeight%2===0){
   try{
    const bitmap=await root.createImageBitmap(image,{resizeWidth:image.naturalWidth/2,
     resizeHeight:image.naturalHeight/2,resizeQuality:'high'});
    return {image:bitmap,ratio:.5};
   }catch{/* The original remains usable if this browser cannot resize the atlas. */}
  }
  return {image,ratio:1};
 }
 function loadSource(key,{background=false,full=false}={}){
  const cached=full?images.get(key):background?active?.images.get(key):sourceFor(key);
  if(cached){if(images.get(key)===cached)remember(key,cached);return Promise.resolve(true);}
  const loading=requests.get(key);
  if(loading){
   if(!background){loading.demand=true;loading.image.fetchPriority='high';}
   loading.full||=full;
   return loading.task;
  }
  if(!atlas?.sources[key]||requests.size>=maxParallel||Date.now()<(retryAt.get(key)||0))return Promise.resolve(false);
  const source=atlas.sources[key],original=images.get(key),image=original?.image||new Image();
  if(!original){
   image.fetchPriority=background?'low':'high';
   image.src=base+source.file+'?v='+source.sha256.slice(0,16);
  }
  const request={image,full,demand:!background};
  request.task=(original?Promise.resolve():image.decode()).then(async()=>{
   if(image.naturalWidth!==source.size[0]||image.naturalHeight!==source.size[1])throw Error('Dimensões incorretas: '+source.file);
   if(active?.keys.has(key)&&!active.images.has(key)){
    const raster=await worldRaster(image);
    if(active?.keys.has(key))active.images.set(key,raster);
    else if(raster.image!==image)raster.image.close?.();
   }
   if(request.full||request.demand&&!active?.images.has(key))remember(key,{image,ratio:1});
   retryAt.delete(key);if(!retryAt.size)error=null;return true;
  }).catch(problem=>{retryAt.set(key,Date.now()+3000);report(problem);return false;}).finally(()=>{
   requests.delete(key);warmNext();
  });
  requests.set(key,request);return request.task;
 }
 function warmNext(){
  while(active?.queue.length&&requests.size<warmParallel){
   const key=active.queue.shift();
   if(!active.images.has(key)&&!requests.has(key))void loadSource(key,{background:true});
  }
 }
 function warmClass(player,direction='south'){
  if(!equipped(player)){
   for(const {image} of active?.images.values()||[])image.close?.();
   active=null;warming=null;return;
  }
  if(!atlas){
   if(Date.now()<retryAtlasAt)return;
   const start=!warming;warming={player,direction};
   if(!start)return;
   void loadAtlas().then(data=>{
    const wanted=warming;warming=null;
    if(data&&wanted)warmClass(wanted.player,wanted.direction);
   });
   return;
  }
  const owner=ownerOf(player),armed=weaponIdOf(player)!==null;
  if(active?.owner===owner&&active.classId===player.classId&&active.armed===armed)return;
  const idle=animation.pose(atlas,inputFor(player,{direction}));
  if(!idle)return;
  const walk=atlas.clips['walk_'+idle.loadout],bare=atlas.clips.cast_palm_shared;
  const ordered=new Set();
  const add=(clip,d)=>{if(clip)ordered.add(viewSource(clip,d).key);};
  add(idle.data,idle.direction);add(bare,idle.direction);add(walk,idle.direction);
  for(const d of directions){add(idle.data,d);add(walk,d);}
  const clips=Object.values(atlas.clips);
  for(const clip of clips.filter(c=>c.loadout===idle.loadout||c.classId==='all'))for(const d of directions)add(clip,d);
  for(const clip of clips.filter(c=>c.classId===player.classId))for(const d of directions)add(clip,d);
  if(!armed&&player.classId==='cyborg')for(const d of directions)add(atlas.clips.guard_brawler_bare,d);
  const previous=active;
  active={owner,classId:player.classId,armed,keys:ordered,queue:[...ordered],started:previous?.owner===owner&&previous.started,
   images:new Map([...(previous?.images||[])].filter(([key])=>ordered.has(key))),
   held:previous?.owner===owner?previous.held:{}};
  for(const [key,raster] of previous?.images||[]){
   if(!ordered.has(key)&&raster!==active.held.armed?.raster&&raster!==active.held.bare?.raster)raster.image.close?.();
  }
  void loadSource(viewSource(idle.data,idle.direction).key);
  if(bare)void loadSource(viewSource(bare,idle.direction).key);
  warmNext();
 }
 function readyPose(p,full=false){
  if(!p)return null;
  const source=viewSource(p.data,p.direction),raster=sourceFor(source.key,full);
  return raster?{p,source,raster}:null;
 }
 function readyRest(input,clip,direction,full=false){
  for(const d of [direction,...directions.filter(value=>value!==direction)]){
   const p=animation.pose(atlas,{...input,clip,direction:d,time:0,progress:0});
   const ready=readyPose(p,full);
   if(ready)return ready;
  }
  return null;
 }
 async function prepare(player,options={}){
  if(!equipped(player)||!await loadAtlas())return false;
  const p=pose(atlas,player,options);
  return p?loadSource(viewSource(p.data,p.direction).key,{full:!inWorld(options.consumer)}):false;
 }
 function draw(ctx,player,options={}){
  if(!equipped(player)||player.zoanTransformed)return false;
  if(!atlas){void loadAtlas();return false;}
  const requested=pose(atlas,player,options);if(!requested)return false;
  const map=inWorld(options.consumer),full=!map;
  const key=viewSource(requested.data,requested.direction).key;
  let visual=readyPose(requested,full);
  if(!visual||full&&!images.has(key))void loadSource(key,{full});
  const plan=active?.owner===ownerOf(player)&&options.consumer!=='shared-lobby'?active:null;
  const input=inputFor(player,options);
  const unarmed=input.freeHandPower||!input.weaponEquipped,kind=unarmed?'bare':'armed';
  if(plan&&!plan.started){
   // Seed both sides of the transition before presenting the skin in the world.
   plan.held.bare=readyRest(input,'cast_palm_shared',requested.direction);
   if(plan.armed){
    const neutral=inputFor(player,{});
    plan.held.armed=readyRest(neutral,'idle_'+animation.loadoutFor(atlas,neutral),requested.direction);
   }
   if(!plan.held.bare||plan.armed&&!plan.held.armed)return false;
   plan.started=true;
  }
  if(!visual)visual=readyRest(input,unarmed?'cast_palm_shared':'idle_'+requested.loadout,requested.direction,full)||plan?.held[kind]||plan?.held.bare;
  if(!visual)return false;
  const {p,source,raster}=visual;
  if(images.get(source.key)===raster)remember(source.key,raster);
  if(map&&plan)plan.held[kind]=visual;
  let x=options.x||0,y=options.y||0;
  let scale=(map?worldHeight/p.bodyHeight:p.scale)*(options.scale==null?1:options.scale*46/96);
  const anchored=options.inventoryPresentation&&(options.avatarWorldPose||options.avatarZoom===null);
  if(anchored){
   const cw=ctx.canvas.width,ch=ctx.canvas.height,margin=10;x=cw/2;y=ch-24;
   const height=animation.fitBodyHeight(atlas,inputFor(player,options),96*(options.avatarZoom||2),{left:x-margin,right:cw-x-margin,above:y-margin,below:ch-y-margin});
   scale=height/p.bodyHeight;if(!(scale>0))return false;
  }
  if(p.data.kind==='walk'&&map)x+=(atlas.worldPresentation?.walkOffsets?.[p.clip]?.[p.direction]?.[p.index]||0)*scale;
  animation.draw(ctx,raster.image,p,x,y,scale*p.bodyHeight,{sourceRatio:raster.ratio,mirrored:source.mirrored,
   sourceFrame:source.mirrored?p.data.frames.east[p.index]:p.frame});
  last={skinId:'visual_completo_luffy',action:p.clip,direction:p.direction,frame:p.index,loadout:p.loadout,scale,
   consumer:options.consumer||'world',...(p.clip!==requested.clip||p.direction!==requested.direction?
    {held:true,requestedAction:requested.clip,requestedDirection:requested.direction}:{}),
   ...(anchored?{footAnchor:{x,y},multiplier:scale/p.scale}:{})};
  return true;
 }
 const worldReady=player=>equipped(player)&&active?.owner===ownerOf(player)&&active.started===true;
 const api={itemDef,equipped,pose,draw,prepare,warmClass,worldReady,worldHeight,snapshot:()=>({ready:!!atlas,error,last,
  cachedSources:images.size,maxCachedSources:maxImages,pendingSources:requests.size,
  warm:active?{classId:active.classId,total:active.keys.size,ready:active.images.size}:null})};
 root.MareLuffyVisual=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
