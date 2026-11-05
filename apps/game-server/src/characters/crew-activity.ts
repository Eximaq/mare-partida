import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {crewCapacity,crewMissionRules,crewWeek,type CrewMissionKind} from './crew-config.js';
import {crewAvailable,type CrewMemberRow,type CrewRow} from './crew-store.js';

type ActivityKind=Exclude<CrewMissionKind,'donations'>;
export type CrewActivity={
  characterId:string; kind:ActivityKind; eventId:string; quantity?:number; occurredAt?:Date;
};
type MissionCredit=Omit<CrewActivity,'kind'>&{kind:CrewMissionKind};

export function crewHuntEvents(characterId:string,kills:readonly {id:string;monster:{type:string}}[],occurredAt:Date) {
  return kills.flatMap(({id,monster})=>{
    const events:CrewActivity[]=[{characterId,kind:'kills',eventId:id,occurredAt}];
    if(monster.type==='boss')events.push({characterId,kind:'bosses',eventId:id,occurredAt});
    return events;
  });
}

type MissionRow={
  id:string; kind:CrewMissionKind; capacity:number; target:number; progress:number;
  reward_xp:number; completed_at:Date|null;
};

function crewMissionEntries(crew:CrewRow) {
  const capacity=crewCapacity(crew.facilities);
  return (Object.keys(crewMissionRules) as CrewMissionKind[]).map(kind=>{
    const rule=crewMissionRules[kind];
    return {kind,capacity,target:capacity*rule.perMember,reward_xp:rule.xp};
  });
}

export async function ensureCrewMissions(client:PoolClient,crew:CrewRow,date:Date) {
  const {cycle}=crewWeek(date);
  const rows=crewMissionEntries(crew);
  await client.query(`
    INSERT INTO mare_game.crew_missions(id,crew_id,cycle,kind,capacity,target,reward_xp)
    SELECT x.id,$1,$2,x.kind,x.capacity,x.target,x.reward_xp
    FROM jsonb_to_recordset($3::jsonb) AS x(id uuid,kind text,capacity int,target int,reward_xp int)
    ON CONFLICT(crew_id,cycle,kind) DO NOTHING`,
    [crew.id,cycle,JSON.stringify(rows.map(row=>({...row,id:randomUUID()})))]);
}

export async function readCrewMissions(client:PoolClient,crew:CrewRow,now:Date) {
  const {cycle,endsAt}=crewWeek(now);
  const stored=(await client.query<MissionRow>(`
    SELECT id,kind,capacity,target,progress,reward_xp,completed_at
    FROM mare_game.crew_missions WHERE crew_id=$1 AND cycle=$2`,[crew.id,cycle])).rows;
  return crewMissionEntries(crew).map(rule=>{
    const row=stored.find(m=>m.kind===rule.kind);
    return {id:row?.id??null,type:rule.kind,title:crewMissionRules[rule.kind].title,capacity:row?.capacity??rule.capacity,
      target:row?.target??rule.target,progress:row?.progress??0,xp:row?.reward_xp??rule.reward_xp,
      completedAt:row?.completed_at??null,endsAt};
  });
}

async function creditMission(client:PoolClient,crew:CrewRow,cycle:number,event:MissionCredit,now:Date) {
  const quantity=event.quantity??1;
  if(!Number.isSafeInteger(quantity)||quantity<1||quantity>2_000_000_000||!event.eventId||event.eventId.length>200) {
    throw new RangeError('invalid_crew_activity');
  }
  const result=(await client.query<{earned:number}>(`
    WITH mission AS (
      SELECT id FROM mare_game.crew_missions
      WHERE crew_id=$1 AND cycle=$2 AND kind=$3 AND completed_at IS NULL
    ), accepted AS (
      INSERT INTO mare_game.crew_activity_events(crew_id,character_id,kind,event_id,mission_id)
      SELECT $1,$4,$3,$5,id FROM mission
      ON CONFLICT DO NOTHING RETURNING mission_id
    ), advanced AS (
      UPDATE mare_game.crew_missions m
      SET progress=LEAST(m.target::bigint,m.progress::bigint+$6)::int,
        completed_at=CASE WHEN m.progress::bigint+$6>=m.target THEN $7::timestamptz ELSE NULL END
      FROM accepted WHERE m.id=accepted.mission_id
      RETURNING CASE WHEN m.completed_at IS NULL THEN 0 ELSE m.reward_xp END AS earned
    )
    SELECT earned FROM advanced`,[crew.id,cycle,event.kind,event.characterId,event.eventId,quantity,now])).rows[0];
  if(result?.earned)await client.query('UPDATE mare_game.crews SET xp=xp+$2 WHERE id=$1',[crew.id,result.earned]);
}

// Caller holds the crew lock, and the donation is already in the authoritative ledger.
export async function creditCrewDonation(client:PoolClient,crew:CrewRow,characterId:string,requestId:string,amount:number,at:Date) {
  await ensureCrewMissions(client,crew,at);
  await creditMission(client,crew,crewWeek(at).cycle,{characterId,kind:'donations',eventId:requestId,quantity:amount},at);
}

// Call only for newly persisted server combat receipts. Lock groups in UUID order for Party batches.
export async function creditCrewActivities(client:PoolClient,events:readonly CrewActivity[]) {
  if(!events.length||!await crewAvailable(client))return;
  const now=(await client.query<{now:Date}>('SELECT clock_timestamp() now')).rows[0]!.now;
  const ids=[...new Set(events.map(event=>event.characterId))];
  const groups=(await client.query<CrewRow>(`
    SELECT g.* FROM mare_game.crews g
    WHERE g.dissolved_at IS NULL AND EXISTS (
      SELECT 1 FROM mare_game.crew_members m WHERE m.crew_id=g.id AND m.character_id=ANY($1::uuid[])
    ) ORDER BY g.id FOR UPDATE OF g`,[ids])).rows;
  if(!groups.length)return;
  const members=(await client.query<CrewMemberRow>(
    'SELECT * FROM mare_game.crew_members WHERE character_id=ANY($1::uuid[]) AND crew_id=ANY($2::uuid[])',
    [ids,groups.map(g=>g.id)])).rows;
  const nowCycle=crewWeek(now).cycle;
  const ready=new Set<string>();
  for(const event of events) {
    const member=members.find(m=>m.character_id===event.characterId);
    const crew=member&&groups.find(g=>g.id===member.crew_id);
    const date=event.occurredAt??now;
    if(!crew||!member||member.joined_at>date||date>now)continue;
    const {cycle}=crewWeek(date);
    // A prior cycle only receives late receipts if its real mission had been instantiated.
    if(cycle===nowCycle&&!ready.has(crew.id)) {
      await ensureCrewMissions(client,crew,date);
      ready.add(crew.id);
    }
    await creditMission(client,crew,cycle,event,now);
  }
}

export async function creditCrewActivity(client:PoolClient,characterId:string,kind:ActivityKind,eventId:string,quantity=1,occurredAt?:Date) {
  return creditCrewActivities(client,[{characterId,kind,eventId,quantity,...(occurredAt?{occurredAt}:{})}]);
}
