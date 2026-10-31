'use strict';
/* Rank S timelines reuse the advanced-fruit casting, cooldown and damage gateway. */
((root)=>{
 if(!root.MareRankSData&&typeof module!=='undefined')require('./rank-s-data.js');
 const {rules,effects}=root.MareRankSData,EPS=1e-8,images=new Map(),loads=new Map();
 const entry=id=>Object.values(rules).find(r=>r.id===id),has=id=>!!entry(id),skill=(id,key)=>entry(id)?.skills.find(s=>s.key===String(key))||null;
 const create=()=>({time:null,jobs:[],burns:[],seq:0,regenAt:null});
 const live=m=>m&&m.alive!==false&&m.hp>0&&!m.returning&&!m.isUntargetable&&!m.isInvulnerable;
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),point=m=>({x:m.x,y:m.y});
 const silenced=(m,t)=>(m.rankSSilenceUntil||0)>t,dragged=(m,t)=>(m.rankSPullUntil||0)>t,slowFactor=(m,t)=>(m.rankSHoleSlowUntil||0)>t?.2:(m.rankSIceSlowUntil||0)>t?.6:1;
 const direction=m=>({right:[1,0],east:[1,0],left:[-1,0],west:[-1,0],north:[0,-1],back:[0,-1],south:[0,1],front:[0,1]})[m.direction]||[1,0];
 function aim(from,to,fallback){const d=to?dist(from,to):0;return d?[(to.x-from.x)/d,(to.y-from.y)/d]:fallback;}
 function valid(s,c){
  if(!has(c.fruit)||!skill(c.fruit,c.key)||!Number.isFinite(c.now)||silenced(c.hero,c.now))return false;
  if(c.fruit===rules.yami.id||c.fruit===rules.gura.id&&String(c.key)==='3'||c.fruit===rules.phoenix.id&&String(c.key)==='2'||c.fruit===rules.mera.id&&String(c.key)==='3')return true;
  if([rules.gura.id,rules.hie.id,rules.phoenix.id].includes(c.fruit))return live(c.target)&&dist(c.hero,c.target)<=({[rules.gura.id]:String(c.key)==='2'?192:256,[rules.hie.id]:String(c.key)==='3'?64:String(c.key)==='1'?320:384,[rules.phoenix.id]:String(c.key)==='1'?128:320})[c.fruit]&&c.clear(c.hero,c.target);
  const range=String(c.key)==='1'?320:256;
  return String(c.key)==='2'?c.enemies.some(m=>live(m)&&dist(c.hero,m)<=range&&c.clear(c.hero,m)):live(c.target)&&dist(c.hero,c.target)<=range&&c.clear(c.hero,c.target);
 }
 const vortexImpact=rules.yami.vortex.impactFrame/effects.vortex.frames.length*rules.yami.vortex.duration;
 function cast(s,c){
  if(!valid(s,c))return false;const key=String(c.key),now=c.now,yami=c.fruit===rules.yami.id;
  if(s.time===null)s.time=now;
  const kind=({[rules.yami.id]:{1:'vortex',2:'blackHole',3:'liberation'},[rules.mera.id]:{1:'fireFist',2:'fireRain',3:'pillar'},[rules.gura.id]:{1:'guraCrack',2:'guraSkull',3:'guraBuff'},[rules.hie.id]:{1:'hieSpears',2:'hieBird',3:'hieFreeze'},[rules.phoenix.id]:{1:'phoenixDash',2:'phoenixTotem',3:'phoenixEnergy'}})[c.fruit][key];
  const j={id:++s.seq,kind,key,started:now,origin:point(c.hero),x:c.hero.x,y:c.hero.y,targetId:c.target?.id,direction:aim(c.hero,c.target,direction(c.hero)),token:c.token,elemental:c.stats.elemental,magicPen:c.stats.magicPen||0,hits:new Set(),pulls:[],next:1,shots:[],ticks:new Map(),path:[],pathAt:0,last:now};
  j.duration={guraCrack:.8,guraSkull:.8,guraBuff:10,hieSpears:.9,hieBird:.9,hieFreeze:5,phoenixDash:.7,phoenixTotem:7,phoenixEnergy:1.2,vortex:.6,blackHole:6,liberation:effects.liberation.frames.reduce((n,f)=>n+f.duration,0)/1000,fireFist:320/900+.45,fireRain:1.1,pillar:7}[kind];
  j.until=now+j.duration;j.viewTop=c.view?.y;
  s.jobs.push(j);if(s.jobs.length>32)s.jobs.shift();return true;
 }
 function emit(c,j,m,mult,event,dot=false,power=j.elemental,impact=null){
  if(!live(m))return;
  const physical=j.kind==='guraCrack'||j.kind==='guraSkull';const amount=dot?Math.max(0,Math.floor(power)):(c.damage||root.MareRankA.damage)(m,power,mult,!physical,j.magicPen,j.kind==='guraSkull');
  c.hit(m,amount,{kind:j.kind,token:j.token,eventKey:event,effectAge:Math.max(0,c.now-j.started),skillKey:j.key,dot,exclusive:true,impactPoint:impact||(j.kind==='pillar'?point(j):j.origin)});
 }
 function burn(s,c,j,m,t){
  if(!live(m))return;let b=s.burns.find(b=>b.targetId===m.id&&b.until+EPS>=t);
  if(!b){b={targetId:m.id,started:t,next:t+1,tick:0,until:t+4};s.burns.push(b);}
  b.until=t+4;b.power=j.elemental*.1;b.token=j.token;b.kind=j.kind;b.key=j.key;
  if(s.burns.length>128)s.burns.shift();
 }
 function push(c,m,center,length){const d=dist(center,m),v=d?[(m.x-center.x)/d,(m.y-center.y)/d]:[1,0];c.move?.(m,v[0]*length,v[1]*length);}
 function processJob(s,c,j,t,dt){
  const age=t-j.started;
  if(j.kind==='guraCrack'||j.kind==='guraSkull'){
   if(age>=.35&&!j.hit){j.hit=true;for(const m of c.enemies){const dx=m.x-j.origin.x,dy=m.y-j.origin.y,along=dx*j.direction[0]+dy*j.direction[1],side=Math.abs(dx*j.direction[1]-dy*j.direction[0]);if(live(m)&&dist(j.origin,m)<=(j.kind==='guraCrack'?256:192)&&c.clear(j.origin,m)&&(j.kind!=='guraCrack'||along>=side)){emit(c,j,m,4.5,'impact',false,c.stats.physical);if(j.kind==='guraCrack')m.rankAStunUntil=t+2.5;else m.rankSDefenseUntil=t+3;}}}
  }else if(j.kind==='hieSpears'||j.kind==='hieBird'){
   const travel=Math.min(1,age/.55);const movingTarget=c.enemies.find(m=>m.id===j.targetId);j.x=j.origin.x+((movingTarget?.x??j.origin.x)-j.origin.x)*travel;j.y=j.origin.y+((movingTarget?.y??j.origin.y)-j.origin.y)*travel;
    if(age>=.55&&!j.hit){j.hit=true;const nearby=c.enemies.filter(m=>live(m)&&dist(j.origin,m)<=320&&c.clear(j.origin,m)).sort((a,b)=>dist(a,c.target||j.origin)-dist(b,c.target||j.origin));const targets=j.kind==='hieSpears'?Array.from({length:5},(_,i)=>nearby[i%nearby.length]).filter(Boolean):c.enemies.filter(m=>m.id===j.targetId&&live(m)&&dist(j.origin,m)<=384);for(const [index,m] of targets.entries()){emit(c,j,m,j.kind==='hieSpears'?4.2:4.5,'impact:'+index);m.rankSIceSlowUntil=t+4;m.rankSIceAttackUntil=t+4;}}
  }else if(j.kind==='hieFreeze'){
   if(!j.hit){j.hit=true;const m=c.enemies.find(m=>m.id===j.targetId);if(live(m)){m.rankAStunUntil=t+5;m.rankSFreezeUntil=t+5;m.rankSFreezePower=j.elemental*6;}}if(age+EPS>=5&&!j.released){j.released=true;const m=c.enemies.find(m=>m.id===j.targetId);if(live(m)&&m.rankSFreezeUntil){m.rankSIceSlowUntil=t+3;m.rankSIceAttackUntil=t+3;m.rankSFreezeUntil=0;}}
  }else if(j.kind==='phoenixDash'||j.kind==='phoenixEnergy'){
   if(j.kind==='phoenixDash'&&!j.moved){j.moved=true;c.move?.(c.hero,j.direction[0]*Math.min(128,dist(j.origin,c.target||j.origin)),j.direction[1]*Math.min(128,dist(j.origin,c.target||j.origin)));}
   if(j.kind==='phoenixEnergy'){const travel=Math.min(1,age/j.duration);j.x=j.origin.x+(c.target?.x-j.origin.x||0)*travel;j.y=j.origin.y+(c.target?.y-j.origin.y||0)*travel;while(j.next<=5&&age+EPS>=j.next*j.duration/5){const m=c.enemies.find(m=>m.id===j.targetId);if(live(m))emit(c,j,m,1.1,'energy:'+j.next);j.next++;if(j.next===6&&live(m))m.rankSHealDebuffUntil=t+5;}}else if(age>=j.duration*.7&&!j.hit){j.hit=true;const m=c.enemies.find(m=>m.id===j.targetId);if(live(m)){emit(c,j,m,4,'impact');m.rankSHealDebuffUntil=t+5;m.rankSPhoenixDefenseUntil=t+5;}}
  }else if(j.kind==='phoenixTotem'){
   while(j.next<=7&&age+EPS>=j.next){j.next++;if(dist(c.hero,j.origin)<=320)c.heal?.(.15);}
  }else if(j.kind==='vortex'){
   if(age+EPS>=vortexImpact&&!j.hit){j.hit=true;for(const m of c.enemies)if(live(m)&&dist(c.hero,m)<=rules.yami.vortex.radius&&c.clear(c.hero,m)){emit(c,j,m,4,'initial');m.rankSSilenceUntil=Math.max(m.rankSSilenceUntil||0,t+5);m.rankSPullUntil=t+.18;if(m.akumaFruitId)m.telegraph=null;j.pulls.push({id:m.id,started:t,until:t+.18});}}
   for(const p of j.pulls){const m=c.enemies.find(m=>m.id===p.id);if(!live(m)||t-dt>=p.until-EPS)continue;const from=Math.max(t-dt,p.started),remain=Math.max(EPS,p.until-from),fraction=Math.min(1,Math.max(0,Math.min(t,p.until)-from)/remain);c.move?.(m,(c.hero.x-m.x)*fraction,(c.hero.y-m.y)*fraction);}
  }else if(j.kind==='blackHole'){
   const radius=rules.yami.hole.radius*Math.min(1,Math.max(0,age)/.5);
   for(const m of c.enemies)if(live(m)&&dist(j.origin,m)<=radius&&c.clear(j.origin,m))m.rankSHoleSlowUntil=Math.max(m.rankSHoleSlowUntil||0,Math.min(j.until,t+.075));
   while(j.next<=6&&age+EPS>=j.next){const tick=j.next++;for(const m of c.enemies)if(live(m)&&dist(j.origin,m)<=rules.yami.hole.radius&&c.clear(j.origin,m))emit(c,j,m,2.5,'hole:'+tick);}
  }else if(j.kind==='liberation'){
   for(const [index,frame]of [1,26].entries())if(age+EPS>=frame*.083&&!j.hits.has(index)){j.hits.add(index);for(const m of c.enemies)if(live(m)&&dist(j.origin,m)<=rules.yami.liberation.radius&&c.clear(j.origin,m)){emit(c,j,m,index===0?4:3,'wave:'+index);push(c,m,j.origin,96);}}
  }else if(j.kind==='fireFist'){
   const length=Math.min(320,Math.max(0,age)*900),old=j.distance||0,[dx,dy]=j.direction;let stop=length;
   // Sweep in small segments: both hitbox and VFX stop at solid map collision.
   for(let d=old;d<length;d+=4){const p={x:j.origin.x+dx*Math.min(length,d+4),y:j.origin.y+dy*Math.min(length,d+4)},from={x:j.origin.x+dx*d,y:j.origin.y+dy*d};if(!c.clear(from,p)){stop=d;j.blocked=true;break;}}
   j.distance=stop;j.x=j.origin.x+dx*stop;j.y=j.origin.y+dy*stop;
   for(const m of c.enemies){const x=m.x-j.origin.x,y=m.y-j.origin.y,along=x*dx+y*dy,side=Math.abs(x*dy-y*dx);if(live(m)&&!j.hits.has(m.id)&&along>=Math.max(0,old-16)&&along<=stop+EPS&&along<=320&&side<=32&&c.clear(j.origin,m)){j.hits.add(m.id);emit(c,j,m,4.5,'fist');burn(s,c,j,m,t);}}
  }else if(j.kind==='fireRain'){
   for(let index=0;index<5;index++)if(age+EPS>=index*.12&&!j.hits.has(index)){
    j.hits.add(index);const targets=c.enemies.filter(m=>live(m)&&dist(j.origin,m)<=256&&c.clear(j.origin,m)).sort((a,b)=>dist(j.origin,a)-dist(j.origin,b));
    const m=targets[index%Math.max(1,targets.length)];if(m)j.shots.push({index,targetId:m.id,point:point(m),released:j.started+index*.12,top:j.viewTop??m.y-320,hit:false});
   }
   for(const shot of j.shots)if(!shot.hit&&t+EPS>=shot.released+.25){shot.hit=true;const m=c.enemies.find(m=>m.id===shot.targetId);if(live(m)&&dist(shot.point,m)<=32&&c.clear(j.origin,m)){emit(c,j,m,1.3,'rain:'+shot.index,false,j.elemental,shot.point);burn(s,c,j,m,t);}}
  }else if(j.kind==='pillar'&&t<j.until-EPS){
   const m=c.enemies.filter(live).sort((a,b)=>dist(j,a)-dist(j,b))[0];
   if(m){
    if(j.followId!==m.id||t>=j.pathAt){j.followId=m.id;j.path=c.path?c.path(j,m):[point(m)];j.pathAt=t+.3;}
    let remaining=360*dt;
    while(remaining>EPS&&j.path.length){const p=j.path[0],d=dist(j,p);if(d<1){j.path.shift();continue;}const step=Math.min(d,remaining),moved=c.move?.(j,(p.x-j.x)/d*step,(p.y-j.y)/d*step)||0;remaining-=step;if(moved+.1<step){j.path=[];break;}}
   }
   for(const target of c.enemies)if(live(target)&&dist(j,target)<=rules.mera.pillar.radius&&c.clear(j,target)&&(j.ticks.get(target.id)||-Infinity)<=t+EPS){j.ticks.set(target.id,t+1);emit(c,j,target,4.5,'pillar:'+Math.round((t-j.started)*1000));burn(s,c,j,target,t);push(c,target,j,96);}
  }
 }
 function step(s,c){
  if(s.time===null){s.time=c.now;return;}if(c.now<=s.time+EPS)return;
  const end=Math.min(c.now,s.time+12);
  for(let t=s.time;t<end-EPS;){const next=Math.min(end,t+.05),dt=next-t;t=next;
   for(const b of s.burns){const m=c.enemies.find(m=>m.id===b.targetId);while(live(m)&&b.next<=t+EPS&&b.next<=b.until+EPS){emit(c,b,m,1,'burn:'+(++b.tick),true,b.power);b.next++;}}
   s.burns=s.burns.filter(b=>b.until+EPS>=t&&live(c.enemies.find(m=>m.id===b.targetId)));
   for(const j of s.jobs)if(t<=j.until+EPS)processJob(s,c,j,t,dt);
   s.jobs=s.jobs.filter(j=>t<j.until-EPS);
  }s.time=c.now;
 }
 function clear(s,enemies=[]){s.jobs=[];s.burns=[];s.time=null;for(const m of enemies)for(const k of ['rankSSilenceUntil','rankSPullUntil','rankSHoleSlowUntil','rankSIceSlowUntil','rankSIceAttackUntil','rankSFreezeUntil','rankSFreezePower','rankSDefenseUntil','rankSPhoenixDefenseUntil','rankSHealDebuffUntil'])delete m[k];}
 function preload(id){const r=entry(id);if(!r||typeof Image!=='function')return Promise.resolve(false);return Promise.all(r.effectKeys.map(key=>{if(!loads.has(key)){const im=new Image();images.set(key,im);loads.set(key,new Promise(resolve=>{im.onload=()=>resolve(im.naturalWidth>0);im.onerror=()=>resolve(false);im.src=effects[key].image}));}return loads.get(key)})).then(a=>a.every(Boolean));}
 const auraFrame=(id,time)=>{const i=Math.floor((Math.max(0,time)+EPS)/.083);return id===rules.gura.id?16+i%5:i%(entry(id)?.auraFrames||effects[entry(id)?.auraKey]?.frames.length||35)};
 const blackHoleFrame=age=>age<.5?Math.min(18,Math.floor(Math.max(0,age)/.5*19)):19+Math.floor((age-.5+EPS)/.083)%22;
 function auraLayout(id,index,x,y,scale=1){const key=entry(id)?.auraKey,f=effects[key]?.frames[index];if(!f)return null;const k=(id===rules.gura.id?184:id===rules.phoenix.id?180:128)*scale/f.w;return {x:x-f.anchor.x*k,y:y-(id===rules.gura.id?56:32)*scale-f.anchor.y*k,width:f.w*k,height:f.h*k,scale:k};}
 function paint(ctx,key,index,x,y,width,height=width,angle=0,crop=null,anchor=null){const im=images.get(key),f=effects[key]?.frames[index];if(!im?.complete||!im.naturalWidth||!f)return false;ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));ctx.rotate(angle);ctx.drawImage(im,f.x+(crop?.x||0),f.y+(crop?.y||0),crop?.w||f.w,crop?.h||f.h,-width*(anchor?.x??.5),-height*(anchor?.y??.5),width,height);ctx.restore();return true;}
 function drawAura(ctx,id,x,y,time,scale=1,layer='back'){const key=entry(id)?.auraKey,index=auraFrame(id,time),p=auraLayout(id,index,x,y,scale);if(!p)return false;ctx.save();if(id===rules.gura.id)ctx.globalAlpha=.68;if(layer==='front'){ctx.beginPath();ctx.rect(x-p.width/2,y-23*scale,p.width,65*scale);ctx.clip();}const done=paint(ctx,key,index,p.x+p.width/2,p.y+p.height/2,p.width,p.height);ctx.restore();return done;}
 function draw(ctx,s,now,enemies,layer='all',hero=null){
  for(const j of s.jobs){const age=Math.max(0,now-j.started);if(layer==='front'&&['vortex','blackHole','liberation','pillar','guraBuff','hieSpears','hieBird','phoenixEnergy'].includes(j.kind)||layer==='back'&&['fireFist','fireRain','hieFreeze','phoenixTotem'].includes(j.kind))continue;
   if(['guraCrack','guraSkull','guraBuff','hieSpears','hieBird','hieFreeze','phoenixDash','phoenixTotem','phoenixEnergy'].includes(j.kind)){
    const key=({guraCrack:'guraCrack',guraSkull:'guraSkull',guraBuff:'guraAura',hieSpears:'hieSpears',hieBird:'hieBird',hieFreeze:'hieFreeze',phoenixTotem:'phoenixTotem',phoenixEnergy:'phoenixEnergy'})[j.kind];
    if(key&&(layer==='back'||['hieFreeze','phoenixTotem'].includes(j.kind))){const frames=effects[key].frames,index=j.kind==='guraBuff'?4+Math.floor(age/.083)%11:j.kind==='phoenixTotem'&&age>.5?17+Math.floor((age-.5)/.083)%24:Math.min(j.kind==='hieBird'?38:frames.length-1,Math.floor(age/j.duration*(j.kind==='hieBird'?39:frames.length)));paint(ctx,key,index,j.kind==='hieFreeze'?(enemies.find(m=>m.id===j.targetId)?.x??j.origin.x):j.kind==='guraBuff'?hero?.x??j.x:['hieSpears','hieBird','phoenixEnergy'].includes(j.kind)?j.x:j.origin.x,(j.kind==='hieFreeze'?(enemies.find(m=>m.id===j.targetId)?.y??j.origin.y):j.kind==='guraBuff'?hero?.y??j.y:['hieSpears','hieBird','phoenixEnergy'].includes(j.kind)?j.y:j.origin.y)-32,Math.min(280,frames[0].w));}
    if(layer==='front'&&j.kind==='phoenixTotem'){for(let n=0;n<5;n++){const a=n*Math.PI*2/5;paint(ctx,'phoenixTotem',Math.floor(age/.083)%6,j.origin.x+Math.cos(a)*96,j.origin.y+Math.sin(a)*96-24,42);}}
    if(layer==='front'&&(j.kind==='guraCrack'||j.kind==='guraSkull')){const dust=j.kind==='guraCrack'?'guraDust2':'guraDust1',frames=effects[dust].frames;paint(ctx,dust,Math.min(frames.length-1,Math.floor(Math.max(0,age-.2)/.6*frames.length)),j.origin.x,j.origin.y-16,j.kind==='guraCrack'?256:192);}
   }else if(j.kind==='vortex')paint(ctx,'vortex',Math.min(40,Math.floor(age/.6*41)),hero?.x??j.origin.x,(hero?.y??j.origin.y)-32,rules.yami.vortex.visualWidth*Math.min(1,age/.18));
   else if(j.kind==='blackHole'){ctx.save();ctx.globalAlpha=.75;paint(ctx,'blackHole',blackHoleFrame(age),j.origin.x,j.origin.y,rules.yami.hole.visualWidth*Math.min(1,age/.5));ctx.restore();}
   else if(j.kind==='liberation')paint(ctx,'liberation',Math.min(40,Math.floor(age/.083)),j.origin.x,j.origin.y,rules.yami.liberation.visualWidth,rules.yami.liberation.visualHeight,0,null,{x:.5,y:100/116});
   else if(j.kind==='fireFist'){const moving=age<320/900,index=moving?Math.min(26,Math.floor(age/.04)):Math.min(40,27+Math.floor((age-320/900)/.45*14));paint(ctx,'fireFist',index,j.x,j.y-32,150,110,Math.atan2(j.direction[1],j.direction[0]),null,{x:.88,y:.48});}
   else if(j.kind==='fireRain'){for(const shot of j.shots)if(!shot.hit){const k=Math.max(0,Math.min(1,(now-shot.released)/.25)),y=shot.top+(shot.point.y-shot.top)*k;paint(ctx,'fireRain',Math.min(13,Math.floor(k*14)),shot.point.x,y-32,52,58,Math.PI/4,{x:65,y:64,w:56,h:61});}}
   else if(j.kind==='pillar')paint(ctx,'pillar',Math.floor(age/.083)%41,j.x,j.y-rules.mera.pillar.visualOffsetY,rules.mera.pillar.visualWidth,rules.mera.pillar.visualHeight);
  }
  if(layer!=='back')for(const b of s.burns){const m=enemies.find(m=>m.id===b.targetId);if(live(m)&&now<b.until)paint(ctx,'burn',Math.floor(Math.max(0,now-b.started)/.083)%41,m.x,m.y-40,32,32);}
 }
 const api={rules,effects,has,skill,create,valid,cast,step,clear,preload,draw,drawAura,auraFrame,auraLayout,blackHoleFrame,silenced,dragged,slowFactor,vortexImpact};root.MareRankS=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
