'use strict';
// Shared original objectives. Online progress and rewards are authorized only by the BFF.
((root)=>{
  const quests = [
    {id:'crab',title:'Cascos de magma',desc:'Derrote 6 carapaças ígneas.',target:6,stat:'crab',gold:85,xp:65},
    {id:'bandit',title:'Chamas à espreita',desc:'Derrote 5 corsários de brasa.',target:5,stat:'bandit',gold:125,xp:100},
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
  const progress=(game,q)=>q?.area?(game.hunts?.areas[q.area]?.[q.metric]||0):(game.stats?.[q?.stat]||0);
  const matching=kill=>quests.filter(q=>q.area?kill.area===q.area&&(q.metric==='kills'||kill.monster.type==='boss'):kill.monster.type===q.stat);
  const api=Object.freeze({rulesetId:'original-contracts-v1',quests,progress,matching});
  root.MareContracts=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
