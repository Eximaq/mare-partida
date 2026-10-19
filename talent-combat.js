'use strict';
/* Passive hooks return secondary effects; those effects never re-enter attack hooks. */
((root)=>{
  const U=root.MareUltimates;
  const key=g=>root.MareTalents.keystone(g),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const create=()=>({ultimate:U.start(),adaptive:0,bloodlust:0,shield:0,shieldTime:0,combatRemaining:0,targetId:null,combo:0,seen:new Set(),backstabbed:new Set(),queue:[],procs:{}});
  const proc=(rt,id)=>{rt.procs[id]=(rt.procs[id]||0)+1;};
  const face={north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]};
  function behind(hero,target){const f=face[target.emberFacing]||[0,1],dx=hero.x-target.x,dy=hero.y-target.y,len=Math.hypot(dx,dy);return len>0&&(dx*f[0]+dy*f[1])/len<-.5;}
  function beforeHit(g,rt,{target,hero,stats,basic,magic,area,critical}){
    const k=key(g);rt.combatRemaining=6;
    if(rt.targetId!==target.id){rt.combo=0;rt.targetId=target.id;}
    if(k==='growing'&&basic)rt.combo=Math.min(8,rt.combo+1);
    let multiplier=(area?1+stats.aoeBonus:1)*(k==='growing'&&basic?1+rt.combo*.04:1);
    if(k==='longshot')multiplier*=1+Math.min(.3,distance(hero,target)/180*.3);
    if(k==='focus'&&g.hp>=stats.maxHP&&!rt.seen.has(target.id))critical=true;
    rt.seen.add(target.id);
    let trueAmount=null;
    if(k==='backstab'&&!rt.backstabbed.has(target.id)&&behind(hero,target)){rt.backstabbed.add(target.id);trueAmount=Math.floor(stats.physical*1.5);proc(rt,k);}
    const final=U.before(g,rt.ultimate,{basic,magic,critical});critical=final.critical;multiplier*=final.multiplier;
    const wear=!magic&&target.talentWear?.remaining>0?target.talentWear.stacks*.04:0;
    const armor=(target.empRemaining>0?0:target.defense)*(1-(magic?stats.magicPen:stats.penetration))*(1-wear)*(basic&&U.selected(g)==='titan'?.8:1);
    return {multiplier,critical,armor,trueAmount,critMultiplier:final.critMultiplier};
  }
  function afterHit(g,rt,{target,stats,basic,magic,projectile,critical,damage,contactScale=1,fromClone=false,random=Math.random}){
    const k=key(g),result={heal:damage*stats.lifesteal,gold:0,pierce:false,notice:''};
    if(k==='fury'&&g.hp<stats.maxHP*.3)result.heal+=damage*.12;if(U.selected(g)==='immortal'&&rt.ultimate.immortal>0)result.heal+=damage*.6;
    if(basic&&k==='concussion'&&random()<.15){target.talentControl={type:'stun',remaining:1};result.notice='ATORDOADO';proc(rt,k);}
    if(basic&&k==='wear'){target.talentWear={stacks:Math.min(5,(target.talentWear?.remaining>0?target.talentWear.stacks:0)+1),remaining:5};proc(rt,k);}
    if(k==='poison'){const prop=fromClone?'clonePoison':'talentPoison';target[prop]={power:stats.physical*.2*contactScale,remaining:4,clock:target[prop]?.clock||0};result.notice='VENENO';proc(rt,k);}
    if(magic&&k==='freeze'){target.talentSlow={percent:.25,remaining:3};proc(rt,k);}
    if(magic&&k==='echo'&&random()<.2){rt.queue.push({target,amount:damage*.5,delay:.18,kind:'echo'});proc(rt,k);}
    if(projectile&&k==='pierce'&&random()<.3){result.pierce=true;proc(rt,k);}
    if(critical&&k==='lightHands'&&(target.talentStolen||0)<6&&random()<.15){result.gold=Math.min(6-(target.talentStolen||0),2*contactScale);target.talentStolen=(target.talentStolen||0)+result.gold;proc(rt,k);}
    return result;
  }
  function onKill(g,rt,stats){const k=key(g);rt.combatRemaining=6;if(k==='bloodlust'){rt.bloodlust=6;proc(rt,k);}if(k==='siphon'){proc(rt,k);return stats.maxEnergy*.1;}return 0;}
  function receive(g,rt,{stats,amount,physical=true,melee=false,source=null,random=Math.random,now=Date.now()}){
    const k=key(g);rt.combatRemaining=6;
    if(physical&&k==='parry'&&random()<.12){proc(rt,k);return {damage:0,parry:true};}
    let damage=amount;if(k==='fury'&&g.hp<stats.maxHP*.3)damage*=.75;
    if(rt.shield>0&&rt.shieldTime>0){const absorbed=Math.min(damage,rt.shield);rt.shield-=absorbed;damage-=absorbed;}
    const ultimate=U.receive(g,rt.ultimate,{stats,amount:damage,physical,melee,source,now});damage=ultimate.damage;
    let shieldTriggered=false;
    if(damage>=g.hp&&g.hp>0&&k==='energyShield'&&U.internalReady(g,g.talentCooldowns?.energyShieldUntil,now)){damage=Math.max(0,g.hp-1);rt.shield=Math.round(stats.maxHP*.3);rt.shieldTime=5;shieldTriggered=true;proc(rt,k);}
    if(physical&&k==='adaptive'){rt.adaptive=Math.min(15,rt.adaptive+1);proc(rt,k);}
    const explode=k==='unstable'&&random()<.2;if(explode)proc(rt,k);
    return {...ultimate,damage:shieldTriggered?Math.max(0,g.hp-1):Math.max(0,Math.floor(damage)),shieldTriggered,explode};
  }
  function tick(rt,dt,enemies){
    rt.bloodlust=Math.max(0,rt.bloodlust-dt);rt.shieldTime=Math.max(0,rt.shieldTime-dt);if(!rt.shieldTime)rt.shield=0;
    rt.combatRemaining=Math.max(0,rt.combatRemaining-dt);if(!rt.combatRemaining){rt.adaptive=0;rt.combo=0;rt.targetId=null;}
    const actions=[];
    for(const m of enemies){
      for(const prop of ['talentWear','talentControl','talentSlow'])if(m[prop])m[prop].remaining=Math.max(0,m[prop].remaining-dt);
      for(const prop of ['talentPoison','clonePoison']){const p=m[prop];if(p?.remaining>0){const active=Math.min(dt,p.remaining);p.remaining-=active;p.clock+=active;const ticks=Math.floor(p.clock+1e-9);if(ticks){p.clock-=ticks;actions.push({target:m,amount:p.power*ticks,kind:'poison'});}}}
    }
    for(const action of rt.queue)action.delay-=dt;
    actions.push(...rt.queue.filter(a=>a.delay<=0));rt.queue=rt.queue.filter(a=>a.delay>0);
    return actions;
  }
  function piercingTargets(hero,first,enemies,maxDistance=300){
    const dx=first.x-hero.x,dy=first.y-hero.y,len=Math.hypot(dx,dy);if(!len)return [];
    return enemies.filter(m=>m!==first&&m.alive&&m.hp>0).map(m=>({m,along:((m.x-hero.x)*dx+(m.y-hero.y)*dy)/len,offset:Math.abs((m.x-hero.x)*dy-(m.y-hero.y)*dx)/len})).filter(v=>v.along>len&&v.along<=maxDistance&&v.offset<=22).sort((a,b)=>a.along-b.along).slice(0,2).map(v=>v.m);
  }
  function rarity(random,boost=0){const roll=Math.floor(random()*1000)+1,b=Math.max(0,Math.min(1,boost));return roll<=Math.ceil(5*(1+b))?'legendary':roll<=Math.ceil(125*(1+b))?'epic':roll<=Math.ceil(275*(1+b))?'rare':roll<=500?'uncommon':'common';}
  function chainHeal(g,recipients,target,effective){
    if(key(g)!=='chain'||effective<=0)return [];
    const allies=recipients.filter(a=>a.id!==target.id&&a.alive!==false&&a.hp>0&&distance(a,target)<=180&&a.hp<a.maxHP);
    if(!allies.length)return [];return allies.map(a=>{const amount=Math.min(a.maxHP-a.hp,effective*.3/allies.length);a.hp+=amount;return {id:a.id,amount};});
  }
  function auraRecipients(g,source,recipients,{left=-Infinity,right=Infinity,top=-Infinity,bottom=Infinity}={}){
    if(key(g)!=='rejuvenation')return [];
    return recipients.filter(a=>a.alive!==false&&a.hp>0&&a.x>=left&&a.x<=right&&a.y>=top&&a.y<=bottom).map(a=>({id:a.id,hpRegenMultiplier:1.2,energyRegenMultiplier:1.2}));
  }
  function applyControl(g,source,recipient,type,duration,runtime=null){
    const reduced=key(g)==='intervention'&&['stun','freeze'].includes(type)&&distance(source,recipient)<=180;
    const immune=U.selected(g)==='armamentSkin'&&runtime?.ultimate?.vigor>0&&recipient.id===source.id;
    const remaining=immune?0:Math.max(0,duration)*(reduced?.5:1);if(['stun','freeze'].includes(type))recipient.talentControl={type,remaining};return remaining;
  }
  const snapshot=rt=>({adaptive:rt.adaptive,combo:rt.combo,shield:rt.shield,bloodlust:rt.bloodlust,queued:rt.queue.length,ultimate:{vigor:rt.ultimate.vigor,vigorMax:rt.ultimate.vigorMax,immortal:rt.ultimate.immortal,hidden:rt.ultimate.hidden,shots:rt.ultimate.shots,holyHP:rt.ultimate.holyHP,holyAttack:rt.ultimate.holyAttack,fields:rt.ultimate.fields.map(f=>({...f})),ricochets:rt.ultimate.ricochets.length,procs:{...rt.ultimate.procs}},procs:{...rt.procs}});
  const api={create,beforeHit,afterHit,onKill,receive,tick,piercingTargets,rarity,behind,chainHeal,auraRecipients,applyControl,snapshot};root.MareTalentCombat=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
