import {createRequire} from 'node:module';
import {randomInt,randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {prisonActions,prisonStateSchema,type CharacterCommand,type CharacterState,type WorldSnapshot,type OriginalItemInstance} from '@mare/shared';
import {AuthFault} from '../auth/errors.js';
import {readOriginalInventory,awardWorldLoot} from '../gameplay/inventory.js';
import {getGameCatalog} from '../gameplay/catalog.js';
import {readBattle,storeBattle} from './battle.js';
import {readWorld,storeWorld} from './world.js';
import {readFighter} from './fighter.js';
import {creditProfessionPrison} from './crew-professions.js';
const require=createRequire(import.meta.url),P=require('../../../../prison-system.js'),E=require('../../../../world-battle.cjs'),maps=require('../../../../world-catalog.cjs').load;
const rng=()=>randomInt(0,0x100000000)/0x100000000;
export const isPrisonAction=(action:string)=>(prisonActions as readonly string[]).includes(action);
export async function readPrison(client:PoolClient,id:string){
 if(!(await client.query("SELECT to_regclass('mare_game.character_prison') present")).rows[0].present)return null;
 const row=(await client.query('SELECT state FROM mare_game.character_prison WHERE character_id=$1',[id])).rows[0];
 return prisonStateSchema.parse(row?.state??P.migrate({}).impelDown);
}
async function save(client:PoolClient,id:string,state:any){const parsed=prisonStateSchema.parse(state);await client.query('INSERT INTO mare_game.character_prison(character_id,state) VALUES($1,$2) ON CONFLICT(character_id) DO UPDATE SET state=EXCLUDED.state',[id,JSON.stringify(parsed)]);}
function prepare(p:any,floor:number){
 if(floor!==p.cleared+1||!P.validFloor(floor))throw new AuthFault(409,'prison_floor_locked');
 const result=P.prepareEncounter({impelDown:p},floor,E.prisonCatalog,rng);if(!result.ok)throw new AuthFault(503,'prison_encounter_unavailable');
 const next=result.state.impelDown;if(!next.encounter.spawnId)next.encounter.spawnId=randomUUID();return next;
}
function grantItem(next:any,floor:number,now:number):OriginalItemInstance|undefined{
 const item=next.inventory?.find((i:any)=>i.id==='impel-milestone-'+floor);return item?{...item,obtainedAt:now}:undefined;
}
async function milestone(client:PoolClient,id:string,requestId:string,floor:number){await client.query('INSERT INTO mare_game.prison_milestones(character_id,floor,request_id,item_id) VALUES($1,$2,$3,$4)',[id,floor,requestId,'impel-milestone-'+floor]);}
async function begin(client:PoolClient,id:string,state:CharacterState,p:any,b:any,w:WorldSnapshot,now:Date){
 const fighter=await readFighter(client,id,state);if(fighter.rulesetId!=='original-character-v1')throw new AuthFault(409,'original_inventory_required');
 const spec=P.resolveEncounter(p.encounter,E.prisonCatalog);if(!spec)throw new AuthFault(503,'prison_encounter_unavailable');
 const stolen=(await client.query('SELECT total FROM mare_game.battle_talent_steals WHERE character_id=$1 AND spawn_id=$2',[id,p.encounter.spawnId])).rows[0]?.total??0;
 const hero={...maps().maps['impel-down'].spawn};E.enterPrison(b,spec,fighter.stats,hero,{id:p.encounter.spawnId,stolen});
 Object.assign(w,{mapId:'impel-down',area:'impel-down',position:hero,path:[],speed:0,direction:'front',serverNow:now.toISOString(),motionUntil:now.toISOString()});
 await save(client,id,p);await storeBattle(client,id,b);await storeWorld(client,id,w);
}
export async function mutatePrison(client:PoolClient,id:string,input:CharacterCommand,state:CharacterState){
 if(!prisonActions.includes(input.action as any))return;
 const floor=(input.payload as {floor:number}).floor;let p=await readPrison(client,id);if(!p)throw new AuthFault(503,'prison_unavailable');
 if(state.version>=Number.MAX_SAFE_INTEGER)throw new AuthFault(503,'state_version_exhausted');
 const b=await readBattle(client,id),w=await readWorld(client,id);if(!b||!w)throw new AuthFault(409,'battle_not_started');
 if(b.rulesHash!==E.rulesHash)throw new AuthFault(503,'battle_rules_changed');
 const now=(await client.query('SELECT clock_timestamp() now')).rows[0].now as Date;
 if(input.action==='prison.claim'){
  const stock=await readOriginalInventory(client,id);if(!stock)throw new AuthFault(409,'original_inventory_required');
  const result=P.claimMilestone({...stock,impelDown:p},floor,getGameCatalog().items);if(!result.ok)throw new AuthFault(409,stock.inventory.length>=120?'inventory_full':'prison_milestone_unavailable');
  const grant=grantItem(result.state,floor,now.getTime());if(!grant)throw new AuthFault(503,'prison_reward_unavailable');
  await awardWorldLoot(client,id,input.requestId,state,[],undefined,0,{grant,action:'prison.claim'});await milestone(client,id,input.requestId,floor);await save(client,id,result.state.impelDown);
 }else{
  p=prepare(p,floor);
  if(input.action==='prison.enter'){
   if(b.prison)throw new AuthFault(409,'prison_already_active');
   await begin(client,id,state,p,b,w,now);await client.query('UPDATE mare_game.character_battles SET tick_at=$2,control_epoch=$3 WHERE character_id=$1',[id,now,input.control.epoch]);
  }else await save(client,id,p);
 }
 await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[id]);
}
export async function completePrisonFloor(client:PoolClient,id:string,requestId:string,b:any,kill:any,now:Date){
 const p=await readPrison(client,id),stock=await readOriginalInventory(client,id);
 if(!p||!stock||!p.encounter||p.encounter.spawnId!==kill.id||p.encounter.token!==kill.prisonToken||kill.prisonFloor!==p.cleared+1||b.prison.floor!==kill.prisonFloor)throw new AuthFault(503,'prison_victory_invalid');
 const result=P.completeFloor({...stock,impelDown:p},kill.prisonFloor,true,getGameCatalog().items);if(!result.ok)throw new AuthFault(503,'prison_victory_invalid');
 await client.query('INSERT INTO mare_game.prison_floors(character_id,floor,spawn_id,request_id,monster,rules_hash) VALUES($1,$2,$3,$4,$5,$6)',[id,kill.prisonFloor,kill.id,requestId,kill.monster.type,E.rulesHash]);
 await creditProfessionPrison(client,id,kill.id,kill.prisonFloor,now);
 const grant=grantItem(result.state,kill.prisonFloor,now.getTime());if(grant)await milestone(client,id,requestId,kill.prisonFloor);
 await save(client,id,result.state.impelDown);b.prison.transitionAt=now.getTime()+850;return grant;
}
export async function advancePrison(client:PoolClient,id:string,state:CharacterState,b:any,w:WorldSnapshot,now:Date){
 if(!b.prison?.transitionAt||now.getTime()<b.prison.transitionAt)return false;
 const p=await readPrison(client,id);if(!p)throw new AuthFault(503,'prison_unavailable');
 if(p.cleared===100){E.changeArea(b,null,now.getTime(),rng);Object.assign(w,{mapId:'lobby',area:null,position:{...maps().maps.lobby.spawn},path:[],speed:0,direction:'front',serverNow:now.toISOString(),motionUntil:now.toISOString()});await storeWorld(client,id,w);await storeBattle(client,id,b);}
 else await begin(client,id,state,prepare(p,p.cleared+1),b,w,now);
 return true;
}
