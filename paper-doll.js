'use strict';
/* Rendering only: this module owns no combat clocks, equipment or persistence. */
((root)=>{
  const slots=['body','pants','boots','outfit','hair','accessory','weapon'];
  const directions=['south','north','west','east'];
  const aliases={front:'south',back:'north',left:'west',right:'east'};
  const clone=value=>JSON.parse(JSON.stringify(value));
  const integer=n=>Number.isInteger(n);
  function create({getImage,createCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;},maxCacheBytes=4*1024*1024,maxCacheEntries=96,validatePixels=null}={}){
    if(typeof getImage!=='function')throw new TypeError('Paper Doll requires an image loader.');
    const rigs=new Map(),pieces=new Map(),cache=new Map(),audits=new WeakMap();
    let bytes=0,hits=0,misses=0,fallbacks=0,compositions=0;
    const clear=()=>{cache.clear();bytes=0;};
    function registerRig(input){
      const r=clone(input);
      if(!r.id||!integer(r.frameWidth)||!integer(r.frameHeight)||r.frameWidth<1||r.frameHeight<1||!integer(r.pivotX)||!integer(r.pivotY)||!Number.isFinite(r.scale)||r.scale<=0)throw new TypeError('Invalid rig geometry.');
      if(r.frameWidth>512||r.frameHeight>512||r.pivotX<0||r.pivotX>r.frameWidth||r.pivotY<0||r.pivotY>r.frameHeight)throw new TypeError('Rig exceeds supported bounds.');
      for(const a of Object.values(r.animations||{}))if(!integer(a.frames)||a.frames<1||a.frames>64||!Number.isFinite(a.fps)||a.fps<=0||typeof a.loop!=='boolean'||!Array.isArray(a.directions)||!a.directions.length||new Set(a.directions).size!==a.directions.length||a.directions.some(d=>!directions.includes(d)))throw new TypeError('Invalid rig animation.');
      if(!Object.keys(r.animations||{}).length)throw new TypeError('Rig has no animations.');
      r.requiredSlots=r.requiredSlots||['body','hair','outfit','weapon'];
      if(r.requiredSlots.some(s=>!slots.includes(s)))throw new TypeError('Invalid required slot.');
      rigs.set(r.id,r);clear();return r.id;
    }
    function registerPiece(input){
      const p=clone(input);if(!p.id||!p.rigId||!slots.includes(p.slot))throw new TypeError('Invalid piece identity.');
      pieces.set(p.id,p);clear();return p.id;
    }
    function sample(rigId,animationId,direction,time=0,{progress=null}={}){
      const r=rigs.get(rigId),a=r?.animations[animationId],d=aliases[direction]||direction;
      if(!a||!a.directions.includes(d))return null;
      const n=Number.isFinite(progress)?Math.min(a.frames-1,Math.floor(Math.max(0,Math.min(1,progress))*a.frames+1e-9)):Math.floor(Math.max(0,Number.isFinite(time)?time:0)*a.fps);
      return {animationId,direction:d,frameIndex:a.loop===false?Math.min(n,a.frames-1):n%a.frames,pivotX:r.pivotX,pivotY:r.pivotY};
    }
    function imageAudit(image,clip,r){
      let checks=audits.get(image);if(!checks){checks=new Map();audits.set(image,checks);}
      const key=[clip.url,clip.frames,clip.directions.join(','),r.frameWidth,r.frameHeight,JSON.stringify(clip.occludedFrames||{})].join('|');
      if(checks.has(key))return checks.get(key);
      let result=null;
      try{
        if(validatePixels)result=validatePixels(image,clip,r);
        else{
          const c=createCanvas(image.naturalWidth,image.naturalHeight),ctx=c.getContext('2d',{willReadFrequently:true});
          ctx.drawImage(image,0,0);const rgba=ctx.getImageData(0,0,c.width,c.height).data;
          for(let row=0;row<clip.directions.length&&!result;row++){
            let animated=clip.frames===1;
            for(let col=0;col<clip.frames;col++){
            let visible=false;
            for(let y=0;y<r.frameHeight&&!visible;y++)for(let x=0;x<r.frameWidth;x++)if(rgba[((row*r.frameHeight+y)*c.width+col*r.frameWidth+x)*4+3]){visible=true;break;}
            const occluded=clip.occludedFrames?.[clip.directions[row]]?.includes(col)===true;
            if(occluded&&visible){result='occluded-frame-has-pixels';break;}
            if(!occluded&&!visible){result='empty-frame';break;}
            if(col&&!animated)for(let y=0;y<r.frameHeight&&!animated;y++)for(let x=0;x<r.frameWidth;x++){
              const first=((row*r.frameHeight+y)*c.width+x)*4,current=first+col*r.frameWidth*4;
              if(rgba[first+3]!==rgba[current+3]||(rgba[first+3]&&(rgba[first]!==rgba[current]||rgba[first+1]!==rgba[current+1]||rgba[first+2]!==rgba[current+2]))){animated=true;break;}
            }
            }
            if(!result&&!animated)result='static-animation';
          }
        }
      }catch{result='unreadable-image';}
      checks.set(key,result);return result;
    }
    function resolve(appearance,pose,{allowDraft=false}={}){
      const r=rigs.get(appearance?.rigId),missing=[],layers=[];
      if(!r)return {valid:false,missing:[{code:'missing-rig',slot:'body',pieceId:appearance?.rigId||''}],layers};
      const direction=aliases[pose?.direction]||pose?.direction,a=r.animations[pose?.animationId];
      const frameIndex=pose?.frameIndex;
      if(!a||!a.directions.includes(direction)||!integer(frameIndex)||frameIndex<0||frameIndex>=a.frames)return {valid:false,rig:r,missing:[{code:'unsupported-pose',slot:'body',pieceId:''}],layers};
      if(appearance.blocked?.length)return {valid:false,rig:r,missing:appearance.blocked.map(x=>({...x,code:x.code||'unmapped-equipment'})),layers};
      for(const slot of slots){
        const id=appearance.pieces?.[slot],p=pieces.get(id);
        const problem=code=>missing.push({slot,pieceId:id||'',code});
        if(!id){if(r.requiredSlots.includes(slot))problem('missing-piece');continue;}
        if(!p){problem('missing-piece');continue;}
        if(p.available===false){problem('missing-source');continue;}
        if(p.slot!==slot||p.rigId!==r.id){problem('incompatible-rig');continue;}
        if(!allowDraft&&p.approved!==true){problem('unapproved-piece');continue;}
        const clip=p.animations?.[pose.animationId];
        if(typeof clip?.url!=='string'||!clip.url){problem('missing-animation');continue;}
        if(clip.frames!==a.frames||clip.frameWidth!==r.frameWidth||clip.frameHeight!==r.frameHeight||clip.fps!==a.fps||clip.loop!==a.loop||!Array.isArray(clip.directions)||!clip.directions.length||clip.directions.some(d=>!a.directions.includes(d))||new Set(clip.directions).size!==clip.directions.length){problem('incompatible-animation');continue;}
        // A production lot may cover only some directions; never borrow another row.
        if(!clip.directions.includes(direction)){problem('missing-direction');continue;}
        const rigid=clip.kind==='rigid-attachment';
        if(clip.kind!==undefined&&clip.kind!=='sheet'&&!rigid){problem('unsupported-layer-kind');continue;}
        // Genuine full weapon occlusion is explicit; empty anatomy never passes as a pose.
        if(clip.occludedFrames!==undefined){
          const occluded=clip.occludedFrames;
          if(slot!=='weapon'||rigid||!occluded||typeof occluded!=='object'||Array.isArray(occluded)||
            Object.entries(occluded).some(([d,frames])=>!clip.directions.includes(d)||!Array.isArray(frames)||frames.length>=clip.frames||
              new Set(frames).size!==frames.length||frames.some(i=>!integer(i)||i<0||i>=clip.frames))){problem('invalid-occlusion');continue;}
        }
        let sourceWidth=r.frameWidth,sourceHeight=r.frameHeight,socket=null,source=null,url=clip.url;
        if(rigid){
          // Rigid gear and short hair follow measured sockets; anatomy still needs real frames.
          const validSource=s=>s&&[s.width,s.height,s.anchorX,s.anchorY].every(integer)&&s.width>0&&s.height>0&&s.width<=512&&s.height<=512&&s.anchorX>=0&&s.anchorX<=s.width&&s.anchorY>=0&&s.anchorY<=s.height;
          if(clip.sources!==undefined){
            if(!clip.sources||Array.isArray(clip.sources)||!clip.directions.every(d=>validSource(clip.sources[d])&&typeof clip.sources[d].url==='string'&&clip.sources[d].url)){problem('invalid-attachment-source');continue;}
            source=clip.sources[direction];url=source.url;
          }else source=clip.source;
          if(!['weapon','hair','accessory'].includes(slot)||!validSource(source)){problem('invalid-attachment-source');continue;}
          const complete=clip.directions.every(d=>Array.isArray(clip.sockets?.[d])&&clip.sockets[d].length===a.frames&&clip.sockets[d].every(s=>s&&integer(s.x)&&integer(s.y)&&s.x>=0&&s.x<=r.frameWidth&&s.y>=0&&s.y<=r.frameHeight&&(s.quarterTurns===undefined||(integer(s.quarterTurns)&&s.quarterTurns>=0&&s.quarterTurns<=3))));
          if(!complete){problem('missing-socket');continue;}
          if(slot!=='weapon'&&clip.directions.some(d=>clip.sockets[d].some(s=>(s.quarterTurns??0)!==0))){problem('invalid-transform');continue;}
          sourceWidth=source.width;sourceHeight=source.height;socket=clip.sockets[direction][frameIndex];
        }
        const row=clip.directions.indexOf(direction),overrides=clip.poseOverrides?.[direction]?.[frameIndex]||{},byDirection=clip.directionOverrides?.[direction]||{};
        const pivotX=clip.pivotX??r.pivotX,pivotY=clip.pivotY??r.pivotY;
        // Exact quarter-turns rotate a rigid weapon around its grip. Anatomy never rotates.
        const quarterTurns=rigid?(socket.quarterTurns??0):0;
        const anchors=rigid?[[source.anchorX,source.anchorY],[source.height-1-source.anchorY,source.anchorX],[source.width-1-source.anchorX,source.height-1-source.anchorY],[source.anchorY,source.width-1-source.anchorX]]:null;
        const offsetX=(overrides.offsetX??byDirection.offsetX??clip.offsetX??0)+(rigid?socket.x-anchors[quarterTurns][0]:0),offsetY=(overrides.offsetY??byDirection.offsetY??clip.offsetY??0)+(rigid?socket.y-anchors[quarterTurns][1]:0);
        const zIndex=overrides.zIndex??byDirection.zIndex??clip.zIndex??p.zIndex??slots.indexOf(slot)*10;
        if(![pivotX,pivotY,offsetX,offsetY,zIndex].every(integer)||pivotX<0||pivotX>r.frameWidth||pivotY<0||pivotY>r.frameHeight||Math.abs(offsetX)>512||Math.abs(offsetY)>512){problem('invalid-transform');continue;}
        let image;try{image=getImage(url);}catch{problem('failed-image');continue;}
        if(!image?.complete){problem('loading-image');continue;}
        if(!image.naturalWidth||!image.naturalHeight){problem('failed-image');continue;}
        if(image.naturalWidth!==(rigid?sourceWidth:r.frameWidth*clip.frames)||image.naturalHeight!==(rigid?sourceHeight:r.frameHeight*clip.directions.length)){problem('invalid-sheet-size');continue;}
        const invalid=rigid?imageAudit(image,{url,frames:1,directions:['south']},{frameWidth:sourceWidth,frameHeight:sourceHeight}):imageAudit(image,clip,r);if(invalid){problem(invalid);continue;}
        layers.push({slot,pieceId:id,revision:p.revision||1,image,url,animationId:pose.animationId,direction,frameIndex,
          kind:rigid?'rigid-attachment':'sheet',socket:rigid?{...socket}:null,quarterTurns,
          pivotX,pivotY,offsetX,offsetY,zIndex,sx:rigid?0:frameIndex*r.frameWidth,sy:rigid?0:row*r.frameHeight,width:sourceWidth,height:sourceHeight});
      }
      layers.sort((x,y)=>x.zIndex-y.zIndex||slots.indexOf(x.slot)-slots.indexOf(y.slot));
      return {valid:missing.length===0,rig:r,pose:{animationId:pose.animationId,direction,frameIndex},layers,missing};
    }
    function draw(context,appearance,pose,x,y,{scale=null,hidden=[],allowDraft=false}={}){
      const plan=resolve(appearance,pose,{allowDraft});
      if(!plan.valid){fallbacks++;return false;}
      const r=plan.rig,factor=scale??r.scale;if(!Number.isFinite(factor)||factor<=0)return false;
      const visible=plan.layers.filter(l=>!hidden.includes(l.slot));
      const key=JSON.stringify([r.id,r.revision||1,plan.pose,visible.map(l=>[l.pieceId,l.revision,l.url,l.pivotX,l.pivotY,l.offsetX,l.offsetY,l.zIndex,l.quarterTurns])]);
      let c=cache.get(key);
      if(c){hits++;cache.delete(key);cache.set(key,c);}
      else{
        misses++;compositions++;
        // Expand around the rig pivot so legitimate offsets/pivots never clip a layer.
        const left=Math.min(0,...visible.map(l=>r.pivotX-l.pivotX+l.offsetX));
        const top=Math.min(0,...visible.map(l=>r.pivotY-l.pivotY+l.offsetY));
        const right=Math.max(r.frameWidth,...visible.map(l=>r.pivotX-l.pivotX+l.offsetX+(l.quarterTurns%2?l.height:l.width)));
        const bottom=Math.max(r.frameHeight,...visible.map(l=>r.pivotY-l.pivotY+l.offsetY+(l.quarterTurns%2?l.width:l.height)));
        if(right-left>2048||bottom-top>2048)return false;
        try{
          const image=createCanvas(right-left,bottom-top),ctx=image.getContext('2d');ctx.imageSmoothingEnabled=false;
          for(const l of visible){
            const x=r.pivotX-l.pivotX+l.offsetX-left,y=r.pivotY-l.pivotY+l.offsetY-top;
            if(!l.quarterTurns)ctx.drawImage(l.image,l.sx,l.sy,l.width,l.height,x,y,l.width,l.height);
            else{
              ctx.save();
              const origins=[[0,0],[l.height,0],[l.width,l.height],[0,l.width]];
              ctx.translate(x+origins[l.quarterTurns][0],y+origins[l.quarterTurns][1]);ctx.rotate(l.quarterTurns*Math.PI/2);
              ctx.drawImage(l.image,l.sx,l.sy,l.width,l.height,0,0,l.width,l.height);ctx.restore();
            }
          }
          c={image,pivotX:r.pivotX-left,pivotY:r.pivotY-top,bytes:image.width*image.height*4};
        }catch{fallbacks++;return false;}
        if(c.bytes<=maxCacheBytes&&maxCacheEntries>0){
          while(cache.size&&(bytes+c.bytes>maxCacheBytes||cache.size>=maxCacheEntries)){const first=cache.keys().next().value;bytes-=cache.get(first).bytes;cache.delete(first);}
          cache.set(key,c);bytes+=c.bytes;
        }
      }
      context.save();context.imageSmoothingEnabled=false;
      context.drawImage(c.image,Math.round(x-c.pivotX*factor),Math.round(y-c.pivotY*factor),Math.round(c.image.width*factor),Math.round(c.image.height*factor));context.restore();return true;
    }
    const stats=()=>({hits,misses,fallbacks,compositions,cacheEntries:cache.size,cacheBytes:bytes,maxCacheBytes,maxCacheEntries});
    return {registerRig,registerPiece,sample,resolve,draw,clear,stats,rig:id=>rigs.has(id)?clone(rigs.get(id)):null,piece:id=>pieces.has(id)?clone(pieces.get(id)):null};
  }
  const api={create,slots,directions};root.MarePaperDoll=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
