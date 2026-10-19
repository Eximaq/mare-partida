'use strict';
/* Final talents are configuration and passive events; secondary damage never re-enters itself. */
((root)=>{
  const definitions={
    brawler:[['titan','Corpo de Titã','Corpo 35% maior. Básicos atingem inimigos num raio de 100px e ignoram 20% da defesa restante.'],['armamentSkin','Pele de Armamento','Vigor igual a 25% da vida máxima, renovado ao fim do combate. Enquanto ativo: imunidade a controle e reflexão de 25% do dano corpo a corpo.'],['immortal','Imortalidade Temporária','Golpe letal: 5s de invulnerabilidade e 60% de roubo de vida. Recarga persistida de 10 minutos.']],
    sword:[['asura','Aura Demoníaca (Asura)','Cada básico cria dois cortes fantasmas, cada um com 30% do dano original.'],['execution','Execução Absoluta','Básicos têm 5% de executar um monstro comum; no chefe, o mesmo gatilho causa 10% da vida máxima em dano verdadeiro.'],['spatial','Corte Espacial','Alcance dos cortes passa a pelo menos 220px. Básicos projetam um feixe que atinge todos os inimigos alinhados.']],
    gunner:[['artillery','Artilharia Pesada','A cada 5 básicos, bombardeia o alvo e um raio de 150px com 400% do ataque.'],['camouflage','Camuflagem Óptica','Parado por 2s, fica invisível e inalvejável até atacar ou se mover. O ataque de saída é crítico com 300% de dano.'],['ricochet','Mestre do Ricochete','Projéteis rebatem entre todos os alvos próximos a até 160px, perdendo 15% de dano por salto. O rebote continua enquanto houver outro alvo vivo no alcance.']],
    rogue:[['assassinMark','Marca do Assassino','Críticos acumulam marcas. Na quinta, causam 12% da vida máxima do alvo em dano verdadeiro e consomem as marcas.'],['shadowClone','Clone das Sombras','Um clone intangível segue você e repete cada ataque com 50% do dano e efeitos de contato pela metade. O clone não gera outro clone.'],['underworld','Senhor do Submundo','Dobra chances de saque e bônus de raridade. Comuns têm 0,5% de chance de caixa de pérolas Nv.1 e 1% de equipamento lendário.']],
    cyborg:[['overclock','Overclock de Sistemas','Dobra ataque e movimento, sem recarga interna dos talentos/itens. Em combate, consome 1% da vida máxima por segundo; habilidades ativas mantêm sua recarga.'],['emp','Matriz de Aniquilação (EMP)','Ao cruzar 50% de vida, pulsa pela tela: silencia, cega e zera a defesa física/mágica dos monstros por 10s. Recarga persistida de 45s.'],['orbital','Canhão Orbital','Básicos tornam-se feixes de 250% do ataque, com metade da cadência, deixando fogo de 35% do ataque/s por 4s ao longo do trajeto.']],
    strategist:[['cataclysm','Cataclismo Passivo','Básicos alternam meteoro, raio e gelo com 160% do dano mágico, aplicando aleatoriamente queimadura, atordoamento ou congelamento.'],['archmage','Domínio do Arquimago','Ações não gastam energia. A energia atual vira um escudo permanente: 1 energia absorve 1 de dano antes do HP e se regenera normalmente.'],['singularity','Singularidade','Críticos mágicos criam um campo por 2s, puxando monstros num raio de 180px para o ponto do impacto, respeitando obstáculos.']],
    healer:[['eternalBlessing','Benção Eterna','Excesso de cura vira vida máxima e ataque até o fim do combate: 10% do excesso em vida e 2% em ataque, acumulando.'],['guardianAngel','Anjo Guardião','Ao morrer, você ou um aliado real na tela revive com vida/energia cheias e derruba inimigos por 2s. Recarga global persistida de 10 minutos.'],['empathy','Vínculo Empático','Em grupo, divide dano igualmente e replica curas. Solo: 50% da cura efetiva causa dano mágico aos atacantes próximos.']]
  };
  const trees=Object.fromEntries(Object.entries(definitions).map(([id,items])=>[id,items.map(([id,name,description])=>({id,name,description}))]));
  const selected=g=>g.talentBuilds?.[g.classId]?.ultimate||null;
  const start=()=>({vigor:null,vigorMax:0,immortal:0,still:0,hidden:false,revealed:false,lastX:null,lastY:null,shots:0,holyHP:0,holyAttack:0,fields:[],ricochets:[],delayed:[],attackers:new Set(),empathyBuffer:new Map(),hitTargets:new Set(),cycle:2,procs:{}});
  const count=(rt,key)=>{rt.procs[key]=(rt.procs[key]||0)+1;};
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),live=m=>m.alive!==false&&m.hp>0;
  function stats(d,g,rt){
    const u=selected(g);d={...d};
    if(u==='spatial')d.range=Math.max(220,d.range);
    if(u==='overclock'){d.speed*=2;d.moveSpeed*=2;d.huntSpeed*=2;}
    if(u==='orbital'){d.speed*=.5;d.range=Math.max(250,d.range);}
    if(u==='eternalBlessing'&&rt){d.maxHP+=rt.holyHP;d.physical+=rt.holyAttack;d.elemental+=rt.holyAttack;d.attack+=rt.holyAttack;}
    return d;
  }
  function before(g,rt,{basic,magic,critical}){
    const u=selected(g);let multiplier=1,critMultiplier=null;if(u&&basic)count(rt,'attacks');
    if(basic&&u==='camouflage'&&rt.hidden){critical=true;critMultiplier=3;rt.hidden=false;rt.still=0;rt.revealed=true;count(rt,u);}
    if(basic&&u==='orbital')multiplier=2.5;
    if(basic&&u==='cataclysm'){multiplier=1.6;rt.cycle=(rt.cycle+1)%3;}
    return {critical,critMultiplier,multiplier};
  }
  function connected(hero,first,enemies,range=300){
    const dx=first.x-hero.x,dy=first.y-hero.y,len=Math.hypot(dx,dy);if(!len)return [];
    return enemies.filter(m=>live(m)&&m!==first).filter(m=>{const along=((m.x-hero.x)*dx+(m.y-hero.y)*dy)/len,off=Math.abs((m.x-hero.x)*dy-(m.y-hero.y)*dx)/len;return along>0&&along<=range&&off<=28;});
  }
  function after(g,rt,{target,hero,stats,damage,basic,magic,critical,projectile,enemies,clear=()=>true,random=Math.random}){
    const u=selected(g),actions=[];rt.hitTargets.add(target.id);
    const add=(m,amount,kind=u)=>{if(live(m)&&clear(hero,m))actions.push({target:m,amount,kind});};
    if(basic&&u==='titan')for(const m of enemies.filter(m=>m!==target&&distance(m,target)<=100))add(m,damage);
    if(basic&&u==='asura'){add(target,damage*.3);actions.at(-1)&&(actions.at(-1).delay=.12);add(target,damage*.3);actions.at(-1)&&(actions.at(-1).delay=.24);}
    if(basic&&u==='execution'&&live(target)&&random()<.05)add(target,target.type==='boss'?target.maxHP*.1:target.hp);
    if(basic&&u==='spatial')for(const m of connected(hero,target,enemies,stats.range))add(m,damage);
    if(basic&&u==='artillery'&&++rt.shots%5===0)for(const m of enemies.filter(m=>distance(m,target)<=150))add(m,stats.attack*4);
    if(projectile&&u==='ricochet')rt.ricochets.push({from:{x:target.x,y:target.y},lastId:target.id,amount:damage*.85,clock:.12});
    if(critical&&u==='assassinMark'&&live(target)){target.assassinMarks=(target.assassinMarks||0)+1;if(target.assassinMarks>=5){target.assassinMarks=0;add(target,target.maxHP*.12);}}
    if(u==='shadowClone'&&live(target))actions.push({target,amount:damage*.5,kind:'clone',delay:.16,contact:{stats,basic,magic,critical,projectile}});
    if(basic&&u==='orbital'){count(rt,u);rt.fields.push({kind:'burnLine',from:{x:hero.x,y:hero.y},to:{x:target.x,y:target.y},remaining:4,clock:0,power:stats.attack*.35});}
    if(basic&&u==='cataclysm'&&live(target)){
      const status=['burn','stun','freeze'][Math.min(2,Math.floor(random()*3))];
      if(status==='burn')target.ultimateBurn={remaining:4,clock:0,power:stats.elemental*.3};else target.talentControl={type:status,remaining:1.5};
      actions.push({visualOnly:true,target,kind:['meteor','lightning','ice'][rt.cycle]});
    }
    if(magic&&critical&&u==='singularity'){count(rt,u);rt.fields.push({kind:'gravity',x:target.x,y:target.y,remaining:2,radius:180});}
    if(actions.length)count(rt,u);return actions;
  }
  function receive(g,rt,{amount,stats,physical,melee=false,source=null,now=Date.now()}){
    const u=selected(g);let damage=Math.max(0,amount),energyUsed=0,reflect=0,trigger=null;if(source&&damage>0)rt.attackers.add(source.id);
    if(u==='camouflage'&&rt.hidden)return {damage:0,untargetable:true};
    if(u==='immortal'&&rt.immortal>0)return {damage:0,invulnerable:true};
    if(u==='armamentSkin'){
      if(rt.vigor===null){rt.vigorMax=Math.round(stats.maxHP*.25);rt.vigor=rt.vigorMax;}
      const active=rt.vigor>0,absorbed=Math.min(damage,rt.vigor);rt.vigor-=absorbed;
      if(active&&physical&&melee)reflect=damage*.25;damage-=absorbed;
    }
    if(u==='archmage'){energyUsed=Math.min(Math.max(0,g.energy),damage);damage-=energyUsed;}
    if(damage>=g.hp&&g.hp>0&&u==='immortal'&&(g.talentCooldowns?.immortalUntil||0)<=now){damage=Math.max(0,g.hp-1);rt.immortal=5;trigger='immortal';}
    if(damage>=g.hp&&g.hp>0&&u==='guardianAngel'&&(g.talentCooldowns?.guardianUntil||0)<=now){damage=0;trigger='guardianAngel';}
    if(u==='emp'&&g.hp>stats.maxHP*.5&&g.hp-damage<=stats.maxHP*.5&&(g.talentCooldowns?.empUntil||0)<=now)trigger='emp';
    if(trigger)count(rt,trigger);return {damage,energyUsed,reflect,trigger};
  }
  function heal(g,rt,{amount,effective,stats,enemies=[],clear=()=>true,hero}){
    const u=selected(g),overflow=Math.max(0,amount-effective);
    if(u==='eternalBlessing'&&overflow>0){rt.holyHP+=overflow*.1;rt.holyAttack+=overflow*.02;count(rt,u);}
    if(u!=='empathy'||effective<=0)return [];
    const result=enemies.filter(m=>live(m)&&rt.attackers.has(m.id)&&distance(hero,m)<=500&&clear(hero,m)).map(target=>{const total=(rt.empathyBuffer.get(target.id)||0)+effective*.5,amount=Math.floor(total);rt.empathyBuffer.set(target.id,total-amount);return {target,amount,kind:'empathy'};}).filter(a=>a.amount>0);if(result.length)count(rt,'empathy');return result;
  }
  function tick(g,rt,dt,{hero,stats,inCombat,inHunt=inCombat,enemies=[],clear=()=>true,move=()=>{}}){
    const u=selected(g),actions=[];
    rt.immortal=Math.max(0,rt.immortal-dt);
    const moved=rt.lastX===null||Math.hypot(hero.x-rt.lastX,hero.y-rt.lastY)>.05;rt.lastX=hero.x;rt.lastY=hero.y;
    if(u==='camouflage'){if(!inHunt||moved){rt.still=0;rt.hidden=false;rt.revealed=false;}else{rt.still+=dt;if(rt.still>=2)rt.hidden=true;}}
    if(u==='armamentSkin'&&(rt.vigor===null||!inCombat)){rt.vigorMax=Math.round(stats.maxHP*.25);rt.vigor=rt.vigorMax;}
    if(u==='overclock'&&inCombat)actions.push({selfBurn:stats.maxHP*.01*dt});
    if(!inCombat){rt.holyHP=0;rt.holyAttack=0;rt.hitTargets.clear();rt.attackers.clear();rt.empathyBuffer.clear();}
    for(const a of rt.delayed)a.delay-=dt;actions.push(...rt.delayed.filter(a=>a.delay<=0));rt.delayed=rt.delayed.filter(a=>a.delay>0);
    for(const b of rt.ricochets){b.clock-=dt;if(b.clock>0)continue;const next=enemies.filter(m=>live(m)&&m.id!==b.lastId&&distance(b.from,m)<=160&&clear(b.from,m)).sort((a,c)=>distance(b.from,a)-distance(b.from,c))[0];if(!next){b.done=true;continue;}actions.push({target:next,amount:b.amount,kind:'ricochet',from:b.from});count(rt,'ricochet');b.from={x:next.x,y:next.y};b.lastId=next.id;b.amount*=.85;b.clock+=.12;}rt.ricochets=rt.ricochets.filter(b=>!b.done);
    for(const m of enemies){
      if(m.empRemaining>0)m.empRemaining=Math.max(0,m.empRemaining-dt);
      const p=m.ultimateBurn;if(p?.remaining>0){p.clock+=Math.min(dt,p.remaining);p.remaining=Math.max(0,p.remaining-dt);if(p.clock+1e-9>=1){const n=Math.floor(p.clock+1e-9);p.clock=Math.max(0,p.clock-n);actions.push({target:m,amount:p.power*n,kind:'burn'});}}
    }
    for(const f of rt.fields){
      const active=Math.min(dt,f.remaining);f.remaining-=dt;
      if(f.kind==='gravity')for(const m of enemies.filter(m=>live(m)&&distance(f,m)<=f.radius&&clear(f,m))){const len=Math.max(1,distance(f,m)),step=Math.min(len,180*active);move(m,(f.x-m.x)/len*step,(f.y-m.y)/len*step);}
      if(f.kind==='burnLine'){f.clock+=active;if(f.clock+1e-9>=1){const n=Math.floor(f.clock+1e-9);f.clock=Math.max(0,f.clock-n);for(const m of enemies.filter(live)){const dx=f.to.x-f.from.x,dy=f.to.y-f.from.y,l2=dx*dx+dy*dy,t=l2?Math.max(0,Math.min(1,((m.x-f.from.x)*dx+(m.y-f.from.y)*dy)/l2)):0;if(Math.hypot(m.x-f.from.x-t*dx,m.y-f.from.y-t*dy)<=40&&clear(f.from,m))actions.push({target:m,amount:f.power*n,kind:'burn'});}}}
    }
    rt.fields=rt.fields.filter(f=>f.remaining>0);return actions;
  }
  // Party contracts only accept actual entity records. Replicated events must not be sent here again.
  function distributeDamage(g,source,allies,amount){const group=allies.filter(a=>a.alive!==false&&a.hp>0);return selected(g)==='empathy'&&group.length>1?group.map(target=>({target,amount:amount/group.length})): [{target:source,amount}];}
  function replicateHeal(g,primary,allies,amount){return selected(g)==='empathy'?allies.filter(a=>a!==primary&&a.alive!==false&&a.hp>0).map(target=>({target,amount:Math.min(amount,target.maxHP-target.hp)})):[];}
  function reviveAlly(g,rt,source,ally,stats,now=Date.now(),bounds=null){const visible=ally.id===source.id||(bounds&&ally.x>=bounds.left&&ally.x<=bounds.right&&ally.y>=bounds.top&&ally.y<=bounds.bottom);if(selected(g)!=='guardianAngel'||ally.hp>0||!visible||(g.talentCooldowns?.guardianUntil||0)>now)return false;ally.hp=ally.maxHP;ally.energy=ally.maxEnergy;ally.alive=true;g.talentCooldowns.guardianUntil=now+600000;count(rt,'guardianAngel');return true;}
  const internalCooldown=(g,duration)=>selected(g)==='overclock'?0:Math.max(0,duration);
  const internalReady=(g,until,now=Date.now())=>internalCooldown(g,Math.max(0,(until||0)-now))===0;
  function loot(g,random=Math.random){if(selected(g)!=='underworld')return {box:false,legendary:false};return {box:random()<.005,legendary:random()<.01};}
  const api={internalCooldown,internalReady,loot,trees,selected,start,stats,before,after,receive,heal,tick,connected,distributeDamage,replicateHeal,reviveAlly};root.MareUltimates=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
