((root)=>{
 'use strict';
 const effects=new Map(), clock=()=>root.KaizokuAkainuArt.now();
 const clamp=n=>Math.max(0,Math.min(1,n));
 function draw(ctx,m,time){
  const at=clock(),action=m.action?.kind;
  const clip=!m.alive?'hurt':action==='sword-special'?'special':action==='punch'?'attack':m.moving?'walk':'idle';
  const progress=m.action?clamp((at-m.action.startedAt)/Math.max(1,m.action.endAt-m.action.startedAt)):null;
  return root.MareSpriteCombatV2.draw(ctx,m.type,m.x,m.y,{action:clip,direction:m.emberFacing||'south',time,progress,height:118});
 }
 function trace(ctx,shape){
  ctx.beginPath();
  if(shape.kind==='circle'){ctx.arc(shape.center.x,shape.center.y,shape.radius,0,Math.PI*2);}
  else if(shape.kind==='cone'){
   const {origin,angle,range,angleDeg}=shape,half=angleDeg*Math.PI/360;
   ctx.moveTo(origin.x,origin.y);ctx.arc(origin.x,origin.y,range,angle-half,angle+half);ctx.closePath();
  }else if(shape.kind==='line'){
   ctx.moveTo(shape.from.x,shape.from.y);ctx.lineTo(shape.to.x,shape.to.y);
  }
 }
 function effect(ctx,type,kind,point,sample){
  const meta=root.MareDailySwordBossArtData.effects[type]?.[kind];if(!meta)return;
  if(!effects.has(meta.image)){const im=new Image();im.src=meta.image;effects.set(meta.image,im);}
  const im=effects.get(meta.image);if(!im.complete||im.naturalWidth!==meta.size*meta.frames||im.naturalHeight!==meta.size)return;
  ctx.save();ctx.translate(Math.round(point.x),Math.round(point.y));
  if(meta.nativeFacing==='east')ctx.rotate(sample.angle);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(im,Math.min(sample.frame,meta.frames-1)*meta.size,0,meta.size,meta.size,-meta.anchor[0],-meta.anchor[1],meta.size,meta.size);
  ctx.restore();
 }
 function ground(ctx,m){
  const cast=m.action?.cast;if(!m.alive||!cast)return;
  const sample=root.KaizokuDailySwordBossCombat.sample(cast,clock());if(!sample)return;
  if(sample.phase==='warning'){
   ctx.save();ctx.lineCap='round';
   for(const shape of sample.shapes){
    trace(ctx,shape);ctx.fillStyle='#a72e3955';ctx.strokeStyle='#ffc469';ctx.lineWidth=2;
    if(shape.kind==='line'){ctx.strokeStyle='#d45e6866';ctx.lineWidth=shape.width;ctx.stroke();ctx.strokeStyle='#ffc469';ctx.lineWidth=2;}
    else ctx.fill();
    ctx.stroke();
   }
   ctx.restore();
  }else if(sample.phase==='travel'||sample.phase==='impact'){
   const points=cast.shape==='zone-set'?sample.shapes.map(s=>s.center):[sample.phase==='travel'?sample.travelPoint:sample.impactPoint];
   for(const point of points)effect(ctx,m.type,sample.phase,point,sample);
  }
 }
 root.MareSwordEventArt={draw,ground};
})(globalThis);
