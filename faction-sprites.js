'use strict';
/* Playback uses metadata and native generated pixels; no frame synthesis or mirroring. */
(() => {
  const assets={};
  const images=new Map();
  const reportedFailures=new Set();
  const assetBase=typeof document!=='undefined'&&document.currentScript?.src?new URL('.',document.currentScript.src).href:null;
  const assetVersion=typeof document!=='undefined'&&document.currentScript?.src?new URL(document.currentScript.src).searchParams.get('v'):null;
  const directionMap={front:'south',back:'north',left:'west',right:'east'};
  function image(url){
    if(!images.has(url)){
      const im=new Image(),notify=()=>window.dispatchEvent(new Event('mare-faction-sprite-ready'));
      im.addEventListener('load',notify);im.addEventListener('error',()=>{if(!reportedFailures.has(url)){reportedFailures.add(url);console.error('[sprite] Falha ao carregar',url);}notify();});
      const target=assetBase?new URL(url,assetBase):null;
      // Opaque local-image URLs must remain byte-for-byte intact for imported packs.
      if(target&&assetVersion&&(target.protocol==='http:'||target.protocol==='https:'))target.searchParams.set('v',assetVersion);
      im.src=target?target.href:url;images.set(url,im);
    }
    return images.get(url);
  }
  function ensure(id){
    const asset=assets[id];if(!asset||asset.requested)return;
    asset.requested=true;
    for(const [action,animation]of Object.entries(asset.meta.animations)){
      asset.sheets[action]=image(animation.url);
    }
  }
  function register(config,{lazy=false}={}){
    for(const [id,meta] of Object.entries(config)){
      assets[id]={meta,sheets:{},requested:false};
      if(!lazy)ensure(id);
    }
  }
  function status(id,action='idle'){
    const asset=assets[id];if(!asset)return 'missing';
    ensure(id);const animation=asset.meta.animations[action];if(!animation)return 'unsupported';
    const image=asset.sheets[action];if(!image||!image.complete)return 'loading';
    if(!image.naturalWidth)return 'failed';
    const [width,height]=asset.meta.frame_size;
    const valid=image.naturalWidth===width*animation.frames&&image.naturalHeight===height*asset.meta.directions.length;
    if(!valid&&!reportedFailures.has(animation.url)){reportedFailures.add(animation.url);console.error('[sprite] Dimensões incorretas',animation.url);}
    return valid?'ready':'failed';
  }
  function frame(id,action='idle',direction='south',time=0,progress=null){
    const asset=assets[id];if(!asset)return null;
    ensure(id);
    const animation=asset.meta.animations[action];if(!animation||status(id,action)!=='ready')return null;
    const image=asset.sheets[action];
    const row=asset.meta.directions.indexOf(directionMap[direction]||direction);
    if(row<0)return null;
    const count=animation.direction_frames?.[asset.meta.directions[row]]??animation.frames;
    const fps=animation.direction_fps?.[asset.meta.directions[row]]??animation.fps;
    if(animation.valid_directions&&!animation.valid_directions.includes(asset.meta.directions[row]))return null;
    const raw=Number.isFinite(progress)?Math.min(count-1,Math.floor(Math.max(0,Math.min(1,progress))*count+1e-9)):Math.floor(Math.max(0,time)*fps);
    const index=animation.loop===false?Math.min(count-1,raw):raw%count;
    const [width,height]=asset.meta.frame_size;
    return {image,index,row,width,height,meta:asset.meta,animation};
  }
  function draw(context,id,x,y,{action='idle',direction='south',time=0,height=null,scale=null,progress=null}={}){
    const f=frame(id,action,direction,time,progress);if(!f)return false;
    const nativeHeight=f.animation.visible_height?.[f.meta.directions[f.row]]??f.meta.reference_height;
    const factor=scale??((height??f.meta.render_height??f.meta.reference_height*f.meta.render_scale)/nativeHeight);
    const width=Math.round(f.width*factor),h=Math.round(f.height*factor);
    const [ax,ay]=f.meta.anchor;
    context.save();context.imageSmoothingEnabled=false;
    context.drawImage(f.image,f.index*f.width,f.row*f.height,f.width,f.height,
      Math.round(x-ax*factor),Math.round(y-ay*factor),width,h);
    context.restore();return true;
  }
  const forgetImage=url=>{if(url.startsWith('blob:'))images.delete(url);};
  globalThis.MareFactionSprites={register,ensure,status,frame,draw,assets,image,forgetImage};
})();
