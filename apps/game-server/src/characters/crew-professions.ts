import {randomInt} from 'node:crypto';
import type {PoolClient} from 'pg';
import {AuthFault} from '../auth/errors.js';
import {crewDonationPolicy} from './crew-config.js';
import {readFighter} from './fighter.js';
import {readCharacterState} from './state.js';
import {
 collectionGoal,contributionTarget,eligibleProfessionAreas,objectiveIds,professionalFloor,professionIds,professionLevel,professionRules,
 professions,professionWeek,selectProfessionalTarget,type ObjectiveId,type ProfessionId,
} from './crew-profession-rules.js';
export {professionIds,professionLevel,professions,professionRules};
export {readCrewProfessionBenefits,readCrewBenefitsForCharacters,readCharacterCrewBenefits} from './crew-benefits.js';

type ChoiceRow={profession:ProfessionId;experience:number;chosen_at:Date;now:Date};
type Floor=ReturnType<typeof professionalFloor>;
type Target=NonNullable<ReturnType<typeof selectProfessionalTarget>>;
type Spec={version:number;profession:ProfessionId;characterLevel:number;eligibleAreas:string[];prisonCleared:number;target:Target;floor:Floor;xp:Record<ObjectiveId,number>;targets:Partial<Record<ObjectiveId,number>>};
type WeekRow={week_start:string;issued_at:Date;spec:Spec;progress:Partial<Record<ObjectiveId,number>>;material_count:number};
type Event={id:string;kind:'kill'|'donation'|'prison'|'weekly-boss';amount?:number;floor?:number;area?:string|null;monster?:string;level?:number};
export type ProfessionKill={id:string;area:string|null;monster:{type:string;level:number}};

const maxExperience=professionRules.xp[professionRules.xp.length-1]!,windowDays=7,ms=1000;
const available=async(client:PoolClient)=>Boolean((await client.query("SELECT to_regclass('mare_game.character_professions') present")).rows[0]?.present);
async function choice(client:PoolClient,id:string,lock:boolean){
 return (await client.query<ChoiceRow>("SELECT profession,experience,chosen_at,clock_timestamp() now FROM mare_game.character_professions WHERE character_id=$1"+(lock?' FOR UPDATE':''),[id])).rows[0];
}
async function donatedToday(client:PoolClient,id:string,at:Date){
 const {periodSeconds}=crewDonationPolicy,time=at.getTime(),start=Math.floor(time/(periodSeconds*ms))*periodSeconds*ms;
 const row=(await client.query<{total:string}>(`
  SELECT COALESCE(sum(amount),0) total FROM mare_game.crew_ledger
  WHERE character_id=$1 AND kind='donation' AND created_at >= $2 AND created_at < $3`,[id,new Date(start),new Date(start+periodSeconds*ms)])).rows[0];
 return Number(row?.total??0);
}
async function getWeek(client:PoolClient,id:string,key:string){
 return (await client.query<WeekRow>('SELECT week_start::text,issued_at,spec,progress,material_count FROM mare_game.profession_weeks WHERE character_id=$1 AND week_start=$2',[id,key])).rows[0];
}
async function ensureWeek(client:PoolClient,id:string,selected:ChoiceRow,at:Date,excludeDonation=0){
 const period=professionWeek(at.getTime());
 const existing=await getWeek(client,id,period.key);
 if(existing)return existing;
 // A delayed event can settle an issued week; it cannot create a new historical contract from today's equipment.
 if(period.key!==professionWeek(selected.now.getTime()).key||at<selected.chosen_at)return undefined;
 const state=await readCharacterState(client,id),fighter=await readFighter(client,id,state);
 if(fighter.rulesetId!=='original-character-v1')return undefined;
 const target=selectProfessionalTarget(id,period.key,state.level,fighter.stats);
 if(!target)return undefined;
 const prisonRow=(await client.query<{cleared:number}>(`
  SELECT COALESCE((state->>'cleared')::int,0) cleared FROM mare_game.character_prison WHERE character_id=$1`,[id])).rows[0];
 const prisonCleared=prisonRow?.cleared??0;
 // The authoritative mode allows the next floor with an original inventory, and records each floor once.
 const floor=professionalFloor({enabled:true,cleared:prisonCleared,repeats:false});
 const chosenDuringWeek=selected.chosen_at.getTime()>period.start;
 const quotaUsed=chosenDuringWeek?Math.max(0,await donatedToday(client,id,selected.chosen_at)-excludeDonation):0;
 const donation=contributionTarget(chosenDuringWeek?selected.chosen_at.getTime():period.start,period.start,period.end,quotaUsed);
 const trials=target.rate*professionRules.huntHours;
 const targets:Spec['targets']={hunt:Math.max(1,Math.ceil(trials*professionRules.huntFraction)),collection:collectionGoal(trials),prison:floor.kind==='floor'?1:Math.max(1,Math.ceil(target.rate*(professionRules.cycleHours-professionRules.huntHours)*.5))};
 if(donation>0)targets.donation=donation;
 const xp=professionRules.productionWeeklyBoss?professionRules.xpProfile.boss:professionRules.xpProfile.base;
 if(xp.boss>0)targets.boss=3;
 const spec:Spec={version:professionRules.version,profession:selected.profession,characterLevel:state.level,eligibleAreas:eligibleProfessionAreas(state.level),prisonCleared,target,floor,xp,targets};
 // Clear the separate, non-tradable material pile. Historical counters and XP remain available.
 await client.query('UPDATE mare_game.profession_weeks SET material_count=0 WHERE character_id=$1 AND week_start<$2 AND material_count>0',[id,period.key]);
 const issuedAt=new Date(Math.max(period.start,selected.chosen_at.getTime()));
 await client.query('INSERT INTO mare_game.profession_weeks(character_id,week_start,issued_at,spec) VALUES($1,$2,$3,$4)',[id,period.key,issuedAt,JSON.stringify(spec)]);
 return {week_start:period.key,issued_at:issuedAt,spec,progress:{},material_count:0} satisfies WeekRow;
}

export async function chooseProfession(client:PoolClient,id:string,profession:ProfessionId){
 if(!professionIds.includes(profession))throw new AuthFault(400,'invalid_request');
 if(!await available(client))throw new AuthFault(503,'crew_unavailable');
 const chosen=await client.query(`
  INSERT INTO mare_game.character_professions(character_id,profession)
  SELECT $1,$2 WHERE EXISTS(SELECT 1 FROM mare_game.game_inventory WHERE character_id=$1)
  ON CONFLICT(character_id) DO NOTHING RETURNING profession`,[id,profession]);
 if(!chosen.rowCount){
  if(await choice(client,id,false))throw new AuthFault(409,'profession_already_chosen');
  throw new AuthFault(409,'original_inventory_required');
 }
 const selected=await choice(client,id,true);
 if(selected)await ensureWeek(client,id,selected,selected.now);
}

function eventObjectives(event:Event,spec:Spec):ObjectiveId[]{
 if(event.kind==='donation')return ['donation'];
 if(event.kind==='prison')return spec.floor.kind==='floor'&&spec.floor.floor===event.floor?['prison']:[];
 if(event.kind==='weekly-boss')return spec.targets.boss?['boss']:[];
 const objectives:ObjectiveId[]=[];
 if(spec.target.level===event.level&&event.area&&spec.eligibleAreas.includes(event.area)){
  objectives.push('hunt');
  if(spec.target.area===event.area&&spec.target.monster===event.monster){
   objectives.push('collection');
   if(spec.floor.kind==='patrol')objectives.push('prison');
  }
 }
 return objectives;
}
async function credit(client:PoolClient,id:string,events:readonly Event[],at?:Date,rollCollection=()=>randomInt(0,10000)<Math.round(professionRules.collectChance*10000)){
 if(!events.length||!await available(client))return;
 const selected=await choice(client,id,true);
 if(!selected)return;
 const moment=at??selected.now;
 if(moment<selected.chosen_at||moment.getTime()>selected.now.getTime()+ms*5)return;
 const beforeDonation=events.length===1&&events[0]!.kind==='donation'&&Math.floor(moment.getTime()/(crewDonationPolicy.periodSeconds*ms))===Math.floor(selected.chosen_at.getTime()/(crewDonationPolicy.periodSeconds*ms))?events[0]!.amount??0:0;
 const current=await ensureWeek(client,id,selected,moment,beforeDonation);
 if(!current||moment<current.issued_at)return;
 const {spec,progress}=current,credited:ObjectiveId[]=[];
 let changed=false;
 for(const event of events){
  const objectives=eventObjectives(event,spec).filter(objective=>(progress[objective]??0)<(spec.targets[objective]??0));
  if(!objectives.length)continue;
  // Persist the receipt even if the independent material roll misses.
  const claimed=await client.query(`
   INSERT INTO mare_game.profession_events(character_id,week_start,kind,event_id) VALUES($1,$2,$3,$4)
   ON CONFLICT(character_id,kind,event_id) DO NOTHING RETURNING event_id`,[id,current.week_start,event.kind,event.id]);
  if(!claimed.rowCount)continue;
  for(const objective of objectives){
   if(objective==='collection'&&!rollCollection())continue;
   const target=spec.targets[objective]!,previous=progress[objective]??0,delta=objective==='donation'?event.amount??0:1;
   progress[objective]=Math.min(target,previous+delta);
   changed=true;
   if(previous<target&&progress[objective]===target)credited.push(objective);
  }
 }
 if(!changed)return;
 const live=professionWeek(selected.now.getTime()).key===current.week_start;
 const count=progress.collection??0,materialCount=live&&count<(spec.targets.collection??0)?count:0;
 await client.query('UPDATE mare_game.profession_weeks SET progress=$3,material_count=$4 WHERE character_id=$1 AND week_start=$2',[id,current.week_start,JSON.stringify(progress),materialCount]);
 if(!credited.length)return;
 const used=(await client.query<{total:string}>('SELECT COALESCE(sum(amount),0) total FROM mare_game.profession_xp WHERE character_id=$1 AND week_start=$2',[id,current.week_start])).rows[0];
 let room=Math.min(professionRules.weeklyLimit-Number(used?.total??0),maxExperience-selected.experience),xp=0;
 for(const objective of credited){
  const amount=Math.min(room,spec.xp[objective]);
  if(amount<=0)continue;
  const inserted=await client.query(`
   INSERT INTO mare_game.profession_xp(character_id,week_start,objective,amount) VALUES($1,$2,$3,$4)
   ON CONFLICT(character_id,week_start,objective) DO NOTHING RETURNING amount`,[id,current.week_start,objective,amount]);
  if(inserted.rowCount){room-=amount;xp+=amount;}
 }
 if(xp>0)await client.query('UPDATE mare_game.character_professions SET experience=experience+$2 WHERE character_id=$1',[id,xp]);
}

export async function creditProfessionKills(client:PoolClient,id:string,kills:readonly ProfessionKill[],at?:Date,rollCollection?:()=>boolean){
 await credit(client,id,kills.filter(k=>k.area&&Number.isSafeInteger(k.monster.level)).map(k=>({id:k.id,kind:'kill',area:k.area,monster:k.monster.type,level:k.monster.level})),at,rollCollection);
}
export async function creditProfessionDonation(client:PoolClient,id:string,requestId:string,amount:number,at?:Date){
 if(Number.isSafeInteger(amount)&&amount>0)await credit(client,id,[{id:requestId,kind:'donation',amount}],at);
}
export async function creditProfessionPrison(client:PoolClient,id:string,runId:string,floor:number,at?:Date){
 if(Number.isSafeInteger(floor)&&floor>=1&&floor<=professionRules.floorCount)await credit(client,id,[{id:runId,kind:'prison',floor}],at);
}
// The production flag remains false until the official event supports three eligible victories per week.
export async function creditProfessionWeeklyBoss(client:PoolClient,id:string,victoryId:string,at?:Date){
 if(professionRules.productionWeeklyBoss)await credit(client,id,[{id:victoryId,kind:'weekly-boss'}],at);
}

export async function readProfession(client:PoolClient,id:string){
 if(!await available(client))return null;
 const selected=await choice(client,id,true),xp=selected?.experience??0,level=professionLevel(xp);
 const choices=professionIds.map(key=>({id:key,...professions[key]}));
 const base={profession:selected?.profession??null,level,experience:xp,levelStartXp:professionRules.xp[level-1]!,nextLevelXp:professionRules.xp[level]??null,choices};
 if(!selected)return {...base,week:null,history:[],futureBoss:{title:'Boss Semanal',enabled:false}};
 const current=await ensureWeek(client,id,selected,selected.now),period=professionWeek(selected.now.getTime()),selectedSpec=professions[selected.profession];
 const [record,membership]=await Promise.all([
  client.query<{weekStart:string;objective:ObjectiveId;xp:number;creditedAt:Date}>(`
   SELECT week_start::text "weekStart",objective,amount xp,credited_at "creditedAt"
   FROM mare_game.profession_xp WHERE character_id=$1 ORDER BY week_start DESC,credited_at DESC,objective LIMIT $2`,[id,windowDays*5]),
  client.query<{member:boolean}>('SELECT EXISTS(SELECT 1 FROM mare_game.crew_members WHERE character_id=$1) member',[id]),
 ]);
 const history=record.rows.map(row=>({...row,title:selectedSpec.titles[row.objective]}));
 const futureBoss={title:selectedSpec.titles.boss,enabled:Boolean(current?.spec.targets.boss)};
 if(!current)return {...base,week:null,history,futureBoss};
 const {spec,progress}=current,{target,floor}=spec,member=membership.rows[0]?.member===true;
 const quota=spec.targets.donation&&member?Math.max(0,crewDonationPolicy.dailyLimit-await donatedToday(client,id,selected.now)):null;
 const descriptions:Record<ObjectiveId,string>={
  donation:member?'Doe Berry à tesouraria da sua tripulação.':'Entre em uma tripulação para fazer doações.',
  hunt:`Derrote monstros de nível ${target.level} em mapas de caça acessíveis.`,
  collection:`Derrote ${target.monsterName} em ${target.areaName} para recuperar ${selectedSpec.material.name}. Chance por abate: 10%.`,
  prison:floor.kind==='floor'?`${floor.revisit?'Revisite':'Conclua'} o andar ${floor.floor} de Impel Down.`:`${floor.reason} Patrulhe ${target.areaName} e derrote ${target.monsterName}.`,
  boss:'Conclua três vitórias elegíveis do Boss Semanal nesta semana.',
 };
 const earnedXp=history.filter(row=>row.weekStart===period.key).reduce((total,row)=>total+row.xp,0);
 const objectives=objectiveIds.filter(id=>spec.targets[id]!==undefined).map(id=>{
  const goal=spec.targets[id]!,count=progress[id]??0;
  return {id,title:selectedSpec.titles[id],description:descriptions[id],progress:count,target:goal,xp:spec.xp[id],status:count>=goal?'complete':'active',available:id!=='donation'||member,
   ...(id==='collection'?{mapId:target.islandId,area:target.area,monster:target.monster,level:target.level,material:{...selectedSpec.material,quantity:current.material_count},dropChance:professionRules.collectChance,killsPerHour:target.rate}:{}),
   ...(id==='hunt'?{level:target.level}:{}),...(id==='prison'?{floor:floor.floor,revisit:floor.revisit}:{}),
   ...(id==='donation'?{dailyRemaining:quota,nextQuotaAt:new Date((Math.floor(selected.now.getTime()/(crewDonationPolicy.periodSeconds*ms))+1)*crewDonationPolicy.periodSeconds*ms).toISOString()}:{}),
  };
 });
 return {...base,week:{startAt:new Date(period.start).toISOString(),endAt:new Date(period.end).toISOString(),earnedXp,limit:professionRules.weeklyLimit,objectives},history,futureBoss};
}
