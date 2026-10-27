'use strict';
/* PixelLab sheets. Tori uses 64×64 frames; the other Zoans use 48×48. */
((root)=>{
  const names={akuma_tori_albatroz:'tori',akuma_uma_uma:'uma',akuma_inu_dachshund:'inu',akuma_neko_leopard:'neko',akuma_ushi_giraffe:'ushi',akuma_inu_wolf:'wolf'};
  const directions={front:'south',back:'north',left:'west',right:'east'};
  // Bottommost opaque pixel in each original Inu frame, measured per direction.
  // The source strips have different transparent margins between idle and walk.
  const inuFeet={
    idle:{south:[43],west:[38],east:[38],north:[44]},
    walk:{south:[47,48,47,47,48,47,48,46,48],west:[46,46,45,45,45,44,46,46,45],east:[46,46,46,46,46,46,45,45,44],north:[48,48,48,48,45,45,46,48,48]},
    attack:{south:[48,47,45,47,46,48,48,45,47],west:[46,46,46,45,46,46,46,45,46],east:[46,45,46,44,44,46,46,45,45],north:[48,46,46,48,48,48,48,48,48]}
  };
  const toriFeet={
    idle:{south:[56],west:[55],east:[55],north:[53]},
    walk:{south:[50,51,53,55,56,56,54,53],west:[54,53,52,54,55,55,55,55],east:[54,53,52,54,55,55,55,55],north:[51,53,53,52,52,53,53,52]},
    attack:{south:[56,56,56,56,56,52,48,50,55],west:[55,55,55,55,55,55,55,55,55],east:[55,55,55,55,55,55,55,55,55],north:[53,52,52,53,55,55,54,54,52]}
  };
  const cache=new Map();
  function asset(name,action,direction){
    const url=`assets/akuma/zoan/${name}-${action}-${direction}.png`;
    if(!cache.has(url)){const image=new Image(),notify=()=>{if(typeof window!=='undefined')window.dispatchEvent(new Event('mare-zoan-sprite-ready'));};image.addEventListener?.('load',notify);image.addEventListener?.('error',notify);image.src=url;cache.set(url,image);}
    return cache.get(url);
  }
  function status(fruitId,action='idle',direction='front'){
    if(fruitId==='akuma_ryu_ryu')return root.MareRyu.status(action,direction);
    if(fruitId==='akuma_neko_leopard')return root.MareNeko.status(action,direction);
    if(fruitId==='akuma_inu_wolf')return root.MareWolf.status(action,direction);
    if(fruitId==='akuma_ushi_giraffe')return root.MareUshi.status(action,direction);
    if(fruitId==='akuma_ushi_bison')return root.MareRankCExpansion.status(action,direction);
    const name=names[fruitId];if(!name)return 'missing';
    const image=asset(name,action,directions[direction]||'south');
    if(!image.complete)return 'loading';return image.naturalWidth>=(name==='tori'?64:48)?'ready':'failed';
  }
  function draw(c,fruitId,x,y,{action='idle',direction='front',time=0,scale=1,duration=.75,progress=null}={}){
    if(fruitId==='akuma_ryu_ryu')return root.MareRyu.drawActor(c,x,y,{action,direction,time,scale,progress});
    if(fruitId==='akuma_ushi_bison')return root.MareRankCExpansion.drawActor(c,x,y,{action,direction,time,progress,height:64*scale});
    if(fruitId==='akuma_neko_leopard')return root.MareNeko.drawActor(c,x,y,{action,direction,time,scale,progress});
    if(fruitId==='akuma_inu_wolf')return root.MareWolf.drawActor(c,x,y,{action,direction,time,scale,duration,progress});
    if(fruitId==='akuma_ushi_giraffe')return root.MareUshi.drawActor(c,x,y,{action,direction,time,scale,progress});
    const name=names[fruitId];if(!name)return false;
    const frameSize=name==='tori'?64:48;
    const facing=directions[direction]||'south';
    let resolvedAction=action,image=asset(name,resolvedAction,facing);
    if(!image.complete||image.naturalWidth<frameSize){resolvedAction='idle';image=asset(name,resolvedAction,facing);}
    if(!image.complete||image.naturalWidth<frameSize)return false;
    const frames=Math.max(1,Math.floor(image.naturalWidth/frameSize));
    const fps=resolvedAction==='attack'?12:resolvedAction==='walk'?10:2;
    const frame=Number.isFinite(progress)?Math.min(frames-1,Math.floor(Math.max(0,Math.min(1,progress))*frames+1e-9)):Math.floor(time*fps)%frames;
    const foot=name==='inu'?inuFeet[resolvedAction]?.[facing]?.[frame]??48:name==='tori'?toriFeet[resolvedAction]?.[facing]?.[frame]??64:48;
    c.save();c.imageSmoothingEnabled=false;
    c.drawImage(image,frame*frameSize,0,frameSize,frameSize,Math.round(x-frameSize*scale/2),Math.round(y-foot*scale),Math.round(frameSize*scale),Math.round(frameSize*scale));
    c.restore();return true;
  }
  function drawVfx(c,fruitId,x,y,{time=0,scale=1,loop=false}={}){
    const name=names[fruitId];if(!name)return false;
    const url=`assets/akuma/zoan/${name}-skill-vfx.png`;
    if(!cache.has(url)){const image=new Image();image.src=url;cache.set(url,image);}
    const image=cache.get(url);if(!image.complete||image.naturalWidth<48)return false;
    const frames=Math.floor(image.naturalWidth/48),index=loop?Math.floor(time*12)%frames:Math.min(frames-1,Math.floor(time*12));
    const yOffset=name==='uma'?32:48;
    c.save();c.imageSmoothingEnabled=false;
    c.drawImage(image,index*48,0,48,48,Math.round(x-24*scale),Math.round(y-yOffset*scale),Math.round(48*scale),Math.round(48*scale));
    c.restore();return true;
  }
  function attackTiming(fruitId,direction='front'){
    if(fruitId==='akuma_ryu_ryu'){const c=root.MareRyu.clip('attack',direction);return {frames:c.frames,fps:c.fps,impact_frame:c.impact_frame,loop:false};}
    if(fruitId==='akuma_ushi_bison'){const c=root.MareRankCExpansion.clip('attack',direction);return {frames:c.frames,fps:12,hitFrameRatio:.5,loop:false};}
    const facing=directions[direction]||direction,system=fruitId==='akuma_neko_leopard'?root.MareNeko:fruitId==='akuma_ushi_giraffe'?root.MareUshi:fruitId==='akuma_inu_wolf'?root.MareWolf:null;
    if(system){const clip=system.clips.attack[facing];return {frames:clip.frames,fps:clip.fps,impact_frame:clip.impact_frame??Math.floor(clip.frames*.45),hitFrameRatio:clip.hitFrameRatio,loop:false};}
    const name=names[fruitId];if(!name)return null;
    const size=name==='tori'?64:48,image=asset(name,'attack',facing);if(!image.complete||image.naturalWidth<size)return null;
    const frames=Math.floor(image.naturalWidth/size);return {frames,fps:12,impact_frame:Math.floor(frames*.45),loop:false};
  }
  root.MareZoanArt={draw,drawVfx,status,names,attackTiming};
  if(typeof module!=='undefined')module.exports=root.MareZoanArt;
})(globalThis);
