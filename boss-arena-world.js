'use strict';
/* The native painting and independent reward sprite share world coordinates. */
((root)=>{
  const layout=root.MareBossArenaLayout;
  if(!layout)return;
  const base=typeof document==='undefined'?null:document.currentScript?.src;
  let source=null;const sprites=new Map();
  const load=url=>{const image=new Image();image.src=base?new URL(url,base).href:url;return image;};
  function prepare(){
    if(typeof Image!=='function')return null;
    source ||= load(layout.groundUrl);
    for(const p of layout.props)if(p.spriteUrl&&!sprites.has(p.spriteUrl))sprites.set(p.spriteUrl,load(p.spriteUrl));
    return source;
  }
  function state(){
    prepare();const images=[source,...sprites.values()];
    if(images.some(image=>image?.complete&&!image.naturalWidth))return 'failed';
    return images.every(image=>image?.complete&&image.naturalWidth)?'ready':'loading';
  }
  function paint(ctx,x,y,w,h){
    const image=prepare();if(!image?.complete||!image.naturalWidth||w<=0||h<=0)return false;
    const sx=image.naturalWidth/layout.width,sy=image.naturalHeight/layout.height;
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(image,x*sx,y*sy,w*sx,h*sy,x,y,w,h);ctx.restore();return true;
  }
  function sprite(ctx,p){
    const image=sprites.get(p.spriteUrl);if(!image?.complete||!image.naturalWidth)return false;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(image,p.x,p.y,p.w,p.h);ctx.restore();return true;
  }
  function ground(ctx,camera,w,h){
    const x=Math.max(0,Math.floor(camera.x)),y=Math.max(0,Math.floor(camera.y));
    const cw=Math.min(layout.width,Math.ceil(camera.x+w+2))-x;
    const ch=Math.min(layout.height,Math.ceil(camera.y+h+2))-y;
    const drawn=paint(ctx,x,y,cw,ch);
    for(const p of layout.props)if(p.spriteUrl&&p.x<x+cw&&p.y<y+ch&&p.x+p.w>x&&p.y+p.h>y)sprite(ctx,p);
    return drawn;
  }
  function drawProp(ctx,p){
    if(p.spriteUrl){prepare();return sprite(ctx,p);}
    if(!p.polygon?.length)return false;
    ctx.save();ctx.beginPath();
    for(const [i,point]of p.polygon.entries()){
      if(i)ctx.lineTo(point.x,point.y);else ctx.moveTo(point.x,point.y);
    }
    ctx.closePath();ctx.clip();const drawn=paint(ctx,p.x,p.y,p.w,p.h);ctx.restore();return drawn;
  }
  root.MareBossArena={prepare,state,ground,drawProp,get image(){return prepare();}};
})(globalThis);
