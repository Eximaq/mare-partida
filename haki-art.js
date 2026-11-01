'use strict';
/* Only exported PixelLab frames are drawn. Sprite regions and offsets are runtime anchors. */
((root)=>{
  let clips={};const images={};
  const coating=document.createElement('canvas'),mask=document.createElement('canvas');coating.width=mask.width=128;coating.height=mask.height=128;
  const coat=coating.getContext('2d'),silhouette=mask.getContext('2d');
  fetch('assets/haki/mastery/effects.json').then(r=>r.ok?r.json():{}).then(data=>{clips=data;for(const [id,clip] of Object.entries(clips)){const img=new Image();img.src='assets/haki/mastery/'+clip.file;images[id]=img;}}).catch(()=>{});
  function frame(ctx,id,x,y,t,{scale=1,flip=false}={}){
    const clip=clips[id],img=images[id];if(!clip||!img?.naturalWidth)return;
    const n=Math.min(clip.frames-1,(clip.loop?Math.floor(t*clip.fps)%clip.frames:Math.floor(t/.8*clip.frames))),col=n%clip.columns,row=Math.floor(n/clip.columns);
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));if(flip)ctx.scale(-1,1);
    ctx.drawImage(img,col*clip.width,row*clip.height,clip.width,clip.height,-clip.anchor[0]*scale,-clip.anchor[1]*scale,clip.width*scale,clip.height*scale);ctx.restore();
  }
  function draw(ctx,rt,hero,time,reduced,drawSubject,bodyScale=1){
    if(!rt)return;
    const direction=({front:'south',back:'north',left:'west',right:'east'})[hero.direction]||hero.direction;
    if(rt.kingFX>0)frame(ctx,'conqueror',hero.x,hero.y-20,reduced?.35:.8-rt.kingFX,{scale:2.2});
    // Observe eyes only on front/side views; never paint eyes on the back of the head.
    if(rt.active==='observation'&&rt.eyeFX>0&&direction!=='north')frame(ctx,'observation',hero.x,hero.y-83*bodyScale,reduced?0:time,{scale:.75*bodyScale,flip:direction==='west'});
    if(rt.active==='armament'){
      const side=['west','east'].includes(direction),north=direction==='north';
      // Mask exported pixels with the actual current sprite: coating never floats outside its arms/weapon.
      coat.clearRect(0,0,128,128);silhouette.clearRect(0,0,128,128);
      coat.save();coat.beginPath();coat.rect(0,112-70*bodyScale,128,42*bodyScale);coat.clip();
      frame(coat,'armament',64+(side?(direction==='west'?-17:17):-18)*bodyScale,112-(north?51:49)*bodyScale,reduced?0:time,{scale:.8*bodyScale});
      if(!side)frame(coat,'armament',64+18*bodyScale,112-(north?36:27)*bodyScale,reduced?0:time,{scale:.8*bodyScale,flip:true});
      coat.restore();
      if(drawSubject){drawSubject(silhouette,64,112);coat.globalCompositeOperation='destination-in';coat.drawImage(mask,0,0);coat.globalCompositeOperation='source-over';}
      ctx.drawImage(coating,Math.round(hero.x-64),Math.round(hero.y-112));
    }
  }
  root.MareHakiArt={draw,frame,iconsReady:true,stats:()=>Object.fromEntries(Object.keys(images).map(id=>[id,{loaded:!!images[id].naturalWidth,width:images[id].naturalWidth,height:images[id].naturalHeight}]))};
})(globalThis);
