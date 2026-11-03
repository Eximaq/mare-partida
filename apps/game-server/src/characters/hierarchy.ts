import {createRequire} from 'node:module';
import type {PoolClient} from 'pg';
import type {CharacterState} from '@mare/shared';
import {AuthFault} from '../auth/errors.js';
import {permanentCharacterPower} from './power.js';
const H=createRequire(import.meta.url)('../../../../hierarchy-system.js');
async function available(client:PoolClient){return !!(await client.query("SELECT to_regclass('mare_game.character_hierarchy') present")).rows[0].present;}
export async function refreshHierarchyPower(client:PoolClient,id:string,power:number){
 if(!await available(client))return;
 await client.query('INSERT INTO mare_game.character_hierarchy(character_id,power) VALUES($1,$2) ON CONFLICT(character_id) DO UPDATE SET power=EXCLUDED.power WHERE mare_game.character_hierarchy.power<>EXCLUDED.power',[id,power]);
}
export async function readHierarchy(client:PoolClient,id:string,state:CharacterState,power?:number){
 if(!await available(client))return null;
 await refreshHierarchyPower(client,id,power??await permanentCharacterPower(client,id,state));
 const r=(await client.query('SELECT h.tier,h.power,c.faction_id FROM mare_game.character_hierarchy h JOIN mare_game.characters c ON c.id=h.character_id WHERE h.character_id=$1',[id])).rows[0];
 return {rulesetId:'original-hierarchy-v1',tier:r.tier,title:H.title(r.faction_id,r.tier),power:r.power,next:H.next(r.tier,state.level)};
}
export async function promoteHierarchy(client:PoolClient,id:string,requestId:string,state:CharacterState,expectedTier:number){
 const view=await readHierarchy(client,id,state);if(!view)throw new AuthFault(503,'hierarchy_unavailable');
 if(view.tier!==expectedTier)throw new AuthFault(409,'hierarchy_tier_conflict');
 if(view.next.state==='locked')throw new AuthFault(409,'hierarchy_locked');
 if(view.next.state!=='ready')throw new AuthFault(409,'hierarchy_level_required');
 if(state.version>=Number.MAX_SAFE_INTEGER)throw new AuthFault(503,'state_version_exhausted');
 await client.query('INSERT INTO mare_game.hierarchy_promotions(character_id,request_id,tier_before,tier_after,level,version_before) VALUES($1,$2,$3,$4,$5,$6)',[id,requestId,view.tier,view.next.target,state.level,state.version]);
 await client.query('UPDATE mare_game.character_hierarchy SET tier=$2 WHERE character_id=$1',[id,view.next.target]);
 await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[id]);
}
export async function hierarchyRanking(client:PoolClient,faction:string|null){
 if(!await available(client))throw new AuthFault(503,'hierarchy_unavailable');
 const rows=(await client.query(`SELECT c.id player_id,c.name,c.class_id,c.faction_id faction,p.level,COALESCE(h.tier,1) tier,COALESCE(h.power,0) power
 FROM mare_game.characters c JOIN mare_game.character_progression p ON p.character_id=c.id LEFT JOIN mare_game.character_hierarchy h ON h.character_id=c.id
 WHERE ($1::text IS NULL OR c.faction_id=$1) ORDER BY COALESCE(h.tier,1) DESC,p.level DESC,COALESCE(h.power,0) DESC,c.id LIMIT 10`,[faction])).rows;
 return {faction,leaderboard:rows.map(r=>({...r,rank_title:H.title(r.faction,r.tier),portrait:''}))};
}
