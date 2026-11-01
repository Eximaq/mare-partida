'use strict';
/* Hierarquia dos Mares: regras compartilhadas pela interface e preview estático. */
const MareHierarchy=(()=>{
  const levels=[1,20,50,75,100,135,170,200];
  const titles={
    pirate:['Pirata Novato','Pirata Promissor','Capitão Pirata','Supernova','Shichibukai','Comandante Yonkou','Yonkou (Imperador)','Rei dos Piratas'],
    marine:['Recruta','Marinheiro','Sargento','Capitão','Comodoro','Vice-Almirante','Almirante','Almirante de Frota'],
    revolutionary:['Simpatizante','Guerrilheiro','Oficial Revolucionário','Executivo','Comandante de Tropa','Comandante de Exército','Chefe de Gabinete','Líder Supremo'],
    government:['Agente Menor','Agente Oficial','Inspetor do Governo','Agente Cipher Pol','Elite Cipher Pol (CP9)','Agente Aegis (CP0)','Comandante Aegis Zero','Diretor Geral']
  };
  const lockedMessage='Esta ascensão requer itens especiais ainda não descobertos nos mares.';
  const asset=(faction,tier)=>'assets/ui/hierarchy/'+faction+'-'+tier+'.png';
  function art(faction,tier){if(!Object.hasOwn(titles,faction)||!Number.isInteger(tier)||tier<1||tier>8)return null;const i=tier-1;return {id:faction+':'+tier,plaque:'assets/ui/honors-hd/'+faction+'-plaque.png',sheet:'assets/ui/honors-hd/'+faction+'-insignias.png',x:i%4*100/3,y:i<4?0:100};}
  const flag=faction=>'assets/ui/hierarchy/'+faction+'-flag.png';
  function migrate(game){
    game.hierarchyPlayerId ||= game.akumaPlayerId || (globalThis.crypto?.randomUUID?.() || 'player-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
    game.hierarchyTier=Number.isInteger(game.hierarchyTier)?Math.max(1,Math.min(5,game.hierarchyTier)):1;
    if(!titles[game.factionId])game.factionId='pirate';
    game.hierarchyFaction ||= game.factionId;
    if(game.hierarchyFaction!==game.factionId){game.hierarchyTier=1;game.hierarchyFaction=game.factionId;}
    return game;
  }
  function title(faction,tier){return (titles[faction]||titles.pirate)[Math.max(0,Math.min(7,tier-1))];}
  function next(tier,level){const target=tier+1;if(target>8)return {state:'max',target};if(target>=6)return {state:'locked',target,message:lockedMessage};return {state:level>=levels[target-1]?'ready':'level',target,required:levels[target-1]};}
  function progress(tier,level){if(tier>=8)return 1;const base=levels[tier-1],goal=levels[tier];return Math.max(0,Math.min(1,(level-base)/(goal-base)));}
  function ranking(players){return players.slice().sort((a,b)=>b.tier-a.tier||b.level-a.level||b.power-a.power||String(a.player_id).localeCompare(String(b.player_id))).slice(0,10);}
  return {levels,titles,lockedMessage,asset,flag,migrate,title,next,progress,ranking,art};
})();
if(typeof module!=='undefined')module.exports=MareHierarchy;
