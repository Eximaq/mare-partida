'use strict';
/* PixelLab sheets. Tori uses 64×64 frames; the other Zoans use 48×48. */
((root)=>{
  const names={akuma_tori_albatroz:'tori',akuma_tori_phoenix:'phoenix',akuma_uma_uma:'uma',akuma_inu_dachshund:'inu',akuma_neko_leopard:'neko',akuma_ushi_giraffe:'ushi',akuma_inu_wolf:'wolf'};
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
  const reworks={
    bite:{file:'mordida-focal',w:48,h:48,cols:8,frames:8,fps:12,duration:2/3,anchor:[24,24]},
    dust:{file:'poeira',w:128,h:64,cols:8,frames:8,fps:12,duration:2/3,anchor:[105,48],directional:true},
    leopard:{file:'leopard',w:96,h:96,cols:8,frames:8,fps:8/.15,duration:.15,anchor:[48,48]},
    'giraffe-back':{file:'furia-atras',w:192,h:160,cols:4,frames:16,fps:24,duration:5,loop:true,anchor:[72,146]},
    'giraffe-front':{file:'furia-frente',w:192,h:160,cols:4,frames:16,fps:24,duration:5,loop:true,anchor:[72,146]},
    'giraffe-sweep':{file:'chicote-arco',w:192,h:160,cols:4,frames:16,fps:16/(5/12),duration:5/12,anchor:[72,146],directional:true},
    'bison-back':{file:'casco-atras',w:160,h:128,cols:4,frames:16,fps:24,duration:30,loop:true,anchor:[80,112]},
    'bison-front':{file:'casco-frente',w:160,h:128,cols:4,frames:16,fps:24,duration:30,loop:true,anchor:[80,112]},
    'bison-dust':{file:'investida-poeira',w:160,h:128,cols:4,frames:16,fps:24,duration:.67,loop:true,anchor:[80,112],directional:true}
  };
  function drawRework(c,kind,x,y,age,{direction='right',scale=1,index=0}={}){
    if(kind==='wolf-trail'){
      if(!Number.isFinite(age)||age<0)return false;c.save();c.translate(x,y);const angle={front:Math.PI/2,south:Math.PI/2,back:-Math.PI/2,north:-Math.PI/2,left:Math.PI,west:Math.PI}[direction]||0;c.rotate(angle);
      for(let i=0;i<7;i++){const q=(age*3+i/7)%1;c.globalAlpha=(1-q)*.55;c.fillStyle=i%2?'#b89b67':'#729394';c.fillRect(Math.round(-24-q*62),Math.round(-2+(i%3-1)*6),Math.round(8+q*9),2);}c.restore();return true;
    }
    const f=reworks[kind];if(!f||!Number.isFinite(age)||age<0||age>=f.duration)return false;
    const url=`assets/akuma/zoan/reworks/${f.file}.png`;if(!cache.has(url)){const im=new Image();im.src=url;cache.set(url,im);}const im=cache.get(url);if(!im.complete||!im.naturalWidth)return false;
    const frame=f.loop?Math.floor(age*f.fps)%f.frames:Math.min(f.frames-1,Math.floor(age*f.fps));
    c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(x),Math.round(y));
    if(f.directional){const angle={front:Math.PI/2,south:Math.PI/2,back:-Math.PI/2,north:-Math.PI/2,left:Math.PI,west:Math.PI}[direction]||0;c.rotate(angle);}
    if(kind==='leopard')c.globalAlpha*=Math.sin(Math.PI*age/.15);
    if(f.loop&&!f.directional)c.globalAlpha*=Math.min(1,age/.1,(f.duration-age)/.14);
    c.drawImage(im,(frame%f.cols)*f.w,(Math.floor(frame/f.cols)+(kind==='leopard'?index%2:0))*f.h,f.w,f.h,-f.anchor[0]*scale,-f.anchor[1]*scale,f.w*scale,f.h*scale);c.restore();return true;
  }
  function drawWind(c,x,y,age,direction='right'){
    if(!Number.isFinite(age)||age<0||age>=5)return false;c.save();c.translate(x,y);
    const angle={front:Math.PI/2,south:Math.PI/2,back:-Math.PI/2,north:-Math.PI/2,left:Math.PI,west:Math.PI}[direction]||0;c.rotate(angle);
    const fade=Math.min(1,age/.15,(5-age)/.2);for(let i=0;i<6;i++){const p=(age*1.6+i/6)%1;c.globalAlpha=fade*Math.sin(p*Math.PI)*.7;c.strokeStyle=i%2?'#b8e5e9':'#67bdcb';c.lineWidth=i%3===0?2:1;c.beginPath();const yy=-15-i*11;c.moveTo(-22-55*p,yy+4);c.bezierCurveTo(-40-55*p,yy+8,-65-55*p,yy-5,-90-55*p,yy);c.stroke();}c.restore();return true;
  }
  function drawVfx(c,fruitId,x,y,{time=0,scale=1,loop=false,direction='right'}={}){
    if(fruitId==='akuma_tori_albatroz')return drawWind(c,x,y,time,direction);
    if(fruitId==='akuma_uma_uma')return drawRework(c,'dust',x,y,time,{direction});
    if(fruitId==='akuma_inu_dachshund')return drawRework(c,'bite',x,y,time,{scale});
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
    // Existing Tori/Uma/Inu logical clips: 9 frames at 12fps, contact at 4.
    // Timing must stay available without requesting a retired actor sheet.
    return {frames:9,fps:12,impact_frame:4,loop:false};
  }
  root.MareZoanArt={draw,drawVfx,drawRework,status,names,attackTiming};
  if(typeof module!=='undefined')module.exports=root.MareZoanArt;
})(globalThis);
