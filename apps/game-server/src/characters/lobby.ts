import type {PoolClient} from 'pg';
import type {WorldSnapshot} from '@mare/shared';
import {projectWorld} from './world.js';
import {defaultAppearance,defaultPreferences} from './profile-defaults.js';
import {lobbyCapacity} from './lobby-channels.js';
export type LobbyCapabilities={present:boolean;crews:boolean;channels:boolean;party?:boolean};
/** Public visual projection only. No client position, private inventory or account/session identifier. */
export async function readLobby(client:PoolClient,id:string,world:WorldSnapshot|null,knownCapabilities?:LobbyCapabilities){
 let limit=16;
 const players:Array<{id:string;name:string;classId:string;factionId:string;appearance96:unknown;hideHeadgear:boolean;crew?:{tag:string;flag:string};equipment:Record<string,{def:number}>;world:WorldSnapshot}>=[];
 if(world?.mapId!=='lobby')return {players,limit,truncated:false};
 const capabilities=knownCapabilities??(await client.query("SELECT to_regclass('mare_game.character_profile') present,to_regclass('mare_game.crews') IS NOT NULL crews,to_regclass('mare_game.lobby_channel_members') IS NOT NULL channels")).rows[0];
 if(!capabilities.present)return {players,limit,truncated:false};
 const channels=capabilities.channels;limit=channels?lobbyCapacity-1:16;
 const rows=(await client.query({name:`mare-lobby-v3-${channels?'channels':'legacy'}-${capabilities.crews?'crews':'plain'}`,text:`SELECT w.*,clock_timestamp() sampled_at,least(w.motion_until,cc.expires_at,s.expires_at,s.idle_expires_at) motion_until,${channels?'cm.channel_id,':''}c.id,c.name,c.class_id,c.faction_id,p.appearance,p.preferences,i.equipment${capabilities.crews?',g.tag crew_tag,g.flag crew_flag':''}
 FROM mare_game.characters c
 ${channels?`JOIN mare_game.lobby_channel_members cm ON cm.character_id=c.id AND cm.reserved_until>clock_timestamp() AND cm.channel_id=(SELECT channel_id FROM mare_game.lobby_channel_members WHERE character_id=$1 AND reserved_until>clock_timestamp())`:''}
 JOIN mare_game.character_world w ON w.character_id=c.id AND w.map_id='lobby' AND w.rules_hash=$2
 JOIN mare_game.character_control cc ON cc.character_id=c.id
 JOIN mare_game.app_sessions s ON s.id=cc.session_id AND s.account_id=c.account_id
 JOIN mare_game.accounts a ON a.id=c.account_id
 LEFT JOIN mare_game.character_profile p ON p.character_id=c.id
 JOIN mare_game.game_inventory i ON i.character_id=c.id
 ${capabilities.crews?'LEFT JOIN mare_game.crew_members m ON m.character_id=c.id LEFT JOIN mare_game.crews g ON g.id=m.crew_id AND g.dissolved_at IS NULL':''}
 WHERE ${channels?'true':'c.id<>$1'} AND cc.expires_at>clock_timestamp() AND s.kind='play'
 AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp() AND s.idle_expires_at>clock_timestamp()
 AND s.provider_valid_until>clock_timestamp() AND s.account_epoch=a.auth_epoch
 ORDER BY c.id LIMIT $3`,values:[id,world.rulesHash,limit+1]})).rows;
 const own=rows.find(row=>row.id===id),channel=channels&&own?{id:own.channel_id,capacity:lobbyCapacity,occupancy:rows.length}:null;
 const peers=rows.filter(row=>row.id!==id),visible=peers.slice(0,limit);
 for(const row of visible){
  row.appearance??=defaultAppearance;row.preferences??=defaultPreferences;
  // Appearance, channel eligibility and motion come from the same committed snapshot.
  const motion=projectWorld(row,row.sampled_at);
  const equipment:Record<string,{def:number}>={};
  if(!row.preferences.hideItems)for(const slot of ['weapon','head','coat','cloak','gloves','legs','boots']){
   const item=row.equipment[slot];if(item&&Number.isInteger(item.def))equipment[slot]={def:item.def};
  }
  players.push({id:row.id,name:row.name,classId:row.class_id,factionId:row.faction_id,appearance96:row.appearance,hideHeadgear:!!row.preferences.hideHeadgear,equipment,...(row.crew_tag?{crew:{tag:row.crew_tag,flag:row.crew_flag}}:{}),world:motion});
 }
 return {players,limit,channel,truncated:peers.length>limit};
}
