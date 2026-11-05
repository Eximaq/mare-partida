import {readCombatInputs} from './combat-inputs.js';
import {readCrewIdentities} from './crew-store.js';
import type {PoolClient} from 'pg';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {partyActions,type CharacterCommand,type CharacterState} from '@mare/shared';
import {AuthFault} from '../auth/errors.js';
import {assertSocialContactAllowed,isSocialCharacterOnline} from './social-contacts.js';
import {membership,lockParty,partyAvailable} from './party-store.js';
import {readBattleRows,readBattle,storeBattle} from './battle.js';
import {readWorlds,readWorld,mutateWorld} from './world.js';
import {readFighter} from './fighter.js';
import {readCharacterState} from './state.js';
import {mutateDungeon,readDungeons} from './dungeons.js';
const require=createRequire(import.meta.url),P=require('../../../../party-rules.cjs'),E=require('../../../../world-battle.cjs'),maps=require('../../../../world-catalog.cjs').load,D=require('../../../../boss-dungeon-system.js');
export const isPartyAction=(a:string)=>(partyActions as readonly string[]).includes(a);
export async function presence(c:PoolClient,party:string){return (await c.query(`SELECT m.*,ch.name,ch.class_id,ch.faction_id,cc.epoch,cc.session_id,ch.account_id,
 (m.last_seen>clock_timestamp()-interval '10 seconds' AND cc.expires_at>clock_timestamp() AND s.kind='play' AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp() AND s.idle_expires_at>clock_timestamp() AND s.provider_valid_until>clock_timestamp() AND s.account_epoch=a.auth_epoch) AS connected
 FROM mare_game.party_members m JOIN mare_game.characters ch ON ch.id=m.character_id
 LEFT JOIN mare_game.character_control cc ON cc.character_id=ch.id LEFT JOIN mare_game.app_sessions s ON s.id=cc.session_id LEFT JOIN mare_game.accounts a ON a.id=ch.account_id WHERE m.party_id=$1 ORDER BY m.joined_at,m.character_id`,[party])).rows;}
export async function lockPeer(c:PoolClient,m:any){
 if(m.session_id&&!(await c.query('SELECT id FROM mare_game.app_sessions WHERE id=$1 FOR UPDATE SKIP LOCKED',[m.session_id])).rowCount)throw new AuthFault(409,'party_member_busy');
 if(!(await c.query('SELECT id FROM mare_game.accounts WHERE id=$1 FOR UPDATE SKIP LOCKED',[m.account_id])).rowCount||!(await c.query('SELECT pg_try_advisory_xact_lock(hashtextextended($1,1296126533)) locked',[m.character_id])).rows[0].locked)throw new AuthFault(409,'party_member_busy');
}
async function assertDestination(c:PoolClient,m:any,p:any){
 const s=await readCharacterState(c,m.character_id),b=await readBattle(c,m.character_id),w=await readWorld(c,m.character_id);
 if(!m.connected||!b||!w||b.hp<=0||b.prison||w.mapId==='impel-down')throw new AuthFault(409,'party_member_unavailable');
 if(b.dungeon)throw new AuthFault(409,'party_member_in_dungeon');
 const spec=p.kind==='hunt'?maps().islands.find((x:any)=>x.id===p.destination):D.byId[p.destination];
 if(!spec||s.level<(spec.minLevel??spec.level))throw new AuthFault(409,'party_destination_locked');
 if(p.kind==='dungeon'){const progress:any=await readDungeons(c,m.character_id),r=progress?.records[p.destination];if(r&&r.phase!=='running')throw new AuthFault(409,'party_dungeon_already_completed');}
 return {s,b,w};
}
export async function leavePartyActivity(c:PoolClient,id:string){
 const b=await readBattle(c,id);if(!b?.partyInstanceId)return;
 delete b.partyInstanceId;E.cancel(b);E.resetHaki(b);b.mobs=[];await storeBattle(c,id,b);
 await mutateWorld(c,id,{action:'world.return',payload:{}} as CharacterCommand,await readCharacterState(c,id));
}
async function detach(c:PoolClient,id:string,_input:CharacterCommand){
 await leavePartyActivity(c,id);await c.query('DELETE FROM mare_game.party_members WHERE character_id=$1',[id]);
}
export async function refreshPartyLeader(c:PoolClient,partyId:string,roster:any[],now=Date.now()){
 const group=(await c.query('SELECT leader_id FROM mare_game.parties WHERE id=$1',[partyId])).rows[0];
 const current=roster.find(m=>m.character_id===group?.leader_id);
 if(current&&!current.connected&&now-new Date(current.last_seen).getTime()>P.policy.reconnectMs){
  const next=roster.find(m=>m.connected);if(next)await c.query('UPDATE mare_game.parties SET leader_id=$2,preparation=NULL WHERE id=$1',[partyId,next.character_id]);
 }
}
export async function mutateParty(c:PoolClient,id:string,input:CharacterCommand,_state:CharacterState){
 if(!await partyAvailable(c))throw new AuthFault(503,'party_unavailable');
 if(_state.version>=Number.MAX_SAFE_INTEGER)throw new AuthFault(503,'state_version_exhausted');
 const p:any=input.payload,partyId=await lockParty(c,id);const party=partyId?(await c.query('SELECT * FROM mare_game.parties WHERE id=$1',[partyId])).rows[0]:null;
 if(input.action==='party.create'){
  if(party)throw new AuthFault(409,'party_already_joined');
  const b=await readBattle(c,id);if(b?.prison||b?.dungeon)throw new AuthFault(409,'party_member_unavailable');
  const key=randomUUID();await c.query('INSERT INTO mare_game.parties(id,leader_id) VALUES($1,$2)',[key,id]);await c.query('INSERT INTO mare_game.party_members(character_id,party_id) VALUES($1,$2)',[id,key]);
 }else if(input.action==='party.respond'){
   if(party&&p.accept)throw new AuthFault(409,'party_already_joined');
  const invite=(await c.query('SELECT * FROM mare_game.party_invites WHERE id=$1 AND target_id=$2',[p.inviteId,id])).rows[0];if(!invite)throw new AuthFault(404,'party_invite_missing');
  await c.query('SELECT id FROM mare_game.parties WHERE id=$1 FOR UPDATE',[invite.party_id]);
  const fresh=(await c.query("SELECT * FROM mare_game.party_invites WHERE id=$1 AND status='pending' AND expires_at>clock_timestamp() FOR UPDATE",[invite.id])).rows[0];if(!fresh)throw new AuthFault(409,'party_invite_expired');
  if(p.accept){
   await assertSocialContactAllowed(c,invite.sender_id,id);
   if(party||await membership(c,id))throw new AuthFault(409,'party_already_joined');
   const roster=await presence(c,invite.party_id),g=(await c.query('SELECT * FROM mare_game.parties WHERE id=$1',[invite.party_id])).rows[0];
   if(!g||g.closed_at||roster.length>=P.policy.capacity)throw new AuthFault(409,'party_full');
   if((await c.query('SELECT id FROM mare_game.party_instances WHERE party_id=$1 AND ended_at IS NULL',[g.id])).rowCount)throw new AuthFault(409,'party_activity_active');
   const b=await readBattle(c,id);if(b?.prison||b?.dungeon)throw new AuthFault(409,'party_member_unavailable');
   await c.query('INSERT INTO mare_game.party_members(character_id,party_id) VALUES($1,$2)',[id,g.id]);await c.query('UPDATE mare_game.parties SET preparation=NULL WHERE id=$1',[g.id]);
  }
  await c.query('UPDATE mare_game.party_invites SET status=$2 WHERE id=$1',[invite.id,p.accept?'accepted':'declined']);
 }else{
  if(!party)throw new AuthFault(409,'party_not_joined');
  const leader=party.leader_id===id,roster=await presence(c,party.id),active=(await c.query('SELECT id FROM mare_game.party_instances WHERE party_id=$1 AND ended_at IS NULL',[party.id])).rows[0];
  if(!['party.leave','party.ready'].includes(input.action)&&!leader)throw new AuthFault(403,'party_leader_required');
  if(input.action==='party.invite'){
   if(active)throw new AuthFault(409,'party_activity_active');if(roster.length>=4)throw new AuthFault(409,'party_full');
   const target=(await c.query(`SELECT ch.id FROM mare_game.characters ch JOIN mare_game.character_control cc ON cc.character_id=ch.id JOIN mare_game.app_sessions s ON s.id=cc.session_id JOIN mare_game.accounts a ON a.id=ch.account_id WHERE ${p.targetId?'ch.id=$1':'lower(ch.name)=lower($1)'} AND cc.expires_at>clock_timestamp() AND s.revoked_at IS NULL AND s.kind='play' AND s.expires_at>clock_timestamp() AND s.idle_expires_at>clock_timestamp() AND s.provider_valid_until>clock_timestamp() AND s.account_epoch=a.auth_epoch ORDER BY ch.id LIMIT 2`,[p.targetId??p.name])).rows;
   if(target.length!==1)throw new AuthFault(404,'party_player_unavailable');const to=target[0].id;if(to===id)throw new AuthFault(409,'party_self_invite');if(await membership(c,to))throw new AuthFault(409,'party_already_joined');
   await assertSocialContactAllowed(c,id,to);
   if(p.targetId&&!await isSocialCharacterOnline(c,to))throw new AuthFault(404,'party_player_unavailable');
   const b=await readBattle(c,to);if(b?.prison||b?.dungeon)throw new AuthFault(409,'party_member_unavailable');
   await c.query("UPDATE mare_game.party_invites SET status='expired' WHERE party_id=$1 AND target_id=$2 AND expires_at<=clock_timestamp() AND status='pending'",[party.id,to]);
   await c.query("INSERT INTO mare_game.party_invites(id,party_id,sender_id,target_id,expires_at) VALUES($1,$2,$3,$4,clock_timestamp()+interval '60 seconds') ON CONFLICT(party_id,target_id) WHERE status='pending' DO NOTHING",[randomUUID(),party.id,id,to]);
  }else if(input.action==='party.leave'||input.action==='party.kick'){
   const target=input.action==='party.leave'?id:p.memberId,m=roster.find(x=>x.character_id===target);if(!m||input.action==='party.kick'&&target===id)throw new AuthFault(409,'party_member_missing');
   if(target!==id)await lockPeer(c,m);await detach(c,target,input);
   const rest=roster.filter(x=>x.character_id!==target);await c.query('UPDATE mare_game.parties SET preparation=NULL,leader_id=$2,closed_at=$3 WHERE id=$1',[party.id,target===party.leader_id?(rest.find(x=>x.connected)?.character_id??rest[0]?.character_id??id):party.leader_id,rest.length?null:new Date()]);
   if(!rest.length)await c.query('UPDATE mare_game.party_instances SET ended_at=clock_timestamp() WHERE party_id=$1 AND ended_at IS NULL',[party.id]);
  }else if(input.action==='party.promote'){
   if(!roster.some(x=>x.character_id===p.memberId&&x.connected))throw new AuthFault(409,'party_member_unavailable');await c.query('UPDATE mare_game.parties SET leader_id=$2,preparation=NULL WHERE id=$1',[party.id,p.memberId]);
  }else if(input.action==='party.prepare'){
   if(active)throw new AuthFault(409,'party_activity_active');for(const m of roster)await assertDestination(c,m,p);
   await c.query('UPDATE mare_game.parties SET preparation=$2 WHERE id=$1',[party.id,JSON.stringify({...p,nonce:randomUUID(),expires:Date.now()+P.policy.preparationMs,members:roster.map(x=>x.character_id),ready:{}})]);
  }else if(input.action==='party.ready'||input.action==='party.start'){
   const plan=party.preparation;if(!plan||plan.nonce!==p.nonce||plan.expires<=Date.now())throw new AuthFault(409,'party_preparation_expired');
   if(input.action==='party.ready'){plan.ready[id]=p.ready;await c.query('UPDATE mare_game.parties SET preparation=$2 WHERE id=$1',[party.id,JSON.stringify(plan)]);}
   else{
    if(active||!P.canStart(plan,roster.map(x=>x.character_id),p.nonce))throw new AuthFault(409,'party_not_ready');
    for(const m of roster.slice().sort((a,b)=>a.character_id.localeCompare(b.character_id)))if(m.character_id!==id)await lockPeer(c,m);
    const checked=[];for(const m of roster)checked.push({m,...await assertDestination(c,m,plan)});
    const instance=randomUUID(),room:any={id:instance,kind:plan.kind,destination:plan.destination,startedAt:Date.now(),mobs:[],hunts:null,respawns:{},seq:0};
    for(const {m,s} of checked){
     const action=plan.kind==='hunt'?'world.travel':'dungeon.enter',payload=plan.kind==='hunt'?{islandId:plan.destination}:{dungeonId:plan.destination};
     await (plan.kind==='hunt'?mutateWorld:mutateDungeon)(c,m.character_id,{...input,action,payload,control:{...input.control,epoch:Number(m.epoch)}} as CharacterCommand,s);
     const b=await readBattle(c,m.character_id);if(!b)throw new AuthFault(409,'battle_not_started');
     if(!room.mobs.length){room.area=b.area;room.mobs=b.mobs;room.hunts=b.hunts;room.mapId=(await readWorld(c,m.character_id))!.mapId;if(plan.kind==='dungeon'){room.mobs[0].hp=Math.round(room.mobs[0].hp*P.policy.bossHp[checked.length-1]);room.mobs[0].maxHP=room.mobs[0].hp;}}
     if(plan.kind==='dungeon'){
      const own=b.dungeon.record;own.spawnId=room.mobs[0].id;
      await c.query("UPDATE mare_game.character_dungeons SET state=jsonb_set(state,ARRAY['records',$2],$3::jsonb) WHERE character_id=$1",[m.character_id,plan.destination,JSON.stringify(own)]);
     }
     b.partyInstanceId=instance;b.partyXpReceived=0;b.partyStartedAt=room.startedAt;b.mobs=room.mobs;E.cancel(b);b.auto=true;await storeBattle(c,m.character_id,b);
    }
    await c.query('INSERT INTO mare_game.party_instances(id,party_id,simulation) VALUES($1,$2,$3)',[instance,party.id,JSON.stringify(room)]);await c.query('UPDATE mare_game.parties SET preparation=NULL WHERE id=$1',[party.id]);
   }
  }
 }
 await c.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[id]);
}
async function touchPartyPresence(c:PoolClient,id:string){
 await c.query(`UPDATE mare_game.party_members m SET last_seen=clock_timestamp() WHERE m.character_id=$1 AND EXISTS(SELECT 1 FROM mare_game.character_control cc JOIN mare_game.app_sessions s ON s.id=cc.session_id WHERE cc.character_id=$1 AND cc.expires_at>clock_timestamp() AND s.kind='play' AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp() AND s.idle_expires_at>clock_timestamp() AND s.provider_valid_until>clock_timestamp() AND s.account_epoch=(SELECT auth_epoch FROM mare_game.accounts WHERE id=s.account_id))`,[id]);
}
/** Dynamic public member fields only; static appearance/stats remain in the full projection. */
export async function readPartyMotion(c:PoolClient,id:string){
 if(!await partyAvailable(c))return null;
 const group=await membership(c,id);await touchPartyPresence(c,id);if(!group)return {group:null};
 const roster=await presence(c,group);await refreshPartyLeader(c,group,roster);
 const g=(await c.query('SELECT id,leader_id,preparation FROM mare_game.parties WHERE id=$1',[group])).rows[0],members=[];
 const ids=roster.map(m=>m.character_id),battles=await readBattleRows(c,ids),worlds=await readWorlds(c,ids);
 for(const m of roster){
  const b=battles.get(m.character_id)?.simulation,w=worlds.get(m.character_id)??null;
  members.push({id:m.character_id,hp:Math.max(0,b?.hp??0),connected:m.connected===true,ready:g.preparation?.ready[m.character_id]===true,world:w,action:b?.pending||b?.skillJob?'attack':'idle',instanceId:b?.partyInstanceId??null,zoanTransformed:b?.fruit?.transformed===true,haki:b?.haki?{active:b.haki.active,eyeFX:b.haki.eyeFX,kingFX:b.haki.kingFX}:null});
 }
 const instance=(await c.query('SELECT id,simulation FROM mare_game.party_instances WHERE party_id=$1 AND ended_at IS NULL',[group])).rows[0];
 return {group:{id:g.id,leaderId:g.leader_id,preparation:g.preparation?.expires>Date.now()?g.preparation:null,members,activity:instance?{id:instance.id,kind:instance.simulation.kind,destination:instance.simulation.destination,density:instance.simulation.density??1}:null}};
}
export async function readParty(c:PoolClient,id:string){
 if(!await partyAvailable(c))return null;
 const group=await membership(c,id);
 await touchPartyPresence(c,id);
 const invites=(await c.query(`SELECT i.id,i.party_id,i.target_id,i.sender_id,i.expires_at,i.status,ch.name sender,t.name target,lead.name leader_name,(SELECT count(*)::int FROM mare_game.party_members WHERE party_id=i.party_id) members FROM mare_game.party_invites i JOIN mare_game.characters ch ON ch.id=i.sender_id JOIN mare_game.characters t ON t.id=i.target_id JOIN mare_game.parties party ON party.id=i.party_id JOIN mare_game.characters lead ON lead.id=party.leader_id WHERE (i.target_id=$1 OR i.sender_id=$1) AND i.expires_at>clock_timestamp()-interval '60 seconds' ORDER BY i.created_at DESC LIMIT 16`,[id])).rows.map(x=>({...x,status:x.status==='pending'&&new Date(x.expires_at).getTime()<Date.now()?'expired':x.status}));
 if(!group)return {group:null,invites};
 const roster=await presence(c,group);await refreshPartyLeader(c,group,roster);
 const g=(await c.query('SELECT id,leader_id,preparation FROM mare_game.parties WHERE id=$1',[group])).rows[0],members=[];
 const ids=roster.map(m=>m.character_id),inputs=await readCombatInputs(c,ids),battles=await readBattleRows(c,ids),worlds=await readWorlds(c,ids);
 const identities=await readCrewIdentities(c,ids);
 for(const m of roster){
  const input=inputs.get(m.character_id)!,{state}=input,b=battles.get(m.character_id)?.simulation,w=worlds.get(m.character_id)??null;
  const f=input.inventory?input.fighter(b):await readFighter(c,m.character_id,state),visual=input.inventory?{appearance:input.appearance,preferences:input.preferences,equipment:input.inventory.equipment}:null;
  const equipment:any={};if(!visual?.preferences.hideItems)for(const slot of ['weapon','head','coat','cloak','gloves','legs','boots'] as const){const item=visual?.equipment[slot];if(item)equipment[slot]={def:item.def};}
  members.push({id:m.character_id,name:m.name,crewIdentity:identities.get(m.character_id)??null,classId:m.class_id,factionId:m.faction_id,level:state.level,power:f.rulesetId==='original-character-v1'?f.stats.power:0,hp:Math.max(0,Math.min(b?.hp??f.maxHp,f.maxHp)),maxHp:f.maxHp,connected:m.connected===true,ready:g.preparation?.ready[m.character_id]===true,world:w,appearance96:visual?.appearance,hideHeadgear:!!visual?.preferences.hideHeadgear,equipment,action:b?.pending||b?.skillJob?'attack':'idle',instanceId:b?.partyInstanceId??null,fruitId:f.rulesetId==='original-character-v1'?f.fruitId:null,zoanTransformed:b?.fruit?.transformed===true,haki:b?.haki?{active:b.haki.active,eyeFX:b.haki.eyeFX,kingFX:b.haki.kingFX}:null});
 }
 const instance=(await c.query('SELECT id,simulation FROM mare_game.party_instances WHERE party_id=$1 AND ended_at IS NULL',[group])).rows[0];
 return {group:{id:g.id,leaderId:g.leader_id,preparation:g.preparation?.expires>Date.now()?g.preparation:null,members,activity:instance?{id:instance.id,kind:instance.simulation.kind,destination:instance.simulation.destination,density:instance.simulation.density??1}:null},invites};
}
