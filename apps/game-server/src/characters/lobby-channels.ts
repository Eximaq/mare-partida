import type {PoolClient} from 'pg';
import {AuthFault} from '../auth/errors.js';
export const lobbyCapacity=24;
async function available(client:PoolClient){return !!(await client.query("SELECT to_regclass('mare_game.lobby_channel_members') present")).rows[0].present;}
/** Caller holds its own character lock. Admissions serialize briefly, never motion/frames.
 * Unique slots, not counts of temporarily verified provider tokens, enforce capacity.
 * A reservation lasts exactly as long as the controller lease and survives token refresh. */
export async function ensureLobbyChannel(client:PoolClient,id:string,target?:number){
 if(!await available(client))return;
 const world=(await client.query('SELECT w.map_id,c.expires_at FROM mare_game.character_world w LEFT JOIN mare_game.character_control c USING(character_id) WHERE w.character_id=$1',[id])).rows[0];
 if(world?.map_id!=='lobby'){
  if(target!==undefined)throw new AuthFault(409,'lobby_required');
  await client.query('DELETE FROM mare_game.lobby_channel_members WHERE character_id=$1',[id]);return;
 }
 await client.query('SELECT pg_advisory_xact_lock(5821,58)');
 const previous=(await client.query('SELECT channel_id,slot,changed_at,changed_at>clock_timestamp()-interval \'5 seconds\' cooling FROM mare_game.lobby_channel_members WHERE character_id=$1',[id])).rows[0];
 await client.query('DELETE FROM mare_game.lobby_channel_members WHERE reserved_until<=clock_timestamp()');
 if(!world.expires_at||(await client.query('SELECT $1::timestamptz<=clock_timestamp() expired',[world.expires_at])).rows[0].expired)return;
 if(target!==undefined&&target!==previous?.channel_id&&previous?.cooling)throw new AuthFault(429,'lobby_channel_cooldown',5);
 const reserved=(await client.query('SELECT channel_id,slot FROM mare_game.lobby_channel_members WHERE character_id<>$1 ORDER BY channel_id,slot',[id])).rows;
 const channels=new Map<number,Set<number>>();
 for(const row of reserved){if(!channels.has(row.channel_id))channels.set(row.channel_id,new Set());channels.get(row.channel_id)!.add(row.slot);}
 let channel=target??previous?.channel_id;
 if(target!==undefined&&!channels.has(target)&&previous?.channel_id!==target)throw new AuthFault(404,'lobby_channel_not_found');
 if(channel&&channels.get(channel)?.size===lobbyCapacity){if(target!==undefined)throw new AuthFault(409,'lobby_channel_full');channel=undefined;}
 if(!channel)for(let n=1;n<=4096;n++)if((channels.get(n)?.size??0)<lobbyCapacity){channel=n;break;}
 if(!channel)throw new AuthFault(503,'lobby_capacity_reached');
 let slot=1;while(channels.get(channel)?.has(slot))slot++;
 await client.query(`INSERT INTO mare_game.lobby_channel_members(character_id,channel_id,slot,reserved_until,changed_at)
 VALUES($1,$2,$3,$4,CASE WHEN $5 THEN clock_timestamp() ELSE NULL END)
 ON CONFLICT(character_id) DO UPDATE SET channel_id=EXCLUDED.channel_id,slot=EXCLUDED.slot,reserved_until=EXCLUDED.reserved_until,
 changed_at=CASE WHEN $5 THEN clock_timestamp() ELSE lobby_channel_members.changed_at END`,[id,channel,slot,world.expires_at,target!==undefined&&target!==previous?.channel_id]);
}
export async function renewLobbyChannel(client:PoolClient,id:string){
 if(!await available(client))return;
 // Updating the reservation also prevents expiry cleanup from reclaiming a renewed slot.
 const r=await client.query(`UPDATE mare_game.lobby_channel_members m SET reserved_until=c.expires_at
 FROM mare_game.character_control c WHERE m.character_id=$1 AND c.character_id=m.character_id RETURNING m.character_id`,[id]);
 if(!r.rowCount)await ensureLobbyChannel(client,id);
}
export async function readLobbyChannels(client:PoolClient,id:string){
 if(!await available(client))return {channels:[]};
 const rows=(await client.query(`SELECT channel_id AS id,count(*)::int occupancy,
 bool_or(character_id=$1) current FROM mare_game.lobby_channel_members
 WHERE reserved_until>clock_timestamp() GROUP BY channel_id ORDER BY channel_id LIMIT 128`,[id])).rows;
 return {channels:rows.map(r=>({...r,capacity:lobbyCapacity,available:lobbyCapacity-r.occupancy}))};
}
