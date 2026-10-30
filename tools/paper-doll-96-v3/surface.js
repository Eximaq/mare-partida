/* Native material transfer. Geometry comes from the approved body, never from
 * colour searches or from a garment borrowed from the opposite limb. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.MareSurface96=factory();
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const sides=['LEFT','RIGHT'];
  function normalizeAlpha(source){
    const out=new Uint8ClampedArray(source);
    for(let i=0;i<out.length;i+=4){if(out[i+3]<128)out.fill(0,i,i+4);else out[i+3]=255;}
    return out;
  }
  const distances=new WeakMap();
  function bodyDistance(body,width,height){
    const cached=distances.get(body);if(cached&&cached.width===width)return cached.data;
    const data=new Uint16Array(width*height);data.fill(65535);const queue=[];
    for(let p=0;p<data.length;p++)if(body[p*4+3]){data[p]=0;queue.push(p);}
    for(let n=0;n<queue.length;n++){
      const p=queue[n],x=p%width,y=Math.floor(p/width);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const xx=x+dx,yy=y+dy,j=yy*width+xx;
        if(xx<0||xx>=width||yy<0||yy>=height||data[j]<=data[p]+1)continue;
        data[j]=data[p]+1;queue.push(j);
      }
    }distances.set(body,{width,data});return data;
  }
  function constrainVolume(fitted,material,body,restBody,width,height){
    const nativeDistance=bodyDistance(restBody,128,128),targetDistance=bodyDistance(body,width,height);
    let volume=0;for(let p=0;p<128*128;p++)if(material[p*4+3])volume=Math.max(volume,nativeDistance[p]);
    const out=new Uint8ClampedArray(fitted),cut=new Set();
    for(let p=0;p<width*height;p++)if(out[p*4+3]&&targetDistance[p]>volume+1){out.fill(0,p*4,p*4+4);cut.add(p);}
    if(!cut.size)return out;
    // Repair only the newly cut border with the material's native ink.
    let ink=[15,15,20],darkest=Infinity;
    for(let i=0;i<material.length;i+=4)if(material[i+3]){const l=material[i]+material[i+1]+material[i+2];if(l<darkest){darkest=l;ink=Array.from(material.subarray(i,i+3));}}
    for(const p of cut){const x=p%width,y=Math.floor(p/width);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
      const xx=x+dx,yy=y+dy,j=yy*width+xx;if(xx<0||xx>=width||yy<0||yy>=height||!out[j*4+3])continue;
      out.set(ink,j*4);
    }}
    // A contour trimmed to the body must not leave a detached toe or cuff.
    const seen=new Uint8Array(width*height),groups=[];
    for(let p=0;p<seen.length;p++){
      if(seen[p]||!out[p*4+3])continue;const group=[p];seen[p]=1;
      for(let n=0;n<group.length;n++){const q=group[n],x=q%width,y=Math.floor(q/width);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const xx=x+dx,yy=y+dy,j=yy*width+xx;if(xx<0||xx>=width||yy<0||yy>=height||seen[j]||!out[j*4+3])continue;seen[j]=1;group.push(j);
      }}groups.push(group);
    }groups.sort((a,b)=>b.length-a.length);
    for(const group of groups.slice(1))for(const p of group)out.fill(0,p*4,p*4+4);
    return out;
  }
  function shapeCoveredHand(fitted,material,rest,pose,side,padding,width,height,body,handSurface){
    const r=joints(rest),p=joints(pose),a=axis(p[side+' ELBOW'],p[side+' ARM']);
    const original=axis(r[side+' ELBOW'],r[side+' ARM']),out=new Uint8ClampedArray(fitted);
    let usable=false;
    if(handSurface)for(let y=0;y<height&&!usable;y++)for(let x=0;x<width;x++){
      if(handSurface[(y*width+x)*4+3]&&Math.hypot(x-padding-a.b.x,y-padding-a.b.y)<7){usable=true;break;}
    }
    const silhouette=usable?handSurface:body;
    const colours=new Map();
    for(let y=0;y<128;y++)for(let x=0;x<128;x++){
      const i=(y*128+x)*4;if(!material[i+3]||Math.hypot(x-original.b.x,y-original.b.y)>6)continue;
      const rgb=Array.from(material.subarray(i,i+3)),light=rgb[0]+rgb[1]+rgb[2];if(light<50||light>550)continue;
      const key=rgb.join(',');colours.set(key,(colours.get(key)||0)+1);
    }
    const fill=(Array.from(colours).sort((a,b)=>b[1]-a[1])[0]?.[0]||'25,32,49').split(',').map(Number);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=(y*width+x)*4,xx=x-padding,yy=y-padding,v=a.at(xx,yy);
      if(v.along<a.length+1||Math.hypot(xx-a.b.x,yy-a.b.y)>8)continue;
      out.fill(0,i,i+4);if(!silhouette[i+3]||!body[i+3])continue;
      const other=p[(side==='LEFT'?'RIGHT':'LEFT')+' ARM'];
      if(Math.hypot(xx-other.x,yy-other.y)+.5<Math.hypot(xx-a.b.x,yy-a.b.y))continue;
      const source=original.point(original.length+v.along-a.length,v.across),sx=Math.round(source.x),sy=Math.round(source.y);
      let from=-1,best=Infinity;
      for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
        const nx=sx+dx,ny=sy+dy,j=(ny*128+nx)*4,d=dx*dx+dy*dy;
        if(nx<0||nx>=128||ny<0||ny>=128||d>=best||!material[j+3])continue;best=d;from=j;
      }
      const ink=Math.max(body[i],body[i+1],body[i+2])<55;
      if(ink)out.set([10,14,23,255],i);
      else if(from>=0)out.set([...material.subarray(from,from+3),255],i);
      else out.set([...fill,255],i);
    }
    const seen=new Uint8Array(width*height),groups=[];
    for(let p=0;p<seen.length;p++){
      if(seen[p]||!out[p*4+3])continue;const group=[p];seen[p]=1;
      for(let n=0;n<group.length;n++){const q=group[n],x=q%width,y=Math.floor(q/width);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const xx=x+dx,yy=y+dy,j=yy*width+xx;if(xx<0||xx>=width||yy<0||yy>=height||seen[j]||!out[j*4+3])continue;seen[j]=1;group.push(j);
      }}groups.push(group);
    }groups.sort((a,b)=>b.length-a.length);
    for(const group of groups.slice(1))for(const p of group)out.fill(0,p*4,p*4+4);
    return out;
  }
  const joints=points=>Object.fromEntries(points.map(p=>[p.label,{x:p.x*128,y:p.y*128,z:p.z_index||0}]));
  function axis(a,b){
    const length=Math.hypot(b.x-a.x,b.y-a.y)||1;
    const ux=(b.x-a.x)/length,uy=(b.y-a.y)/length;
    return {a,b,length,ux,uy,at(x,y){const dx=x-a.x,dy=y-a.y;return {along:dx*ux+dy*uy,across:-dx*uy+dy*ux};},point(along,across){return {x:a.x+along*ux-across*uy,y:a.y+along*uy+across*ux};}};
  }
  function bones(points,slot){
    const j=joints(points),out=[];
    for(const side of sides){
      if(slot==='pants')for(const [part,a,b]of [['upper',' HIP',' KNEE'],['lower',' KNEE',' LEG']])out.push({side,part,key:side+part,...axis(j[side+a],j[side+b])});
      else{const a=slot==='boots'?' KNEE':' ELBOW',b=slot==='boots'?' LEG':' ARM';out.push({side,part:'end',key:side+'end',...axis(j[side+a],j[side+b])});}
    }return {j,list:out};
  }
  function nearest(list,x,y){
    let best=null,distance=Infinity;
    for(const b of list){const p=b.at(x,y),clamped=Math.max(0,Math.min(b.length,p.along));
      const d=(p.along-clamped)**2+p.across**2;
      if(d<distance){distance=d;best={bone:b,...p,distance:Math.sqrt(d)};}
    }return best;
  }
  function profile(body,points,slot,padding,width,height){
    const rig=bones(points,slot),bins=new Map(),pixels=[];
    const hip={x:(rig.j['LEFT HIP'].x+rig.j['RIGHT HIP'].x)/2,y:(rig.j['LEFT HIP'].y+rig.j['RIGHT HIP'].y)/2};
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=(y*width+x)*4;if(body[i+3]<128)continue;
      const xx=x-padding,yy=y-padding,q=nearest(rig.list,xx,yy);if(!q)continue;
      if(slot==='pants'){
        if(yy<hip.y-4||q.distance>14)continue;
        // The forearm may cross a thigh; its surface remains an arm.
        let arm=Infinity;
        for(const side of sides){const a=rig.j[side+' ELBOW'],b=rig.j[side+' ARM'],ax=axis(a,b),p=ax.at(xx,yy);arm=Math.min(arm,Math.hypot(p.across,p.along-Math.max(0,Math.min(ax.length,p.along))));}
        if(arm<4&&arm+1<q.distance)continue;
      }else if(q.along<-.5||q.along>q.bone.length+17||q.distance>15)continue;
      const bin=Math.round(q.along),key=q.bone.key+':'+bin;
      let band=bins.get(key);if(!band){band={min:Infinity,max:-Infinity};bins.set(key,band);}
      band.min=Math.min(band.min,q.across);band.max=Math.max(band.max,q.across);
      pixels.push({i,x:xx,y:yy,...q,bin,key});
    }return {rig,bins,pixels,hip};
  }
  function transfer(source,slot,restPoints,posePoints,padding,width,height,body,restBody,sourceParts){
    if(!restBody||restBody.length!==128*128*4||body.length!==width*height*4)throw Error('Native fitting requires both body surfaces');
    const rest=profile(restBody,restPoints,slot,0,128,128),target=profile(body,posePoints,slot,padding,width,height);
    const partSources={};
    if(sourceParts)for(const [key,data]of Object.entries(sourceParts)){const bone=rest.rig.list.find(b=>b.key===key||b.side===key);if(bone)partSources[bone.key]=data;}
    const parts=slot==='pants'?{full:new Uint8ClampedArray(body.length)}:Object.fromEntries(sides.map(s=>[s,new Uint8ClampedArray(body.length)]));
    const rb=Object.fromEntries(rest.rig.list.map(b=>[b.key,b]));
    const spanAverage=(map,key)=>{const widths=[];for(const [k,b]of map)if(k.startsWith(key+':')&&b.max-b.min>1)widths.push(b.max-b.min);widths.sort((a,b)=>a-b);return widths.length?widths[Math.floor(widths.length/2)]:5;};
    const scales={};for(const b of target.rig.list)scales[b.key]=Math.max(.65,Math.min(1.6,spanAverage(target.bins,b.key)/spanAverage(rest.bins,b.key)));
    for(const p of target.pixels){
      const original=rb[p.bone.key],along=p.along/p.bone.length*original.length;
      const material=partSources[original.key]||source;
      const point=original.point(along,p.across/scales[original.key]);
      const sx=Math.round(point.x),sy=Math.round(point.y);if(sx<0||sy<0||sx>=128||sy>=128)continue;
      const from=(sy*128+sx)*4;if(material[from+3]<128)continue;
      const out=slot==='pants'?parts.full:parts[p.bone.side];out.set(material.subarray(from,from+4),p.i);out[p.i+3]=255;
    }
    if(slot==='pants'){
      // The waistband belongs to the pelvis. Its shape follows the torso while
      // the two leg surfaces below it remain independent.
      const r=rest.rig.j,p=target.rig.j;
      const rHip={x:(r['LEFT HIP'].x+r['RIGHT HIP'].x)/2,y:(r['LEFT HIP'].y+r['RIGHT HIP'].y)/2},pHip=target.hip;
      const rAxis=axis(r.NECK,rHip),pAxis=axis(p.NECK,pHip);
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const i=(y*width+x)*4,xx=x-padding,yy=y-padding;if(body[i+3]<128||yy<pHip.y-9||yy>pHip.y+2)continue;
        const v=pAxis.at(xx,yy),src=rAxis.point(v.along*rAxis.length/pAxis.length,v.across);
        const sx=Math.round(src.x),sy=Math.round(src.y);if(sx<0||sy<0||sx>=128||sy>=128)continue;
        const from=(sy*128+sx)*4;if(source[from+3]<128)continue;
        // Restrict the waist to the pelvic silhouette, away from hanging hands.
        if(Math.abs(v.across)>Math.max(8,Math.abs(p['LEFT HIP'].x-p['RIGHT HIP'].x)/2+5))continue;
        parts.full.set(source.subarray(from,from+4),i);parts.full[i+3]=255;
      }
    }
    return parts;
  }

  // A fitted garment follows the native anatomy of each pose. Material colours
  // are independent of the skin palette; a static hand is never rotated onto a
  // differently shaped attack gesture.
  function nativeMaterial(source,slot,restPoints,posePoints,padding,width,height,body,sourceParts,design={}){
    const target=profile(body,posePoints,slot,padding,width,height),rest=bones(restPoints,slot),out=slot==='pants'?{full:new Uint8ClampedArray(body.length)}:{LEFT:new Uint8ClampedArray(body.length),RIGHT:new Uint8ClampedArray(body.length)};
    const ramp=design.ramp||[[12,16,26],[23,32,48],[37,52,72],[61,77,96],[91,109,126]];
    const bounds={};
    for(const b of rest.list){const data=sourceParts?.[b.key]||sourceParts?.[b.side]||source;let lo=Infinity,hi=-Infinity,across=0;
      for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4;if(data[i+3]<128)continue;const q=b.at(x,y);lo=Math.min(lo,q.along/b.length);hi=Math.max(hi,q.along/b.length);across=Math.max(across,Math.abs(q.across));}
      bounds[b.key]={lo,hi,across};
    }
    const samples=[];
    for(const p of target.pixels){const limits=bounds[p.bone.key];if(!limits||!Number.isFinite(limits.lo))continue;
      const f=p.along/p.bone.length;
      let lo=limits.lo,hi=limits.hi;
      if(slot==='boots'){lo=design.cuffStart??.62;hi=2.0;}
      if(slot==='pants'&&design.kneePlate&&p.bone.part==='lower'){lo=0;hi=1.1;}
      if(slot==='gloves'){lo=design.cuffStart??.6;hi=design.fingerCoverage==='fingerless'?1.30:1.9;}
      if(f<lo-.03||f>hi+.04)continue;
      if(slot!=='pants'&&Math.abs(p.across)>(slot==='boots'?9:6.5))continue;
      if(slot==='gloves'){
        const r=body[p.i],g=body[p.i+1],b=body[p.i+2],ink=Math.max(r,g,b)<65,skin=r>80&&r>b*1.3&&g/r>.33&&g/r<.91;
        if(!ink&&!skin)continue;
        const nativeHand=design.handSurface?.[p.i+3];
        // Native skin and component ownership below also cover hands stored
        // in the main body strip, rather than only in a foreground strip.
        const torso=axis(target.rig.j.NECK,target.hip),q=torso.at(p.x,p.y),d=Math.hypot(q.across,q.along-Math.max(0,Math.min(torso.length,q.along)));
        if(!nativeHand&&d+1<p.distance)continue;
      }
      const data=slot==='pants'?out.full:out[p.bone.side];data[p.i+3]=255;samples.push({...p,f,lo,hi,data});
    }
    if(slot==='pants'){
      const j=target.rig.j,hip=target.hip,axisPelvis=axis(j.NECK,hip),radius=Math.max(7,Math.abs(j['LEFT HIP'].x-j['RIGHT HIP'].x)/2+4);
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const i=(y*width+x)*4,xx=x-padding,yy=y-padding;if(!body[i+3]||yy<hip.y-5||yy>hip.y+3)continue;
        const q=axisPelvis.at(xx,yy);if(Math.abs(q.across)>radius)continue;
        let hand=false;for(const side of sides){const a=axis(j[side+' ELBOW'],j[side+' ARM']),p=a.at(xx,yy);if(p.along>a.length*.5&&Math.hypot(p.across,p.along-Math.min(a.length,p.along))<4&&Math.abs(q.across)>radius-3)hand=true;}if(hand)continue;
        if(!out.full[i+3]){out.full[i+3]=255;samples.push({i,x:xx,y:yy,f:0,lo:0,hi:1,across:q.across,bone:{side:'LEFT',length:20},data:out.full});}
      }
    }
    for(const p of samples){const nativeLight=.2126*body[p.i]+.7152*body[p.i+1]+.0722*body[p.i+2];let shade=nativeLight<65?0:nativeLight<130?1:nativeLight<185?2:nativeLight<225?3:4;
      const x=p.i/4%width,y=Math.floor(p.i/4/width),boundary=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{const xx=x+dx,yy=y+dy;return xx<0||xx>=width||yy<0||yy>=height||!p.data[(yy*width+xx)*4+3];});
      // Preserve the silhouette ink, use broad shade clusters inside the piece.
      if(boundary)shade=Math.min(shade,1);else shade=Math.max(2,Math.min(3,shade));
      if(slot==='boots'&&p.f< p.lo+.12)shade=3;
      if(slot==='boots'&&p.f>1.5)shade=1;
      if(slot==='gloves'&&p.f<p.lo+.14)shade=3;
      let colour=ramp[shade];if(design.kneePlate&&slot==='pants'&&(p.bone.part==='upper'&&p.f>.83&&p.f<1.03||p.bone.part==='lower'&&p.f<.86))colour=[[20,28,37],[44,57,67],[75,91,102],[110,129,140],[145,164,172]][shade];
      p.data.set([...colour,255],p.i);
    }
    // Stitch one-pixel cuts only across the same native skin/foot surface.
    // Other islands are not part of this member and must not become speckles.
    for(const [key,data]of Object.entries(out)){
      const seen=new Uint8Array(width*height),groups=[];
      for(let p=0;p<seen.length;p++){if(seen[p]||!data[p*4+3])continue;const g=[p];seen[p]=1;for(let n=0;n<g.length;n++){const q=g[n],x=q%width,y=Math.floor(q/width);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,k=yy*width+xx;if(xx<0||xx>=width||yy<0||yy>=height||seen[k]||!data[k*4+3])continue;seen[k]=1;g.push(k);}}groups.push(g);}
      if(slot==='pants'){const max=Math.max(...groups.map(g=>g.length),0);for(const g of groups)if(g.length<Math.min(8,max))for(const p of g)data.fill(0,p*4,p*4+4);continue;}
      const bone=target.rig.list.find(v=>v.side===key),distance=g=>Math.min(...g.map(p=>Math.hypot(p%width-padding-bone.b.x,Math.floor(p/width)-padding-bone.b.y)));
      groups.sort((a,b)=>distance(a)-distance(b));const linked=new Set(groups[0]||[]);
      for(const group of groups.slice(1)){let bridge=null;
        for(const p of group){const x=p%width,y=Math.floor(p/width);for(let dy=-2;dy<=2&&!bridge;dy++)for(let dx=-2;dx<=2;dx++){
          const q=(y+dy)*width+x+dx;if(!linked.has(q))continue;const steps=Math.max(Math.abs(dx),Math.abs(dy)),path=[];let valid=true;
          for(let n=1;n<steps;n++){const xx=x+Math.round(dx*n/steps),yy=y+Math.round(dy*n/steps),k=yy*width+xx,i=k*4,r=body[i],g=body[i+1],b=body[i+2];if(xx<0||xx>=width||yy<0||yy>=height||!body[i+3]||slot==='gloves'&&!(Math.max(r,g,b)<65||r>80&&r>b*1.3&&g/r>.33&&g/r<.91)){valid=false;break;}path.push(k);}
          if(valid){bridge=path;break;}
        }if(bridge)break;}
        if(bridge){for(const p of bridge){data.set([...ramp[2],255],p*4);linked.add(p);}for(const p of group)linked.add(p);}
        else for(const p of group)data.fill(0,p*4,p*4+4);
      }
    }
    // A closed glove owns every native palm pixel, including a one-pixel finger
    // separated by the generic component cleanup. Never synthesize a new hand.
    if(slot==='gloves'&&design.fingerCoverage==='full'&&design.handOwnership){
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const p=y*width+x,i=p*4;if(!design.handOwnership[p]||!body[i+3])continue;
        const xx=x-padding,yy=y-padding,candidates=target.rig.list.map(b=>({b,d:Math.hypot(xx-b.b.x,yy-b.b.y),q:b.at(xx,yy)})).filter(a=>a.d<=6.5&&a.q.along>=a.b.length*.65).sort((a,b)=>a.d-b.d);
        if(!candidates.length)continue;const to=out[candidates[0].b.side];if(to[i+3])continue;
        const light=.2126*body[i]+.7152*body[i+1]+.0722*body[i+2],shade=Math.max(body[i],body[i+1],body[i+2])<65?0:light<160?2:3;
        to.set([...ramp[shade],255],i);
      }
    }
    return out;
  }

  return {nativeMaterial,axis,bones,profile,transfer,bodyDistance,constrainVolume,shapeCoveredHand,normalizeAlpha};
});
