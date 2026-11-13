/* Presentation only: reads existing clocks, never moves actors or invokes combat. */
(function(root){
 'use strict';
 const base='assets/skins/visual-completo/zoro/',aliases={front:'south',back:'north',left:'west',right:'east'};
 const equipped=player=>player?.classId==='sword'&&player?.equipment?.visual_completo?.def===187;
 const clamp=n=>Math.max(0,Math.min(1,n));
 function pose(atlas,player,options={}){
  if(!equipped(player)||player.zoanTransformed||options.action==='death')return null;
  const requested=options.action||'idle';
  let action=requested;
  if(['idle','combat-idle','guard','reload','dodge'].includes(action))action='walk';
  else if(['cast','heal','attack-focus','attack-unarmed','castPalm'].includes(action))action='castPalm';
  else if(action.startsWith('attack')||['skill','skill-1','skill-2','combo'].includes(action))action='attack';
  if(!atlas.clips[action])action='walk';
  const direction=action==='hurt'?'south':aliases[options.direction]||options.direction||'south';
  const clip=atlas.clips[action],frames=clip.frames[direction];if(!frames)return null;
  let index=0;
  if(requested==='walk'||requested==='run')index=Math.floor(((options.time||0)%1+1)%1*frames.length);
  else if(action!=='walk'){
   const p=clamp(Number.isFinite(options.progress)?options.progress:0);
   if(action==='hurt')index=Math.min(frames.length-1,Math.floor(p*frames.length));
   else{
    const hit=Math.max(.001,Math.min(.999,options.timing?.hitFrameRatio??.5)),contact=Math.min(3,frames.length-1);
    index=p<hit?Math.min(contact-1,Math.floor(p/hit*contact)):Math.min(frames.length-1,contact+Math.floor((p-hit)/(1-hit)*(frames.length-contact)));
   }
  }
  return {action,direction,index,frame:frames[index],scale:clip.scale,source:clip.source};
 }
 let atlas=null,pending=null,failure=null,last=null;const images=new Map();
 function prepare(){
  if(pending||atlas)return pending;
  failure=null;
  pending=fetch(base+'atlas.json').then(r=>{if(!r.ok)throw Error('Atlas Zoro HTTP '+r.status);return r.json();}).then(async data=>{
   const decoded=await Promise.all(Object.entries(data.sources).filter(([key])=>key!=='icon').map(async ([key,source])=>{
    const im=new Image();im.src=base+source.file;
    try{await im.decode();}catch(error){throw Error(source.file+': '+error.message);}
    if(im.naturalWidth!==source.size[0]||im.naturalHeight!==source.size[1])throw Error('Dimensões inválidas: '+key);
    return [key,im];
   }));
   const prepared=new Map(decoded);
   for(const [action,clip] of Object.entries(data.clips)){
    const source=prepared.get(clip.source);
    if(!source||!Number.isFinite(clip.scale)||clip.scale<=0)throw Error('Clipe inválido: '+action);
    for(const direction of action==='hurt'?['south']:['south','north','east','west']){
     const frames=clip.frames[direction];
     if(!frames?.length)throw Error('Direção ausente: '+action+' / '+direction);
     for(const {rect:[x,y,w,h],anchor} of frames){
      if(![x,y,w,h].every(Number.isInteger)||x<0||y<0||w<=0||h<=0||x+w>source.naturalWidth||y+h>source.naturalHeight||anchor.length!==2||!anchor.every(Number.isFinite))throw Error('Quadro inválido: '+action+' / '+direction);
     }
    }
   }
   for(const [key,im] of prepared)images.set(key,im);
   atlas=data;
  }).catch(error=>{failure=error.message;console.error('[visual-completo]',failure);}).finally(()=>{pending=null;});
  return pending;
 }
 function draw(ctx,player,options={}){
  if(!equipped(player)||player.zoanTransformed)return false;
  if(!atlas){prepare();return false;}
  const p=pose(atlas,player,options);if(!p)return false;
  const im=images.get(p.source);if(!im)return false;
  const [sx,sy,w,h]=p.frame.rect,[ax,ay]=p.frame.anchor;
  const scale=p.scale*(options.scale==null?1:options.scale*46/96);
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(p.frame.clipPolygon){const dx=Math.round((options.x||0)-ax*scale),dy=Math.round((options.y||0)-ay*scale);ctx.beginPath();p.frame.clipPolygon.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](dx+x*scale,dy+y*scale));ctx.closePath();ctx.clip();}
  ctx.drawImage(im,sx,sy,w,h,Math.round((options.x||0)-ax*scale),Math.round((options.y||0)-ay*scale),w*scale,h*scale);
  ctx.restore();last={action:p.action,direction:p.direction,frame:p.index,scale,consumer:options.consumer||'world'};return true;
 }
 const api={equipped,pose,draw,prepare,snapshot:()=>({ready:!!atlas,error:failure,last})};
 root.MareVisualCompletoRenderer=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
