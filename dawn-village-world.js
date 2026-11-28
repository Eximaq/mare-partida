'use strict';
/* Camera crops and occlusion use the complete original painting. */
((root)=>{
  const layout=root.MareDawnVillageLayout;
  if(!layout)return;
  const base=typeof document==='undefined'?null:document.currentScript?.src;
  let source=null;
  function prepare(){
    if(typeof Image!=='function')return null;
    if(!source){
      source=new Image();
      source.src=base?new URL(layout.groundUrl,base).href:layout.groundUrl;
    }
    return source;
  }
  function state(){
    const image=prepare();
    return image?.complete?(image.naturalWidth?'ready':'failed'):'loading';
  }
  function paint(ctx,x,y,w,h){
    const image=prepare();if(!image?.complete||!image.naturalWidth||w<=0||h<=0)return false;
    const sx=image.naturalWidth/layout.width,sy=image.naturalHeight/layout.height;
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(image,x*sx,y*sy,w*sx,h*sy,x,y,w,h);
    ctx.restore();return true;
  }
  function ground(ctx,camera,w,h){
    const x=Math.max(0,Math.floor(camera.x)),y=Math.max(0,Math.floor(camera.y));
    const cw=Math.min(layout.width,Math.ceil(camera.x+w+2))-x;
    const ch=Math.min(layout.height,Math.ceil(camera.y+h+2))-y;
    return paint(ctx,x,y,cw,ch);
  }
  function drawProp(ctx,p){
    if(!p.polygon?.length)return false;
    ctx.save();ctx.beginPath();
    for(const [i,point]of p.polygon.entries()){
      const x=Array.isArray(point)?point[0]:point.x,y=Array.isArray(point)?point[1]:point.y;
      if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
    }
    ctx.closePath();ctx.clip();
    const drawn=paint(ctx,p.x,p.y,p.w,p.h);ctx.restore();return drawn;
  }
  root.MareDawnVillage={prepare,state,ground,drawProp,get image(){return prepare();}};
})(globalThis);
