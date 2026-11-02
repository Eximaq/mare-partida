import type {PoolClient} from 'pg';
import type {WorldSnapshot} from '@mare/shared';
import {readWorld} from './world.js';
const limit=16;
/** Public visual projection only. No client position, private inventory or account/session identifier. */
export async function readLobby(client:PoolClient,id:string,world:WorldSnapshot|null){
 const players:Array<{id:string;name:string;classId:string;factionId:string;appearance96:unknown;hideHeadgear:boolean;equipment:Record<string,{def:number}>;world:WorldSnapshot}>=[];
 if(world?.mapId!=='lobby'||!(await client.query("SELECT to_regclass('mare_game.character_profile') present")).rows[0].present)return {players,limit,truncated:false};
 const rows=(await client.query(`SELECT c.id,c.name,c.class_id,c.faction_id,p.appearance,p.preferences,i.equipment
 FROM mare_game.characters c
 JOIN mare_game.character_world w ON w.character_id=c.id AND w.map_id='lobby' AND w.rules_hash=$2
 JOIN mare_game.character_control cc ON cc.character_id=c.id
 JOIN mare_game.app_sessions s ON s.id=cc.session_id AND s.account_id=c.account_id
 JOIN mare_game.accounts a ON a.id=c.account_id
 JOIN mare_game.character_profile p ON p.character_id=c.id
 JOIN mare_game.game_inventory i ON i.character_id=c.id
 WHERE c.id<>$1 AND cc.expires_at>clock_timestamp() AND s.kind='play'
 AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp() AND s.idle_expires_at>clock_timestamp()
 AND s.provider_valid_until>clock_timestamp() AND s.account_epoch=a.auth_epoch
 ORDER BY c.id LIMIT $3`,[id,world.rulesHash,limit+1])).rows;
 for(const row of rows.slice(0,limit)){
  const motion=await readWorld(client,row.id);
  // A travel committed between the roster query and the position query must not leak a hunt.
  if(motion?.mapId!=='lobby')continue;
  const equipment:Record<string,{def:number}>={};
  if(!row.preferences.hideItems)for(const slot of ['weapon','head','coat','cloak','gloves','legs','boots']){
   const item=row.equipment[slot];if(item&&Number.isInteger(item.def))equipment[slot]={def:item.def};
  }
  players.push({id:row.id,name:row.name,classId:row.class_id,factionId:row.faction_id,appearance96:row.appearance,hideHeadgear:!!row.preferences.hideHeadgear,equipment,world:motion});
 }
 return {players,limit,truncated:rows.length>limit};
}
