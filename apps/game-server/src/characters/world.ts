import {createRequire} from 'node:module';
import type {PoolClient} from 'pg';
import {worldActions,worldSnapshotSchema,type CharacterCommand,type CharacterState,type WorldSnapshot} from '@mare/shared';
import {AuthFault} from '../auth/errors.js';
import {readFighter} from './fighter.js';
import {syncBattleWorld,readBattle} from './battle.js';
const require=createRequire(import.meta.url),catalog=require('../../../../world-catalog.cjs').load;
type Point={x:number;y:number};
type Row={rules_hash:string;map_id:string;area:string|null;x:number;y:number;path:Point[];speed:number;direction:WorldSnapshot['direction'];started_at:Date;motion_until:Date};
export const isWorldAction=(action:string)=>(worldActions as readonly string[]).includes(action);
async function clock(client:PoolClient):Promise<Date>{return (await client.query('SELECT clock_timestamp() now')).rows[0].now;}
function snapshot(row:Row,now:Date):WorldSnapshot {
 const rules=catalog();if(row.rules_hash!==rules.rulesHash)throw new AuthFault(503,'world_rules_changed');
 const nav=rules.navigation(row.map_id),actor={x:row.x,y:row.y,direction:row.direction},path=row.path.map(p=>({...p}));
 nav.follow(actor,path,row.speed,Math.max(0,Math.min(now.getTime(),row.motion_until.getTime())-row.started_at.getTime())/1000);
 if(now>=row.motion_until)path.length=0;
 return worldSnapshotSchema.parse({rulesetId:'original-world-v1',rulesHash:rules.rulesHash,mapId:row.map_id,area:row.area,position:{x:actor.x,y:actor.y},path,speed:row.speed,direction:actor.direction,serverNow:now.toISOString(),motionUntil:row.motion_until.toISOString()});
}
export async function readWorlds(client:PoolClient,ids:readonly string[],now?:Date){
 const result=new Map<string,WorldSnapshot>();if(!ids.length)return result;
 const rows=(await client.query<Row&{character_id:string;sampled_at:Date}>(`SELECT w.*,clock_timestamp() sampled_at,least(w.motion_until,coalesce(c.expires_at,w.started_at),s.expires_at,s.idle_expires_at,s.revoked_at) AS motion_until
 FROM mare_game.character_world w LEFT JOIN mare_game.character_control c ON c.character_id=w.character_id
 LEFT JOIN mare_game.app_sessions s ON s.id=c.session_id WHERE w.character_id=ANY($1::uuid[])`,[ids])).rows;
 for(const row of rows)result.set(row.character_id,snapshot(row,now??row.sampled_at));return result;
}
export async function readWorld(client:PoolClient,id:string,now?:Date){return (await readWorlds(client,[id],now)).get(id)??null;}
export async function storeWorld(client:PoolClient,id:string,w:WorldSnapshot){
 await client.query(`INSERT INTO mare_game.character_world(character_id,rules_hash,map_id,area,x,y,path,speed,direction,started_at,motion_until)
 VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11) ON CONFLICT(character_id) DO UPDATE
 SET rules_hash=EXCLUDED.rules_hash,map_id=EXCLUDED.map_id,area=EXCLUDED.area,x=EXCLUDED.x,y=EXCLUDED.y,path=EXCLUDED.path,speed=EXCLUDED.speed,direction=EXCLUDED.direction,started_at=EXCLUDED.started_at,motion_until=EXCLUDED.motion_until`,[id,w.rulesHash,w.mapId,w.area,w.position.x,w.position.y,JSON.stringify(w.path),w.speed,w.direction,w.serverNow,w.motionUntil]);
}
const store=storeWorld;
// Called under the same character lock as lease takeover: old motion cannot resume.
export async function stopWorld(client:PoolClient,id:string){
 // Lease acquisition also serves pre-world migration fixtures; no world exists then.
 if(!(await client.query("SELECT to_regclass('mare_game.character_world') present")).rows[0].present)return null;
 const now=await clock(client),w=await readWorld(client,id,now);if(w){w.path=[];w.motionUntil=w.serverNow;await store(client,id,w);}return w;}
export async function mutateWorld(client:PoolClient,id:string,input:CharacterCommand,state:CharacterState){
 const now=await clock(client),rules=catalog();let w=await readWorld(client,id,now);
 if(input.action==='world.initialize'&&w)return w;
 if(input.action!=='world.initialize'&&!w)throw new AuthFault(409,'world_not_started');
 const phase=(await client.query("SELECT phase FROM mare_game.combat_encounters WHERE character_id=$1 ORDER BY ordinal DESC LIMIT 1",[id])).rows[0]?.phase;
 if(['world.initialize','world.travel','world.return'].includes(input.action)&&['active','won'].includes(phase))throw new AuthFault(409,'world_combat_pending');
 if(['world.initialize','world.travel','world.return'].includes(input.action)){
  const island=input.action==='world.travel'?rules.islands.find((i:any)=>i.id===input.payload.islandId):null;
  if(input.action==='world.travel'&&!island)throw new AuthFault(400,'world_destination_unknown');
  if(island&&state.level<island.minLevel)throw new AuthFault(409,'world_level_required');
  const mapId=island?rules.mapId(island.area):'lobby',nav=rules.navigation(mapId),position={...nav.map.spawn};
  if(!nav.walkable(position.x,position.y))throw new AuthFault(503,'world_spawn_blocked');
  w={rulesetId:'original-world-v1',rulesHash:rules.rulesHash,mapId,area:island?.area??null,position,path:[],speed:0,direction:'front',serverNow:now.toISOString(),motionUntil:now.toISOString()};
 }else if(input.action==='world.move'){
  const battle=await readBattle(client,id);if(battle&&(battle.pending||battle.skillJob||battle.fruit?.job||(battle.actionLockUntil||0)>now.getTime()))throw new AuthFault(409,'battle_action_locked');
  const nav=rules.navigation(w!.mapId),goal=input.payload;if(!nav.walkable(goal.x,goal.y))throw new AuthFault(409,'world_destination_blocked');
  const path:Point[]=nav.path(w!.position,goal);if(!path.length||path.length>128)throw new AuthFault(409,'world_route_unavailable');
  const fighter=await readFighter(client,id,state);const speed=fighter.rulesetId==='original-character-v1'?fighter.stats.moveSpeed:150;
  const lease=(await client.query<{until:Date}>(`SELECT least(c.expires_at,s.expires_at,s.idle_expires_at,$2::timestamptz+interval '120 seconds') AS until
   FROM mare_game.character_control c JOIN mare_game.app_sessions s ON s.id=c.session_id WHERE c.character_id=$1`,[id,now])).rows[0]!;
  w={...w!,path,speed,serverNow:now.toISOString(),motionUntil:lease.until.toISOString()};
 }else{w={...w!,path:[],serverNow:now.toISOString(),motionUntil:now.toISOString()};}
 if(state.version>=Number.MAX_SAFE_INTEGER)throw new AuthFault(503,'state_version_exhausted');
 await store(client,id,worldSnapshotSchema.parse(w));
 if(input.action!=='world.initialize')await syncBattleWorld(client,id,w!.area,now.getTime());
 const updated=await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1 AND state_version=$2 RETURNING id',[id,state.version]);
 if(!updated.rowCount)throw new AuthFault(409,'state_version_conflict');
 return w!;
}

export async function enterPilotWorld(client:PoolClient,id:string){
 if(await readBattle(client,id))throw new AuthFault(409,'battle_original_active');
 if(!await readWorld(client,id))return null;
 const now=await clock(client),rules=catalog(),nav=rules.navigation('dawn'),position={...nav.map.spawn};
 const enemy=nav.nearest({x:position.x+110,y:position.y});
 if(!enemy||!nav.projectileClear(position,enemy))throw new AuthFault(503,'world_spawn_blocked');
 await store(client,id,{rulesetId:'original-world-v1',rulesHash:rules.rulesHash,mapId:'dawn',area:'beach',position,path:[],speed:0,direction:'front',serverNow:now.toISOString(),motionUntil:now.toISOString()});
 return {mapId:'dawn',...enemy};
}
export async function requirePilotReach(client:PoolClient,id:string,combat:any){
 if(!combat.worldMapId)return;
 const w=await readWorld(client,id),enemy=combat.enemyPosition,range=combat.fighter?.stats?.range??44;
 if(!w||w.mapId!==combat.worldMapId||!enemy||Math.hypot(w.position.x-enemy.x,w.position.y-enemy.y)>range)throw new AuthFault(409,'combat_out_of_range');
 if(!catalog().navigation(w.mapId).projectileClear(w.position,enemy))throw new AuthFault(409,'combat_line_blocked');
 await stopWorld(client,id);
}
