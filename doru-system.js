'use strict';
((root)=>{
  if(typeof module!=='undefined')require('./doru-data.js');
  const {rules,animations}=root.MareDoruData;
  const ranges={'1':{flight:[0,3],burst:[4,8]},'2':{flight:[0,6],root:[7,11],release:[12,12]}};
  function phaseDuration(key,phase){const [a,b]=ranges[key][phase];return animations[key].frames.slice(a,b+1).reduce((sum,f)=>sum+f.duration,0);}
  function frameIndex(key,phase,elapsed){const [a,b]=ranges[key][phase],loop=phase==='flight'||phase==='root';let t=Math.max(0,elapsed);t=loop?t%phaseDuration(key,phase):Math.min(t,phaseDuration(key,phase)-1);for(let i=a;i<=b;i++){if(t<animations[key].frames[i].duration)return i;t-=animations[key].frames[i].duration;}return b;}
  const damage=(attack,armor)=>Math.max(1,Math.floor(attack*rules.skills[0].damage_multiplier-armor*.30));
  const targets=(center,enemies)=>enemies.filter(m=>m.alive!==false&&m.hp!==0&&Math.hypot(m.x-center.x,m.y-center.y)<=rules.explosionRadius);
  const isRooted=(entity,now)=>entity?.alive!==false&&entity?.doruRootUntil>now;
  function create(key,start,direction,attack,serverId=null){const length=Math.hypot(...direction);if(!ranges[key]||!Number.isFinite(length)||length<.001||!Number.isFinite(attack)||attack<0)throw Error('Projétil Doru inválido');return {key,x:start.x,y:start.y,dx:direction[0]/length,dy:direction[1]/length,attack,serverId,travel:0,phase:'flight',elapsed:0,done:false};}
  function contact(from,to,enemy){const dx=to.x-from.x,dy=to.y-from.y,fx=from.x-enemy.x,fy=from.y-enemy.y,a=dx*dx+dy*dy,c=fx*fx+fy*fy-rules.hitRadius**2;if(c<=0)return 0;if(!a)return null;const b=2*(fx*dx+fy*dy),discriminant=b*b-4*a*c;if(discriminant<0)return null;const t=(-b-Math.sqrt(discriminant))/(2*a);return t>=0&&t<=1?t:null;}
  function impact(p,target,callbacks,now){
    p.elapsed=0;p.impactX=p.x;p.impactY=p.y;
    if(p.key==='2'&&target){p.phase='root';p.targetId=target.id;p.rootUntil=now+rules.rootDuration;target.doruRootUntil=p.rootUntil;target.doruRootStarted=now;target.isRooted=true;target.moving=0;p.x=target.x;p.y=target.y;}
    else p.phase=p.key==='1'?'burst':'release';
    callbacks.impact?.(p,target);
  }
  function step(p,dt,enemies,clear,callbacks={},now=0){
    if(p.done)return;p.elapsed+=dt*1000;
    if(p.phase==='flight'){
      let budget=Math.min(rules.range-p.travel,rules.speed*Math.max(0,dt));
      while(budget>1e-7&&p.phase==='flight'){
        const amount=Math.min(budget,8),from={x:p.x,y:p.y},to={x:p.x+p.dx*amount,y:p.y+p.dy*amount};
        if(!clear(from,to)){impact(p,null,callbacks,now);break;}
        let hit=null,t=Infinity;for(const enemy of enemies){if(enemy.alive===false||enemy.hp===0)continue;const touch=contact(from,to,enemy);if(touch!==null&&touch<t){hit=enemy;t=touch;}}
        const fraction=hit?t:1;p.x+=p.dx*amount*fraction;p.y+=p.dy*amount*fraction;p.travel+=amount*fraction;budget-=amount;
        if(hit){impact(p,hit,callbacks,now);break;}
        if(p.travel>=rules.range-1e-7){impact(p,null,callbacks,now);break;}
      }
    }else if(p.phase==='root'){
      const target=enemies.find(m=>String(m.id)===String(p.targetId)&&m.alive!==false&&m.hp!==0);
      if(!target){p.done=true;return;}
      p.x=target.x;p.y=target.y;
      if(now>=p.rootUntil){target.isRooted=false;p.phase='release';p.elapsed=0;}
    }else if(p.elapsed>=phaseDuration(p.key,p.phase))p.done=true;
  }
  function guardNavigation(nav,now){const move=nav.move;nav.move=function(entity,dx,dy){if(isRooted(entity,now())){entity.moving=0;return;}return move.call(this,entity,dx,dy);};return nav;}
  const images=new Map();function image(key){if(!images.has(key)){const im=new Image();im.src=animations[key].image;images.set(key,im);}return images.get(key);}
  function preload(){image('1');image('2');}
  function draw(c,p){const im=image(p.key);if(!im.complete||!im.naturalWidth||p.done)return false;const data=animations[p.key],f=data.frames[frameIndex(p.key,p.phase,p.elapsed)],rotating=p.phase==='flight',nativeAngle=p.key==='1'?0:-Math.PI/4,angle=rotating?Math.atan2(p.dy,p.dx)-nativeAngle:0,scale=1.25;c.save();if(p.phase==='release')c.globalAlpha*=Math.max(0,1-p.elapsed/phaseDuration(p.key,p.phase));c.imageSmoothingEnabled=false;c.translate(Math.round(p.x),Math.round(p.y-32));if(angle)c.rotate(angle);c.drawImage(im,f.x,f.y,f.w,f.h,-data.anchor.x*scale,-data.anchor.y*scale,f.w*scale,f.h*scale);c.restore();return true;}
  root.MareDoru={rules,animations,ranges,phaseDuration,frameIndex,damage,targets,isRooted,create,contact,step,guardNavigation,preload,draw};
  if(typeof module!=='undefined')module.exports=root.MareDoru;
})(globalThis);
