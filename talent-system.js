'use strict';
/* Data-driven passive trees. Budgets are derived, never awarded twice on reload. */
((root)=>{
  const U=root.MareUltimates||(typeof require==='function'?require('./ultimate-system.js'):null),A=root.MareAchievements||(typeof require==='function'?require('./achievement-system.js'):null);
  const VERSION=2,MAX_RANK=10,KEYSTONE_COST=1,KEYSTONE_GATE=10,ULTIMATE_COST=3,ULTIMATE_GATE=50;
  const clone=x=>JSON.parse(JSON.stringify(x)),integer=n=>Number.isSafeInteger(n)&&n>=0?n:0;
  const earned=level=>integer(level),empty=()=>({nodes:{},keystone:null,ultimate:null});
  const totalEarned=g=>earned(g.level)+(A?.bonus(g)||0);
  const statNames={physical:'Dano físico',elemental:'Dano mágico',penetration:'Penetração física',magicPen:'Penetração mágica',maxHP:'Vida máxima',hpPct:'Vida máxima',defense:'Defesa',defPct:'Defesa',mitigation:'Redução de dano',lifesteal:'Roubo de vida',crit:'Chance crítica',critDamage:'Dano crítico',speed:'Velocidade de ataque',evasion:'Esquiva',moveSpeed:'Movimento',accuracy:'Precisão',range:'Alcance',energyRegen:'Regeneração de energia',healthRegen:'Regeneração de vida',maxEnergy:'Energia máxima',energyPct:'Energia máxima',energyEfficiency:'Eficiência de energia',aoe:'Dano em área',rareChance:'Chance de raros',healing:'Potência de cura',healingPct:'Potência de cura',shieldBonus:'Eficiência de proteção'};
  const percent=new Set(['penetration','magicPen','hpPct','defPct','mitigation','lifesteal','crit','critDamage','speed','evasion','accuracy','energyPct','energyEfficiency','aoe','rareChance','healingPct','shieldBonus']);
  const effects={
    concussion:{name:'Impacto Concussivo',description:'Ataques básicos têm 15% de chance de atordoar o alvo por 1 segundo.'},
    fury:{name:'Fúria da Batalha',description:'Abaixo de 30% de vida: 25% de redução adicional de dano e 12% de roubo de vida.'},
    growing:{name:'Golpes Crescentes',description:'Cada ataque básico consecutivo no mesmo alvo ganha 4% de dano, até 8 acúmulos. Trocar de alvo reinicia.'},
    wear:{name:'Fio Desgastante',description:'Ataques básicos reduzem a defesa física do alvo em 4% por 5 segundos, até 5 acúmulos.'},
    bloodlust:{name:'Ímpeto Sanguinário',description:'Abater um inimigo concede 20% de velocidade de ataque e 15% de movimento por 6 segundos.'},
    parry:{name:'Aparar Perfeito',description:'12% de chance de anular um ataque físico e contra-atacar com 100% do dano físico base, respeitando alcance e obstáculos.'},
    longshot:{name:'Tiro de Longo Alcance',description:'Dano aumenta com a distância: até 30% de bônus a 180 pixels ou mais.'},
    pierce:{name:'Munição Perfurante',description:'Projéteis têm 30% de chance de atingir até 2 inimigos atrás do alvo, com 50% do dano e respeitando obstáculos.'},
    focus:{name:'Foco Extremo',description:'Com 100% de vida, o primeiro acerto em cada inimigo é sempre crítico.'},
    poison:{name:'Lâminas Envenenadas',description:'Acertos aplicam veneno: 20% do dano físico base por segundo durante 4 segundos. Reaplicar renova; não acumula.'},
    lightHands:{name:'Mãos Leves',description:'Chance relativa de equipamentos raros ou melhores +20%. Críticos têm 15% de chance de roubar 2 dobrões, até 6 por inimigo. Não cria Gemas ou Pérolas.'},
    backstab:{name:'Golpe Furtivo',description:'O primeiro acerto pelas costas em cada inimigo causa 150% do dano físico base como dano verdadeiro.'},
    energyShield:{name:'Escudo de Energia',description:'Um golpe letal deixa 1 de vida e ativa escudo de 30% da vida máxima por 5 segundos. Recarga: 90 segundos, preservada ao recarregar.'},
    unstable:{name:'Núcleo Instável',description:'Golpes recebidos têm 20% de chance de causar explosão térmica: 60% do ataque em um raio de 120 pixels.'},
    adaptive:{name:'Armadura Adaptativa',description:'Cada golpe físico recebido aumenta a defesa em 3%, até 15 acúmulos. Reinicia ao fim do combate.'},
    echo:{name:'Eco Arcano',description:'Acertos mágicos têm 20% de chance de repetir automaticamente 50% do dano após 0,18 segundo. O eco não gera outro eco.'},
    freeze:{name:'Congelamento Estático',description:'Dano mágico aplica lentidão de 25% por 3 segundos. Reaplicar renova a duração.'},
    siphon:{name:'Sifão de Mana',description:'Abater um inimigo restaura 10% da energia máxima.'},
    chain:{name:'Cura em Corrente',description:'30% da cura efetiva de alvo único é distribuída entre outros aliados reais a até 180 pixels. Requer aliados; não duplica cura no próprio alvo.'},
    rejuvenation:{name:'Aura de Revigoramento',description:'O suporte e aliados reais na mesma tela recebem 20% de regeneração de vida e energia. Auras iguais não se acumulam.'},
    intervention:{name:'Intervenção Divina',description:'Atordoamento e congelamento no suporte ou em aliados próximos duram metade do tempo. Reduções iguais não se acumulam.'}
  };
  const utility=[['accuracy',.002],['speed',.008],['energyRegen',.05],['healthRegen',.06],['moveSpeed',1]];
  const themes={
    brawler:{name:'Lutador',branches:[['Força Bruta',[['physical',2],['penetration',.01],['physical',2],['crit',.003],['physical',3]]],['Vitalidade',[['maxHP',6],['defense',1],['hpPct',.005],['mitigation',.003],['lifesteal',.002]]],['Disciplina',utility]],keystones:['concussion','fury','growing']},
    sword:{name:'Espadachim',branches:[['Letalidade',[['crit',.004],['critDamage',.015],['penetration',.005],['physical',2],['crit',.003]]],['Agilidade',[['speed',.01],['evasion',.003],['moveSpeed',1],['accuracy',.002],['maxHP',5]]],['Guarda Naval',[['defense',1],['healthRegen',.06],['maxHP',6],['mitigation',.002],['physical',1]]]],keystones:['wear','bloodlust','parry']},
    gunner:{name:'Atirador',branches:[['Precisão Cirúrgica',[['critDamage',.015],['accuracy',.002],['physical',2],['penetration',.005],['crit',.003]]],['Posicionamento',[['moveSpeed',1],['evasion',.003],['maxHP',5],['range',2],['accuracy',.002]]],['Arsenal',[['physical',1],['speed',.008],['maxEnergy',2],['energyRegen',.05],['mitigation',.002]]]],keystones:['longshot','pierce','focus']},
    rogue:{name:'Gatuno',branches:[['Letalidade Rápida',[['physical',2],['penetration',.007],['crit',.003],['speed',.008],['critDamage',.01]]],['Oportunismo',[['evasion',.003],['crit',.002],['rareChance',.005],['moveSpeed',1],['maxHP',5]]],['Astúcia',utility]],keystones:['poison','lightHands','backstab']},
    cyborg:{name:'Ciborgue',branches:[['Blindagem Metálica',[['defense',1],['maxHP',8],['mitigation',.003],['hpPct',.005],['defPct',.01]]],['Sobrecarga de Armas',[['physical',2],['aoe',.01],['penetration',.005],['maxEnergy',2],['speed',.008]]],['Manutenção',[['healthRegen',.08],['energyRegen',.06],['maxHP',5],['accuracy',.002],['moveSpeed',1]]]],keystones:['energyShield','unstable','adaptive']},
    strategist:{name:'Estrategista Elemental',branches:[['Poder Elemental',[['elemental',2],['magicPen',.01],['crit',.003],['elemental',2],['critDamage',.01]]],['Fluxo de Mana',[['energyRegen',.06],['maxEnergy',3],['energyEfficiency',.003],['energyPct',.005],['energyRegen',.08]]],['Concentração',[['defense',1],['evasion',.002],['maxHP',5],['moveSpeed',1],['aoe',.01]]]],keystones:['echo','freeze','siphon']},
    healer:{name:'Suporte',branches:[['Devoção',[['healing',2],['shieldBonus',.01],['energyEfficiency',.003],['healingPct',.01],['maxEnergy',2]]],['Presença',[['maxHP',8],['healthRegen',.08],['mitigation',.003],['hpPct',.005],['energyRegen',.06]]],['Peregrinação',utility]],keystones:['chain','rejuvenation','intervention']}
  };
  const trees=Object.fromEntries(Object.entries(themes).map(([classId,t])=>[classId,{classId,name:t.name,branches:t.branches.map(([name,stats],b)=>({id:classId+'-branch-'+b,name,nodes:stats.map(([stat,value],tier)=>({id:classId+'-'+b+'-'+tier,branch:b,tier,stat,value,maxRank:MAX_RANK,requires:tier?[{id:classId+'-'+b+'-'+(tier-1),level:5}]:[],name:statNames[stat]+' '+['I','II','III','IV','V'][tier]}))})),ultimates:U.trees[classId],keystones:t.keystones.map(id=>({id,...effects[id]}))}]));
  const getTree=id=>trees[id]||null;
  const nodes=classId=>getTree(classId)?.branches.flatMap(b=>b.nodes)||[];
  const commonSpent=build=>Object.values(build?.nodes||{}).reduce((sum,n)=>sum+integer(n),0);
  const spent=build=>commonSpent(build)+(build?.keystone?KEYSTONE_COST:0)+(build?.ultimate?ULTIMATE_COST:0);
  const branchCount=(classId,build)=>getTree(classId)?.branches.filter(b=>b.nodes.some(n=>integer(build?.nodes?.[n.id])>0)).length||0;
  function validate(classId,build,budget,prior=empty()){
    const tree=getTree(classId);if(!tree||!build||typeof build.nodes!=='object'||!build.nodes)return 'Árvore inválida.';
    const all=nodes(classId);
    if(Object.entries(build.nodes).some(([id,n])=>!all.some(node=>node.id===id)||!Number.isInteger(n)||n<0||n>MAX_RANK))return 'Investimento inválido.';
    if(branchCount(classId,build)>2)return 'Você pode investir em apenas duas ramificações.';
    for(const branch of tree.branches)for(const node of branch.nodes)if(build.nodes[node.id]>0&&node.requires.some(req=>(build.nodes[req.id]||0)<req.level))return 'Invista 5 pontos no talento anterior deste ramo.';
    if(!build.keystone&&all.some(n=>n.tier>=2&&(build.nodes[n.id]||0)>(prior.nodes?.[n.id]||0)))return 'Escolha um exclusivo intermediário para atravessar a ponte aos tiers avançados.';
    if(build.ultimate&&!tree.ultimates.some(u=>u.id===build.ultimate))return 'Talento final inválido.';
    if(build.ultimate&&(!build.keystone||commonSpent(build)<ULTIMATE_GATE||!all.some(n=>n.tier===4&&(build.nodes[n.id]||0)>=5)))return 'O final requer 50 PT comuns, um intermediário e 5 pontos em uma ponta avançada.';
    if(build.keystone&&!tree.keystones.some(k=>k.id===build.keystone))return 'Talento exclusivo inválido.';
    if(build.keystone&&commonSpent(build)<KEYSTONE_GATE)return 'Invista 10 PT nos ramos antes de escolher um talento exclusivo.';
    if(spent(build)>budget)return 'Pontos de Talento insuficientes.';return '';
  }
  function normalize(classId,build,budget){
    const result=empty(),tree=getTree(classId);let remaining=budget;
    for(const b of tree.branches)for(const n of b.nodes){const rank=Math.min(MAX_RANK,integer(build?.nodes?.[n.id]),remaining);if(rank&&branchCount(classId,result)>=2&&!b.nodes.some(node=>result.nodes[node.id]>0))break;if(n.requires.some(req=>(result.nodes[req.id]||0)<req.level))break;if(rank){result.nodes[n.id]=rank;remaining-=rank;}}
    if(remaining&&tree.keystones.some(k=>k.id===build?.keystone)&&spent(result)>=KEYSTONE_GATE)result.keystone=build.keystone;
    if(remaining>=ULTIMATE_COST+Number(!!result.keystone)&&tree.ultimates.some(u=>u.id===build?.ultimate)&&!validate(classId,{...result,ultimate:build.ultimate},budget,result))result.ultimate=build.ultimate;
    return result;
  }
  function migrate(original){
    const save=A.migrate(clone(original)),budget=totalEarned(save),old=[1,VERSION].includes(save.talentVersion)?save.talentBuilds||{}:{};
    save.talentVersion=VERSION;save.talentSeq=integer(save.talentSeq);
    save.talentBuilds=Object.fromEntries(Object.keys(trees).map(id=>[id,normalize(id,old[id],budget)]));
    save.talentCooldowns=Object.fromEntries(['energyShieldUntil','immortalUntil','guardianUntil','empUntil'].map(id=>[id,Number.isFinite(Number(save.talentCooldowns?.[id]))?Math.max(0,Number(save.talentCooldowns?.[id])):0]));return save;
  }
  const buildFor=(g,classId=g.classId)=>g.talentBuilds?.[classId]||empty();
  const available=g=>Math.max(0,totalEarned(g)-spent(buildFor(g)));
  function propose(g,build,id,budget){
    const next=clone(build),tree=getTree(g.classId),node=nodes(g.classId).find(n=>n.id===id);
    if(node){if((next.nodes[id]||0)>=node.maxRank)return {ok:false,message:'Talento no nível máximo.'};next.nodes[id]=(next.nodes[id]||0)+1;}
    else if(tree.keystones.some(k=>k.id===id)){if(next.keystone&&next.keystone!==id)return {ok:false,message:'Escolha apenas um talento exclusivo. Redefina a árvore para trocar.'};if(next.keystone===id)return {ok:false,message:'Talento exclusivo já escolhido.'};next.keystone=id;}
    else if(tree.ultimates.some(u=>u.id===id)){if(next.ultimate)return {ok:false,message:'Escolha apenas um talento final. Redefina a árvore para trocar.'};next.ultimate=id;}
    else return {ok:false,message:'Talento desconhecido.'};
    const message=validate(g.classId,next,budget,buildFor(g));return message?{ok:false,message}:{ok:true,build:next};
  }
  const invest=(g,build,id)=>propose(g,build,id,totalEarned(g));
  const eligibility=(g,build,id)=>propose(g,build,id,Infinity);
  function commit(g,{classId,expectedSeq,build}){
    if(classId!==g.classId||expectedSeq!==integer(g.talentSeq))return {ok:false,message:'A árvore mudou. Reabra a prévia antes de confirmar.'};
    const message=validate(classId,build,totalEarned(g),buildFor(g));if(message)return {ok:false,message};
    const old=buildFor(g);if(nodes(classId).some(n=>(build.nodes[n.id]||0)<(old.nodes[n.id]||0))||(old.keystone&&old.keystone!==build.keystone)||(old.ultimate&&old.ultimate!==build.ultimate)||spent(build)<=spent(old))return {ok:false,message:'Não é possível remover pontos nesta confirmação.'};
    const state=migrate(g);state.talentBuilds[classId]=clone(build);state.talentSeq++;return {ok:true,state};
  }
  function reset(g){const state=migrate(g);state.talentBuilds[g.classId]=empty();state.talentSeq++;return state;}
  const bonuses=g=>{const result={};for(const n of nodes(g.classId)){const rank=integer(buildFor(g).nodes[n.id]);if(rank)result[n.stat]=(result[n.stat]||0)+rank*n.value;}return result;};
  const keystone=g=>buildFor(g).keystone;
  function applyStats(base,g,runtime=null){
    const b=bonuses(g),d={...base},key=keystone(g);
    d.physical+=b.physical||0;d.elemental+=b.elemental||0;d.maxHP=Math.round((d.maxHP+(b.maxHP||0))*(1+(b.hpPct||0)));d.maxEnergy=Math.round((d.maxEnergy+(b.maxEnergy||0))*(1+(b.energyPct||0)));
    d.defense=Math.round((d.defense+(b.defense||0))*(1+(b.defPct||0)+(key==='adaptive'?(runtime?.adaptive||0)*.03:0)));
    d.speed=Math.min(3,d.speed*(1+(b.speed||0)+(key==='bloodlust'&&runtime?.bloodlust>0?.20:0)));
    d.crit=Math.min(.65,d.crit+(b.crit||0));d.evasion=Math.min(.45,d.evasion+(b.evasion||0));d.accuracy=Math.min(1,d.accuracy+(b.accuracy||0));
    d.range+=b.range||0;d.moveSpeed=(d.moveSpeed+(b.moveSpeed||0))*(key==='bloodlust'&&runtime?.bloodlust>0?1.15:1);d.huntSpeed=(d.huntSpeed+(b.moveSpeed||0))*(key==='bloodlust'&&runtime?.bloodlust>0?1.15:1);
    d.healing=Math.round((d.healing+(b.healing||0))*(1+(b.healingPct||0)));d.protection=Math.min(.8,d.protection*(1+(b.shieldBonus||0)));d.mitigation=Math.min(.6,d.mitigation+(b.mitigation||0));
    d.energyRegen=(d.energyRegen+(b.energyRegen||0))*(key==='rejuvenation'?1.2:1);d.healthRegen=(d.healthRegen+(b.healthRegen||0))*(key==='rejuvenation'?1.2:1);
    d.critMultiplier=1.65+(b.critDamage||0);d.penetration=Math.min(.6,b.penetration||0);d.magicPen=Math.min(.6,b.magicPen||0);d.lifesteal=Math.min(.3,b.lifesteal||0);d.energyEfficiency=Math.min(.4,b.energyEfficiency||0);d.aoeBonus=Math.min(.5,b.aoe||0);d.rareChance=Math.min(.5,(b.rareChance||0)+(key==='lightHands'?.2:0));
    Object.assign(d,U.stats(d,g,runtime?.ultimate));
    d.attack=['strategist','healer'].includes(g.classId)?d.elemental:d.physical;
    d.power=Math.round(d.attack*8+d.defense*5+d.maxHP*.22+d.maxEnergy*.1+d.crit*100+d.evasion*100+(g.classId==='healer'?d.healing*2:0));return d;
  }
  const describeNode=n=>'+'+(percent.has(n.stat)?Number((n.value*100).toFixed(2))+'%':n.value)+' '+statNames[n.stat]+' por ponto';
  const api={VERSION,MAX_RANK,KEYSTONE_GATE,ULTIMATE_COST,ULTIMATE_GATE,totalEarned,commonSpent,trees,effects,getTree,nodes,empty,earned,spent,branchCount,validate,migrate,buildFor,available,invest,eligibility,commit,reset,bonuses,keystone,applyStats,describeNode};
  root.MareTalents=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
