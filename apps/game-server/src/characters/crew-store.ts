import type {PoolClient} from 'pg';
import {AuthFault} from '../auth/errors.js';
import {crewCapacity,crewDonationPolicy,crewLevel,crewPolicy,type CrewFacilities} from './crew-config.js';

export type CrewRole='captain'|'officer'|'member';
export type CrewRecruitment='open'|'approval';
export type CrewRow={
  id:string; name:string; tag:string; flag:string; captain_id:string;
  policy:CrewRecruitment; min_level:number; xp:string; treasury:string;
  facilities:CrewFacilities; dissolved_at:Date|null;
};
export type CrewMemberRow={character_id:string; crew_id:string; role:CrewRole; joined_at:Date};

export async function crewAvailable(client:PoolClient) {
  return (await client.query("SELECT to_regclass('mare_game.crews') IS NOT NULL AS present")).rows[0]?.present===true;
}

export async function crewMember(client:PoolClient,id:string) {
  return (await client.query<CrewMemberRow>('SELECT * FROM mare_game.crew_members WHERE character_id=$1',[id])).rows[0]??null;
}

export async function lockCrew(client:PoolClient,id:string) {
  const crew=(await client.query<CrewRow>('SELECT * FROM mare_game.crews WHERE id=$1 AND dissolved_at IS NULL FOR UPDATE',[id])).rows[0];
  if(!crew)throw new AuthFault(404,'crew_missing');
  return crew;
}

export async function crewClock(client:PoolClient):Promise<Date> {
  return (await client.query<{now:Date}>('SELECT transaction_timestamp() now')).rows[0]!.now;
}

export async function crewDonation(client:PoolClient,id:string,now:Date) {
  const periodMs=crewDonationPolicy.periodSeconds*1000;
  const dayStart=new Date(Math.floor(now.getTime()/periodMs)*periodMs);
  const resetsAt=new Date(dayStart.getTime()+periodMs);
  const used=Number((await client.query(
    "SELECT COALESCE(sum(amount),0)::text used FROM mare_game.crew_ledger WHERE character_id=$1 AND kind='donation' AND created_at>=$2 AND created_at<$3",
    [id,dayStart,resetsAt])).rows[0].used);
  return {used,limit:crewDonationPolicy.dailyLimit,resetsAt};
}

export function crewSummary(crew:CrewRow,memberCount:number) {
  const {id,name,tag,flag,policy,facilities}=crew;
  return {id,name,tag,flag,policy,minLevel:crew.min_level,captainId:crew.captain_id,
    memberCount,capacity:crewCapacity(facilities),shipStage:facilities.hull,...crewLevel(Number(crew.xp))};
}

export async function listCrews(client:PoolClient,search:string) {
  const term=search.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR').slice(0,32);
  const rows=(await client.query<CrewRow&{member_count:number}>(`
    SELECT g.*,(SELECT count(*)::int FROM mare_game.crew_members m WHERE m.crew_id=g.id) member_count
    FROM mare_game.crews g
    WHERE g.dissolved_at IS NULL AND (strpos(g.name_key,$1)>0 OR strpos(lower(g.tag),$1)>0)
    ORDER BY g.xp DESC,g.name_key,g.id LIMIT $2`,[term,crewPolicy.listLimit])).rows;
  return rows.map(row=>crewSummary(row,row.member_count));
}

export async function readCrewIdentities(client:PoolClient,ids:readonly string[]) {
  type IdentityRow={character_id:string;id:string;name:string;tag:string;flag:string};
  if(!ids.length||!await crewAvailable(client))return new Map<string,Omit<IdentityRow,'character_id'>>();
  const {rows}=await client.query<IdentityRow>(`
    SELECT m.character_id,g.id,g.name,g.tag,g.flag
    FROM mare_game.crew_members m JOIN mare_game.crews g ON g.id=m.crew_id
    WHERE m.character_id=ANY($1::uuid[]) AND g.dissolved_at IS NULL`,[ids]);
  return new Map(rows.map(({character_id,...crew})=>[character_id,crew]));
}
