import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {AuthFault} from '../auth/errors.js';
import {crewCapacity,crewFacilities,crewLevel,crewPolicy,crewProject,seaWar,type CrewFacility} from './crew-config.js';
import {creditCrewDonation,ensureCrewMissions,readCrewMissions} from './crew-activity.js';
import {creditProfessionDonation,professionLevel,readCrewProfessionBenefits} from './crew-professions.js';
import {
  crewAvailable,crewClock,crewDonation,crewMember,crewSummary,listCrews,lockCrew,readCrewIdentities,
  type CrewRecruitment,type CrewRole,type CrewRow,
} from './crew-store.js';

export {creditCrewActivities,creditCrewActivity,type CrewActivity} from './crew-activity.js';

type CrewCommand = {
  requestId:string;
} & (
  | {action:'crew.create';payload:{name:string;tag:string;flag:string;policy:CrewRecruitment;minLevel:number}}
  | {action:'crew.join'|'crew.apply';payload:{crewId:string}}
  | {action:'crew.invite';payload:{name:string}}
  | {action:'crew.respond';payload:{requestId:string;accept:boolean}}
  | {action:'crew.recruitment';payload:{policy:CrewRecruitment;minLevel:number}}
  | {action:'crew.role';payload:{memberId:string;role:'officer'|'member'}}
  | {action:'crew.transfer'|'crew.kick';payload:{memberId:string}}
  | {action:'crew.leave';payload:Record<string,never>}
  | {action:'crew.dissolve';payload:{confirmed:true}}
  | {action:'crew.donate';payload:{amount:number}}
  | {action:'crew.upgrade';payload:{facility:CrewFacility;expectedLevel:number}}
);
type CrewRequest={
  id:string;crew_id:string;character_id:string;kind:'application'|'invitation';
  status:'pending'|'accepted'|'declined'|'cancelled'|'expired';expires_at:Date;
};
type MemberViewRow={
  id:string;name:string;class_id:string;faction_id:string;level:number;role:CrewRole;
  power:number;profession:string|null;experience:number|null;contribution:string;
};

async function requireCrew(client:PoolClient) {
  if(!await crewAvailable(client))throw new AuthFault(503,'crew_unavailable');
}

// This lock guards membership of a destination character without acquiring that
// character's gameplay lock. Existing crew row locks always precede this lock.
async function lockEntry(client:PoolClient,id:string) {
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,735132881))',[id]);
}

async function enforceEntry(client:PoolClient,id:string) {
  if(await crewMember(client,id))throw new AuthFault(409,'crew_already_joined');
  const blocked=await client.query(
    'SELECT character_id FROM mare_game.crew_entry_blocks WHERE character_id=$1 AND until_at>clock_timestamp()',[id]);
  if(blocked.rowCount)throw new AuthFault(409,'crew_entry_blocked');
}

async function checkEligibility(client:PoolClient,crew:CrewRow,id:string) {
  const result=(await client.query<{level:number;members:number}>(`
    SELECT p.level,(SELECT count(*)::int FROM mare_game.crew_members WHERE crew_id=$2) members
    FROM mare_game.character_progression p WHERE character_id=$1`,[id,crew.id])).rows[0];
  if(!result||result.level<crew.min_level)throw new AuthFault(409,'crew_level_required');
  if(result.members>=crewCapacity(crew.facilities))throw new AuthFault(409,'crew_full');
}

async function addMember(client:PoolClient,crew:CrewRow,id:string,requestId?:string) {
  await enforceEntry(client,id);
  await checkEligibility(client,crew,id);
  await client.query("INSERT INTO mare_game.crew_members(character_id,crew_id,role,joined_at) VALUES($1,$2,'member',clock_timestamp())",
    [id,crew.id]);
  await client.query(`
    UPDATE mare_game.crew_requests
    SET status=CASE WHEN id=$2 THEN 'accepted' ELSE 'cancelled' END
    WHERE character_id=$1 AND status='pending'`,[id,requestId??null]);
}

async function lockActorCrew(client:PoolClient,id:string) {
  const member=await crewMember(client,id);
  if(!member)throw new AuthFault(409,'crew_not_joined');
  const crew=await lockCrew(client,member.crew_id);
  const current=await crewMember(client,id);
  if(!current||current.crew_id!==crew.id)throw new AuthFault(409,'crew_not_joined');
  return {crew,role:current.role};
}

function assertCaptain(role:CrewRole) {
  if(role!=='captain')throw new AuthFault(403,'crew_captain_required');
}

function assertOfficer(role:CrewRole) {
  if(role==='member')throw new AuthFault(403,'crew_officer_required');
}

function normalizeIdentity(payload:Extract<CrewCommand,{action:'crew.create'}>['payload']) {
  const name=payload.name.normalize('NFC').trim().replace(/\s+/g,' ');
  const nameLength=[...name].length;
  const tag=payload.tag.normalize('NFC').trim().toUpperCase();
  const flag=payload.flag.toLowerCase();
  if(nameLength<crewPolicy.nameMin||nameLength>crewPolicy.nameMax||
     !/^[\p{L}\p{N}][\p{L}\p{M}\p{N} '’\-]*$/u.test(name)||
     !/^[A-Z0-9]{2,6}$/.test(tag)||!/^[0-9a-f]{1024}$/.test(flag)||!/[1-9a-f]/.test(flag)) {
    throw new AuthFault(400,'crew_invalid_identity');
  }
  return {name,nameKey:name.toLocaleLowerCase('pt-BR'),tag,flag};
}

async function createCrew(client:PoolClient,id:string,input:Extract<CrewCommand,{action:'crew.create'}>) {
  const {name,nameKey,tag,flag}=normalizeIdentity(input.payload);
  const {policy,minLevel}=input.payload;
  await lockEntry(client,id);
  await enforceEntry(client,id);
  const crewId=randomUUID();
  const crew=(await client.query<CrewRow>(`
    INSERT INTO mare_game.crews(id,name,name_key,tag,flag,captain_id,policy,min_level)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING *`,
    [crewId,name,nameKey,tag,flag,id,policy,minLevel])).rows[0];
  if(!crew)throw new AuthFault(409,'crew_identity_taken');
  await client.query("INSERT INTO mare_game.crew_members(character_id,crew_id,role,joined_at) VALUES($1,$2,'captain',clock_timestamp())",
    [id,crewId]);
  await client.query("UPDATE mare_game.crew_requests SET status='cancelled' WHERE character_id=$1 AND status='pending'",[id]);
  await ensureCrewMissions(client,crew,await crewClock(client));
}

async function sendRequest(client:PoolClient,crew:CrewRow,target:string,sender:string,kind:CrewRequest['kind']) {
  await client.query(`
    UPDATE mare_game.crew_requests SET status='expired'
    WHERE crew_id=$1 AND character_id=$2 AND kind=$3 AND status='pending' AND expires_at<=clock_timestamp()`,
    [crew.id,target,kind]);
  await client.query(`
    INSERT INTO mare_game.crew_requests(id,crew_id,character_id,sender_id,kind,expires_at)
    VALUES($1,$2,$3,$4,$5,clock_timestamp()+$6::int*interval '1 hour')
    ON CONFLICT(crew_id,character_id,kind) WHERE status='pending' DO NOTHING`,
    [randomUUID(),crew.id,target,sender,kind,crewPolicy.requestHours]);
}

async function resolveRequest(client:PoolClient,id:string,requestId:string,accept:boolean) {
  const existing=(await client.query<CrewRequest>('SELECT * FROM mare_game.crew_requests WHERE id=$1',[requestId])).rows[0];
  if(!existing)throw new AuthFault(404,'crew_request_missing');
  if(existing.kind==='invitation'&&existing.character_id!==id)throw new AuthFault(404,'crew_request_missing');
  if(existing.kind==='application'&&(await crewMember(client,id))?.crew_id!==existing.crew_id) {
    throw new AuthFault(404,'crew_request_missing');
  }
  const crew=await lockCrew(client,existing.crew_id);
  if(existing.kind==='application') {
    const actor=await crewMember(client,id);
    if(actor?.crew_id!==crew.id)throw new AuthFault(404,'crew_request_missing');
    assertOfficer(actor.role);
  }
  await lockEntry(client,existing.character_id);
  const request=(await client.query<CrewRequest>(`
    SELECT * FROM mare_game.crew_requests
    WHERE id=$1 AND status='pending' AND expires_at>clock_timestamp()`,[requestId])).rows[0];
  if(!request)throw new AuthFault(409,'crew_request_expired');
  if(accept)await addMember(client,crew,request.character_id,request.id);
  else await client.query("UPDATE mare_game.crew_requests SET status='declined' WHERE id=$1",[request.id]);
}

async function targetMember(client:PoolClient,crew:CrewRow,target:string) {
  const member=await crewMember(client,target);
  if(member?.crew_id!==crew.id||member.role==='captain')throw new AuthFault(409,'crew_member_missing');
  return member;
}

async function blockEntry(client:PoolClient,id:string,hours:number) {
  await client.query(`
    INSERT INTO mare_game.crew_entry_blocks(character_id,until_at) VALUES($1,clock_timestamp()+$2::int*interval '1 hour')
    ON CONFLICT(character_id) DO UPDATE SET until_at=excluded.until_at`,[id,hours]);
}

async function donate(client:PoolClient,crew:CrewRow,id:string,requestId:string,amount:number) {
  if(!Number.isSafeInteger(amount)||amount<1)throw new AuthFault(400,'crew_invalid_donation');
  const at=await crewClock(client);
  const quota=await crewDonation(client,id,at);
  if(quota.used+amount>quota.limit)throw new AuthFault(409,'crew_donation_limit');
  const paid=await client.query('UPDATE mare_game.character_progression SET gold=gold-$2 WHERE character_id=$1 AND gold>=$2',[id,amount]);
  if(!paid.rowCount)throw new AuthFault(409,'crew_insufficient_gold');
  await client.query('UPDATE mare_game.crews SET treasury=treasury+$2 WHERE id=$1',[crew.id,amount]);
  await client.query(`
    INSERT INTO mare_game.crew_ledger(crew_id,character_id,request_id,kind,amount,created_at)
    VALUES($1,$2,$3,'donation',$4,$5)`,[crew.id,id,requestId,amount,at]);
  await creditCrewDonation(client,crew,id,requestId,amount,at);
  await creditProfessionDonation(client,id,requestId,amount,at);
}

async function upgrade(client:PoolClient,crew:CrewRow,id:string,requestId:string,facility:CrewFacility,expectedLevel:number) {
  if(!crewFacilities.includes(facility))throw new AuthFault(400,'crew_invalid_facility');
  const level=crew.facilities[facility];
  if(level!==expectedLevel)throw new AuthFault(409,'crew_project_conflict');
  const benefits=await readCrewProfessionBenefits(client,crew.id);
  const project=crewProject(facility,level,benefits.carpenter);
  if(project.nextLevel===null||project.cost===null||project.requiredCrewLevel===null) {
    throw new AuthFault(409,'crew_project_max_level');
  }
  if(crewLevel(Number(crew.xp)).level<project.requiredCrewLevel)throw new AuthFault(409,'crew_project_level_required');
  if(Number(crew.treasury)<project.cost)throw new AuthFault(409,'crew_insufficient_treasury');
  // Anchor the week's target before increasing capacity, even if nobody has contributed yet.
  if(facility==='hull')await ensureCrewMissions(client,crew,await crewClock(client));
  await client.query(`
    UPDATE mare_game.crews SET treasury=treasury-$2,
      facilities=jsonb_set(facilities,ARRAY[$3]::text[],to_jsonb($4::int)) WHERE id=$1`,
    [crew.id,project.cost,facility,project.nextLevel]);
  await client.query(`
    INSERT INTO mare_game.crew_ledger(crew_id,character_id,request_id,kind,amount,facility)
    VALUES($1,$2,$3,'upgrade',$4,$5)`,[crew.id,id,requestId,project.cost,facility]);
}

/** Run inside the authenticated character command transaction. The outer service owns receipts. */
export async function executeCrew(client:PoolClient,id:string,input:CrewCommand,_state?:{version:number}) {
  await requireCrew(client);
  switch(input.action) {
    case 'crew.create':
      await createCrew(client,id,input);
      break;
    case 'crew.join':
    case 'crew.apply': {
      const crew=await lockCrew(client,input.payload.crewId);
      await lockEntry(client,id);
      if(input.action==='crew.join') {
        if(crew.policy!=='open')throw new AuthFault(409,'crew_requires_approval');
        await addMember(client,crew,id);
      } else {
        if(crew.policy!=='approval')throw new AuthFault(409,'crew_open_recruitment');
        if(await crewMember(client,id))throw new AuthFault(409,'crew_already_joined');
        await checkEligibility(client,crew,id);
        await sendRequest(client,crew,id,id,'application');
      }
      break;
    }
    case 'crew.respond':
      await resolveRequest(client,id,input.payload.requestId,input.payload.accept);
      break;
    default: {
      const {crew,role}=await lockActorCrew(client,id);
      switch(input.action) {
        case 'crew.invite': {
          assertOfficer(role);
          const candidates=(await client.query<{id:string}>(
            'SELECT id FROM mare_game.characters WHERE lower(name)=lower($1) ORDER BY id LIMIT 2',[input.payload.name])).rows;
          const target=candidates[0]?.id;
          if(candidates.length!==1||!target)throw new AuthFault(404,'crew_character_missing');
          if(target===id)throw new AuthFault(409,'crew_self_invite');
          await lockEntry(client,target);
          if(await crewMember(client,target))throw new AuthFault(409,'crew_already_joined');
          await checkEligibility(client,crew,target);
          await sendRequest(client,crew,target,id,'invitation');
          break;
        }
        case 'crew.recruitment':
          assertOfficer(role);
          await client.query('UPDATE mare_game.crews SET policy=$2,min_level=$3 WHERE id=$1',
            [crew.id,input.payload.policy,input.payload.minLevel]);
          break;
        case 'crew.role':
          assertCaptain(role);
          await targetMember(client,crew,input.payload.memberId);
          await client.query('UPDATE mare_game.crew_members SET role=$2 WHERE character_id=$1',
            [input.payload.memberId,input.payload.role]);
          break;
        case 'crew.transfer':
          assertCaptain(role);
          await targetMember(client,crew,input.payload.memberId);
          await client.query("UPDATE mare_game.crew_members SET role='officer' WHERE character_id=$1",[id]);
          await client.query("UPDATE mare_game.crew_members SET role='captain' WHERE character_id=$1",[input.payload.memberId]);
          await client.query('UPDATE mare_game.crews SET captain_id=$2 WHERE id=$1',[crew.id,input.payload.memberId]);
          break;
        case 'crew.kick':
          assertCaptain(role);
          await targetMember(client,crew,input.payload.memberId);
          await lockEntry(client,input.payload.memberId);
          await client.query('DELETE FROM mare_game.crew_members WHERE character_id=$1 AND crew_id=$2',
            [input.payload.memberId,crew.id]);
          break;
        case 'crew.leave':
          if(role==='captain')throw new AuthFault(409,'crew_transfer_or_dissolve');
          await lockEntry(client,id);
          await client.query('DELETE FROM mare_game.crew_members WHERE character_id=$1 AND crew_id=$2',[id,crew.id]);
          await blockEntry(client,id,crewPolicy.departureHours);
          break;
        case 'crew.dissolve':
          assertCaptain(role);
          if(input.payload.confirmed!==true)throw new AuthFault(400,'crew_confirmation_required');
          await lockEntry(client,id);
          await client.query('UPDATE mare_game.crews SET dissolved_at=clock_timestamp() WHERE id=$1',[crew.id]);
          await client.query('DELETE FROM mare_game.crew_members WHERE crew_id=$1',[crew.id]);
          await client.query("UPDATE mare_game.crew_requests SET status='cancelled' WHERE crew_id=$1 AND status='pending'",[crew.id]);
          await blockEntry(client,id,crewPolicy.dissolutionHours);
          break;
        case 'crew.donate':
          await donate(client,crew,id,input.requestId,input.payload.amount);
          break;
        case 'crew.upgrade':
          assertCaptain(role);
          await upgrade(client,crew,id,input.requestId,input.payload.facility,input.payload.expectedLevel);
          break;
      }
    }
  }
  const bumped=await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1 AND state_version<9007199254740991',[id]);
  if(!bumped.rowCount)throw new AuthFault(503,'state_version_exhausted');
}

async function readRequests(client:PoolClient,id:string,group:Pick<CrewRow,'id'>&{role:CrewRole}|null) {
  const requests=(await client.query(`
    SELECT r.id,r.crew_id,r.character_id,r.kind,r.created_at,r.expires_at,g.name crew_name,g.tag crew_tag,g.flag,
      ch.name character_name,sender.name sender_name
    FROM mare_game.crew_requests r JOIN mare_game.crews g ON g.id=r.crew_id
    JOIN mare_game.characters ch ON ch.id=r.character_id JOIN mare_game.characters sender ON sender.id=r.sender_id
    WHERE g.dissolved_at IS NULL AND r.status='pending' AND r.expires_at>clock_timestamp()
      AND (r.character_id=$1 OR (r.crew_id=$2 AND r.kind='application'))
    ORDER BY r.created_at DESC,r.id LIMIT $3`,[id,group&&group.role!=='member'?group.id:null,crewPolicy.inboxLimit])).rows;
  const rows=requests.map(r=>({
    id:r.id,crewId:r.crew_id,crewName:r.crew_name,crewTag:r.crew_tag,flag:r.flag,characterId:r.character_id,
    characterName:r.character_name,senderName:r.sender_name,createdAt:r.created_at,expiresAt:r.expires_at,
    direction:r.kind==='application'&&r.character_id===id?'own':'incoming',kind:r.kind,
  }));
  return {invites:rows.filter(r=>r.kind==='invitation'),applications:rows.filter(r=>r.kind==='application')};
}

async function readGroup(client:PoolClient,crew:CrewRow&{role:CrewRole},now:Date) {
  const rows=(await client.query<MemberViewRow>(`
    SELECT ch.id,ch.name,ch.class_id,ch.faction_id,p.level,m.role,COALESCE(h.power,0) power,
      pr.profession,pr.experience,COALESCE(gifts.amount,0)::text contribution
    FROM mare_game.crew_members m
    JOIN mare_game.characters ch ON ch.id=m.character_id
    JOIN mare_game.character_progression p ON p.character_id=ch.id
    LEFT JOIN mare_game.character_hierarchy h ON h.character_id=ch.id
    LEFT JOIN mare_game.character_professions pr ON pr.character_id=ch.id
    LEFT JOIN (
      SELECT character_id,sum(amount) amount FROM mare_game.crew_ledger
      WHERE crew_id=$1 AND kind='donation' GROUP BY character_id
    ) gifts ON gifts.character_id=ch.id
    WHERE m.crew_id=$1 ORDER BY CASE m.role WHEN 'captain' THEN 0 WHEN 'officer' THEN 1 ELSE 2 END,m.joined_at,m.character_id`,
    [crew.id])).rows;
  const members=rows.map(row=>({id:row.id,name:row.name,classId:row.class_id,factionId:row.faction_id,
    level:row.level,role:row.role,power:row.power,contribution:Number(row.contribution),
    profession:row.profession===null?null:{id:row.profession,level:professionLevel(Number(row.experience))}}));
  const history=(await client.query(`
    SELECT l.kind,l.amount,l.facility,l.created_at,c.name FROM mare_game.crew_ledger l
    JOIN mare_game.characters c ON c.id=l.character_id WHERE crew_id=$1
    ORDER BY l.created_at DESC,l.request_id LIMIT 30`,[crew.id])).rows.map(row=>({
      kind:row.kind,amount:Number(row.amount),facility:row.facility,createdAt:row.created_at,characterName:row.name,
    }));
  const benefits=await readCrewProfessionBenefits(client,crew.id);
  return {...crewSummary(crew,members.length),xp:Number(crew.xp),treasury:Number(crew.treasury),role:crew.role,
    facilities:crew.facilities,members,history,benefits,missions:await readCrewMissions(client,crew,now),futureMissions:[seaWar],
    projects:crewFacilities.map(facility=>crewProject(facility,crew.facilities[facility],benefits.carpenter))};
}

export async function readCrew(client:PoolClient,id:string,search='') {
  await requireCrew(client);
  const current=(await client.query<(CrewRow&{role:CrewRole})>(`
    SELECT g.*,m.role FROM mare_game.crews g JOIN mare_game.crew_members m ON m.crew_id=g.id
    WHERE m.character_id=$1 AND g.dissolved_at IS NULL`,[id])).rows[0]??null;
  const serverNow=await crewClock(client);
  const blockedUntil=(await client.query<{until_at:Date}>(
    'SELECT until_at FROM mare_game.crew_entry_blocks WHERE character_id=$1 AND until_at>$2',[id,serverNow])).rows[0]?.until_at??null;
  let group=current?await readGroup(client,current,serverNow):null;
  // Drop a roster or inbox read if the viewer's membership changed during assembly.
  const membership=current?await crewMember(client,id):null;
  if(current&&(membership?.crew_id!==current.id||membership.role!==current.role))group=null;
  const requests=await readRequests(client,id,group?current:null);
  return {serverNow,blockedUntil,group,listing:group?[]:await listCrews(client,search),...requests,
    donation:await crewDonation(client,id,serverNow),contribution:group?.members.find(m=>m.id===id)?.contribution??0};
}

export async function readCrewIdentity(client:PoolClient,id:string) {
  return (await readCrewIdentities(client,[id])).get(id)??null;
}

export async function readCrewRankings(client:PoolClient) {
  await requireCrew(client);
  const rows=(await client.query<CrewRow&{member_count:number;power:string;captain:string}>(`
    SELECT g.*,count(m.character_id)::int member_count,COALESCE(sum(h.power),0)::text power,c.name captain
    FROM mare_game.crews g JOIN mare_game.characters c ON c.id=g.captain_id
    JOIN mare_game.crew_members m ON m.crew_id=g.id
    LEFT JOIN mare_game.character_hierarchy h ON h.character_id=m.character_id
    WHERE g.dissolved_at IS NULL
    GROUP BY g.id,c.name ORDER BY COALESCE(sum(h.power),0) DESC,g.xp DESC,g.created_at,g.id LIMIT $1`,
    [crewPolicy.rankLimit])).rows;
  return rows.map((row,index)=>({...crewSummary(row,row.member_count),rank:index+1,power:Number(row.power),captain:row.captain}));
}
