'use strict';
/* Additional Rank A timelines; composed through the shared MareRankA runtime. */
((root)=>{
 const ids=['akuma_bari_bari','akuma_doku_doku','akuma_ito_ito'],EPS=1e-8;
 const has=id=>ids.includes(id),live=m=>m&&m.alive!==false&&m.hp>0&&!m.returning&&!m.isUntargetable&&!m.isInvulnerable;
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),A=()=>root.MareRankA;
 const state=s=>s.expansion ||= {jobs:[],fields:[],dots:[],dome:null,seq:0};
 const attackBlocked=(m,t)=>(m.rankASilenceUntil||0)>t||(m.rankABlindUntil||0)>t;
 const dragged=(m,t)=>(m.rankADragUntil||0)>t;
 const slowFactor=(m,t)=>(m.rankAPoisonSlowUntil||0)>t?.7:1;
 const domeActive=(s,t)=>!!s?.expansion?.dome&&t<s.expansion.dome.until&&(!s.expansion.dome.realUntil||Date.now()<s.expansion.dome.realUntil);
 function attackTags(hero,source,{physical=true,damageType='',reach=60}={}){const projectile=!!(source?.projectile||source?.isProjectile||source?.ranged||['projectile','ranged'].includes(source?.attackType)||source?.type==='spirit'||/projectile|bullet|beam/.test(damageType||source?.damageType||''));const melee=!!source&&physical&&!projectile&&!/explosion|poison|burn/.test(damageType)&&dist(hero,source)<=Math.max(60,source.reach??reach)+10;return {projectile,melee};}
 function protect(s,t,amount,{projectile=false,melee=false,reflected=false}={}){const active=domeActive(s,t),damage=active?(projectile?0:amount*.2):amount;return {damage,reflected:active&&melee&&!reflected?damage*.2:0,ccImmune:active};}
 const parasiteFrame=age=>age<5?24:Math.min(28,25+Math.floor((age-5)/.083));
 function valid(s,c){
  if(!has(c.fruit)||!['1','2','3'].includes(String(c.key)))return false;
  if(c.fruit==='akuma_bari_bari'||c.fruit==='akuma_doku_doku'&&c.key==='3'||c.fruit==='akuma_ito_ito'&&c.key==='3')return true;
  if(c.fruit==='akuma_doku_doku'&&c.key==='2')return !c.target||live(c.target);
  return live(c.target)&&dist(c.hero,c.target)<=(c.fruit==='akuma_ito_ito'?320:256)&&c.clear(c.hero,c.target);
 }
 function emit(c,j,m,power,mult,magic=false,absolute=false,event='initial',dot=false){
  if(!live(m))return;const amount=dot?power:(c.damage||A().damage)(m,power,mult,magic,magic?j.magicPen:j.pen,absolute);
  c.hit(m,amount,{kind:j.kind,token:j.token,eventKey:event,impactPoint:j.point,dot,ignoreAllMitigation:absolute,exclusive:true});
 }
 function poison(e,j,m,now,kind,power,count,interval=1){
  if(kind==='bleed'){const old=e.dots.find(d=>d.cast===j.id&&d.targetId===m.id&&d.kind===kind);if(old){old.until=now+4;return;}}
  e.dots.push({cast:j.id,targetId:m.id,kind,power,next:now+interval,until:now+count*interval,left:count,tick:0,token:j.token});
  if(e.dots.length>512)e.dots.splice(0,e.dots.length-512);
 }
 function tiles(point,radius){const out=[],cx=Math.floor(point.x/64)*64+32,cy=Math.floor(point.y/64)*64+32;for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++){const p={x:cx+x*64,y:cy+y*64};if(dist(point,p)<=radius)out.push(p);}return out;}
 function cleanseControl(actor){for(const key of ['talentControl','talentSlow','zoanSlow','stun','freeze','frozen','root','hanaStunFrom','hanaStunUntil','rankAStunUntil'])delete actor[key];for(const key of ['slow','stunUntil','frozenUntil','rootUntil','doruRootUntil','betaRootUntil','ryuStunUntil','bisonStunUntil'])actor[key]=0;actor.isRooted=actor.isStunned=actor.isFrozen=actor.isImmobilized=false;}
 function clipPoint(c,from,to){const d=dist(from,to),n=Math.max(1,Math.ceil(d/4));let last={...from};for(let i=1;i<=n;i++){const p={x:from.x+(to.x-from.x)*i/n,y:from.y+(to.y-from.y)*i/n};if(!c.clear(last,p))break;last=p;}return last;}
 function cast(s,c){
  if(!valid(s,c))return false;const e=state(s),now=c.now,bari=c.fruit===ids[0],doku=c.fruit===ids[1];
  if(bari&&c.key==='2'){e.dome={started:now,until:now+10,realUntil:c.epoch?c.epoch+10000:null};cleanseControl(c.hero);return true;}
  const kind=bari?(c.key==='1'?'bariPush':'bariCharge'):doku?({1:'hydra',2:'gasBomb',3:'redPoison'})[c.key]:({1:'tamaito',2:'parasite',3:'overheat'})[c.key],direction=A().direction(c.hero);
  const j={id:++e.seq,kind,started:now,origin:{x:c.hero.x,y:c.hero.y},point:c.target?{x:c.target.x,y:c.target.y}:{x:c.hero.x+direction[0]*192,y:c.hero.y+direction[1]*192},direction,targetId:c.target?.id,token:c.token,physical:c.stats.physical,elemental:c.stats.elemental,attack:c.stats.attack??c.stats.physical,pen:c.stats.penetration||0,magicPen:c.stats.magicPen||0,hits:new Set(),walls:new Set(),distance:0,next:0,shots:[]};
  if(kind==='gasBomb'){const d=dist(j.origin,j.point);if(d>192){j.point={x:j.origin.x+(j.point.x-j.origin.x)*192/d,y:j.origin.y+(j.point.y-j.origin.y)*192/d};}j.point=clipPoint(c,j.origin,j.point);j.duration=dist(j.origin,j.point)/640;}
  if(kind==='bariPush'||kind==='bariCharge')j.limit=dist(j.origin,clipPoint(c,j.origin,{x:j.origin.x+direction[0]*256,y:j.origin.y+direction[1]*256}));
  if(kind==='redPoison')j.point={x:Math.floor(c.hero.x/64)*64+32,y:Math.floor(c.hero.y/64)*64+32};
  if(kind==='parasite'){c.target.rankAStunUntil=Math.max(c.target.rankAStunUntil||0,now+5);c.target.telegraph=null;c.target.moving=0;}
  e.jobs.push(j);if(e.jobs.length>32)e.jobs.shift();return true;
 }
 function step(s,c){
  const e=s.expansion;if(!e)return;
  if(e.dome&&!domeActive(s,c.now))e.dome=null;if(domeActive(s,c.now))cleanseControl(c.hero);
  e.jobs=e.jobs.filter(j=>{
   const age=c.now-j.started,m=c.enemies.find(m=>m.id===j.targetId);
   if(j.kind==='bariPush'||j.kind==='bariCharge'){
    const length=Math.min(j.limit,Math.max(0,age)*640),[dx,dy]=j.direction;
    for(const target of c.enemies){if(!live(target))continue;const x=target.x-j.origin.x,y=target.y-j.origin.y,along=x*dx+y*dy,side=Math.abs(x*dy-y*dx);
     if(!j.hits.has(target.id)&&along>=-EPS&&along<=length+EPS&&side<=48&&c.clear(j.origin,target)){j.hits.add(target.id);emit(c,j,target,j.physical,j.kind==='bariPush'?3.5:3);}
     if(!j.hits.has(target.id)||!live(target))continue;
     const alongNow=(target.x-j.origin.x)*dx+(target.y-j.origin.y)*dy,step=Math.max(0,length-alongNow);
     if(step>EPS){const moved=c.move?c.move(target,dx*step,dy*step):0;if(moved+1<step&&!j.walls.has(target.id)&&j.kind==='bariPush'){j.walls.add(target.id);emit(c,j,target,j.physical,1,false,false,'wall');target.rankAStunUntil=Math.max(target.rankAStunUntil||0,c.now+1.5);target.telegraph=null;}}
     target.rankADragUntil=j.started+.4;if(j.kind==='bariCharge'){target.rankASilenceUntil=j.started+.4;target.telegraph=null;}
    }j.distance=length;return age<.4;
   }
   if(j.kind==='hydra'){
    if(!live(m))return false;if(!j.hit&&age+EPS>=.8){j.hit=true;emit(c,j,m,j.elemental,2.5,true);poison(e,j,m,c.now,'severe',j.attack*.2,5);m.rankAPoisonSlowUntil=Math.max(m.rankAPoisonSlowUntil||0,c.now+5);}return age<1.427;
   }
   if(j.kind==='gasBomb'){
    if(!j.hit&&age+EPS>=j.duration){j.hit=true;j.impact=c.now;for(const target of c.enemies)if(live(target)&&dist(j.point,target)<=128&&c.clear(j.point,target))emit(c,j,target,j.elemental,1.5,true);
     e.fields.push({...j,kind:'gas',started:c.now,until:c.now+4,next:c.now+1,tick:0,tiles:tiles(j.point,128).filter(p=>c.walkable(p)&&c.clear(j.point,p))});if(e.fields.length>16)e.fields.shift();}return !j.hit||c.now-j.impact<.8;
   }
   if(j.kind==='redPoison'){
    if(!j.hit&&age+EPS>=.6){j.hit=true;for(const target of c.enemies)if(live(target)&&dist(j.point,target)<=192&&c.clear(j.point,target)){emit(c,j,target,j.elemental,5,true,true);poison(e,j,target,c.now,'corrosion',(target.maxHP||target.hp)*.05,3);}}return age<3.6;
   }
   if(j.kind==='parasite'){
    if(!live(m))return false;for(const due of [1.5,3.5])if(age+EPS>=due&&!j.hits.has(due)){j.hits.add(due);emit(c,j,m,m.attack||0,1,false,false,'self:'+due);}return age<5.332;
   }
   if(j.kind==='tamaito'){
    if(!live(m))return false;for(const due of [0,.12,.24])if(age+EPS>=due&&!j.hits.has(due)){j.hits.add(due);j.shots.push({released:j.started+due,hit:false,index:j.shots.length});}
    for(const shot of j.shots)if(!shot.hit){const travel=(c.now-shot.released)*1000;if(dist(j.origin,m)>320||!c.clear(j.origin,m)){shot.hit=true;continue;}if(travel+EPS>=dist(j.origin,m)){shot.hit=true;emit(c,j,m,j.physical,1.8,false,false,'shot:'+shot.index);poison(e,j,m,c.now,'bleed',j.physical*.15,4);}}
    return age<.7||j.shots.some(shot=>!shot.hit);
   }
   if(j.kind==='overheat'){
    const [dx,dy]=j.direction;while(j.next<6&&age+EPS>=.15+j.next*.3){const index=j.next++,sign=index%2? -1:1;for(const target of c.enemies){const cross=(target.x-c.hero.x)*-dy+(target.y-c.hero.y)*dx;if(live(target)&&dist(c.hero,target)<=192&&(cross>=0?1:-1)===sign&&c.clear(c.hero,target))emit(c,j,target,j.physical,2.5,false,false,'whip:'+index);}}return age<1.8;
   }return false;
  });
  e.fields=e.fields.filter(f=>{
   for(const target of c.enemies)if(live(target)&&dist(f.point,target)<=128&&c.clear(f.point,target)){target.rankABlindUntil=Math.max(target.rankABlindUntil||0,Math.min(f.until,c.now+.06));target.telegraph=null;}
   while(f.next<=Math.min(c.now,f.until)+EPS){f.tick++;for(const target of c.enemies)if(live(target)&&dist(f.point,target)<=128&&c.clear(f.point,target))emit(c,f,target,f.elemental*.2,1,true,true,'gas:'+f.tick,true);f.next++;}return c.now<f.until;
  });
  e.dots=e.dots.filter(d=>{const target=c.enemies.find(m=>m.id===d.targetId);if(!live(target))return false;while(d.left>0&&d.next<=c.now+EPS&&d.next<=d.until+EPS){emit(c,d,target,d.power,1,true,true,'dot:'+d.kind+':'+(++d.tick),true);d.left--;d.next++;}return d.left>0;});
 }
 function clear(s,enemies){if(!s.expansion)return;s.expansion={jobs:[],dots:[],fields:[],dome:null,seq:0};for(const m of enemies)for(const key of ['rankASilenceUntil','rankADragUntil','rankABlindUntil','rankAPoisonSlowUntil'])delete m[key];}
 function draw(ctx,s,now,enemies,layer,paint,effects,hero){
  const e=s.expansion;if(!e)return;
  const f=(key,age,rate=1)=>Math.floor(Math.max(0,age)*1000*rate/83)%effects[key].frames.length;
  if(layer!=='back'&&domeActive(s,now)&&hero){ctx.save();ctx.globalAlpha=.38;paint(ctx,'bariDome',f('bariDome',now-e.dome.started),hero.x,hero.y-48,150,150);ctx.restore();}
  for(const j of e.jobs){const age=now-j.started,m=enemies.find(m=>m.id===j.targetId),[dx,dy]=j.direction;if(layer==='back'&&!['redPoison','overheat','parasite','hydra'].includes(j.kind))continue;if(layer==='front'&&['redPoison','overheat'].includes(j.kind))continue;
   if(j.kind==='bariPush'||j.kind==='bariCharge')paint(ctx,j.kind,Math.min(28,Math.floor(age/.7*29)),j.origin.x+dx*j.distance,j.origin.y+dy*j.distance-40,128,128,Math.atan2(dy,dx)+(j.kind==='bariCharge'?Math.PI/4:0));
   else if(j.kind==='hydra'&&m)paint(ctx,'hydra',Math.min(40,Math.floor(age/.8*23)),m.x-(dx<0?-60:60),m.y-64,164,156,0,dx<0);
   else if(j.kind==='gasBomb'){const p=Math.min(1,age/Math.max(.001,j.duration));paint(ctx,'gasBomb',j.hit?Math.min(32,8+Math.floor((now-j.impact)/.8*25)):Math.min(7,Math.floor(p*8)),j.origin.x+(j.point.x-j.origin.x)*p,j.origin.y+(j.point.y-j.origin.y)*p-32,88,82);}
   else if(j.kind==='redPoison'){const size=384*Math.min(1,age/.6);ctx.save();ctx.globalAlpha=.65;paint(ctx,'redPoison',f('redPoison',age),j.point.x,j.point.y-55,size,size);ctx.restore();}
   else if(j.kind==='parasite'&&m)paint(ctx,'parasite',parasiteFrame(age),m.x,m.y-68-Math.max(0,1-age/.12)*40,128,180);
   else if(j.kind==='tamaito'&&m){for(const shot of j.shots)if(!shot.hit){const d=dist(j.origin,m),k=Math.min(1,(now-shot.released)*1000/Math.max(1,d));paint(ctx,'tamaito',f('tamaito',now-shot.released,2),j.origin.x+(m.x-j.origin.x)*k,j.origin.y+(m.y-j.origin.y)*k-32,88,30,Math.atan2(m.y-j.origin.y,m.x-j.origin.x),false,{x:0,y:0,w:128,h:42});}}
   else if(j.kind==='overheat'&&hero)paint(ctx,'overheat',Math.min(32,Math.floor(age/1.8*33)),hero.x,hero.y-35,384,384,Math.floor(age/.3)%2?Math.PI:0);
  }
  if(layer!=='front'){for(const field of e.fields){ctx.save();ctx.globalAlpha=.65;for(const p of field.tiles)paint(ctx,'poison',f('poison',now-field.started),p.x,p.y-12,64,64);ctx.restore();}}
  if(layer!=='back'){const targets=new Set(e.dots.filter(d=>d.kind!=='bleed').map(d=>d.targetId));for(const id of targets){const m=enemies.find(m=>m.id===id);if(m)paint(ctx,'poison',f('poison',now),m.x,m.y-28,48,48);}}
 }
 const api={has,state,valid,cast,step,clear,draw,protect,domeActive,attackBlocked,dragged,slowFactor,parasiteFrame,cleanseControl,attackTags};root.MareRankAExpansion=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
