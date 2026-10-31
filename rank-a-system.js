'use strict';
/* Rank A deterministic combat timeline. Runtime state is never serialized. */
((root)=>{
 if(!root.MareRankAData&&typeof module!=='undefined')require('./rank-a-data.js');
 const {rules,effects}=root.MareRankAData,images=new Map(),loads=new Map(),EPS=1e-8;
 const has=id=>Object.values(rules).some(r=>r.id===id),create=()=>({room:null,jobs:[],trails:[]});
 const roomActive=(s,t)=>!!s?.room&&t+EPS>=s.room.started+.25&&t<s.room.until&&(!Number.isFinite(s.room.realUntil)||Date.now()<s.room.realUntil);
 const roomFrame=t=>t<.25?Math.min(24,Math.floor(Math.max(0,t)*100)):25+Math.floor((t-.25)/.083)%4;
 const stunned=(m,t)=>(m.rankAStunUntil||0)>t||(m.petrifiedUntil||0)>t;
 const petrified=(m,t)=>(m.petrifiedUntil||0)>t;
 const defenseFactor=(m,t)=>(m.rankADefenseUntil||0)>t?.8:1;
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),live=m=>m&&m.alive!==false&&m.hp>0&&!m.returning&&!m.isUntargetable&&!m.isInvulnerable;
 const direction=actor=>({right:[1,0],east:[1,0],left:[-1,0],west:[-1,0],back:[0,-1],north:[0,-1],front:[0,1],south:[0,1]})[actor.direction]||[actor.facing<0?-1:1,0];
 function skill(id,key,s,t){const r=Object.values(rules).find(r=>r.id===id);return r?.id===rules.ope.id&&String(key)==='1'&&roomActive(s,t)?r.shambles:r?.skills.find(v=>v.key===String(key))||null;}
 const cooldownKey=(id,k,s,t)=>id+':'+(id===rules.ope.id&&String(k)==='1'&&roomActive(s,t)?'shambles':k);
 function valid(s,c){
  if(!has(c.fruit)||!skill(c.fruit,c.key,s,c.now)||!Number.isFinite(c.now))return false;
  const ope=c.fruit===rules.ope.id;
  if(ope&&c.key==='1'&&!roomActive(s,c.now))return !s.room||c.now>=s.room.until||s.room.realUntil<=Date.now();
  if(!ope&&c.key==='1')return true;
  if(!live(c.target)||!c.clear(c.hero,c.target))return false;
  if(ope&&c.key==='1')return dist(s.room,c.hero)<=320&&dist(s.room,c.target)<=320&&c.walkable(c.target)&&c.walkable(c.hero);
  return dist(c.hero,c.target)<=(ope?320:256);
 }
 function control(m,t,d,p=false,def=0){m.rankAStunUntil=Math.max(m.rankAStunUntil||0,t+d);if(p)m.petrifiedUntil=Math.max(m.petrifiedUntil||0,t+d);if(def)m.rankADefenseUntil=Math.max(m.rankADefenseUntil||0,t+def);m.telegraph=null;m.moving=0;m.attackAnim=0;}
 function damage(m,power,mult,magic,pen=0,absolute=false){
  if(absolute)return Math.max(1,Math.floor(power*mult));
  const armor=(magic?(m.magicDefense??m.defense):m.defense)||0;
  let n=Math.max(1,Math.floor(power*mult-armor*(1-pen)*.3));
  n*=1-Math.min(.95,Math.max(0,m.mitigation||0));if(!magic)n*=1-Math.min(.95,Math.max(0,m.physicalDamageReduction||0));
  if(m.shield>0){const blocked=Math.min(m.shield,n);m.shield-=blocked;n-=blocked;}
  return Math.max(0,Math.floor(n));
 }
 function cast(s,c){
  c={...c,key:String(c.key)};if(!valid(s,c))return false;
  const ope=c.fruit===rules.ope.id,now=c.now,base={started:now,origin:{x:c.hero.x,y:c.hero.y},power:ope?c.stats.physical:c.stats.elemental,physical:c.stats.physical,elemental:c.stats.elemental,pen:c.stats.penetration||0,magicPen:c.stats.magicPen||0,targetId:c.target?.id,hit:false,fruit:c.fruit,token:c.token};
  if(ope&&c.key==='1'){
   if(roomActive(s,now)){const from={x:c.hero.x,y:c.hero.y},to={x:c.target.x,y:c.target.y};Object.assign(c.hero,to);Object.assign(c.target,from);s.trails.push({...from,to,started:now});control(c.target,now,2);c.hit(c.target,(c.damage||damage)(c.target,c.stats.physical,2,false,c.stats.penetration),{kind:'shambles'});c.onSwap?.();}
   else s.room={...base.origin,started:now,until:now+.25+30};return true;
  }
  const kind=ope?(c.key==='2'?'tact':'gamma'):c.key==='1'?'mellow':c.key==='2'?'kiss':'rain';
  const duration={tact:.6,gamma:1.8,mellow:.8,kiss:1.6,rain:1}[kind];
  s.jobs.push({...base,kind,duration,hitIds:new Set(),x:c.hero.x,y:c.hero.y,direction:direction(c.hero),point:c.target?{x:c.target.x,y:c.target.y}:null});if(s.jobs.length>32)s.jobs.shift();return true;
 }
 function step(s,c){
  if(s.room&&(c.now>=s.room.until||s.room.realUntil<=Date.now()))s.room=null;s.trails=s.trails.filter(v=>c.now-v.started<.25);
  s.jobs=s.jobs.filter(j=>{
   const age=c.now-j.started,target=c.enemies.find(m=>m.id===j.targetId),ope=j.fruit===rules.ope.id;
   if(j.kind==='kiss'){
    if(!live(target)||!c.clear(j,target))return false;
    const dx=target.x-j.origin.x,dy=target.y-j.origin.y,d=Math.hypot(dx,dy),travel=Math.min(256,Math.max(0,age)*900);
    if(d>256)return false;j.x=j.origin.x+(d?dx/d:0)*Math.min(travel,d);j.y=j.origin.y+(d?dy/d:0)*Math.min(travel,d);
    if(!j.hit&&travel+EPS>=d){j.hit=true;j.impact=c.now;j.point={x:target.x,y:target.y};control(target,c.now,1.5,false,4);c.hit(target,(c.damage||damage)(target,j.physical,3.5,false,j.pen),{kind:j.kind,token:j.token});}
    return !j.hit?age<1.6:c.now-j.impact<.8;
   }
   if(j.kind==='mellow'){
    const length=192*Math.min(1,Math.max(0,age)/j.duration),[dx,dy]=j.direction;
    for(const m of c.enemies){if(!live(m)||j.hitIds.has(m.id)||!c.clear(j.origin,m))continue;const x=m.x-j.origin.x,y=m.y-j.origin.y,forward=x*dx+y*dy,side=Math.abs(-x*dy+y*dx);if(forward>0&&forward<=length+EPS&&side<=forward/2){j.hitIds.add(m.id);control(m,c.now,3,true);c.hit(m,(c.damage||damage)(m,j.power,2.5,true,j.magicPen),{kind:j.kind});}}
    return age<j.duration;
   }
   if(!live(target))return false;
   if(!j.hit&&age+EPS>=j.duration){
    j.hit=true;if(!c.clear(j.origin,target))return false;
    const targets=j.kind==='gamma'?[target]:c.enemies.filter(m=>live(m)&&dist(target,m)<=(ope?128:256)&&c.clear(target,m));
    for(const m of targets){if(j.kind==='rain')control(m,c.now,5,true,5);const absolute=j.kind==='gamma';c.hit(m,damage(m,absolute?j.elemental:j.power,absolute?4.5:ope?3.5:2.5,!ope||absolute,absolute?1:ope?j.pen:j.magicPen,absolute),{kind:j.kind,ignoreAllMitigation:absolute,token:j.token});}
   }
   return age+EPS<j.duration;
  });
 }
 function clear(s,enemies=[]){s.room=null;s.jobs=[];s.trails=[];for(const m of enemies)for(const k of ['rankAStunUntil','petrifiedUntil','rankADefenseUntil'])delete m[k];}
 function preload(id){if(typeof Image!=='function')return Promise.resolve(false);const keys=id===rules.ope.id?['room','tact','gamma']:['mellow','kiss','rain'];return Promise.all(keys.map(key=>{if(!loads.has(key)){const im=new Image();images.set(key,im);loads.set(key,new Promise(resolve=>{im.onload=()=>resolve(im.naturalWidth>0);im.onerror=()=>resolve(false);im.src=effects[key].image;}));}return loads.get(key);})).then(values=>values.every(Boolean));}

 function paint(ctx,key,index,x,y,w,h=w,rotation=0){const im=images.get(key),f=effects[key].frames[index];if(!im?.complete||!im.naturalWidth||!f)return false;ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));ctx.rotate(rotation);ctx.drawImage(im,f.x,f.y,f.w,f.h,-w/2,-h/2,w,h);ctx.restore();return true;}
 function frame(key,ratio){return Math.min(effects[key].frames.length-1,Math.floor(Math.max(0,ratio)*effects[key].frames.length));}
 function layout(j,target,now){
  const progress=Math.min(1,Math.max(0,(now-j.started)/j.duration));
  if(j.kind==='gamma'){const p=effects.gamma.frames[0].pivot;return {x:target.x+(.5-p.x)*112,y:target.y-36+(.5-p.y)*112,width:112,height:112};}
  if(j.kind==='tact'){const size=256*progress;return {x:target.x,y:target.y-.375*size,width:size,height:size};}
  return {x:target.x,y:target.y-100,width:512,height:512};
 }
 function draw(ctx,s,now,enemies){
  if(s.room&&now<s.room.until){const age=now-s.room.started,grow=Math.min(1,age/.25);ctx.save();ctx.globalAlpha=.55;paint(ctx,'room',roomFrame(age),s.room.x,s.room.y-160*grow,640*grow,640*grow);ctx.restore();}
  for(const j of s.jobs){const age=now-j.started,t=enemies.find(m=>m.id===j.targetId)||j.point;if(j.kind==='mellow'){const k=Math.min(1,age/j.duration),[dx,dy]=j.direction;paint(ctx,'mellow',frame('mellow',k),j.origin.x+dx*96*k,j.origin.y-30+dy*96*k,192*k,192*k,Math.atan2(dy,dx));}
   else if(j.kind==='kiss'){const angle=t?Math.atan2(t.y-j.origin.y,t.x-j.origin.x):0;paint(ctx,'kiss',j.hit?14+Math.min(10,Math.floor((now-j.impact)/.08)):Math.floor(age/.05)%14,j.x,j.y-32,80,80,angle);}
   else if(t){const p=layout(j,t,now);paint(ctx,j.kind,frame(j.kind,age/j.duration),p.x,p.y,p.width,p.height);}
  }
  for(const f of s.trails){ctx.save();ctx.globalAlpha=1-(now-f.started)/.25;ctx.strokeStyle='#72f4ff';ctx.lineWidth=3;ctx.setLineDash([7,6]);ctx.beginPath();ctx.moveTo(f.x,f.y-30);ctx.lineTo(f.to.x,f.to.y-30);ctx.stroke();ctx.restore();}
 }
 const api={rules,effects,has,create,roomActive,roomFrame,skill,cooldownKey,stunned,petrified,defenseFactor,valid,cast,step,clear,preload,draw,damage,direction,layout};root.MareRankA=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
