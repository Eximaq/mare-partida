'use strict';
/* Haki presentation: approved 4x cropped sprite frames and a map-aware ground burst. */
((root)=>{
  const base='assets/haki/rebrand/',images={armament:new Image(),observation:new Image()};
  let clips={};
  fetch(base+'clips.json').then(r=>r.ok?r.json():{}).then(v=>{clips=v;}).catch(()=>{});
  for(const [id,img] of Object.entries(images))img.src=base+id+'.png';

  const clamp=v=>Math.max(0,Math.min(1,v)),tau=Math.PI*2;
  const facing=hero=>({front:'south',back:'north',left:'west',right:'east'})[hero.direction]||hero.direction||'south';
  const clipDir=direction=>direction==='east'?'west':direction;
  function frame(ctx,id,hero,elapsed,bodyScale,flip,still){
    const clip=clips[id],img=images[clip?.group];if(!img?.naturalWidth)return;
    const index=still??(id.startsWith('armament-')?Math.floor(Math.max(0,elapsed)*60)%clip.frames.length:Math.min(clip.frames.length-1,Math.floor(Math.max(0,elapsed)*60)));
    const f=clip.frames[index];if(!f)return;
    const [x,y,w,h,dx,dy]=f,k=bodyScale/4;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(hero.x),Math.round(hero.y));
    if(flip)ctx.scale(-1,1);
    ctx.drawImage(img,x,y,w,h,dx*k,dy*k,w*k,h*k);ctx.restore();
  }
  let ghostCanvas;
  function drawGhost(ctx,rt,hero,scale,drawSubject){
    if(!drawSubject)return;
    ghostCanvas??=document.createElement('canvas');
    // Render the actual animated silhouette, including the equipped layers.
    const k=2,w=Math.ceil(252*scale*k),h=Math.ceil(185*scale*k),px=w/2,py=h*.92;
    if(ghostCanvas.width!==w||ghostCanvas.height!==h){ghostCanvas.width=w;ghostCanvas.height=h;}
    const c=ghostCanvas.getContext('2d');c.clearRect(0,0,w,h);
    c.save();c.scale(k,k);drawSubject(c,px/k,py/k);c.restore();
    c.save();c.globalCompositeOperation='source-in';c.fillStyle='#79b5d0';c.fillRect(0,0,w,h);c.restore();
    const t=clamp((.35-rt.dodgeFX)/.35),dx=(facing(hero)==='east'?1:-1)*scale;
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.globalAlpha*=Math.sin(t*Math.PI)*.29;
    ctx.drawImage(ghostCanvas,hero.x-px/k+dx*(6+t*14),hero.y-py/k+1,w/k,h/k);
    ctx.restore();
  }
  function drawBack(ctx,rt,hero,reduced,scale=1,drawSubject){
    if(rt?.active!=='observation'||!(rt.dodgeFX>0)||reduced)return;
    const direction=facing(hero);frame(ctx,'dodge-'+clipDir(direction)+'-back',hero,.35-rt.dodgeFX,scale,direction==='east');
    drawGhost(ctx,rt,hero,scale,drawSubject);
  }
  function draw(ctx,rt,hero,time,reduced,_unused,scale=1){
    if(!rt)return;
    const direction=facing(hero),flip=direction==='east',d=clipDir(direction);
    if(rt.active==='armament')frame(ctx,'armament-'+d,hero,time,scale,flip,reduced?4:undefined);
    if(rt.active!=='observation')return;
    if(rt.dodgeFX>0){
      if(direction!=='north')frame(ctx,'dodge-'+d+'-front',hero,.35-rt.dodgeFX,scale,flip,reduced?8:undefined);
    }else if(rt.eyeFX>0&&direction!=='north'){
      frame(ctx,'focus-'+d,hero,.25-rt.eyeFX,scale,flip,reduced?5:undefined);
    }
  }

  // Cast-center visibility polygon. Use the same projectile solver as damage.
  // Test near each occluder corner as well as evenly spaced bearings so a
  // narrow opening or wall has its own edge without a large bitmap mask.
  const cached=new WeakMap();
  function visibleFan(origin,radius,nav,clear){
    const key=origin.x+','+origin.y+','+radius,map=nav.map,angles=[];
    let cache=cached.get(nav);
    if(cache?.colliders!==map.colliders){cache={colliders:map.colliders,casts:new Map()};cached.set(nav,cache);}
    if(cache.casts.has(key))return cache.casts.get(key);
    for(let i=0;i<360;i++)angles.push(i*tau/360);
    function corners(x,y,w,h){
      for(const [px,py] of [[x,y],[x+w,y],[x+w,y+h],[x,y+h]]){
        const a=(Math.atan2(py-origin.y,px-origin.x)+tau)%tau;
        for(const eps of [-.0001,0,.0001])angles.push((a+eps+tau)%tau);
      }
    }
    corners(0,0,map.width,map.height);
    for(const o of map.colliders){
      if(root.MareWorld.blocksProjectile(o)&&o.x<=origin.x+radius&&o.x+o.w>=origin.x-radius&&o.y<=origin.y+radius&&o.y+o.h>=origin.y-radius)corners(o.x,o.y,o.w,o.h);
    }
    const points=angles.sort((a,b)=>a-b).map(angle=>{
      const dx=Math.cos(angle),dy=Math.sin(angle);
      const at=r=>({x:origin.x+dx*r,y:origin.y+dy*r});
      let lo=0,hi=radius;
      if(clear(origin,at(radius)))return at(radius);
      for(let i=0;i<12;i++){const mid=(lo+hi)/2;if(clear(origin,at(mid)))lo=mid;else hi=mid;}
      return at(lo);
    });
    cache.casts.set(key,points);if(cache.casts.size>18)cache.casts.delete(cache.casts.keys().next().value);
    return points;
  }
  let seed=190711;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const bolts=Array.from({length:33},(_,i)=>{
    const a=i*tau/33+(random()-.5)*.15,from=.38+random()*.27,steps=5+Math.floor(random()*5),branch=2+Math.floor(random()*3);
    const points=Array.from({length:steps},(_,j)=>{
      const r=from+(1-from)*j/(steps-1);
      const theta=a+(j===steps-1?0:(random()-.5)*.14);
      return [r*Math.cos(theta),r*Math.sin(theta)];
    });
    return {points,branch,fork:[points[branch][0]*.86+Math.sin(a)*.12,points[branch][1]*.86-Math.cos(a)*.12],phase:random()};
  });
  const sparks=Array.from({length:160},()=>[random()*tau,random(),random()]);
  function path(ctx,points,r){
    ctx.beginPath();ctx.moveTo(points[0][0]*r,points[0][1]*r);
    for(const [x,y] of points.slice(1))ctx.lineTo(x*r,y*r);
  }
  function drawKing(ctx,rt,nav,clear,reduced){
    const origin=rt?.kingOrigin,r=origin?.radius;
    if(!(rt?.kingFX>0)||!nav||![origin?.x,origin?.y,r].every(Number.isFinite)||r<=0)return;
    const points=visibleFan(origin,r,nav,clear);
    const f=Math.min(47,Math.max(0,Math.floor((.8-rt.kingFX)*60)));
    const t=reduced?.52:f/47,advance=clamp((t-.04)/.43),front=r*(.025+.975*Math.pow(advance,.77)),fade=(1-clamp((t-.49)/.51))*(reduced?.5:1);
    if(fade===0)return;
    ctx.save();ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.closePath();ctx.clip();
    ctx.translate(origin.x,origin.y);
    ctx.globalAlpha*=fade;
    // Deep red pressure on the entire valid area; the impact front expands through it.
    ctx.fillStyle='rgba(125,29,55,.135)';ctx.beginPath();ctx.arc(0,0,r,0,tau);ctx.fill();
    ctx.lineJoin='bevel';ctx.lineCap='round';
    if(t>.12){
      for(const {points:part,branch,fork,phase} of bolts){
        if(phase<clamp((t-.64)*1.9)||part.length<2)continue;
        path(ctx,part,front);
        ctx.lineWidth=6.8;ctx.strokeStyle='rgba(124,22,55,.35)';ctx.stroke();
        ctx.lineWidth=3.7;ctx.strokeStyle='rgba(24,10,21,.91)';ctx.stroke();
        ctx.lineWidth=1.25;ctx.strokeStyle='#0c0910';ctx.stroke();
        path(ctx,part.map(([x,y])=>[x-.003,y-.003]),front);
        ctx.lineWidth=.8;ctx.strokeStyle='rgba(247,71,112,.86)';ctx.stroke();
        const p=part[branch];path(ctx,[p,[(p[0]+fork[0])/2+.02,(p[1]+fork[1])/2-.025],fork],front);
        ctx.lineWidth=1.7;ctx.strokeStyle='#160d18';ctx.stroke();
      }
    }
    for(let j=0;j<44;j++){
      const a=j*tau/44+t*.18,b=a+tau/44*(j%4===0?.42:.94),edge=Math.max(1,front-3);
      ctx.beginPath();ctx.arc(0,0,edge,a,b);
      ctx.lineWidth=5.5;ctx.strokeStyle='rgba(113,24,54,.38)';ctx.stroke();
      ctx.lineWidth=3.2;ctx.strokeStyle='#1c0b17';ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,edge+.7,a+.005,b);ctx.lineWidth=1.2;ctx.strokeStyle=j%5===0?'#f8a3aa':'#ef4e6b';ctx.stroke();
    }
    if(!reduced){
      ctx.fillStyle='#c64567';
      for(const [a,d,l] of sparks){if(l<t*.45)continue;const s=front*(.69+d*.31);ctx.fillRect(Math.round(Math.cos(a)*s),Math.round(Math.sin(a)*s),l>.8?2:1,1);}
    }
    ctx.restore();
  }
  function presentation(rt,age){
    if(!rt||!(age>0)||!(rt.kingFX>0||rt.eyeFX>0||rt.dodgeFX>0))return rt;
    return {...rt,kingFX:Math.max(0,(rt.kingFX||0)-age),eyeFX:Math.max(0,(rt.eyeFX||0)-age),dodgeFX:Math.max(0,(rt.dodgeFX||0)-age)};
  }
  root.MareHakiArt={draw,drawBack,drawKing,presentation,iconsReady:true,stats:()=>({
    ...Object.fromEntries(Object.entries(images).map(([id,img])=>[id,{loaded:!!img.naturalWidth&&Object.keys(clips).length>0,width:img.naturalWidth,height:img.naturalHeight}])),
    conqueror:{loaded:true,procedural:true}
  })};
})(globalThis);
