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
function xpNeeded(level){
  if(!Number.isSafeInteger(level)||level<1||level>2147483647)throw new RangeError('Invalid level');
  const value=Math.round(80+25*Math.pow(level-1,1.55));
  if(!Number.isSafeInteger(value))throw new RangeError('XP precision limit');
  return value;
}
function advance({level,start,experience}){
  if(typeof start!=='bigint'||typeof experience!=='bigint'||start<0n||experience<start||experience>9223372036854775807n)throw new RangeError('Invalid experience');
  const levels=[];
  for(let n=0;n<20;n++){
    const next=start+BigInt(xpNeeded(level));
    if(experience<next)break;
    level++;start=next;levels.push({level,start});
  }
  return {level,start,levels};
}
const api={create,xpNeeded,advance};root.MareCharacterCatalog=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
