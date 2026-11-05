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
  const dailyRules=Object.freeze({hours:6,prisonHours:.25,targetMultiplier:4,berryShare:.95,dayMs:86400000,boostMs:3600000,xpMultiplier:2});
  const boost=Object.freeze({name:'Boost de XP (1h)',kind:'xp-boost',slot:'consumable',rarity:'epic',attack:0,defense:0,hp:0,symbol:'⌛',icon_path:'assets/ui/contracts-hd/xp-boost.png',description:'Duplica a XP do personagem durante uma hora real.'});
  // Map-specific route and survival adjustments from seeded live-engine benchmark runs.
  const dailyEfficiency=Object.freeze({beach:1.23,rare:1.085,loguetown:1.155,'alubarna-05':.83,'skypiea-01':1.12});
  const day=now=>Math.floor(now/dailyRules.dayMs);
  function daily({cycle,level,seed,profiles,stats,goldFactor=1}){
    const eligible=profiles.filter(p=>p.entry<=level).sort((a,b)=>Math.abs(level-a.level)-Math.abs(level-b.level)||a.type.localeCompare(b.type));
    if(!eligible.length)throw Error('Nenhum encontro diário elegível');
    const nearest=eligible.filter(p=>Math.abs(p.level-level)===Math.abs(eligible[0].level-level));
    const p=nearest[seed%nearest.length];
    // Only the next floor can be prepared; use the existing reinforcement objective for new cycles.
    const magical=stats.attack===stats.elemental&&stats.attack!==stats.physical;
    const armor=magical?p.magicDefense*.15:p.defense*.30;
    const hits=Math.ceil(p.maxHP/Math.max(1,(stats.attack-armor)*.5));
    const combatSeconds=hits/Math.max(.1,stats.speed);
    const travelSeconds=p.travel/Math.max(1,stats.huntSpeed||stats.moveSpeed);
    const rate=3600*(dailyEfficiency[p.area]??1)/Math.max(combatSeconds+travelSeconds,(p.respawnSeconds??20)/p.slots);
    const hours=dailyRules.hours-dailyRules.prisonHours;
    const baseKills=Math.max(1,Math.ceil(rate*hours)),factor=dailyRules.targetMultiplier;
    const kills=baseKills*factor;
    const reinforcements=Math.max(1,Math.ceil(rate*dailyRules.prisonHours))*factor;
    return {cycle,endsAt:(cycle+1)*dailyRules.dayMs,claimed:false,objectives:[
      {id:'daily-combat',title:'Caçada do Dia',desc:'Derrote '+p.name+' em '+p.region+'.',area:p.area,type:p.type,target:kills,current:0},
      {id:'daily-berry',title:'Tesouros da Jornada',desc:'Obtenha Berry diretamente dos monstros em '+p.region+'.',area:p.area,target:Math.max(1,Math.ceil(baseKills*(p.gold[0]+p.gold[1])/2*goldFactor*dailyRules.berryShare))*factor,current:0},
      {id:'daily-reinforcement',title:'Reforços da Caçada',desc:'Derrote mais '+reinforcements+' após concluir a Caçada do Dia.',area:p.area,type:p.type,target:reinforcements,current:0}
    ]};
  }
  function applyDaily(d,kill){
    const combat=d.objectives.find(q=>q.id==='daily-combat');
    const combatComplete=combat.current>=combat.target;
    for(const q of d.objectives){
      if(q.id==='daily-reinforcement'&&!combatComplete)continue;
      const amount=q.id==='daily-prison'?Number(kill.prisonFloor===q.floor):kill.area!==q.area?0:q.id==='daily-berry'?(kill.berry||0):Number(kill.monster?.type===q.type);
      q.current=Math.min(q.target,q.current+amount);
    }
    return d;
  }
  const dailyComplete=d=>!!d?.objectives.length&&d.objectives.every(q=>q.current>=q.target);
  const api=Object.freeze({rulesetId:'original-contracts-v1',quests,progress,matching,dailyRules,boost,day,daily,applyDaily,dailyComplete});
  root.MareContracts=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
