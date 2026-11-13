import type {PoolClient} from 'pg';
import {characterStateSchema} from '@mare/shared';
import {AuthFault} from '../auth/errors.js';
import {projectWorld} from './world.js';
/** Current schema only, inside the authorized repeatable-read presentation.
 * One personal snapshot replaces separate progression, world, battle and clock reads.
 * Shared encounters are still resolved by the canonical party/weekly readers. */
export async function readPersonalFrame(client:PoolClient,id:string){
 const row=(await client.query({name:'mare-personal-frame-v1',text:`SELECT w.*,p.character_id AS "characterId",
 c.state_version::float8 version,p.level,p.experience::text,p.gold::text,b.simulation,b.tick_at,
 clock_timestamp() sampled_at,least(w.motion_until,coalesce(cc.expires_at,w.started_at),s.expires_at,s.idle_expires_at,s.revoked_at) motion_until
 FROM mare_game.character_progression p JOIN mare_game.characters c ON c.id=p.character_id
 LEFT JOIN mare_game.character_world w ON w.character_id=c.id
 LEFT JOIN mare_game.character_control cc ON cc.character_id=c.id
 LEFT JOIN mare_game.app_sessions s ON s.id=cc.session_id
 LEFT JOIN mare_game.character_battles b ON b.character_id=c.id WHERE c.id=$1`,values:[id]})).rows[0];
 if(!row)throw new AuthFault(503,'character_state_unavailable');
 return {state:characterStateSchema.parse({characterId:row.characterId,version:row.version,level:row.level,experience:row.experience,gold:row.gold}),
 world:row.map_id?projectWorld(row,row.sampled_at):null,battle:row.simulation??null,
 now:row.sampled_at as Date,tick_at:row.tick_at as Date|null};
}
