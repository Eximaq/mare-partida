'use strict';
/* Native Dawn terrain and trees plus existing Cocox PixelLab animation frames. */
((root)=>{
  const R=root.MareRare,images={};
  const urls={water:'assets/dawn-manual/water.png',grass:'assets/rare-animals/grass.png',grassAlt:'assets/rare-animals/grass-alt.png',sand:'assets/rare-animals/sand.png',tree:'assets/dawn-manual/object-1.png',idle:'assets/rare-animals/cocox/idle.png',run:'assets/rare-animals/cocox/run.png',attack:'assets/rare-animals/cocox/attack.png'};
  for(const [key,url] of Object.entries(urls)){const img=new Image();img.src=url;images[key]=img;}
  function ready(key){const im=images[key];return im?.complete&&im.naturalWidth>0;}
  function ground(ctx,camera,w,h){
    ctx.save();ctx.imageSmoothingEnabled=false;
    const left=Math.max(0,Math.floor(camera.x/R.TILE)),right=Math.min(R.COLS,Math.ceil((camera.x+w)/R.TILE));
    const top=Math.max(0,Math.floor(camera.y/R.TILE)),bottom=Math.min(R.ROWS,Math.ceil((camera.y+h)/R.TILE));
    for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
      const tile=R.at(x,y),key=tile===R.WATER?'water':tile===R.SAND?'sand':tile===R.GRASS_ALT?'grassAlt':'grass';
      if(ready(key))ctx.drawImage(images[key],x*R.TILE,y*R.TILE);
      else{ctx.fillStyle=tile===R.WATER?'#16859a':tile===R.SAND?'#c8aa72':'#426b34';ctx.fillRect(x*R.TILE,y*R.TILE,R.TILE,R.TILE);}
    }
    // Draw narrow, winding footpaths over the native grass tiles in 8px steps.
    if(ready('sand')){
      ctx.fillStyle=ctx.createPattern(images.sand,'repeat');
      for(const route of R.routes)for(let i=1;i<route.points.length;i++){
        const [ax,ay]=route.points[i-1],[bx,by]=route.points[i],length=Math.hypot(bx-ax,by-ay),steps=Math.ceil(length*R.TILE/8);
        for(let n=0;n<=steps;n++){
          const t=n/steps,x=(ax+.5+(bx-ax)*t)*R.TILE,y=(ay+.5+(by-ay)*t)*R.TILE;
          if(x<camera.x-40||x>camera.x+w+40||y<camera.y-40||y>camera.y+h+40)continue;
          const width=45+Math.round(Math.sin(t*9+i*2)*5);
          ctx.fillRect(Math.round((x-width/2)/8)*8,Math.round((y-width/2)/8)*8,Math.ceil(width/8)*8,Math.ceil(width/8)*8);
        }
      }
    }
    ctx.restore();
  }
  function prop(ctx,p){
    ctx.save();ctx.imageSmoothingEnabled=false;
    if(p.kind==='tree'&&ready('tree'))ctx.drawImage(images.tree,Math.round(p.x-47),Math.round(p.y-94));
    else if(p.kind==='bush'&&ready('tree'))ctx.drawImage(images.tree,0,0,95,62,Math.round(p.x-26),Math.round(p.y-27),52,34);
    else if(p.kind==='rock'){
      const x=Math.round(p.x-20),y=Math.round(p.y-20);
      ctx.fillStyle='#35443e';ctx.fillRect(x+3,y+9,36,17);ctx.fillStyle='#829082';ctx.fillRect(x+7,y+5,26,17);ctx.fillStyle='#aab8a1';ctx.fillRect(x+10,y+5,15,5);ctx.fillStyle='#52645b';ctx.fillRect(x+26,y+14,8,8);
    }ctx.restore();
  }
  const rows={south:0,west:1,east:2,north:3};
  const feet={idle:[45,44,44,47],run:[62,60,60,63],attack:[55,55,55,57]};
  const monsterRenderSize=()=>root.MareNewIslandArt?.DEFAULT_MONSTER_RENDER_SIZE||80;
  // A single sprite layout drives drawing, pointer hitbox and HP-label placement.
  function cocoxLayout(m){
    if(m.type!=='cocox')return null;
    const row=rows[m.emberFacing||'south']??0;
    const attack=(m.attackAnim||0)>0,moving=(m.moving||0)>0;
    const key=attack?'attack':moving?'run':'idle';
    const sourceSize=attack?68:moving?80:48,frames=attack?9:moving?4:1;
    const dest=monsterRenderSize(),scale=dest/sourceSize,top=Math.round(m.y+3-feet[key][row]*scale);
    return {row,key,sourceSize,frames,dest,top,scale,halfWidth:dest/2};
  }
  function cocoxHitTest(m,x,y){
    const box=cocoxLayout(m);
    return !!box&&Math.abs(x-m.x)<=box.halfWidth&&y>=box.top&&y<=m.y+12;
  }
  function cocoxHealthBarY(m){
    const box=cocoxLayout(m);
    return box?box.top-22:null;
  }
  function monster(ctx,m,time){
    const box=cocoxLayout(m);
    if(!box||!ready(box.key))return false;
    const {key,frames,sourceSize,row,dest,top}=box;
    const frame=key==='attack'?Math.min(8,Math.max(0,Math.floor((.58-m.attackAnim)*15))):key==='run'?Math.floor(time*8+m.bob)%4:0;
    ctx.save();ctx.imageSmoothingEnabled=false;if(m.hit>0)ctx.filter='brightness(1.5)';
    ctx.drawImage(images[key],Math.max(0,Math.min(frames-1,frame))*sourceSize,row*sourceSize,sourceSize,sourceSize,Math.round(m.x-dest/2),top,dest,dest);
    ctx.restore();return true;
  }
  function environment(ctx,time){const p=R.returnPoint;ctx.save();ctx.strokeStyle='#d9ead2';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,27+Math.sin(time*2),11,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff2cf';ctx.font='bold 11px Trebuchet MS';ctx.textAlign='center';ctx.fillText('Voltar ao porto',p.x,p.y+30);ctx.restore();}
  root.MareRareRenderer={ground,prop,monster,cocoxLayout,cocoxHitTest,cocoxHealthBarY,environment,images};
})(globalThis);
