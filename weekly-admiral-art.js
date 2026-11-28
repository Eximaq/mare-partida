(function(root,factory){const api=factory(root.MareWeeklyAdmirals||(typeof module==='object'?require('./weekly-admirals.js'):null));if(typeof module==='object')module.exports=api;else root.MareWeeklyAdmiralArt=api;})(globalThis,D=>{
 'use strict';
 const root='assets/weekly-boss/admirals/',images=new Map(),F=384,P=[192,344];
 const clips={idle:[260,210,250,210],walk:Array(8).fill(92),attack:[100,150,109,155,130],special_2:[100,180,220,175,185,180],special_area:[100,275,375,175,215,220]};
 const colors={aokiji:[120,226,255],akainu:[255,110,54],kizaru:[255,220,108]};
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=v=>(v=clamp(v),v*v*(3-2*v));
 const is=m=>m?.source==='weekly-boss'&&m.weeklyAdmiralVersion===1&&D.valid(m.weeklyBossId);
 const now=()=>globalThis.KaizokuAkainuArt?.now()??Date.now();
 function img(path){if(!images.has(path)){const im=new Image();im.src=root+path;images.set(path,im);}return images.get(path);}
 function frame(ms,d){let i=0;for(;i<d.length-1&&ms>=d[i];i++)ms-=d[i];return i;}
 function pose(m,t=now()){
  const facing=Object.hasOwn(D.dirs,m.action?.facing)?m.action.facing:Object.hasOwn(D.dirs,m.emberFacing)?m.emberFacing:'south';
  const mirror=facing==='west',direction=mirror?'east':facing,a=m.action;
  let clip='idle',i=0,alpha=m.alive===false?clamp(1-(t-(m.defeatedAt??t))/1200):1;
  if(a?.geometry?.kind==='chain'&&a.hops?.length){const end=a.impactAt+(a.hops.length+1)*127;
   if(t<=a.impactAt)alpha*=1-ease((t-a.impactAt+115)/115);else alpha*=ease((t-end)/146);}
  if(a&&m.alive!==false){clip=a.kind==='aoe'?'special_area':a.kind==='special'?'special_2':'attack';
   const release=clip==='attack'?250:clip==='special_2'?500:750;
   const elapsed=t<a.impactAt?clamp((t-a.startedAt)/Math.max(1,a.impactAt-a.startedAt))*release:release+t-a.impactAt;
   i=frame(elapsed,clips[clip]);
  }else if(m.moving){clip='walk';i=Math.floor((m.emberElapsed||0)*1000/92)%8;}
  else if(m.alive!==false)i=frame(((m.emberElapsed||0)*1000)%930,clips.idle);
  return {mirror,direction,clip,i,alpha};
 }
 function draw(ctx,m,t=now()){
  if(!is(m))return false;
  const p=pose(m,t),i=img(m.weeklyBossId+'/'+p.direction+'-'+p.clip+'.webp');if(!i.complete||!i.naturalWidth||p.alpha<=0)return true;
  ctx.save();ctx.translate(Math.round(m.x),Math.round(m.y));if(p.mirror)ctx.scale(-1,1);
  ctx.imageSmoothingEnabled=false;ctx.globalAlpha*=p.alpha;
  ctx.drawImage(i,p.i*F,0,F,F,-P[0]/2,-P[1]/2,F/2,F/2);ctx.restore();return true;
 }
 const col=(c,a)=>'rgba('+c.join(',')+','+clamp(a)+')';
 function ring(ctx,x,y,r,c,a,scale=1,w=2){if(r<=0||a<=0)return;ctx.strokeStyle=col(c,a);ctx.lineWidth=w;ctx.beginPath();ctx.ellipse(x,y,r,r*scale,0,0,Math.PI*2);ctx.stroke();}
 function line(ctx,a,b,w,c,alpha){ctx.lineCap='round';ctx.lineWidth=w;ctx.strokeStyle=col(c,alpha);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
 function star(ctx,x,y,r,c,a){ctx.fillStyle=col(c,a);ctx.beginPath();for(let j=0;j<8;j++){const t=j*Math.PI/4,rr=j%2?r*.23:r,px=x+Math.cos(t)*rr,py=y+Math.sin(t)*rr;j?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();}
 const xy=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
 function art(ctx,key,p,w,h,alpha=1,angle=0,bias=.5){
  const i=img('vfx/'+key+'.webp');if(!i.complete||!i.naturalWidth||alpha<=0)return;
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);ctx.globalAlpha*=clamp(alpha);ctx.imageSmoothingEnabled=true;
  ctx.drawImage(i,-w/2,-h*bias,w,h);ctx.restore();
 }
 function burst(ctx,p,c,u,size=44){
  if(u<0||u>=1)return;
  const alpha=(1-u)**1.4;ring(ctx,p.x,p.y,(.18+u*.82)*size,c,alpha,.48,3);star(ctx,p.x,p.y-4,Math.max(2,size*.44*(1-u)),[255,248,211],alpha);
  for(let j=0;j<9;j++){const t=j*.698+size,v=size*u*(.65+j%3*.19);line(ctx,{x:p.x+Math.cos(t)*v,y:p.y+Math.sin(t)*v*.54-u*28},{x:p.x+Math.cos(t)*(v+7),y:p.y+Math.sin(t)*(v+7)*.54-u*31},1.8,c,alpha);}
 }
 function warning(ctx,g,c,u){
  if(g.kind==='chain')return;
  if(g.kind==='circle'){
   const {center:p,radius:r}=g;ctx.fillStyle=col(c,.1+.14*u);ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ring(ctx,p.x,p.y,r,c,.78,1,2.5);
   ctx.strokeStyle=col(c,.95);ctx.lineWidth=4;ctx.beginPath();ctx.arc(p.x,p.y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*u);ctx.stroke();
  }else{line(ctx,g.from,g.to,g.radius*2,c,.13+.11*u);ring(ctx,g.to.x,g.to.y,g.radius,c,.77,1,2.4);const p=xy(g.from,g.to,u);line(ctx,g.from,p,2,c,.92);}
 }
 const angle=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x)-Math.PI/2;
 // The leading projectile lands at the authoritative impact. Later trails
 // and impacts are decorative; they do not apply additional damage.
 function volley(ctx,id,p,r,c,e){
  const count=id==='akainu'?14:26;
  for(let j=0;j<count;j++){const theta=j*2.39996,rad=r*(.25+.71*Math.sqrt((j+.5)/count));
   const end={x:p.x+Math.cos(theta)*rad,y:p.y+Math.sin(theta)*rad},travel=id==='akainu'?510:215,u=(e+travel-j%5*47-Math.floor(j/5)*32)/travel;
   if(u<0)continue;
   if(u<1){const q={x:end.x+(j%5-2)*17*(1-u),y:end.y-(id==='akainu'?265:148)*(1-u*u)};
    if(id==='akainu')art(ctx,'meteor',q,63+j%4*8,132+j%4*14,.96,(j%5-2)*.09,.77);
    else{line(ctx,{x:q.x+15,y:q.y-19},q,4,c,.9);star(ctx,q.x,q.y,5,c,.93);}
   }else{
    const f=(u-1)*travel/625;burst(ctx,end,c,f,id==='akainu'?52:26);
    if(f<1&&id==='akainu')art(ctx,'magma_eruption',end,87,85,(1-f)*.9,(j%5-2)*.12,.82);
    if(f<1&&id==='kizaru'&&j%2===0)art(ctx,'light_rain',end,41,65,(1-f)*.75,.1,.8);
   }
  }
 }
 function vfx(ctx,m,layer='back',t=now(),reduced=false){
  if(!is(m)||!m.action?.geometry)return;
  const a=m.action,g=a.geometry,p=a.origin,c=colors[m.weeklyBossId],e=t-a.impactAt,id=m.weeklyBossId;
  if(e<0&&layer==='back'){
   warning(ctx,g,c,ease((t-a.startedAt)/Math.max(1,a.impactAt-a.startedAt)));
   if(g.kind==='chain')for(const h of a.hops)ring(ctx,h.to.x,h.to.y,16,c,.8,.62,2);
  }
  if(e<0){if(layer==='front'&&!reduced){
   const u=ease((t-a.startedAt)/Math.max(1,a.impactAt-a.startedAt)),q={x:p.x,y:p.y-76};
   if(id==='kizaru'){star(ctx,q.x,q.y,6+18*u,c,u);ring(ctx,q.x,q.y,12+19*u,c,u,.88,2);}
   if(g.kind==='circle'&&id!=='aokiji'){
    img('vfx/'+(id==='akainu'?'magma_eruption':'light_rain')+'.webp');
    const travel=id==='akainu'?510:215;
    if(e>=-travel)volley(ctx,id,p,g.radius,c,e);
    else if(id==='akainu')art(ctx,'fist',q,68+33*u,62+30*u,u*.83,0,.55);
   }else if(id==='akainu')art(ctx,'fist',q,68+33*u,62+30*u,u*.83,0,.55);
   if(id==='aokiji'&&g.kind==='capsule')for(const d of [-1,1])art(ctx,'ice_lance',{x:q.x+d*27,y:q.y},26,76,u*.92,d*.13,.72);
  }return;}
  if(reduced){if(layer==='back'&&g.kind==='circle'&&e<=490)ring(ctx,g.center.x,g.center.y,g.radius,c,.8*(1-e/490),1,3);return;}
  if(g.kind==='capsule'){
   if(layer!=='front')return;const u=ease(e/(id==='aokiji'?490:515)),q=xy(g.from,g.to,u),rot=angle(g.from,g.to),dx=Math.cos(rot),dy=Math.sin(rot);
   if(e<530){if(id==='aokiji')for(const d of [-1,1]){const end={x:q.x+dx*d*13,y:q.y+dy*d*13},trail=xy(g.from,end,ease((e-95)/490));line(ctx,trail,end,4,c,.76);art(ctx,'ice_lance',end,45,114,.98,rot,.76);}
    else{art(ctx,'steam',xy(g.from,q,.76),101,81,.29,rot);art(ctx,'fist',q,122,112,.98,rot,.7);}}
   if(e>=420){burst(ctx,g.to,c,(e-420)/650,76);if(id==='akainu'&&e<1070)art(ctx,'magma_eruption',g.to,143,115,1-(e-420)/650,0,.8);}return;
  }
  if(g.kind==='chain'){
   if(layer!=='front'||!a.hops?.length)return;
   const hs=[...a.hops,{from:a.hops.at(-1).to,to:p}],j=Math.floor(e/127);
   if(j>=hs.length){burst(ctx,p,c,(e-hs.length*127)/230,42);return;}
   const h=hs[j],u=ease((e%127)/127),from={x:h.from.x,y:h.from.y-39},to={x:h.to.x,y:h.to.y-39},q=xy(from,to,u);
   line(ctx,from,q,13,c,.53);line(ctx,from,q,5,c,.94);line(ctx,from,q,2,[255,255,236],.98);star(ctx,q.x,q.y,13,c,.9);
   if(j>0)burst(ctx,h.from,c,(e%127)/230,42);return;
  }
  const r=g.radius;
  if(id==='aokiji'){
   if(layer==='back'){
    const v=ease(e/820),size=r*(.05+.95*v);ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,size,0,Math.PI*2);ctx.clip();
    ctx.fillStyle=col(c,.29*(1-ease((e-950)/500)));ctx.fillRect(p.x-r,p.y-r,r*2,r*2);art(ctx,'frost',p,r*2.18,r*2.18,.74*(1-ease((e-980)/470)));ctx.restore();ring(ctx,p.x,p.y,size,c,.7*(1-ease((e-500)/800)),1,3);
   }else if(e<1280)for(let j=0;j<13;j++){const ph=j*2*Math.PI/13+e*.00015,s=r*ease(e/820);art(ctx,'steam',{x:p.x+Math.cos(ph)*s,y:p.y+Math.sin(ph)*s},74,45,.32*(1-e/1280),ph);}
   return;
  }
  if(layer==='back'&&e<1100)ring(ctx,p.x,p.y,r*ease(e/730),c,.55*(1-e/1100),1,3);
  if(layer!=='front')return;
  volley(ctx,id,p,r,c,e);
 }
 function frozen(ctx,p,h,until,t=now()){if(!(until>t))return;const u=clamp((until-t)/210),w=Math.min(33,h*.29);ctx.save();ctx.beginPath();ctx.moveTo(p.x-w,p.y-6);ctx.lineTo(p.x-w*.9,p.y-h*.7);ctx.lineTo(p.x-w*.42,p.y-h);ctx.lineTo(p.x+w*.6,p.y-h*.91);ctx.lineTo(p.x+w,p.y-h*.36);ctx.lineTo(p.x+w*.65,p.y-4);ctx.closePath();ctx.fillStyle=col([116,212,252],.25*u);ctx.strokeStyle=col([207,247,255],.81*u);ctx.lineWidth=2;ctx.fill();ctx.stroke();ctx.restore();}
 return Object.freeze({is,pose,draw,vfx,frozen,height:m=>is(m)?D.roster[m.weeklyBossId].height:114});
});
