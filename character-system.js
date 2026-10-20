'use strict';
/* Character balance and point accounting, shared by combat, previews and saves. */
(() => {
  const attributes={
    strength:{name:'Força',short:'FOR',description:'Dano físico, principalmente em golpes corpo a corpo.'},
    dexterity:{name:'Destreza',short:'DES',description:'Precisão, ataques, crítico, esquiva e mobilidade.'},
    vitality:{name:'Vitalidade',short:'VIT',description:'Vida máxima e defesa; maior eficiência no Ciborgue.'},
    intelligence:{name:'Inteligência',short:'INT',description:'Dano elemental e potência de cura.'},
    spirit:{name:'Espírito',short:'ESP',description:'Energia, regeneração, cura e proteção.'}
  };
  const keys=Object.keys(attributes),empty=()=>Object.fromEntries(keys.map(k=>[k,0]));
  const birth=Object.freeze(Object.fromEntries(Object.entries({
    brawler:[14,9,13,5,9],sword:[15,14,9,6,6],gunner:[9,15,8,10,8],
    rogue:[10,16,9,7,8],cyborg:[11,6,17,8,8],strategist:[5,8,8,17,12],healer:[5,8,10,12,15]
  }).map(([id,values])=>[id,Object.freeze(Object.fromEntries(keys.map((key,i)=>[key,values[i]])))])));
  const cap=(n,a,b)=>Math.min(b,Math.max(a,n));
  const integer=n=>Number.isSafeInteger(n)&&n>=0?n:0;
  const earned=level=>Math.max(0,(integer(level)-1)*5);
  const spent=allocation=>keys.reduce((sum,key)=>sum+integer(allocation?.[key]),0);
  function migrate(g){
    // The budget is derived from level, never added on load. Old saves start unspent.
    let remaining=earned(g.level),allocation=empty();
    if(g.attributeVersion===1||g.attributeVersion===2){
      for(const key of keys){allocation[key]=Math.min(integer(g.attributes?.[key]),remaining);remaining-=allocation[key];}
    }
    return {...g,attributeVersion:2,attributes:allocation,attributePoints:remaining};
  }
  function commit(g,draft){
    if(keys.some(k=>!Number.isSafeInteger(draft?.[k])||draft[k]<0))return false;
    const normalized=migrate(g),cost=spent(draft);
    if(cost<=0||cost>normalized.attributePoints)return false;
    g.attributes=Object.fromEntries(keys.map(k=>[k,normalized.attributes[k]+draft[k]]));
    g.attributeVersion=2;g.attributePoints=normalized.attributePoints-cost;return true;
  }
  const roles={
    sword:{role:'DPS físico',primary:'strength',secondary:'dexterity',physical:[1.6,.45,0],huntSpeed:126},
    brawler:{role:'DPS corpo a corpo / resistência',primary:'strength',secondary:'vitality',physical:[1.55,.15,.25],huntSpeed:100},
    gunner:{role:'DPS à distância',primary:'dexterity',secondary:'strength',physical:[.35,1.55,0],huntSpeed:116},
    rogue:{role:'DPS ágil / evasão',primary:'dexterity',secondary:'vitality',physical:[.25,1.5,.1],huntSpeed:158},
    cyborg:{role:'Tanque',primary:'vitality',secondary:'strength',physical:[.65,.15,.15],huntSpeed:104},
    strategist:{role:'Mago elemental',primary:'intelligence',secondary:'spirit',physical:[.3,.15,0],huntSpeed:116,magic:true},
    healer:{role:'Suporte / Curandeiro',primary:'spirit',secondary:'intelligence',physical:[.25,.15,0],huntSpeed:116,magic:true}
  };
  function configure(classes){
    classes.sword.skills=[
      {name:'Corte de Maré',cost:17,cd:7,type:'strike',multiplier:2.5,desc:'Corte físico de 250%; escala com Força.'},
      {name:'Arco do Horizonte',cost:25,cd:13,type:'area',multiplier:1.65,desc:'Corte em arco de 165%; atinge inimigos próximos.'}];
    classes.cyborg={...classes.cyborg,name:'Ciborgue / Engenheiro de Combate',attack:10,attackStep:1.5,range:70,skills:[
      {name:'Protocolo de Provocação',cost:20,cd:12,type:'taunt',multiplier:1.1,desc:'Pulso físico, atrai inimigos próximos por 5s e concede proteção por 4s.'},
      {name:'Blindagem Ativa',cost:22,cd:15,type:'guard',desc:'Blindagem por 7s; recupera 12% da vida máxima mais 25% da potência de cura.'}]};
    classes.strategist={...classes.strategist,name:'Estrategista Elemental / Mago',skills:[
      {name:'Chama Concentrada',cost:18,cd:7,type:'strike',damageType:'elemental',element:'fire',multiplier:2.4,desc:'Fogo de 240% do dano elemental; escala com Inteligência.'},
      {name:'Tempestade das Correntes',cost:28,cd:14,type:'area',damageType:'elemental',element:'lightning',multiplier:1.7,desc:'Eletricidade em área de 170% do dano elemental; lentidão por 4,5s.'}]};
    classes.healer={name:'Suporte / Curandeiro',baseHP:135,hpStep:11,attack:10,attackStep:1.8,defense:6,defenseStep:1.1,speed:1.05,range:180,energy:130,energyStep:7,crit:.10,color:'#8ce0b5',symbol:'✚',skills:[
      {name:'Maré Restauradora',cost:24,cd:10,type:'heal',desc:'Restaura vida pela potência de cura; escala com Espírito e Inteligência.'},
      {name:'Bênção do Farol',cost:27,cd:16,type:'blessing',desc:'Proteção e regeneração por 8s; potência aumenta com Espírito.'}]};
    return classes;
  }
  function derive(g,c,f,gear){
    const r=roles[g.classId],lvl=g.level-1;
    const compendiumBonus=1+Math.max(0,Number(gear.akumaRegistered)||0)*.001;
    const preAttributes=Object.fromEntries(keys.map(k=>[k,((birth[g.classId]||birth.sword)[k]+integer(g.attributes?.[k]))*(k==='strength'?compendiumBonus:1)+Math.max(0,Number(gear.attributes?.[k])||0)]));
    const a=Object.fromEntries(keys.map(k=>[k,Math.round(preAttributes[k]*(1+Math.max(0,Number(gear.pearlPercent?.[k])||0))*1e6)/1e6]));
    const {strength:S,dexterity:D,vitality:V,intelligence:I,spirit:E}=a;
    const physical=Math.round((c.attack+lvl*c.attackStep+gear.attack+S*r.physical[0]+D*r.physical[1]+V*r.physical[2])*f.attack);
    const elemental=Math.round((c.attack+lvl*c.attackStep+gear.attack*.8+I*(g.classId==='strategist'?2.1: .9)+E*(g.classId==='healer'?.65:.35))*f.attack);
    const defense=Math.round((c.defense+lvl*c.defenseStep+gear.defense+V*(g.classId==='cyborg'?1.05:.55)+S*.08)*f.defense*(1+(gear.physicalDefensePercent||0)));
    const maxHP=Math.round(((c.baseHP+lvl*c.hpStep+V*(g.classId==='cyborg'?12:8))*compendiumBonus+gear.hp)*f.hp*(1+(gear.maxHpPercent||0)));
    const maxEnergy=Math.round((c.energy+lvl*c.energyStep+E*4+I*.5+(gear.energy||0))*f.energy);
    const speed=Math.min(3,(c.speed+Math.min(.5,lvl*.009)+D*.006)*f.speed);
    const crit=cap(c.crit+f.crit+lvl*.001+D*.0015+(gear.crit||0),0,.5),evasion=cap((g.classId==='rogue'?.12:0)+D*.0015+(gear.evasionPercent||0),0,.35);
    const healing=Math.round(12+I*1.1+E*2.3+lvl*.8);
    const attack=r.magic?elemental:physical;
    return {attributes:a,preAttributes,pearlPercent:gear.pearlPercent||{},physical,elemental,attack,defense,maxHP,maxEnergy,speed,crit,evasion,range:c.range,
      accuracy:Math.min(.99,.90+D*.0015),healing,healingReceivedPercent:gear.healingReceivedPercent||0,impactResistancePercent:gear.impactResistancePercent||0,energyRegen:2.2+E*.04,
      healthRegen:.9+E*.015,protection:cap((g.classId==='cyborg'?.38:.30)+E*.001,0,.65),
      mitigation:g.classId==='cyborg'?.12:0,regenBuff:1.5+E*.06+I*.02,
      moveSpeed:((g.classId==='rogue'?180:158)+Math.min(36,D*.3))*(1+(gear.moveSpeedPercent||0)),huntSpeed:(r.huntSpeed+Math.min(36,D*.3))*(1+(gear.moveSpeedPercent||0)),
      power:Math.round(attack*8+defense*5+maxHP*.22+maxEnergy*.1+crit*100+evasion*100+(g.classId==='healer'?healing*2:0))};
  }
  function damage(stats,armor,{type='physical',multiplier=1,variance=1,critical=false}={}){
    const raw=(type==='elemental'?stats.elemental:stats.physical)*multiplier*variance-armor*(type==='elemental'?.15:.30);
    return Math.max(1,Math.floor(Math.max(1,raw)*(critical?(stats.critMultiplier||1.65):1)));
  }
  function incoming(stats,amount,guard=false,variance=1){
    return Math.max(1,Math.floor(amount*100/(100+stats.defense*3)*(1-stats.mitigation)*(guard?1-stats.protection:1)*variance));
  }
  // Real recipients only. An eventual party can pass actual allies through the same contract.
  function healRecipients(recipients,amount){
    return recipients.map(recipient=>{
      const before=recipient.hp;recipient.hp=Math.min(recipient.maxHP,recipient.hp+Math.max(0,amount));
      return {id:recipient.id,amount:recipient.hp-before};
    });
  }
  const api={attributes,birth,keys,empty,earned,spent,migrate,commit,roles,configure,derive,damage,incoming,healRecipients};
  globalThis.MareCharacters=api;
  if(typeof module!=='undefined')module.exports=api;
})();
