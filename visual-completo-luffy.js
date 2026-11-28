/* Luffy's complete visual: lazy RGBA atlases and presentation-only state. */
(function(root){
 'use strict';
 const animation=root.MareLuffyAnimation||(typeof require==='function'?require('./luffy-animation.js'):null);
 const base='assets/skins/visual-completo/luffy/',itemDef=246,maxImages=12;
 const directions=['south','north','east','west'];
 const classes=new Set(['sword','brawler','gunner','rogue','cyborg','strategist','healer']);
 const equipped=player=>classes.has(player?.classId)&&player?.equipment?.visual_completo?.def===itemDef;
 function inputFor(player,options){
  const weapon=player.equipment?.weapon,weaponId=Number.isInteger(weapon?.def)?weapon.def:null;
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
 let atlas=null,pending=null,error=null,last=null,retryAtlasAt=0;
 const images=new Map(),requests=new Map(),retryAt=new Map();
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
 function loadSource(key){
  if(images.has(key)){const image=images.get(key);remember(key,image);return Promise.resolve(true);}
  if(requests.has(key))return requests.get(key);
  if(!atlas?.sources[key]||Date.now()<(retryAt.get(key)||0))return Promise.resolve(false);
  const source=atlas.sources[key],image=new Image();
  image.src=base+source.file+'?v='+source.sha256.slice(0,16);
  const task=image.decode().then(()=>{
   if(image.naturalWidth!==source.size[0]||image.naturalHeight!==source.size[1])throw Error('Dimensões incorretas: '+source.file);
   remember(key,image);retryAt.delete(key);if(!retryAt.size)error=null;return true;
  }).catch(problem=>{retryAt.set(key,Date.now()+3000);report(problem);return false;}).finally(()=>requests.delete(key));
  requests.set(key,task);return task;
 }
 async function prepare(player,options={}){
  if(!equipped(player)||!await loadAtlas())return false;
  const p=pose(atlas,player,options);return p?loadSource(p.source):false;
 }
 function draw(ctx,player,options={}){
  if(!equipped(player)||player.zoanTransformed)return false;
  if(!atlas){void loadAtlas();return false;}
  const p=pose(atlas,player,options);if(!p)return false;
  const image=images.get(p.source);if(!image){void loadSource(p.source);return false;}
  remember(p.source,image);
  let x=options.x||0,y=options.y||0,scale=p.scale*(options.scale==null?1:options.scale*46/96);
  const anchored=options.inventoryPresentation&&(options.avatarWorldPose||options.avatarZoom===null);
  if(anchored){
   const cw=ctx.canvas.width,ch=ctx.canvas.height,margin=10;x=cw/2;y=ch-24;
   const height=animation.fitBodyHeight(atlas,inputFor(player,options),96*(options.avatarZoom||2),{left:x-margin,right:cw-x-margin,above:y-margin,below:ch-y-margin});
   scale=height/p.bodyHeight;if(!(scale>0))return false;
  }
  animation.draw(ctx,image,p,x,y,scale*p.bodyHeight);
  last={skinId:'visual_completo_luffy',action:p.action,direction:p.direction,frame:p.index,loadout:p.loadout,scale,consumer:options.consumer||'world',...(anchored?{footAnchor:{x,y},multiplier:scale/p.scale}:{})};
  return true;
 }
 const api={itemDef,equipped,pose,draw,prepare,snapshot:()=>({ready:!!atlas,error,last,cachedSources:images.size,maxCachedSources:maxImages,pendingSources:requests.size})};
 root.MareLuffyVisual=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
