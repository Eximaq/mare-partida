'use strict';
/* 48×48 PixelLab sheets. Each file is one horizontal action strip. */
((root)=>{
  const names={akuma_tori_albatroz:'tori',akuma_uma_uma:'uma',akuma_inu_dachshund:'inu'};
  const directions={front:'south',back:'north',left:'west',right:'east'};
  // Bottommost opaque pixel in each original Inu frame, measured per direction.
  // The source strips have different transparent margins between idle and walk.
  const inuFeet={
    idle:{south:[43],west:[38],east:[38],north:[44]},
    walk:{south:[47,48,47,47,48,47,48,46,48],west:[46,46,45,45,45,44,46,46,45],east:[46,46,46,46,46,46,45,45,44],north:[48,48,48,48,45,45,46,48,48]},
    attack:{south:[48,47,45,47,46,48,48,45,47],west:[46,46,46,45,46,46,46,45,46],east:[46,45,46,44,44,46,46,45,45],north:[48,46,46,48,48,48,48,48,48]}
  };
  const cache=new Map();
  function asset(name,action,direction){
    const url=`assets/akuma/zoan/${name}-${action}-${direction}.png`;
    if(!cache.has(url)){const image=new Image();image.src=url;cache.set(url,image);}
    return cache.get(url);
  }
  function draw(c,fruitId,x,y,{action='idle',direction='front',time=0,scale=1}={}){
    const name=names[fruitId];if(!name)return false;
    const facing=directions[direction]||'south';
    let resolvedAction=action,image=asset(name,resolvedAction,facing);
    if(!image.complete||image.naturalWidth<48){resolvedAction='idle';image=asset(name,resolvedAction,facing);}
    if(!image.complete||image.naturalWidth<48)return false;
    const frames=Math.max(1,Math.floor(image.naturalWidth/48));
    const fps=resolvedAction==='attack'?12:resolvedAction==='walk'?10:2;
    const frame=Math.floor(time*fps)%frames;
    const foot=name==='inu'?inuFeet[resolvedAction]?.[facing]?.[frame]??48:48;
    c.save();c.imageSmoothingEnabled=false;
    c.drawImage(image,frame*48,0,48,48,Math.round(x-24*scale),Math.round(y-foot*scale),Math.round(48*scale),Math.round(48*scale));
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
  root.MareZoanArt={draw,drawVfx,names};
  if(typeof module!=='undefined')module.exports=root.MareZoanArt;
})(globalThis);
