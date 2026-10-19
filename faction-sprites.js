'use strict';
/* Playback uses metadata and native generated pixels; no frame synthesis or mirroring. */
(() => {
  const assets={};
  const directionMap={front:'south',back:'north',left:'west',right:'east'};
  function register(config){
    for(const [id,meta] of Object.entries(config)){
      const sheets={};
      for(const [action,animation] of Object.entries(meta.animations)){
        const image=new Image();image.addEventListener('load',()=>window.dispatchEvent(new Event('mare-faction-sprite-ready')));image.src=animation.url;sheets[action]=image;
      }
      assets[id]={meta,sheets};
    }
  }
  function frame(id,action='idle',direction='south',time=0){
    const asset=assets[id];if(!asset)return null;
    const animation=asset.meta.animations[action];if(!animation)return null;
    const image=asset.sheets[action];if(!image.complete||!image.naturalWidth)return null;
    const row=asset.meta.directions.indexOf(directionMap[direction]||direction);
    if(row<0)return null;
    const count=animation.direction_frames?.[asset.meta.directions[row]]??animation.frames;
    const fps=animation.direction_fps?.[asset.meta.directions[row]]??animation.fps;
    if(animation.valid_directions&&!animation.valid_directions.includes(asset.meta.directions[row]))return null;
    const raw=Math.floor(Math.max(0,time)*fps);
    const index=animation.loop===false?Math.min(count-1,raw):raw%count;
    const [width,height]=asset.meta.frame_size;
    return {image,index,row,width,height,meta:asset.meta,animation};
  }
  function draw(context,id,x,y,{action='idle',direction='south',time=0,height=null,scale=null}={}){
    const f=frame(id,action,direction,time);if(!f)return false;
    const nativeHeight=f.animation.visible_height?.[f.meta.directions[f.row]]??f.meta.reference_height;
    const factor=scale??((height??f.meta.render_height??f.meta.reference_height*f.meta.render_scale)/nativeHeight);
    const width=Math.round(f.width*factor),h=Math.round(f.height*factor);
    const [ax,ay]=f.meta.anchor;
    context.save();context.imageSmoothingEnabled=false;
    context.drawImage(f.image,f.index*f.width,f.row*f.height,f.width,f.height,
      Math.round(x-ax*factor),Math.round(y-ay*factor),width,h);
    context.restore();return true;
  }
  globalThis.MareFactionSprites={register,frame,draw,assets};
})();
