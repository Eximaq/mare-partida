import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {AuthFault} from '../auth/errors.js';
import {crewCapacity,type CrewFacilities} from './crew-config.js';

export type SocialContactCommand = {requestId:string} & (
  | {action:'friend.request';payload:{targetId:string}}
  | {action:'friend.respond';payload:{requestId:string;accept:boolean}}
  | {action:'friend.cancel';payload:{requestId:string}}
  | {action:'friend.remove';payload:{targetId:string}}
  | {action:'contact.block';payload:{targetId:string;blocked:boolean}}
  | {action:'message.send';payload:{targetId:string;body:string}}
  | {action:'message.read';payload:{targetId:string;throughId:string}}
);

const limits = {
  heartbeatSeconds:5, onlineSeconds:20, messageChars:500, messagesPerMinute:20,
  friendRequestsPerHour:12, pageSize:40, searchSize:12,
};
const pair = (a:string,b:string) => [a.toLowerCase(),b.toLowerCase()].sort();
const other = (id:string,low:string,high:string) => low===id?high:low;

export async function socialAvailable(client:PoolClient) {
  return (await client.query("SELECT to_regclass('mare_game.social_friend_requests') IS NOT NULL AS available")).rows[0]?.available===true;
}

async function requireSocial(client:PoolClient) {
  if(!await socialAvailable(client))throw new AuthFault(503,'social_unavailable');
}

async function lockPair(client:PoolClient,a:string,b:string) {
  // Independent of the actors' gameplay locks. Never wait for a peer's gameplay lock while holding this lock.
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,39817521))',[pair(a,b).join(':')]);
}

async function blockedPair(client:PoolClient,a:string,b:string) {
  return !!(await client.query(`SELECT 1 FROM mare_game.social_contact_blocks
    WHERE (blocker_id=$1 AND target_id=$2) OR (blocker_id=$2 AND target_id=$1) LIMIT 1`,[a,b])).rowCount;
}

/** Reuses the same lock as block/unblock. Older Party/Crew migrations remain usable. */
export async function assertSocialContactAllowed(client:PoolClient,actorId:string,targetId:string) {
  if(!await socialAvailable(client))return;
  const target=targetId.toLowerCase();
  await lockPair(client,actorId,target);
  if(await blockedPair(client,actorId,target))throw new AuthFault(409,'contact_blocked');
}

const validPlayLease = `cc.expires_at>clock_timestamp() AND s.kind='play'
  AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp() AND s.idle_expires_at>clock_timestamp()
  AND s.provider_valid_until>clock_timestamp() AND s.account_epoch=a.auth_epoch`;

export async function heartbeatSocialPresence(client:PoolClient,id:string,sessionId:string) {
  if(!await socialAvailable(client))return;
  await client.query(`INSERT INTO mare_game.social_presence(character_id,control_epoch,last_seen)
    SELECT c.id,cc.epoch,clock_timestamp() FROM mare_game.characters c
    JOIN mare_game.character_control cc ON cc.character_id=c.id AND cc.session_id=$2
    JOIN mare_game.app_sessions s ON s.id=cc.session_id AND s.account_id=c.account_id
    JOIN mare_game.accounts a ON a.id=c.account_id
    LEFT JOIN mare_game.social_presence p ON p.character_id=c.id
    WHERE c.id=$1 AND ${validPlayLease}
      AND (p.last_seen IS NULL OR p.control_epoch<>cc.epoch OR p.last_seen<=clock_timestamp()-$3::int*interval '1 second')
    ON CONFLICT(character_id) DO UPDATE SET control_epoch=excluded.control_epoch,last_seen=excluded.last_seen
    WHERE mare_game.social_presence.control_epoch<=excluded.control_epoch
      AND mare_game.social_presence.last_seen<excluded.last_seen`,[id,sessionId,limits.heartbeatSeconds]);
}

export async function isSocialCharacterOnline(client:PoolClient,id:string) {
  if(!await socialAvailable(client))return false;
  return !!(await client.query(`SELECT 1 FROM mare_game.characters c
    JOIN mare_game.character_control cc ON cc.character_id=c.id
    JOIN mare_game.app_sessions s ON s.id=cc.session_id AND s.account_id=c.account_id
    JOIN mare_game.accounts a ON a.id=c.account_id
    JOIN mare_game.social_presence p ON p.character_id=c.id AND p.control_epoch=cc.epoch
    WHERE c.id=$1 AND ${validPlayLease} AND p.last_seen>clock_timestamp()-$2::int*interval '1 second'`,[id,limits.onlineSeconds])).rowCount;
}

async function checkTarget(client:PoolClient,id:string,target:string) {
  if(id===target)throw new AuthFault(409,'contact_self');
  if(!(await client.query('SELECT id FROM mare_game.characters WHERE id=$1',[target])).rowCount)
    throw new AuthFault(404,'contact_missing');
}

type RequestRow = {id:string;sender_id:string;target_id:string;created_at:Date;status:string};

async function requestFriend(client:PoolClient,id:string,target:string) {
  await checkTarget(client,id,target);
  await lockPair(client,id,target);
  if(await blockedPair(client,id,target))throw new AuthFault(409,'contact_blocked');
  const existing=(await client.query<{status:string;sender_id:string}>(`SELECT status,sender_id
    FROM mare_game.social_friend_requests WHERE character_low=$1 AND character_high=$2
    AND status IN ('pending','accepted')`,pair(id,target))).rows[0];
  if(existing?.status==='accepted')throw new AuthFault(409,'friend_already_added');
  if(existing)throw new AuthFault(409,existing.sender_id===id?'friend_request_pending':'friend_request_received');
  const recent=await client.query<{count:number}>(`SELECT count(*)::int count FROM mare_game.social_friend_requests
    WHERE sender_id=$1 AND created_at>clock_timestamp()-interval '1 hour'`,[id]);
  if(recent.rows[0]!.count>=limits.friendRequestsPerHour)throw new AuthFault(429,'friend_rate_limited');
  await client.query('INSERT INTO mare_game.social_friend_requests(id,sender_id,target_id) VALUES($1,$2,$3)',
    [randomUUID(),id,target]);
}

async function resolveFriend(client:PoolClient,id:string,requestId:string,status:'accepted'|'declined'|'cancelled') {
  const owner=status==='cancelled'?'sender_id':'target_id';
  const request=(await client.query<RequestRow>(`SELECT id,sender_id,target_id FROM mare_game.social_friend_requests
    WHERE id=$1 AND ${owner}=$2`,[requestId,id])).rows[0];
  if(!request)throw new AuthFault(404,'friend_request_missing');
  await lockPair(client,request.sender_id,request.target_id);
  if(status==='accepted'&&await blockedPair(client,request.sender_id,request.target_id))throw new AuthFault(409,'contact_blocked');
  if(!(await client.query(`UPDATE mare_game.social_friend_requests SET status=$2 WHERE id=$1 AND status='pending'`,
    [request.id,status])).rowCount)throw new AuthFault(409,'friend_request_closed');
}

async function blockContact(client:PoolClient,id:string,target:string,blocked:boolean) {
  await checkTarget(client,id,target);
  await lockPair(client,id,target);
  if(!blocked){
    await client.query('DELETE FROM mare_game.social_contact_blocks WHERE blocker_id=$1 AND target_id=$2',[id,target]);
    return;
  }
  await client.query('INSERT INTO mare_game.social_contact_blocks(blocker_id,target_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,target]);
  await client.query(`UPDATE mare_game.social_friend_requests SET status='cancelled'
    WHERE character_low=$1 AND character_high=$2 AND status='pending'`,pair(id,target));
}

async function sendMessage(client:PoolClient,id:string,target:string,requestId:string,rawBody:string) {
  const body=rawBody.trim();
  if(!body||[...body].length>limits.messageChars||/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(body))
    throw new AuthFault(400,'message_invalid');
  await checkTarget(client,id,target);
  await lockPair(client,id,target);
  if(await blockedPair(client,id,target))throw new AuthFault(409,'contact_blocked');
  const keys=pair(id,target);
  const recent=(await client.query<{count:number}>(`SELECT count(*)::int count FROM mare_game.social_private_messages
    WHERE sender_id=$1 AND sent_at>clock_timestamp()-interval '1 minute'`,[id])).rows[0]!;
  if(recent.count>=limits.messagesPerMinute)throw new AuthFault(429,'message_rate_limited');
  const conversation=await client.query(`SELECT 1 FROM mare_game.social_conversations WHERE character_low=$1 AND character_high=$2`,keys);
  if(!conversation.rowCount){
    const friend=await client.query(`SELECT 1 FROM mare_game.social_friend_requests
      WHERE character_low=$1 AND character_high=$2 AND status='accepted'`,keys);
    if(!friend.rowCount)throw new AuthFault(409,'message_friend_required');
    await client.query('INSERT INTO mare_game.social_conversations(character_low,character_high) VALUES($1,$2)',keys);
  }
  await client.query(`INSERT INTO mare_game.social_private_messages(character_low,character_high,sender_id,request_id,body)
    VALUES($1,$2,$3,$4,$5)`,[...keys,id,requestId,body]);
}

function validCursor(value:string) {
  if(!/^[1-9][0-9]{0,18}$/.test(value)||BigInt(value)>9223372036854775807n)throw new AuthFault(400,'message_invalid_cursor');
  return value;
}

async function markMessagesRead(client:PoolClient,id:string,target:string,throughId:string) {
  if(id===target)throw new AuthFault(409,'contact_self');
  const keys=pair(id,target),column=id===keys[0]?'low_read_through':'high_read_through';
  const updated=await client.query(`UPDATE mare_game.social_conversations c
    SET ${column}=greatest(c.${column},$3)
    WHERE c.character_low=$1 AND c.character_high=$2 AND EXISTS(
      SELECT 1 FROM mare_game.social_private_messages m
      WHERE m.character_low=$1 AND m.character_high=$2 AND m.id=$3)`,[...keys,validCursor(throughId)]);
  if(!updated.rowCount)throw new AuthFault(404,'message_missing');
}

export async function executeSocialContact(client:PoolClient,id:string,input:SocialContactCommand) {
  await requireSocial(client);
  id=id.toLowerCase();
  switch(input.action){
    case 'friend.request':
      return requestFriend(client,id,input.payload.targetId.toLowerCase());
    case 'friend.respond':
      return resolveFriend(client,id,input.payload.requestId,input.payload.accept?'accepted':'declined');
    case 'friend.cancel':
      return resolveFriend(client,id,input.payload.requestId,'cancelled');
    case 'friend.remove': {
      const target=input.payload.targetId.toLowerCase();
      await lockPair(client,id,target);
      if(!(await client.query(`UPDATE mare_game.social_friend_requests SET status='removed'
        WHERE character_low=$1 AND character_high=$2 AND status='accepted'`,pair(id,target))).rowCount)
        throw new AuthFault(404,'friend_missing');
      return;
    }
    case 'contact.block':
      return blockContact(client,id,input.payload.targetId.toLowerCase(),input.payload.blocked);
    case 'message.send':
      return sendMessage(client,id,input.payload.targetId.toLowerCase(),input.requestId,input.payload.body);
    case 'message.read':
      return markMessagesRead(client,id,input.payload.targetId.toLowerCase(),input.payload.throughId);
  }
}

type PersonRow = {
  id:string; name:string; class_id:string; faction_id:string; level:number;
  appearance:unknown; preferences:{hideHeadgear?:boolean;hideItems?:boolean}|null;
  equipment:Record<string,{def?:number}>|null;
  crew_tag:string|null; crew_flag:string|null; crew_id:string|null;
  party_id:string|null; party_unavailable:boolean; crew_entry_blocked:boolean;
  party_invite_pending:boolean; crew_invite_pending:boolean;
  online:boolean; last_seen:Date|null; blocked_by_you:boolean; blocked_by_them:boolean;
};
type ActorInvites = {
  party_id:string|null; party_leader:boolean; party_active:boolean; party_members:number;
  crew_id:string|null; crew_officer:boolean; crew_min_level:number;
  crew_facilities:CrewFacilities|null; crew_members:number;
};
type MessageRow = {id:string;sender_id:string;body:string;sent_at:Date};
type ConversationRow = MessageRow & {character_low:string;character_high:string;unread:number};

async function readActorInvites(client:PoolClient,id:string) {
  return (await client.query<ActorInvites>(`
    SELECT g.id party_id,g.leader_id=c.id party_leader,
      EXISTS(SELECT 1 FROM mare_game.party_instances WHERE party_id=g.id AND ended_at IS NULL) party_active,
      (SELECT count(*)::int FROM mare_game.party_members WHERE party_id=g.id) party_members,
      h.id crew_id,cm.role IN ('captain','officer') crew_officer,
      h.min_level crew_min_level,h.facilities crew_facilities,
      (SELECT count(*)::int FROM mare_game.crew_members WHERE crew_id=h.id) crew_members
    FROM mare_game.characters c
    LEFT JOIN mare_game.party_members pm ON pm.character_id=c.id
    LEFT JOIN mare_game.parties g ON g.id=pm.party_id AND g.closed_at IS NULL
    LEFT JOIN mare_game.crew_members cm ON cm.character_id=c.id
    LEFT JOIN mare_game.crews h ON h.id=cm.crew_id AND h.dissolved_at IS NULL
    WHERE c.id=$1`,[id])).rows[0]!;
}

function partyInviteReason(actor:ActorInvites,person:PersonRow) {
  if(!actor.party_id)return 'party_not_joined';
  if(!actor.party_leader)return 'party_leader_required';
  if(actor.party_active)return 'party_activity_active';
  if(actor.party_members>=4)return 'party_full';
  if(person.party_id)return 'party_already_joined';
  if(!person.online||person.party_unavailable)return 'party_player_unavailable';
  if(person.party_invite_pending)return 'party_invite_pending';
  return null;
}

function crewInviteReason(actor:ActorInvites,person:PersonRow) {
  if(!actor.crew_id)return 'crew_not_joined';
  if(!actor.crew_officer)return 'crew_officer_required';
  if(person.crew_id)return 'crew_already_joined';
  if(person.crew_entry_blocked)return 'crew_entry_blocked';
  if(person.level<actor.crew_min_level)return 'crew_level_required';
  if(actor.crew_facilities&&actor.crew_members>=crewCapacity(actor.crew_facilities))return 'crew_full';
  if(person.crew_invite_pending)return 'crew_invite_pending';
  return null;
}

function projectPerson(person:PersonRow,actor:ActorInvites,friendOrConversation:boolean) {
  const blocked=person.blocked_by_you||person.blocked_by_them;
  const equipment:Record<string,{def:number}>={};
  if(!person.preferences?.hideItems)for(const slot of ['weapon','head','coat','gloves','legs','boots']){
    const def=person.equipment?.[slot]?.def;
    if(typeof def==='number'&&Number.isInteger(def))equipment[slot]={def};
  }
  return {
    id:person.id,name:person.name,classId:person.class_id,factionId:person.faction_id,level:person.level,
    appearance96:person.appearance,hideHeadgear:!!person.preferences?.hideHeadgear,equipment,
    ...(person.crew_tag&&person.crew_flag?{crew:{tag:person.crew_tag,flag:person.crew_flag}}:{}),
    online:blocked?false:person.online,lastActivity:blocked?null:person.last_seen?.toISOString()??null,
    blockedByYou:person.blocked_by_you,
    actions:{
      message:blocked?'contact_blocked':friendOrConversation?null:'message_friend_required',
      party:blocked?'contact_blocked':partyInviteReason(actor,person),
      crew:blocked?'contact_blocked':crewInviteReason(actor,person),
    },
  };
}

async function readPeople(client:PoolClient,id:string,ids:readonly string[],actor:ActorInvites){
  if(!ids.length)return [];
  return (await client.query<PersonRow>(`
    SELECT c.id,c.name,c.class_id,c.faction_id,coalesce(g.level,1) level,
      pr.appearance,pr.preferences,i.equipment,h.tag crew_tag,h.flag crew_flag,h.id crew_id,
      pm.party_id,((b.simulation->>'prison') IS NOT NULL OR (b.simulation->>'dungeon') IS NOT NULL) party_unavailable,
      (cb.until_at>clock_timestamp()) IS TRUE crew_entry_blocked,
      EXISTS(SELECT 1 FROM mare_game.party_invites pi WHERE pi.party_id=$4 AND pi.target_id=c.id
        AND pi.status='pending' AND pi.expires_at>clock_timestamp()) party_invite_pending,
      EXISTS(SELECT 1 FROM mare_game.crew_requests ci WHERE ci.crew_id=$5 AND ci.character_id=c.id
        AND ci.kind='invitation' AND ci.status='pending' AND ci.expires_at>clock_timestamp()) crew_invite_pending,
      (${validPlayLease} AND p.control_epoch=cc.epoch
        AND p.last_seen>clock_timestamp()-$3::int*interval '1 second') IS TRUE online,
      p.last_seen,(own.blocker_id IS NOT NULL) blocked_by_you,(theirs.blocker_id IS NOT NULL) blocked_by_them
    FROM mare_game.characters c
    JOIN mare_game.accounts a ON a.id=c.account_id
    LEFT JOIN mare_game.character_progression g ON g.character_id=c.id
    LEFT JOIN mare_game.character_profile pr ON pr.character_id=c.id
    LEFT JOIN mare_game.game_inventory i ON i.character_id=c.id
    LEFT JOIN mare_game.character_control cc ON cc.character_id=c.id
    LEFT JOIN mare_game.app_sessions s ON s.id=cc.session_id AND s.account_id=c.account_id
    LEFT JOIN mare_game.social_presence p ON p.character_id=c.id
    LEFT JOIN mare_game.party_members pm ON pm.character_id=c.id
    LEFT JOIN mare_game.character_battles b ON b.character_id=c.id
    LEFT JOIN mare_game.crew_members cm ON cm.character_id=c.id
    LEFT JOIN mare_game.crews h ON h.id=cm.crew_id AND h.dissolved_at IS NULL
    LEFT JOIN mare_game.crew_entry_blocks cb ON cb.character_id=c.id
    LEFT JOIN mare_game.social_contact_blocks own ON own.blocker_id=$1 AND own.target_id=c.id
    LEFT JOIN mare_game.social_contact_blocks theirs ON theirs.target_id=$1 AND theirs.blocker_id=c.id
    WHERE c.id=ANY($2::uuid[])`,[id,ids,limits.onlineSeconds,actor.party_id,actor.crew_id])).rows;
}

function projectMessage(row:MessageRow) {
  return {id:row.id,senderId:row.sender_id,body:row.body,sentAt:row.sent_at.toISOString()};
}

const participant = '(c.character_low=$1 OR c.character_high=$1)';
const readThrough = 'CASE WHEN c.character_low=$1 THEN c.low_read_through ELSE c.high_read_through END';
const messagePair = 'm.character_low=c.character_low AND m.character_high=c.character_high';

export async function readSocialContactBadge(client:PoolClient,id:string) {
  if(!await socialAvailable(client))return {friendRequests:0,unreadMessages:0};
  const {rows:[row]}=await client.query<{requests:number;unread:number}>(`
    SELECT (SELECT count(*)::int FROM mare_game.social_friend_requests
      WHERE target_id=$1 AND status='pending') requests,
      (SELECT count(*)::int FROM mare_game.social_conversations c
        JOIN mare_game.social_private_messages m ON ${messagePair}
        WHERE ${participant} AND m.sender_id<>$1 AND m.id>(${readThrough})) unread`,[id]);
  return {friendRequests:row!.requests,unreadMessages:row!.unread};
}

async function listConversations(client:PoolClient,id:string) {
  return (await client.query<ConversationRow>(`
    SELECT c.character_low,c.character_high,latest.*,(
      SELECT count(*)::int FROM mare_game.social_private_messages m
      WHERE ${messagePair} AND m.sender_id<>$1 AND m.id>(${readThrough})
    ) unread
    FROM mare_game.social_conversations c
    CROSS JOIN LATERAL (SELECT m.id,m.sender_id,m.body,m.sent_at FROM mare_game.social_private_messages m
      WHERE ${messagePair} ORDER BY m.id DESC LIMIT 1) latest
    WHERE ${participant} ORDER BY latest.id DESC`,[id])).rows;
}

async function searchCharacters(client:PoolClient,id:string,search:string) {
  const term=search.normalize('NFC').trim().slice(0,40);
  if(term.length<2)return [];
  return (await client.query<{id:string}>(`
    SELECT c.id FROM mare_game.characters c WHERE c.id<>$1 AND strpos(lower(c.name),lower($2))>0
      AND NOT EXISTS(SELECT 1 FROM mare_game.social_contact_blocks b
        WHERE (b.blocker_id=c.id AND b.target_id=$1) OR (b.blocker_id=$1 AND b.target_id=c.id))
    ORDER BY CASE WHEN lower(c.name)=lower($2) THEN 0 ELSE 1 END,lower(c.name),c.id LIMIT $3`,
    [id,term,limits.searchSize])).rows.map(row=>row.id);
}

export async function readSocialContacts(client:PoolClient,id:string,{search=''}:{search?:string}={}) {
  await requireSocial(client);
  id=id.toLowerCase();
  const requests=(await client.query<RequestRow>(`
    SELECT id,sender_id,target_id,status,created_at FROM mare_game.social_friend_requests
    WHERE (sender_id=$1 OR target_id=$1) AND status IN ('pending','accepted') ORDER BY created_at DESC,id`,[id])).rows;
  const ownBlocks=(await client.query<{target_id:string}>(`
    SELECT target_id FROM mare_game.social_contact_blocks WHERE blocker_id=$1 ORDER BY target_id`,[id])).rows.map(row=>row.target_id);
  const matches=await searchCharacters(client,id,search);
  const conversations=await listConversations(client,id);
  const inviteActor=await readActorInvites(client,id);
  const peers=new Set(requests.map(r=>other(id,r.sender_id,r.target_id)));
  const canMessage=new Set(requests.filter(r=>r.status==='accepted').map(r=>other(id,r.sender_id,r.target_id)));
  for(const row of conversations)canMessage.add(other(id,row.character_low,row.character_high));
  const people=new Map((await readPeople(client,id,[...new Set([...peers,...canMessage,...ownBlocks,...matches])],inviteActor))
    .map(row=>[row.id,projectPerson(row,inviteActor,canMessage.has(row.id))]));
  type Character=ReturnType<typeof projectPerson>;
  type RequestView={id:string;character:Character;createdAt:string};
  const incoming:RequestView[]=[],outgoing:RequestView[]=[],friends:Character[]=[];
  for(const request of requests){
    const character=people.get(other(id,request.sender_id,request.target_id));
    if(!character||character.actions.message==='contact_blocked')continue;
    if(request.status==='accepted')friends.push(character);
    else (request.sender_id===id?outgoing:incoming).push({id:request.id,character,createdAt:request.created_at.toISOString()});
  }
  friends.sort((a,b)=>Number(b.online)-Number(a.online)||a.name.localeCompare(b.name,'pt-BR')||a.id.localeCompare(b.id));
  return {friends,incoming,outgoing,onlineCount:friends.filter(friend=>friend.online).length,
    blocked:ownBlocks.map(target=>people.get(target)!),
    matches:matches.map(target=>({...people.get(target)!,friendState:friends.some(f=>f.id===target)?'accepted':
      incoming.some(r=>r.character.id===target)?'incoming':outgoing.some(r=>r.character.id===target)?'outgoing':'none'})),
    conversations:conversations.map(row=>({character:people.get(other(id,row.character_low,row.character_high))!,
      lastMessage:projectMessage(row),unread:row.unread})),
  };
}

export async function readPrivateMessages(client:PoolClient,id:string,targetId:string,
  {before,after}:{before?:string;after?:string}={}) {
  await requireSocial(client);
  id=id.toLowerCase();
  const target=targetId.toLowerCase();
  await checkTarget(client,id,target);
  if(before&&after)throw new AuthFault(400,'message_invalid_cursor');
  const keys=pair(id,target);
  const exists=await client.query(`SELECT 1 FROM mare_game.social_conversations WHERE character_low=$1 AND character_high=$2
    UNION ALL SELECT 1 FROM mare_game.social_friend_requests WHERE character_low=$1 AND character_high=$2 AND status='accepted'`,keys);
  if(!exists.rowCount)throw new AuthFault(404,'message_missing');
  const cursor=before??after;
  const args:Array<string|number>=[...keys,limits.pageSize+1];
  if(cursor)args.push(validCursor(cursor));
  const {rows}=await client.query<MessageRow>(`
    SELECT id,sender_id,body,sent_at FROM mare_game.social_private_messages
    WHERE character_low=$1 AND character_high=$2 ${cursor?(after?'AND id>$4':'AND id<$4'):''}
    ORDER BY id ${after?'ASC':'DESC'} LIMIT $3`,args);
  const inviteActor=await readActorInvites(client,id);
  const [person]=await readPeople(client,id,[target],inviteActor);
  if(!person)throw new AuthFault(404,'contact_missing');
  const messages=rows.slice(0,limits.pageSize).map(projectMessage);
  if(!after)messages.reverse();
  return {character:projectPerson(person,inviteActor,true),messages,hasMore:rows.length>limits.pageSize};
}
