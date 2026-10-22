'use strict';
/* Visible chunks only. Sprite pixels come from project assets / approved PixelLab files. */
((root)=>{
  const E=root.MareEmber,images={},characters={},chunks=new Map(),textures={},variants={};let manifest={ready:false},fallback=null,woodSource=null,revision=0;
  const ready=i=>i?.complete&&i.naturalWidth>0;
  const loadImage=url=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>resolve(null);i.src=url;});
  const boot=fetch('assets/ruinas-brasas/manifest.json').then(r=>r.json()).then(async data=>{
    manifest=data;if(!data.ready)return;
    const results=await Promise.all(Object.entries(data.terrain||{}).map(async([key,asset])=>{images[key]=await loadImage(asset.url);if(images[key]){const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const context=canvas.getContext('2d');context.imageSmoothingEnabled=false;context.filter=({water:'contrast(.65) saturate(.8) brightness(.72)',basalt:'contrast(.55) saturate(.6) brightness(.8)',street:'contrast(.6) saturate(.7) brightness(.85)',lava:'contrast(.85) brightness(.85)'})[key]||'none';context.drawImage(images[key],0,0,64,64);textures[key]=canvas;}}));
    if(data.props)images.props=await loadImage(data.props.url);
    for(const [key,def] of Object.entries(data.monsters||{})){
      const sheets={};for(const [action,a] of Object.entries(def.animations||{}))sheets[action]=await loadImage(a.url);
      characters[key]={...def,sheets};
    }
    revision++;chunks.clear();
  }).catch(()=>{});
  function setFallback(source,wood){if(fallback===source&&woodSource===wood)return;fallback=source;woodSource=wood;chunks.clear();}
  function tile(c,key,mask,x,y,w=64,h=64){const asset=manifest.terrain?.[key],img=images[key],cell=asset?.tiles?.find(t=>t.mask===mask);if(!ready(img)||!cell)return false;c.drawImage(img,cell.x,cell.y,cell.width,cell.height,x,y,w,h);return true;}
  const isLand=t=>t!==E.WATER;
  function cornerMask(x,y,predicate){return (predicate(E.at(x,y))?1:0)|(predicate(E.at(x+1,y))?2:0)|(predicate(E.at(x,y+1))?4:0)|(predicate(E.at(x+1,y+1))?8:0);}
  function clipCell(c,tx,ty,x,y,type){
    const same=(dx,dy)=>type==='land'?E.at(tx+dx,ty+dy)!==E.WATER:E.at(tx+dx,ty+dy)===type;
    const r=type===E.WATER?0:14;
    c.beginPath();c.roundRect(x,y,64,64,[!same(-1,0)&&!same(0,-1)?r:0,!same(1,0)&&!same(0,-1)?r:0,!same(1,0)&&!same(0,1)?r:0,!same(-1,0)&&!same(0,1)?r:0]);c.clip();
  }
  function native(c,key,x,y,variant=0){
    const image=textures[key]||images[key];if(!image||(!image.getContext&&!ready(image)))return false;
    const cacheKey=key+':'+variant;
    if(!variants[cacheKey]){const tile=document.createElement('canvas');tile.width=tile.height=64;const ctx=tile.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.translate(32,32);ctx.rotate((variant%4)*Math.PI/2);if(variant>=4)ctx.scale(-1,1);ctx.drawImage(image,-32,-32,64,64);variants[cacheKey]=tile;}
    c.drawImage(variants[cacheKey],x,y);return true;
  }
  const variation=(x,y)=>(Math.imul(x+11,7349)^Math.imul(y+13,9157))>>>0;
  const cliffCells=new Map(E.cliffs.map(face=>[face.tx+','+face.ty,face]));
  function relief(c,tx,ty,x,y){
    const face=cliffCells.get(tx+','+ty);if(!face)return;
    c.save();
    if(face.stair){
      const stone=textures.street||textures.basalt;
      if(stone)for(let step=0;step<5;step++){
        const sy=y+29+step*7;c.filter='brightness('+(1.08-step*.075)+')';
        c.drawImage(stone,0,step*10,64,7,x,sy,64,7);
        c.filter='none';c.fillStyle='#211d1e88';c.fillRect(x,sy+6,64,1);
      }
    }else{
      const stone=textures.basalt;
      if(stone){c.filter='brightness(.48)';c.drawImage(stone,0,10,64,38,x,y+26,64,38);c.filter='none';}
      c.fillStyle='#b6a68b66';c.fillRect(x,y+25,64,2);
      c.fillStyle='#15151b99';c.fillRect(x,y+61,64,3);
      // Staggered joints belong to the retaining wall geometry.
      c.fillRect(x+((tx%2)*19+15),y+29,2,32);c.fillRect(x,y+49,64,1);
    }
    c.restore();
  }
  function wood(c,x,y){
    if(!woodSource)return;c.save();c.beginPath();c.rect(x,y,64,64);c.clip();
    for(let dy=0;dy<64;dy+=30)for(let dx=0;dx<64;dx+=22)c.drawImage(woodSource,80,399,22,30,x+dx,y+dy,22,30);c.restore();
  }
  function drawCell(c,tx,ty,x,y){
    const t=E.at(tx,ty);
    if(!manifest.ready||!(ready(images.water)||ready(images['ocean-basalt']))){
      if(!fallback)return;
      const rect=t===E.WATER?[15,25,32,32]:t===E.LAVA?[49,83,32,32]:t===E.STREET?[350,230,32,32]:t===E.WOOD?[80,399,22,30]:[318,250,32,32];
      c.drawImage(fallback,...rect,x,y,64,64);return;
    }
    if(manifest.texture_mode==='native64'){
      native(c,'water',x,y);if(t===E.WATER)return;
      c.save();clipCell(c,tx,ty,x,y,'land');native(c,'basalt',x,y,variation(tx,ty)%8);
      if(t!==E.BASALT){c.save();clipCell(c,tx,ty,x,y,t);native(c,t===E.LAVA?'lava':t===E.STREET?'street':'basalt',x,y,variation(tx,ty)%8);
        if(t===E.WOOD)wood(c,x,y);c.restore();}
      if(t!==E.LAVA&&t!==E.WOOD){c.fillStyle=ty<12?'#e6ca9617':ty>=22?'#11151b18':'#00000000';c.fillRect(x,y,64,64);}c.restore();relief(c,tx,ty,x,y);return;
    }
    tile(c,'ocean-basalt',t===E.WATER?0:15,x,y);
    if(t===E.LAVA)tile(c,'lava-basalt',0,x,y);
    else if(t===E.STREET)tile(c,'basalt-street',15,x,y);
    else if(t===E.WOOD){
      if(fallback)c.drawImage(fallback,80,399,22,30,x,y,64,64);
    }
    // Dual-grid transitions are confined to boundary cells; collision remains on authored terrain.
    if(t===E.BASALT){
      const nearWater=[E.at(tx-1,ty),E.at(tx+1,ty),E.at(tx,ty-1),E.at(tx,ty+1)].includes(E.WATER);
      if(nearWater)tile(c,'ocean-basalt',cornerMask(tx,ty,isLand),x,y);
    }
  }
  function chunk(cx,cy){
    const key=cx+','+cy+':'+revision;if(chunks.has(key)){const old=chunks.get(key);chunks.delete(key);chunks.set(key,old);return old;}
    const cvs=document.createElement('canvas');cvs.width=cvs.height=512;const c=cvs.getContext('2d');c.imageSmoothingEnabled=false;
    for(let y=0;y<8;y++)for(let x=0;x<8;x++)drawCell(c,cx*8+x,cy*8+y,x*64,y*64);
    chunks.set(key,cvs);if(chunks.size>20)chunks.delete(chunks.keys().next().value);return cvs;
  }
  function ground(c,camera,width,height,time){
    // Ultra-wide displays may exceed the compact world; continue the surrounding sea.
    if(width>E.map.width||height>E.map.height){c.save();c.fillStyle=textures.water?c.createPattern(textures.water,'repeat'):'#1a505b';c.fillRect(camera.x,camera.y,width,height);c.restore();}
    const minX=Math.max(0,Math.floor(camera.x/512)),minY=Math.max(0,Math.floor(camera.y/512)),maxX=Math.min(Math.ceil(E.COLS/8)-1,Math.floor((camera.x+width)/512)),maxY=Math.min(Math.ceil(E.ROWS/8)-1,Math.floor((camera.y+height)/512));
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)c.drawImage(chunk(x,y),x*512,y*512);
    // Texture flow uses the original generated pixels. No character pose is synthesized.
    if(manifest.ready)for(let y=Math.max(0,Math.floor(camera.y/64));y<=Math.min(E.ROWS-1,Math.ceil((camera.y+height)/64));y++)for(let x=Math.max(0,Math.floor(camera.x/64));x<=Math.min(E.COLS-1,Math.ceil((camera.x+width)/64));x++){
      const t=E.at(x,y);if(t!==E.WATER&&t!==E.LAVA)continue;const speed=t===E.LAVA?2.4:1.5,shift=Math.floor(time*speed)%64,key=t===E.LAVA?'lava-basalt':'ocean-basalt';
      c.save();clipCell(c,x,y,x*64,y*64,t);
      if(manifest.texture_mode==='native64'){native(c,t===E.LAVA?'lava':'water',x*64+shift,y*64,t===E.LAVA?variation(x,y)%8:0);native(c,t===E.LAVA?'lava':'water',x*64+shift-64,y*64,t===E.LAVA?variation(x,y)%8:0);}
      else{tile(c,key,0,x*64+shift,y*64);tile(c,key,0,x*64+shift-64,y*64);}
      c.restore();
    }
  }
  function prop(c,p){
    const img=images.props;if(ready(img)){const size=128*p.scale;c.drawImage(img,(p.cell%4)*128,Math.floor(p.cell/4)*128,128,128,Math.round(p.drawX??p.x-size/2),Math.round(p.drawY??p.y-size*.85),size,size);return;}
    if(fallback){const size=80*p.scale;c.drawImage(fallback,230,250,42,56,p.x-size/2,p.y-size,size,size);}
  }
  function environment(c,camera,width,height,time,reduced=false){
    const visible=p=>p.x>camera.x-100&&p.x<camera.x+width+100&&p.y>camera.y-100&&p.y<camera.y+height+100;
    for(const fire of E.fires.filter(visible)){
      if(ready(images.props)){const frame=Math.floor(time*7+fire.phase)%4;c.drawImage(images.props,frame*128,384,128,128,fire.x-32,fire.y-54,64,64);}
      if(!reduced){c.save();c.globalAlpha=.12+Math.sin(time*3+fire.phase)*.025;const glow=c.createRadialGradient(fire.x,fire.y-16,4,fire.x,fire.y-16,65);glow.addColorStop(0,'#ffb551');glow.addColorStop(1,'#ff8c0000');c.fillStyle=glow;c.fillRect(fire.x-65,fire.y-81,130,130);c.restore();}
    }
    if(!reduced)for(let i=0;i<35;i++){const x=camera.x+((i*137+time*(i%3+1)*4)%Math.max(1,width)),y=camera.y+((i*199-time*12)%Math.max(1,height)+height)%height;c.fillStyle=i%5?'#f5b37b33':'#ffe4ad6b';c.fillRect(Math.round(x),Math.round(y),i%2+1,2);}
    const r=E.returnPoint;c.save();c.strokeStyle='#85c8cf';c.lineWidth=2;c.beginPath();c.ellipse(r.x,r.y,28,12,0,0,Math.PI*2);c.stroke();c.font='bold 11px Trebuchet MS';c.textAlign='center';c.fillStyle='#f3deae';c.fillText('Cais de retorno',r.x,r.y+30);c.restore();
  }
  function monster(c,m,time){
    const skin=E.skins[m.type],asset=characters[m.skin]||characters[skin?.id];if(!asset)return false;
    const action=m.attackAnim>0&&asset.animations?.attack?'attack':m.moving>0&&asset.animations?.run?'run':m.emberAction||'idle',anim=asset.animations?.[action]||asset.animations?.idle,img=asset.sheets[action]||asset.sheets.idle;if(!anim||!ready(img))return false;
    const facing=m.emberFacing||'south',row=(asset.directions||['south','north','west','east']).indexOf(facing),frames=anim.frames||1,index=action==='idle'?0:Math.min(frames-1,Math.floor((action==='attack'?Math.max(0,.58-m.attackAnim):m.emberElapsed||0)*(anim.fps||8))%frames),fw=anim.frame_width||asset.frame_width,fh=anim.frame_height||asset.frame_height;
    const scale=asset.render_scale||skin.height/fh,anchor=anim.anchor||asset.anchor||[fw/2,fh*.9];
    c.save();c.imageSmoothingEnabled=false;if(m.hit>0)c.filter='brightness(1.45)';c.drawImage(img,index*fw,Math.max(0,row)*fh,fw,fh,Math.round(m.x-anchor[0]*scale),Math.round(m.y-anchor[1]*scale),Math.round(fw*scale),Math.round(fh*scale));c.restore();return true;
  }
  function overview(c,width,height,hero){
    c.imageSmoothingEnabled=false;const scale=Math.min(width/E.map.width,height/E.map.height);const colors=['#1a505b','#655f54','#b08c59','#e56f2b','#9f764a'];
    for(let y=0;y<E.ROWS;y++)for(let x=0;x<E.COLS;x++){c.fillStyle=colors[E.at(x,y)];c.fillRect(x*64*scale,y*64*scale,Math.ceil(64*scale),Math.ceil(64*scale));}
    c.strokeStyle='#29252c';c.lineWidth=2;for(const f of E.cliffs.filter(f=>!f.stair)){c.beginPath();c.moveTo(f.tx*64*scale,(f.ty+1)*64*scale);c.lineTo((f.tx+1)*64*scale,(f.ty+1)*64*scale);c.stroke();}
    c.strokeStyle='#c49b61';c.lineWidth=5;for(const b of E.bridges){c.beginPath();c.moveTo(b.a.x*scale,b.a.y*scale);c.lineTo(b.b.x*scale,b.b.y*scale);c.stroke();}
    for(const d of E.districts){c.fillStyle='#fce7b6';c.fillRect(d.x*scale-3,d.y*scale-3,6,6);}
    if(hero){c.fillStyle='#68e0cd';c.beginPath();c.arc(hero.x*scale,hero.y*scale,4,0,Math.PI*2);c.fill();}
  }
  root.MareEmberRenderer={boot,setFallback,ground,prop,environment,monster,overview,ready:()=>manifest.ready&&ready(images.props),stats:()=>({chunks:chunks.size,artReady:manifest.ready,monsters:Object.keys(characters).length})};
})(globalThis);
