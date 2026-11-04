'use strict';
// Controlled balance sample; never mutates inventory, catalogues or saved characters.
const F=require('../forge-system.js'),C=require('../character-system.js');
const defs=require('../item-catalog.js').create({forge:F,prison:require('../prison-system.js'),haki:require('../haki-system.js'),akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')}).items;
const catalog=require('../character-catalog.js').create({characters:C});
const potentials=[0,20,40,60,80,100],rarities=Object.keys(F.rarity);
const seed=n=>()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
function compare(classId='sword',level=50){
 if(!catalog.classes[classId]||!Number.isInteger(level)||level<1||level>100)throw Error('Classe ou nível inválido');
 const character={classId,level,attributes:C.empty()},derive=gear=>C.derive(character,catalog.classes[classId],catalog.factions.pirate,gear),naked=derive(F.aggregate({},defs)).power;
 return {classId,level,faction:'pirate',seed:3,naked,series:rarities.map(rarity=>{
  const def=defs.findIndex(d=>d.slot==='coat'&&d.rarity===rarity);
  if(def<0)throw Error('Peitoral nativo ausente: '+rarity);
  const samples=potentials.map(potential=>{
   const item=F.generateItem({id:'controlled-sample',def,level,rarity,plus:0,locked:false},defs,seed(3),{potential,source:'balance-sample'}),gear=F.aggregate({coat:item},defs),stats=derive(gear);
   return {potential,power:stats.power,contribution:stats.power-naked,budget:item.generation.extraBudget,extras:item.extras,gear};
  });
  const gaps=samples.slice(1).map((b,i)=>{const a=samples[i],delta=b.power-a.power;return {from:a.potential,to:b.potential,delta,contributionPercent:delta/a.contribution*100,characterPercent:delta/a.power*100};});
  return {rarity,name:F.rarity[rarity].name,def,item:defs[def].name,samples,gaps};
 })};
}
const num=n=>n.toLocaleString('pt-BR',{maximumFractionDigits:2});
function markdown(report){
 return ['# Comparação controlada de potencial',
  '',`Classe: ${catalog.classes[report.classId].name} · nível ${report.level} · facção Pirata. Poder sem equipamento: ${num(report.naked)}.`,
  '', 'Somente um peitoral equipado. Sem refinamento, pérolas, talentos, Haki, fruta ou atributos distribuídos. O mesmo sorteio determinístico (semente 3) mantém os tipos e a sequência de distribuição dos extras dentro de cada série. Todos os valores vêm de `MareForge.generateItem` → `aggregate` → `MareCharacters.derive`, sem alterar a fórmula de Poder.',
  '', '## Poder acrescentado pelo peitoral',
  '', '| Raridade e peça | 0% | 20% | 40% | 60% | 80% | 100% |',
  '|---|---:|---:|---:|---:|---:|---:|',
  ...report.series.map(r=>`| ${r.name} · ${r.item} (ID ${r.def}) | ${r.samples.map(s=>num(s.contribution)).join(' | ')} |`),
  '', '## Cinco gaps por raridade — pontos de Poder e aumento da contribuição da peça',
  '', '| Raridade | 0→20% | 20→40% | 40→60% | 60→80% | 80→100% |',
  '|---|---:|---:|---:|---:|---:|',
  ...report.series.map(r=>`| ${r.name} | ${r.gaps.map(g=>`+${num(g.delta)} (${num(g.contributionPercent)}%)`).join(' | ')} |`),
  '', '## Limites da leitura',
  '', '- O percentual acima usa a contribuição do peitoral, não o Poder total do personagem. O JSON também fornece o aumento percentual do personagem.',
  '- São amostras controladas. Outra classe, distribuição de extras ou equipamento adicional pode mudar o ganho. Potencial aumenta o orçamento real; não equivale a um multiplicador linear de Poder.',
  '- A fórmula de Poder existente não contabiliza todos os efeitos de combate com o mesmo peso. Velocidade de ataque e dano crítico continuam afetando o combate pelas regras próprias.',
  '- Nesta amostra, o Casaco das Marés Raro fica abaixo do Casaco da Bruma Incomum. O cadastro atual tem bases diferentes (DEF 4 / Vida 17 contra DEF 7 / Vida 27). Essa inversão está exposta para avaliação; não foi corrigida silenciosamente.',
  '', 'Reproduzir: `node tools/report_equipment_potential.cjs sword 50`. Acrescente `--json` para incluir os atributos reais e ambos os percentuais.', ''].join('\n');
}
module.exports={compare,markdown};
if(require.main===module){const args=process.argv.slice(2),report=compare(args[0]||'sword',Number(args[1]||50));console.log(args.includes('--json')?JSON.stringify(report,null,2):markdown(report));}
