export const crewFacilities = ['hull','infirmary','galley','command','workshop','navigation','warehouse'] as const;
export type CrewFacility = typeof crewFacilities[number];
export type CrewFacilities = Record<CrewFacility,number>;
export const crewCapacities = [12,16,20,25,30] as const;
export const crewDonationPolicy = {dailyLimit:1000, periodSeconds:86400} as const;

const day = crewDonationPolicy.periodSeconds*1000;
const week = 7*day;
const mondayEpoch = Date.UTC(1970,0,5);
export const crewPolicy = {
  departureHours:12,
  dissolutionHours:24,
  requestHours:168,
  listLimit:24,
  inboxLimit:32,
  rankLimit:10,
  nameMin:3,
  nameMax:32,
  facilityCosts:[0,12000,25000,50000,85000],
  hullCosts:[0,24000,50000,100000,170000],
  requiredLevels:[1,2,4,6,8],
  levels:[0,500,1500,3000,5000,7500,10500,14000,18000,22500],
} as const;

export const crewMissionRules = {
  kills:{title:'Caçada dos Mares', perMember:1000*10, xp:800, coins:40},
  bosses:{title:'Bandeiras Conquistadas', perMember:2, xp:700, coins:35},
  donations:{title:'Riqueza do Convés', perMember:3500, xp:450, coins:25},
} as const;
export const seaWar = {
  id:'sea-war', title:'Guerra dos Mares', active:false,
  xp:Math.ceil(Math.max(...Object.values(crewMissionRules).map(rule=>rule.xp))*1.5),
} as const;
export type CrewMissionKind=keyof typeof crewMissionRules;

export function crewWeek(date:Date) {
  const cycle=Math.floor((date.getTime()-mondayEpoch)/week);
  return {cycle,startsAt:new Date(mondayEpoch+cycle*week),endsAt:new Date(mondayEpoch+(cycle+1)*week)};
}

export function crewCapacity(facilities:CrewFacilities) {
  return crewCapacities[facilities.hull-1]!;
}

export function crewLevel(xp:number) {
  const index=crewPolicy.levels.findLastIndex(threshold=>xp>=threshold);
  const level=index+1;
  return {level,levelStartXp:crewPolicy.levels[index]!,nextLevelXp:crewPolicy.levels[level]??null};
}

export function crewProject(facility:CrewFacility, level:number, carpenter:number) {
  if(level>=crewCapacities.length) return {facility,level,nextLevel:null,cost:null,baseCost:null,requiredCrewLevel:null};
  const baseCost=(facility==='hull'?crewPolicy.hullCosts:crewPolicy.facilityCosts)[level]!;
  const cost=Math.ceil(baseCost*(1-Math.max(0,Math.min(carpenter,.05))));
  return {facility,level,nextLevel:level+1,cost,baseCost,requiredCrewLevel:crewPolicy.requiredLevels[level]!};
}

export function crewCombatXp(base:number,bonus:number) {
  return Math.round(base*(1+bonus));
}

export function crewMonsterBerry(base:number,factionMultiplier:number,bonus=0) {
  return Math.round(base*factionMultiplier*(1+bonus));
}

export const rankCFragmentPrice=Object.values(crewMissionRules).reduce((total,mission)=>total+mission.coins,0);
