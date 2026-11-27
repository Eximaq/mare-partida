'use strict';
/* Canonical class/faction definitions and XP curve; no persistence or browser APIs. */
(function(root){
function create({characters}){
  const classes = {
    sword: { name:'Espadachim', baseHP:136, hpStep:12, attack:14, attackStep:3, defense:7, defenseStep:1.2, speed:1.25, range:48, energy:90, energyStep:4, crit:.16, color:'#71c8c5', symbol:'⚔', skills:[{name:'Corte de Maré', cost:17, cd:7, type:'strike', multiplier:2.5, desc:'Golpe concentrado com 250% do ataque.'}, {name:'Postura Firme', cost:23, cd:14, type:'guard', desc:'Recupera vida e reduz dano por 7 segundos.'}] },
    brawler: { name:'Lutador / Pugilista', baseHP:182, hpStep:17, attack:12, attackStep:2.5, defense:10, defenseStep:1.6, speed:1.05, range:45, energy:85, energyStep:4, crit:.10, color:'#d7af74', symbol:'✹', skills:[{name:'Impacto de Âncora', cost:17, cd:8, type:'strike', multiplier:3.0, desc:'Golpe poderoso com 300% do ataque.'}, {name:'Fôlego de Ferro', cost:20, cd:14, type:'guard', desc:'Recupera vida e reduz dano por 7 segundos.'}] },
    gunner: { name:'Atirador / Franco-Atirador', baseHP:112, hpStep:10, attack:15, attackStep:3.2, defense:5, defenseStep:1, speed:1.05, range:210, energy:100, energyStep:5, crit:.22, color:'#e2b77a', symbol:'◎', skills:[{name:'Disparo Preciso', cost:17, cd:8, type:'strike', multiplier:2.7, desc:'Disparo certeiro com 270% do ataque.'}, {name:'Rajada de Estilhaços', cost:28, cd:14, type:'area', desc:'Ataca todos os inimigos próximos ao alvo.'}] }
  };

  // Facção é a origem social; classe é uma escolha independente.
  const factions = {
    revolutionary:{name:'Exército Revolucionário',short:'REVOLUCIONÁRIO',color:'#77c69b',accent:'#2d785a',desc:'Mobilidade, sabotagem e independência.',bonus:'Vel. ataque +8% · crítico +5%',attack:1,defense:1,hp:1,energy:1,speed:1.08,crit:.05,gold:1},
    pirate:{name:'Pirata',short:'PIRATA',color:'#ef9a76',accent:'#a44a48',desc:'Liberdade, conquista e espólios.',bonus:'Ataque +10% · Berry +8%',attack:1.10,defense:1,hp:1,energy:1,speed:1,crit:0,gold:1.08},
    marine:{name:'Marinha',short:'MARINHA',color:'#82bdf3',accent:'#396c9c',desc:'Disciplina, proteção e resistência.',bonus:'HP +8% · defesa +10%',attack:1,defense:1.10,hp:1.08,energy:1,speed:1,crit:0,gold:1},
    government:{name:'Governo Mundial',short:'GOVERNO MUNDIAL',color:'#c8b7f3',accent:'#7161a6',desc:'Tática, precisão e influência.',bonus:'Energia +10% · recarga -8%',attack:1,defense:1,hp:1,energy:1.10,speed:1,crit:0,gold:1}
  };
  Object.assign(classes, {
    rogue:{name:'Gatuno / Acrobata',baseHP:124,hpStep:11,attack:15,attackStep:3.1,defense:5,defenseStep:1.0,speed:1.72,range:44,energy:98,energyStep:5,crit:.26,color:'#ad9af1',symbol:'✧',skills:[{name:'Ataque ao Ponto Fraco',cost:18,cd:7,type:'strike',multiplier:2.65,desc:'Golpe veloz de dano elevado.'},{name:'Dança das Adagas',cost:26,cd:13,type:'area',multiplier:1.45,desc:'Atinge inimigos em volta do alvo.'}]},
    cyborg:{name:'Ciborgue / Engenheiro',baseHP:205,hpStep:16,attack:13,attackStep:2.7,defense:12,defenseStep:1.9,speed:.89,range:145,energy:100,energyStep:6,crit:.10,color:'#e7bb81',symbol:'⚙',skills:[{name:'Explosão de Engrenagens',cost:25,cd:9,type:'area',multiplier:1.65,desc:'Dano tecnológico em área.'},{name:'Blindagem Ativa',cost:22,cd:15,type:'guard',desc:'Reduz dano por 7 segundos e recupera vida.'}]},
    strategist:{name:'Estrategista / Elemental',baseHP:128,hpStep:11,attack:13,attackStep:2.8,defense:6,defenseStep:1.2,speed:1.10,range:190,energy:125,energyStep:7,crit:.16,color:'#8ad6ee',symbol:'❖',skills:[{name:'Tempestade Tática',cost:24,cd:9,type:'area',multiplier:1.5,desc:'Afeta vários oponentes com energia elemental.'},{name:'Escudo de Correntes',cost:23,cd:15,type:'guard',desc:'Escudo temporário e recuperação.'}]}
  });
  characters.configure(classes);
  return {classes,factions};
}
function legacyXpNeeded(level){
  if(!Number.isSafeInteger(level)||level<1||level>2147483647)throw new RangeError('Invalid level');
  const value=Math.round(80+25*Math.pow(level-1,1.55));
  if(!Number.isSafeInteger(value))throw new RangeError('XP precision limit');
  return value;
}
const xpCurveVersion=5, xpCurve=[0,80];
function previousXpNeeded(level){
  if(!Number.isSafeInteger(level)||level<1||level>1000000)throw new RangeError('XP precision limit');
  for(let n=xpCurve.length;n<=level;n++){
    const old=legacyXpNeeded(n-1), growth=(legacyXpNeeded(n)-old)/old;
    const cost=xpCurve[n-1]*(1+2*growth);
    if(!Number.isSafeInteger(Math.round(cost)))throw new RangeError('XP precision limit');
    xpCurve.push(cost);
  }
  return Math.round(xpCurve[level]);
}
function version3XpNeeded(level){
  return Math.max(1,Math.ceil(previousXpNeeded(level)/3));
}
// Reference XP per normal kill, shared by the browser and authoritative hunts.
const huntExperience=Object.freeze({
  beach:14, swamp:32, orange:30, rare:40, syrup:46, baratie:52, arlong:54, loguetown:60, alabasta:70,
  'alubarna-01':90,'alubarna-02':94,'alubarna-03':98,'alubarna-04':106,'alubarna-05':120,
  'skypiea-01':126,'skypiea-02':132,'skypiea-03':140,'skypiea-04':160,
  'enies-lobby-01':168,'enies-lobby-02':176,'enies-lobby-03':184,'enies-lobby-04':192,'enies-lobby-05':200,
  'thriller-bark-01':208,'thriller-bark-02':220,'thriller-bark-03':230,'thriller-bark-04':248,
  'sabaody-01':258,'sabaody-02':272,'sabaody-03':298,'sabaody-04':316,
  'marineford-01':330,'marineford-02':352,'marineford-03':368,'marineford-04':382,'marineford-05':398,'marineford-06':414
});
function latestHuntMap(level){
  const atlas=root.MareArchipelago||(typeof require==='function'?require('./archipelago.js'):null);
  return atlas?.islands.findLast(map=>huntExperience[map.area]&&atlas.canTravel(map.id,level))||null;
}
const version4HuntXp=[
  [1,14],[5,26],[11,30],[16,40],[21,46],[26,52],[31,54],[36,60],[40,70],
  [50,90],[55,94],[60,98],[65,106],[70,120],[75,126],[80,132],[85,140],[90,160],
  [95,168],[101,176],[104,184],[107,192],[110,200],[114,208],[118,220],[122,230],[127,248],
  [131,258],[136,272],[141,298],[146,316],[151,330],[156,352],[161,368],[166,382],[171,398],
  [176,414]
];
const initialXp=[0,27,44,56,70], initialBlocks=[0,36,54,70,88,108];
const arlongBlockKills=128, killGrowth=1.12, lastContentBlock=35, postContentStep=120;
function blockKills(block){
  return initialBlocks[block]??(Math.round(arlongBlockKills*killGrowth**(Math.min(block,lastContentBlock)-6))
    +Math.max(0,block-lastContentBlock)*postContentStep);
}
function version4XpNeeded(level){
  if(!Number.isSafeInteger(level)||level<1||level>1000000)throw new RangeError('XP precision limit');
  if(level<5)return initialXp[level];
  const kills=blockKills(Math.floor(level/5)), step=level%5;
  const killsForLevel=Math.floor(kills/5)+(step>=5-kills%5?1:0);
  return killsForLevel*(version4HuntXp.findLast(([min])=>level>=min)[1]);
}
// Level 1–185 costs calibrated by tools/project_world_progression.cjs.
const levelCostsV5=[
  167,348,655,1122,1123,1124,1427,1761,2106,3012,
  3013,3014,3015,3016,3312,4737,6774,7506,8131,9506,
  10742,11387,11615,11842,12365,13973,14884,15511,16152,16764,
  16765,16766,16767,16768,16769,18949,21413,24197,27343,29996,
  30621,31246,31871,32496,32663,33343,34024,34704,35385,39986,
  45185,51060,57698,65199,73675,83253,94076,106306,120126,135743,
  153390,173331,188835,192538,211792,216204,220616,225029,229441,259269,
  278252,283931,289609,295288,295289,295290,295291,295292,295293,295294,
  295295,295296,295297,295298,295299,295300,295301,295302,295303,333693,
  349190,356317,363443,370569,373539,385807,398258,410892,423710,435063,
  439858,448835,457812,486038,493515,503797,536983,547722,558462,591241,
  603558,615876,628193,628194,628195,628196,628197,670689,683839,694360,
  708826,756168,771292,786415,798514,815150,897539,915490,933440,947801,
  947802,947803,947804,961341,1012284,1087953,1110156,1132359,1154562,1172325,
  1312820,1339613,1366405,1393197,1414631,1532157,1563426,1594694,1625963,1650978,
  1865606,2108135,2382193,2691879,2976843,3239777,3305894,3372012,3438130,3491025,
  3729510,3805623,3881735,3957847,4018737,4254404,4341229,4428053,4514878,4584337,
  4880409,4980009,5079610,5179210,5258890,5576815,5690627,5804440,5918252,6009302,
  6134496,6259690,6384884,6510077,6640279
];
const post185Step=132806;
function xpNeeded(level){
  if(!Number.isSafeInteger(level)||level<1||level>1000000)throw new RangeError('XP precision limit');
  return level<=levelCostsV5.length?levelCostsV5[level-1]:levelCostsV5.at(-1)+(level-levelCostsV5.length)*post185Step;
}
function migrateXP(save){
  if(save.xpCurveVersion===xpCurveVersion)return save;
  const type=save.xpCurveVersion, pastCost=type===4?version4XpNeeded:type===3?version3XpNeeded:type===2?previousXpNeeded:legacyXpNeeded;
  const oldCost=BigInt(pastCost(save.level)), newCost=BigInt(xpNeeded(save.level));
  const xp=BigInt(Math.max(0,Math.trunc(Number(save.xp)||0)));
  const progress=(xp*newCost+oldCost/2n)/oldCost;
  // A fractional point rounding up must not grant a level on load.
  const within=xp<oldCost&&progress>=newCost?newCost-1n:progress;
  return {...save,xpCurveVersion,xp:Number(within)};
}
function advance({level,start,experience},limit=20,cost=xpNeeded){
  if(typeof start!=='bigint'||typeof experience!=='bigint'||start<0n||experience<start||experience>9223372036854775807n)throw new RangeError('Invalid experience');
  const levels=[];
  for(let n=0;n<limit;n++){
    const next=start+BigInt(cost(level));
    if(experience<next)break;
    level++;start=next;levels.push({level,start});
  }
  return {level,start,levels};
}
const api={create,xpNeeded,previousXpNeeded,legacyXpNeeded,version3XpNeeded,version4XpNeeded,migrateXP,xpCurveVersion,advance,huntExperience,latestHuntMap};
root.MareCharacterCatalog=api;
if(typeof module!=='undefined')module.exports=api;
})(globalThis);
