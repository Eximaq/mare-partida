/* Reusable world-space geometry and cast clock for daily sword bosses.
   Used only by explicit encounters/previews; does not register a rotation or award damage. */
((root,factory)=>{
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 else root.KaizokuDailySwordBossCombat=api;
})(globalThis,()=>{
 'use strict';
 const pt=p=>({x:p.x,y:p.y});
 const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 const finite=value=>Number.isFinite(value);
 const clamp=(n,l,h)=>Math.max(l,Math.min(h,n));
 const add=(p,u,t)=>({x:p.x+u.x*t,y:p.y+u.y*t});
 const dist=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y);
 const radius=(p)=>finite(p?.radius)?clamp(p.radius,0,64):0;
 const timer=(t,a,b)=>clamp((t-a)/Math.max(1,b-a),0,1);
 function lane(from,to,width){return {kind:'line',from,to,width};}
 function contains(shape,p){
  if(!point(p)||!shape)return false;
  if(shape.kind==='circle')return dist(shape.center,p)<=shape.radius+radius(p);
  if(shape.kind==='line'){
   const x=shape.to.x-shape.from.x,y=shape.to.y-shape.from.y, den=x*x+y*y;
   const t=den?clamp(((p.x-shape.from.x)*x+(p.y-shape.from.y)*y)/den,0,1):0;
   return dist(p,{x:shape.from.x+t*x,y:shape.from.y+t*y})<=shape.width/2+radius(p);
  }
  if(shape.kind==='cone'){
   const x=p.x-shape.origin.x,y=p.y-shape.origin.y,d=Math.hypot(x,y);
   if(d>shape.range+radius(p))return false;
   if(d<=radius(p))return true;
   const delta=Math.atan2(Math.sin(Math.atan2(y,x)-shape.angle),Math.cos(Math.atan2(y,x)-shape.angle));
   return Math.abs(delta)<=shape.angleDeg*Math.PI/360+Math.asin(clamp(radius(p)/d,0,1));
  }
  return false;
 }
 function create(rules,{castId,origin,target,angle,now,legalPoint=p=>p}={}){
  if(typeof castId!=='string'||!castId||!point(origin)||!point(target)||!finite(now)||!rules?.dimensionsPx)return null;
  const from=pt(origin),aim=pt(target),d=rules.dimensionsPx;
  const a=finite(angle)?angle:Math.atan2(aim.y-from.y,aim.x-from.x);
  const u={x:Math.cos(a),y:Math.sin(a)},v={x:-u.y,y:u.x};
  const legal=p=>{const value=legalPoint(pt(p));return point(value)?pt(value):null;};
  const circle=(p,r)=>p?{kind:'circle',center:p,radius:r}:null;
  let shapes=[],to=from;
  switch(rules.shape){
   case 'projectile-line':
    to=add(from,u,d.range);shapes=[lane(from,to,d.width)];break;
   case 'dash-lane':
    to=legal(add(from,u,d.range));if(!to||dist(from,to)<1)return null;
    shapes=[lane(from,to,d.width)];break;
   case 'landing-cone':
    to=add(from,u,d.range*.64);shapes=[{kind:'cone',origin:from,angle:a,range:d.range,angleDeg:d.angleDeg}];break;
   case 'fixed-cross': {
    to=legal(add(from,u,d.centerOffset));if(!to)return null;
    for(const sign of [-1,1]){
     const cut={x:Math.cos(a+sign*Math.PI/4),y:Math.sin(a+sign*Math.PI/4)};
     shapes.push(lane(add(to,cut,-d.armLength/2),add(to,cut,d.armLength/2),d.armWidth));
    }break;
   }
   case 'point-circle':
    to=legal(add(from,u,d.centerOffset));if(!to)return null;shapes=[circle(to,d.radius)];break;
   case 'triple-lane':
    to=add(from,u,d.range*.62);
    for(const shift of [-d.laneOffset,0,d.laneOffset]){
     const p=add(from,v,shift);shapes.push(lane(p,add(p,u,d.range),d.width));
    }break;
   case 'zone-set': {
    const center=add(from,u,Math.min(d.maxTargetDistance,dist(from,aim)));
    const p1=add(add(center,v,-d.radius*1.17),u,d.radius*.57);
    const p2=add(add(center,v,d.radius*1.17),u,d.radius*.57);
    shapes=[center,p1,p2].slice(0,d.count).map(p=>circle(legal(p),d.radius)).filter(Boolean);
    if(!shapes.length)return null;to=shapes[0].center;break;
   }
   default:return null;
  }
  const releaseAt=now+rules.releaseMs,impactAt=releaseAt+rules.travelMs,endAt=impactAt+rules.impactMs;
  return {castId,shape:rules.shape,from,to,angle:a,shapes,startedAt:now,releaseAt,impactAt,endAt,hitIds:Object.create(null),cancelled:false};
 }
 function sample(cast,at){
  if(!cast||cast.cancelled||!finite(at)||at<cast.startedAt||at>=cast.endAt)return null;
  const phase=at<cast.releaseAt?'warning':at<cast.impactAt?'travel':'impact';
  const starts={warning:cast.startedAt,travel:cast.releaseAt,impact:cast.impactAt};
  const ends={warning:cast.releaseAt,travel:cast.impactAt,impact:cast.endAt};
  const progress=timer(at,starts[phase],ends[phase]);
  const travelPoint=add(cast.from,{x:cast.to.x-cast.from.x,y:cast.to.y-cast.from.y},timer(at,cast.releaseAt,cast.impactAt));
  return {phase,progress,frame:Math.min(5,Math.floor(progress*6)),shapes:cast.shapes,travelPoint,impactPoint:cast.to,angle:cast.angle};
 }
 // One authoritative evaluation per target per cast. Area checks run only across the impact timestamp.
 // Callers supply their own authoritative player coordinates and line-of-sight/terrain.
 function contact(cast,last,now,targets,{clear=()=>true}={}){
  if(!cast||cast.cancelled||!finite(last)||!finite(now)||now<last||now<cast.releaseAt||last>=cast.endAt)return [];
  let shapes;
  if(cast.shape==='projectile-line'||cast.shape==='dash-lane'){
   if(last>=cast.impactAt||now<cast.releaseAt)return [];
   const u={x:cast.to.x-cast.from.x,y:cast.to.y-cast.from.y};
   shapes=[lane(add(cast.from,u,timer(last,cast.releaseAt,cast.impactAt)),add(cast.from,u,timer(now,cast.releaseAt,cast.impactAt)),cast.shapes[0].width)];
  }else{
   if(last>=cast.impactAt||now<cast.impactAt)return [];
   shapes=cast.shapes;
  }
  const hits=[];
  for(const t of targets??[]){
   if(!point(t)||(typeof t.id!=='string'&&typeof t.id!=='number')||cast.hitIds[t.id]||t.alive===false)continue;
   if(!shapes.some(s=>contains(s,t)&&clear(s.center||s.from||s.origin,t)))continue;
   cast.hitIds[t.id]=true;hits.push(t.id);
  }
  return hits;
 }
 const cancel=cast=>{if(cast)cast.cancelled=true;};
 return Object.freeze({create,sample,contains,contact,cancel});
});
