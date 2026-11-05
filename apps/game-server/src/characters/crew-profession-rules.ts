import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {crewDonationPolicy,crewWeek} from './crew-config.js';

export const professionIds=['doctor','command','cook','carpenter','navigator'] as const;
export type ProfessionId=(typeof professionIds)[number];
export const objectiveIds=['donation','hunt','collection','prison','boss'] as const;
export type ObjectiveId=(typeof objectiveIds)[number];
type Choice={name:string;benefit:string;maxBenefit:number;facility:string;material:{id:string;name:string;icon:string};titles:Record<ObjectiveId,string>};
const material=(id:string,name:string)=>({id,name,icon:`assets/ui/crew/professional-${id}.png`});
export const professions:Readonly<Record<ProfessionId,Choice>>=Object.freeze({
 doctor:{name:'Médico',benefit:'Até +10% de vida recuperada por poções',maxBenefit:.10,facility:'infirmary',material:material('surgery-manual-pages','Páginas do Manual de Cirurgia'),titles:{donation:'Fundo da Enfermaria',hunt:'Quarentena no Porto',collection:'O Manual Perdido',prison:'Plantão em Impel Down',boss:'Cirurgia de Emergência'}},
 command:{name:'Oficial de Comando',benefit:'Até +10% de XP de combate',maxBenefit:.10,facility:'command',material:material('sealed-operation-orders','Ordens de Operação Lacradas'),titles:{donation:'Fundo de Operações',hunt:'Ordem de Interceptação',collection:'Despachos Extraviados',prison:'Operação Impel Down',boss:'Ordem de Cerco'}},
 cook:{name:'Cozinheiro',benefit:'Até +2% de Vitalidade',maxBenefit:.02,facility:'galley',material:material('cooking-recipes','Receitas de Cozinha'),titles:{donation:'Provisões da Semana',hunt:'Caçada do Refeitório',collection:'O Caderno do Chef',prison:'Rações para a Expedição',boss:'Banquete dos Vitoriosos'}},
 carpenter:{name:'Carpinteiro',benefit:'Até −5% de Berry no custo de obras',maxBenefit:.05,facility:'workshop',material:material('shipwright-blueprints','Esboços de Carpintaria Naval'),titles:{donation:'Fundo de Reparos',hunt:'Defenda o Estaleiro',collection:'Projetos à Deriva',prison:'Escoras para Impel Down',boss:'Reparos de Emergência'}},
 navigator:{name:'Navegador',benefit:'Até +5% de Berry obtidos de monstros',maxBenefit:.05,facility:'navigation',material:material('nautical-chart-fragments','Fragmentos de Carta Náutica'),titles:{donation:'Fundo da Expedição',hunt:'Patrulha da Rota',collection:'Cartas ao Mar',prison:'Rota de Impel Down',boss:'Na Rota do Colosso'}},
});
const day=crewDonationPolicy.periodSeconds*1000;
export const professionRules=Object.freeze({
 version:1,weeklyLimit:1000,xp:Object.freeze([0,400,1000,1800,2800,4000,5400,7000,8800,10800]),
 cycleHours:56,huntHours:42,collectChance:.1,completionChance:.8,huntFraction:.7,donationFraction:.7,
 floorCount:100,productionWeeklyBoss:false,
 xpProfile:{base:{donation:150,hunt:250,collection:400,prison:200,boss:0},boss:{donation:120,hunt:200,collection:320,prison:160,boss:200}},
 // Provisional field-time factors. Under perfect play a cycle would have no travel interruptions or deaths.
 fieldEfficiency:{beach:.74,swamp:.61,orange:.62,rare:.65,syrup:.59,baratie:.59,arlong:.60,loguetown:.58,alabasta:.55,'skypiea-01':.55} as Record<string,number>,
});
export function professionLevel(xp:number){return professionRules.xp.reduce((n,required,i)=>xp>=required?i+1:n,1);}
export function professionWeek(at:number){
 const {startsAt,endsAt}=crewWeek(new Date(at));
 return {key:startsAt.toISOString().slice(0,10),start:startsAt.getTime(),end:endsAt.getTime()};
}
export function contributionTarget(issuedAt:number,startsAt:number,endsAt:number,usedToday:number){
 const firstDay=Math.floor(issuedAt/day)*day,remaining=Math.max(0,Math.ceil((endsAt-firstDay)/day)-1);
 const total=issuedAt<=startsAt?crewDonationPolicy.dailyLimit*7:
  Math.max(0,crewDonationPolicy.dailyLimit-usedToday)+remaining*crewDonationPolicy.dailyLimit;
 return Math.ceil(total*professionRules.donationFraction);
}
export function collectionGoal(trials:number,probability=professionRules.collectChance,confidence=professionRules.completionChance){
 // Use relative binomial masses around the mode to avoid underflow at n near the weekly maximum.
 if(!Number.isInteger(trials)||trials<=0||!(probability>0&&probability<1&&confidence>0&&confidence<=1))return 0;
 const mode=Math.floor((trials+1)*probability),weights=new Float64Array(trials+1);
 weights[mode]=1;let total=1;
 for(let i=mode;i>0&&weights[i]!>0;i--){weights[i-1]=weights[i]!*i*(1-probability)/((trials-i+1)*probability);total+=weights[i-1]!;}
 for(let i=mode;i<trials&&weights[i]!>0;i++){weights[i+1]=weights[i]!*(trials-i)*probability/((i+1)*(1-probability));total+=weights[i+1]!;}
 let tail=0;for(let i=trials;i>=0;i--){tail+=weights[i]!;if(tail/total>=confidence)return i;}return 0;
}
type Target={area:string;areaName:string;islandId:string;monster:string;monsterName:string;level:number;entry:number;count:number;travel:number;maxHP:number;defense:number;magicDefense:number;respawn:number};
type FighterStats={attack:number;physical:number;elemental:number;speed:number;huntSpeed:number};
const req=createRequire(import.meta.url),engine=req('../../../../world-battle.cjs'),behavior=req('../../../../monster-behavior.js'),archipelago=req('../../../../archipelago.js');
export function eligibleProfessionAreas(level:number){
 return Object.keys(engine.hunt.regions).filter(area=>{
  const island=archipelago.byArea(area);
  return island&&archipelago.canTravel(island.id,level);
 });
}
export const professionalTargets:readonly Target[]=Object.entries(engine.hunt.regions).flatMap(([area,region])=>{
 const map=archipelago.byArea(area);
 if(!map)return [];
 const slots=(behavior.slots(area) as {boss?:boolean;type:string;sector:string;x:number;y:number}[]).filter(slot=>!slot.boss);
 const groups=new Map<string,{slot:(typeof slots)[number];profile:{level:number;maxHP:number;defense:number;magicDefense:number}}[]>();
 for(const slot of slots){
  const profile=engine.hunt.profile(area,slot.sector,slot.type,.5),key=slot.type+':'+profile.level;
  const group=groups.get(key)??[];group.push({slot,profile});groups.set(key,group);
 }
 return [...groups.values()].filter(g=>g.length>=2).flatMap(g=>{
  const {slot,profile}=g[0]!,monster=engine.prisonCatalog[slot.type];
  if(!monster?.name||monster.boss)return [];
  const distance=g.reduce((sum,a)=>sum+Math.min(...g.filter(b=>a!==b).map(b=>Math.hypot(a.slot.x-b.slot.x,a.slot.y-b.slot.y))),0)/g.length;
  return [{area,areaName:(region as {name:string}).name,islandId:map.id,monster:slot.type,monsterName:monster.name,level:profile.level,entry:map.minLevel,count:g.length,travel:distance,maxHP:profile.maxHP,defense:profile.defense,magicDefense:profile.magicDefense,respawn:behavior.RESPAWN_MS/1000}];
 });
}).sort((a,b)=>a.level-b.level||a.area.localeCompare(b.area)||a.monster.localeCompare(b.monster));
export function estimatedKillsPerHour(t:Target,stats:FighterStats){
 const magical=stats.attack===stats.elemental&&stats.attack!==stats.physical;
 const hit=Math.max(1,(stats.attack-(magical?t.magicDefense*.15:t.defense*.3))*.5);
 const combat=Math.ceil(t.maxHP/hit)/Math.max(.1,stats.speed);
 const travel=t.travel/Math.max(1,stats.huntSpeed);
 return Math.max(1,Math.floor(3600*(professionRules.fieldEfficiency[t.area]??.55)/Math.max(t.respawn/t.count,combat+travel)));
}
export function selectProfessionalTarget(id:string,weekKey:string,level:number,stats:FighterStats){
 const accessible=professionalTargets.filter(t=>archipelago.canTravel(t.islandId,level)).map(t=>({...t,rate:estimatedKillsPerHour(t,stats)}));
 const compatible=accessible.filter(t=>Math.abs(t.level-level)<=3);
 const nearest=Math.min(...accessible.map(t=>Math.abs(t.level-level)));
 const options=compatible.length?compatible:accessible.filter(t=>Math.abs(t.level-level)===nearest);
 if(!options.length)return null;
 const seed=createHash('sha256').update(id+':'+weekKey+':professional-target-v1').digest().readUInt32BE(0);
 const levels=[...new Set(options.map(t=>t.level))],requiredLevel=levels[seed%levels.length];
 const candidates=options.filter(t=>t.level===requiredLevel);
 return candidates[Math.floor(seed/levels.length)%candidates.length]??null;
}
export type FloorEligibility={cleared:number;enabled:boolean;maxFloor?:number;repeats?:boolean;reachable?:(floor:number)=>boolean};
export function professionalFloor(input:FloorEligibility){
 const max=input.maxFloor??professionRules.floorCount,reachable=input.reachable??(()=>true);
 const next=input.cleared+1;
 if(input.enabled&&next<=max&&reachable(next))return {kind:'floor' as const,floor:next,revisit:false,reason:null};
 if(input.enabled&&input.repeats)for(let floor=Math.min(max,input.cleared);floor>=1;floor--)if(reachable(floor))return {kind:'floor' as const,floor,revisit:true,reason:null};
 return {kind:'patrol' as const,floor:null,revisit:false,reason:input.enabled?'Não há um novo andar disponível nem repetição registrada.':'Impel Down ainda não está disponível.'};
}
export function effectiveProfession(profession:ProfessionId,highestLevel:number,facilityLevel:number){
 const effective=Math.min(10,Math.max(0,highestLevel),Math.max(0,facilityLevel)*2);
 return Number((professions[profession].maxBenefit*effective/10).toFixed(5));
}
