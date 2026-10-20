'use strict';
/*
 * Orange Town terrain compositor.
 * Collision/navigation remain in orange-world.js; this module only draws.
 * Four layered surfaces + deterministic pixel-stepped boundaries + ground details.
 * All randomness derives from world coordinates, never Math.random().
 */
((root)=>{
  const TILE=64,STEP=8;
  const colors={sand:'#cfb58a',grass:'#638c3d',street:'#9d8162',wood:'#745039'};
  const predicates={
    sand:t=>t!==0,
    grass:t=>t===2||t===3,
    street:t=>t===3,
    wood:t=>t===4
  };
  function hash(x,y,seed=0){
    let n=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(seed|0,1442695041))|0;
    n=Math.imul(n^(n>>>13),1274126177);
    return (n^(n>>>16))>>>0;
  }
  function neighborMask(at,tx,ty,includes){
    // N E S W NE SE SW NW (8-way bitmask; 4 cardinal edges + 4 corners).
    const dirs=[[0,-1],[1,0],[0,1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]];
    return dirs.reduce((bits,[dx,dy],i)=>bits|(includes(at(tx+dx,ty+dy))?(1<<i):0),0);
  }
  const variant=(tx,ty,quadrant,seed=0)=>hash(tx*2+(quadrant&1),ty*2+(quadrant>>1),seed)&3;
  function edgeJitter(tx,ty,side,index){
    // Quantized 4px jagged edge, 8px segments. No blur / smooth vector gradient.
    const vertical=side==='left'||side==='right';
    const bx=tx+(side==='right'?1:0),by=ty+(side==='bottom'?1:0);
    const stripe=vertical?by*8+index:bx*8+index;
    return ((hash(vertical?bx:stripe,vertical?stripe:by,side==='right'||side==='bottom'?719:631)%7)-3)*4;
  }
  function contour(c,x,y,tx,ty,mask){
    const north=!!(mask&1),east=!!(mask&2),south=!!(mask&4),west=!!(mask&8);
    c.beginPath();
    c.moveTo(x,y+(north?0:edgeJitter(tx,ty,'top',0)));
    for(let i=1;i<=8;i++)c.lineTo(x+i*STEP,y+(north?0:edgeJitter(tx,ty,'top',i)));
    for(let i=1;i<=8;i++)c.lineTo(x+TILE+(east?0:edgeJitter(tx,ty,'right',i)),y+i*STEP);
    for(let i=7;i>=0;i--)c.lineTo(x+i*STEP,y+TILE+(south?0:edgeJitter(tx,ty,'bottom',i)));
    for(let i=7;i>=0;i--)c.lineTo(x+(west?0:edgeJitter(tx,ty,'left',i)),y+i*STEP);
    c.closePath();
    // Diagonal bits produce the small, stepped *inside* corners of 8-way autotiling.
    // Even-odd cutouts reveal the layer below rather than stretching a square tile.
    function notch(px,py,sx,sy){
      c.moveTo(px,py);
      for(const [dx,dy] of [[12,0],[12,4],[8,4],[8,8],[4,8],[4,12],[0,12]])
        c.lineTo(px+dx*sx,py+dy*sy);
      c.closePath();
    }
    if(north&&west&&!(mask&128))notch(x,y,1,1);
    if(north&&east&&!(mask&16))notch(x+TILE,y,-1,1);
    if(south&&east&&!(mask&32))notch(x+TILE,y+TILE,-1,-1);
    if(south&&west&&!(mask&64))notch(x,y+TILE,1,-1);
  }
  function ready(img){return !!(img&&img.complete&&img.naturalWidth>0)}
  function drawPatch(c,img,sx,sy,size,x,y,flip){
    c.save();
    c.translate(x+(flip&1?size:0),y+(flip&2?size:0));
    c.scale(flip&1?-1:1,flip&2?-1:1);
    c.drawImage(img,sx,sy,size,size,0,0,size,size);
    c.restore();
  }
  function drawMaterial(c,name,images,x,y,tx,ty,woodSource){
    c.fillStyle=colors[name];
    c.fillRect(x-16,y-16,96,96); // coherent fallback while sprites load
    if(name==='wood'){
      if(!woodSource)return;
      for(let py=-32;py<96;py+=30)for(let px=-32;px<96;px+=22)
        c.drawImage(woodSource,80,399,22,30,x+px,y+py,22,30);
      return;
    }
    const img=images[name];if(!ready(img))return;
    if(name==='sand'||name==='grass'){
      // PixelLab atlas mask=15 is the fully covered base tile at (0,96).
      // Flip its four sub-tiles deterministically to break the checkerboard repeat.
      for(let qy=-1;qy<=2;qy++)for(let qx=-1;qx<=2;qx++){
        const px=x+qx*32,py=y+qy*32;
        const flip=variant(tx*2+qx,ty*2+qy,hash(tx,ty,21)&3,name==='grass'?34:12);
        drawPatch(c,img,0,96,32,px,py,flip);
      }
    }else{
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const px=x+dx*TILE,py=y+dy*TILE;
        drawPatch(c,img,0,0,64,px,py,hash(tx+dx,ty+dy,42)&3);
      }
    }
  }
  function decorationPlan(tx,ty,t){
    // Decals occupy visual space only. Navigation, NPCs and mobs are unchanged.
    const h=hash(tx,ty,2026),count=t===2?1+(h%3):t===1?1+(h%2):t===3?(h%4===0?1:0):0;
    const result=[];
    for(let i=0;i<count;i++){
      const x=14+(hash(tx,ty,31+i*11)%37),y=14+(hash(tx,ty,53+i*13)%37);
      const kind=t===2?['grass','grass','flower','leaf','pebble'][hash(tx,ty,70+i)%5]:
                 t===1?['shell','pebble','sandgrass'][hash(tx,ty,83+i)%3]:
                 'crack';
      result.push({x,y,kind,variant:hash(tx,ty,100+i)&3});
    }
    return result;
  }
  function decor(c,tx,ty,t,localX,localY){
    const elements=decorationPlan(tx,ty,t);
    for(const item of elements){
      const x=localX+item.x,y=localY+item.y,v=item.variant;
      if(item.kind==='grass'||item.kind==='sandgrass'){
        const grass=t===1?'#8b9d58':'#315b2b',light=t===1?'#b1b77c':'#8db760';
        c.fillStyle=grass;c.fillRect(x,y+6,12,2);c.fillRect(x+3,y+2,2,6);c.fillRect(x+7,y,2,7);
        c.fillStyle=light;c.fillRect(x+1,y+3,2,4);c.fillRect(x+10,y+4,2,4);
      }else if(item.kind==='flower'){
        c.fillStyle='#315f30';c.fillRect(x+4,y+4,2,6);c.fillStyle=v%2?'#f4dd9b':'#dfb6cc';
        c.fillRect(x+2,y+2,3,3);c.fillRect(x+5,y,3,3);c.fillRect(x+7,y+3,3,3);
        c.fillStyle='#f8e8a0';c.fillRect(x+5,y+3,2,2);
      }else if(item.kind==='leaf'){
        c.fillStyle='#456e34';c.fillRect(x,y,6,3);c.fillRect(x+4,y+3,6,2);
        c.fillStyle='#89a65c';c.fillRect(x+3,y+1,5,2);
      }else if(item.kind==='pebble'){
        c.fillStyle='#686a61';c.fillRect(x+2,y+3,8,4);c.fillRect(x+4,y+1,4,2);
        c.fillStyle='#adb1a1';c.fillRect(x+4,y+1,3,2);
      }else if(item.kind==='shell'){
        c.fillStyle='#f1dfb9';c.fillRect(x+2,y+2,8,5);c.fillRect(x+4,y,4,2);
        c.fillStyle='#b79975';c.fillRect(x+4,y+3,1,3);c.fillRect(x+7,y+3,1,3);
      }else if(item.kind==='crack'){
        c.fillStyle='#4d4540';c.fillRect(x,y,9,2);c.fillRect(x+6,y+2,2,4);
        c.fillStyle='#b0a18b';c.fillRect(x,y+3,5,1);
      }
    }
  }
  function drawChunk(c,cx,cy,model,images,woodSource){
    c.save();c.imageSmoothingEnabled=false;
    // Every layer is drawn across chunk borders with a one-cell halo.
    // That avoids seams at 512px cache edges and makes masks globally stable.
    const water=images.water;
    c.fillStyle='#245a63';c.fillRect(0,0,512,512);
    if(ready(water)){
      for(let y=0;y<8;y++)for(let x=0;x<8;x++)
        c.drawImage(water,0,0,64,64,x*TILE,y*TILE,TILE,TILE);
    }
    for(const name of ['sand','grass','street','wood']){
      const includes=predicates[name];
      for(let ly=-1;ly<=8;ly++)for(let lx=-1;lx<=8;lx++){
        const tx=cx*8+lx,ty=cy*8+ly;
        if(!includes(model.at(tx,ty)))continue;
        const mask=neighborMask(model.at,tx,ty,includes);
        const x=lx*TILE,y=ly*TILE;
        c.save();contour(c,x,y,tx,ty,mask);c.clip('evenodd');
        drawMaterial(c,name,images,x,y,tx,ty,woodSource);
        c.restore();
      }
    }
    // Decals are cached together with the terrain and never regenerated each frame.
    for(let ly=0;ly<8;ly++)for(let lx=0;lx<8;lx++){
      const tx=cx*8+lx,ty=cy*8+ly,t=model.at(tx,ty);
      if(t===1||t===2||t===3)decor(c,tx,ty,t,lx*TILE,ly*TILE);
    }
    c.restore();
  }
  root.MareOrangeTerrain={hash,neighborMask,variant,edgeJitter,decorationPlan,drawChunk};
  if(typeof module!=='undefined')module.exports=root.MareOrangeTerrain;
})(globalThis);
