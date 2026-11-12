'use strict';
// Shared original objectives. Online progress and rewards are authorized only by the BFF.
((root)=>{
  const quests = [
    {id:'crab',title:'Patrulha de Dawn',desc:'Derrote 6 inimigos na Ilha Dawn.',target:6,area:'beach',metric:'kills',gold:85,xp:65},
    {id:'bandit',title:'Defesa do porto',desc:'Derrote 5 inimigos na Cidade das Conchas.',target:5,area:'swamp',metric:'kills',gold:125,xp:100},
    {id:'boss',title:'Coração vulcânico',desc:'Derrote um chefe de ilha.',target:1,stat:'boss',gold:280,xp:190},
    {id:'dawn-patrol',title:'Dawn: liberar as ruas',desc:'Derrote 20 inimigos na Ilha Dawn.',target:20,area:'beach',metric:'kills',gold:150,xp:200},
    {id:'dawn-clear',title:'Dawn: enfrentar César',desc:'Derrote César na Ilha Dawn.',target:1,area:'beach',metric:'bosses',gold:300,xp:450},
    {id:'conchas-patrol',title:'Conchas: patrulha de Helmeppo',desc:'Derrote 30 Helmeppos na Cidade das Conchas.',target:30,area:'swamp',metric:'kills',gold:450,xp:800},
    {id:'conchas-clear',title:'Conchas: derrotar Helmeppo',desc:'Derrote Helmeppo na Cidade das Conchas.',target:1,area:'swamp',metric:'kills',gold:160,xp:240},
    {id:'orange-patrol',title:'Orange Town: recuperar o comércio',desc:'Derrote 40 inimigos em Orange Town.',target:40,area:'orange',metric:'kills',gold:900,xp:1600},
    {id:'orange-clear',title:'Orange Town: retomar as ruas',desc:'Derrote Mr. 3 ou Cabaji em Orange Town.',target:12,area:'orange',metric:'kills',gold:450,xp:800},
    {id:'rare-patrol',title:'Animais Raros: trilha segura',desc:'Derrote 20 Cocox na floresta.',target:20,area:'rare',metric:'kills',gold:1200,xp:2200}
  ];
  quests.forEach(Object.freeze);Object.freeze(quests);
  const progress=(game,q)=>q?.area?Math.max(game.hunts?.areas[q.area]?.[q.metric]||0,game.stats?.[q.id]||0):(game.stats?.[q?.stat]||0);
  const matching=kill=>quests.filter(q=>q.area?kill.area===q.area&&(q.metric==='kills'||kill.monster.type==='boss'):kill.monster.type===q.stat);
  const dailyRules=Object.freeze({hours:5,otherHours:.5,weeklyMultiplier:7,dailyBoosts:1,weeklyBoosts:2,dayMs:86400000,boostMs:3600000,xpMultiplier:2});
  const boost=Object.freeze({name:'Boost de XP (1h)',kind:'xp-boost',slot:'consumable',rarity:'epic',attack:0,defense:0,hp:0,symbol:'⌛',icon_path:'assets/ui/contracts-hd/xp-boost.png',description:'Duplica a XP do personagem durante uma hora real.'});
  // Live-engine hunt baselines in kills and Berry per hour.
  const huntRates=Object.freeze([
    {"min":1,"monster":1,"kills":468,"berry":14940,"byClass":{"sword":[468,14940],"brawler":[384,12108],"gunner":[576,17244],"rogue":[708,21972],"cyborg":[168,4992],"strategist":[660,20568],"healer":[288,8736]}},
    {"min":11,"monster":11,"kills":540,"berry":25728,"byClass":{"sword":[540,25728],"brawler":[432,20532],"gunner":[612,28932],"rogue":[780,36984],"cyborg":[204,9816],"strategist":[600,29052],"healer":[384,17844]}},
    {"min":31,"monster":31,"kills":240,"berry":47664,"byClass":{"sword":[240,48024],"brawler":[216,42636],"gunner":[288,59232],"rogue":[396,78720],"cyborg":[72,14364],"strategist":[240,51204],"healer":[168,34476]}},
    {"min":50,"monster":45,"kills":156,"berry":67452,"byClass":{"sword":[156,67452],"brawler":[156,63732],"gunner":[240,99816],"rogue":[288,116868],"cyborg":[48,18144],"strategist":[228,93312],"healer":[120,51144]}},
    {"min":75,"monster":70,"kills":48,"berry":71916,"byClass":{"sword":[48,66780],"brawler":[48,66744],"gunner":[72,95232],"rogue":[72,105312],"cyborg":[12,15936],"strategist":[72,102336],"healer":[24,38040]}}
  ].map(row=>Object.freeze({...row,byClass:Object.freeze(row.byClass)})));
  const day=now=>Math.floor(now/dailyRules.dayMs);
  const week=now=>Math.floor((day(now)+3)/7);
  function daily({cycle,level,classId,goldFactor=1}){
    const rate=huntRates.findLast(row=>level>=row.min)||huntRates[0];
    const [kills,berry]=rate.byClass[classId]??[rate.kills,rate.berry];
    const hours=dailyRules.hours-dailyRules.otherHours;
    return {revision:2,cycle,endsAt:(cycle+1)*dailyRules.dayMs,claimed:false,objectives:[
      {id:'daily-combat',title:'Caçada do Dia',desc:'Derrote monstros de nível '+rate.monster+' ou superior.',minMonster:rate.monster,target:Math.ceil(kills*hours),current:0},
      {id:'daily-berry',title:'Tesouros da Jornada',desc:'Obtenha Berry de monstros de nível '+rate.monster+' ou superior.',minMonster:rate.monster,target:Math.ceil(berry*hours*goldFactor),current:0}
    ]};
  }
  function rebalanceDaily(previous,input){
    if(!previous||previous.cycle!==input.cycle)return daily(input);
    if(previous.revision===2||previous.claimed)return previous;
    const next=daily(input);
    for(const q of next.objectives){
      const prior=previous.objectives.find(x=>x.id===q.id);
      const extra=q.id==='daily-combat'?(previous.objectives.find(x=>x.id==='daily-reinforcement')?.current||0):0;
      q.current=Math.min(q.target,(prior?.current||0)+extra);
    }
    return next;
  }
  function weekly({cycle,level,classId,goldFactor=1}){
    return {cycle,endsAt:((cycle+1)*7-3)*dailyRules.dayMs,claimed:false,
      objectives:daily({cycle:0,level,classId,goldFactor}).objectives.map(({minMonster,...q})=>({...q,desc:q.id==='daily-combat'?'Derrote monstros.':'Obtenha Berry diretamente dos monstros.',id:q.id.replace('daily','weekly'),title:q.id==='daily-combat'?'Monstros derrotados':'Tesouros da Semana',target:q.target*dailyRules.weeklyMultiplier}))};
  }
  function applyDaily(d,kill){
    if(d.claimed)return d;
    const combat=d.objectives.find(q=>q.id==='daily-combat');
    const combatComplete=combat&&combat.current>=combat.target;
    for(const q of d.objectives){
      if(q.id==='daily-reinforcement'&&!combatComplete)continue;
      const amount=q.id==='daily-prison'?Number(kill.prisonFloor===q.floor):
        q.area&&kill.area!==q.area||q.minMonster&&(!kill.reward||kill.monster?.level<q.minMonster)?0:q.id.endsWith('-berry')?(kill.berry||0):
        Number(!!kill.monster&&(!q.type||kill.monster.type===q.type));
      q.current=Math.min(q.target,q.current+amount);
    }
    return d;
  }
  const dailyComplete=d=>!!d?.objectives.length&&d.objectives.every(q=>q.current>=q.target);
  const api=Object.freeze({rulesetId:'original-contracts-v1',quests,progress,matching,dailyRules,boost,huntRates,day,week,daily,rebalanceDaily,weekly,applyDaily,dailyComplete});
  root.MareContracts=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
