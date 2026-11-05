import {createRequire} from 'node:module';
import type {PoolClient} from 'pg';
import type {CharacterState,CharacterCommand} from '@mare/shared';
import {readBattle,storeBattle} from './battle.js';
import {readWorld,storeWorld} from './world.js';
import {readFighter} from './fighter.js';
import {readTalents} from './talents.js';
import {AuthFault} from '../auth/errors.js';
import {readOriginalInventory} from '../gameplay/inventory.js';
import {getGameCatalog} from '../gameplay/catalog.js';
const A=createRequire(import.meta.url)('../../../../akuma-system.js');
const require=createRequire(import.meta.url),E=require('../../../../world-battle.cjs'),maps=require('../../../../world-catalog.cjs').load;
export async function mutateFruit(client:PoolClient,id:string,input:CharacterCommand,state:CharacterState){
 const b=await readBattle(client,id),w=await readWorld(client,id);if(!b||!w)throw new AuthFault(409,'battle_not_started');
 if(b.rulesHash!==E.rulesHash)throw new AuthFault(503,'battle_rules_changed');
 if(state.version>=Number.MAX_SAFE_INTEGER)throw new AuthFault(503,'state_version_exhausted');
 const fighter=await readFighter(client,id,state);if(fighter.rulesetId!=='original-character-v1')throw new AuthFault(409,'original_inventory_required');
 const now=((await client.query('SELECT clock_timestamp() now')).rows[0].now as Date).getTime(),nav=maps().navigation(w.mapId),c={hero:{...w.position,direction:w.direction},nav,now,stats:fighter.stats,baseStats:fighter.baseStats,fruitId:fighter.fruitId,classId:fighter.classId,factionId:fighter.factionId,level:state.level,build:(await readTalents(client,id,state))?.build};
 if(input.action==='fruit.transform'){if(!E.fruitTransform(b,input.payload.enabled,c))throw new AuthFault(409,'fruit_transform_unavailable');}
 else if(input.action==='fruit.cast'){if(!E.fruitCast(b,input.payload.key,{...c,point:input.payload.point}))throw new AuthFault(409,'fruit_cast_unavailable');}
 else if(input.action==='fruit.move'){
  const g=b.fruit?.effects?.genie;if(!g||g.hp<=0||g.until<=now/1000||b.hp<=0||fighter.fruitId!=='akuma_hoya_hoya'||!nav.walkable(input.payload.x,input.payload.y))throw new AuthFault(409,'fruit_move_unavailable');
  const route=nav.path(g,input.payload);if(!route.length&&Math.hypot(g.x-input.payload.x,g.y-input.payload.y)>1)throw new AuthFault(409,'fruit_move_unavailable');g.path=route;b.targetId=null;
 }
 if(b.fruit?.job){await storeWorld(client,id,{...w,direction:c.hero.direction as typeof w.direction,path:[],motionUntil:w.serverNow});}
 await storeBattle(client,id,b);await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[id]);
}
export async function readFruits(client:PoolClient,id:string){
 if(!(await client.query("SELECT to_regclass('mare_game.fruit_registrations') present")).rows[0].present)return null;
 const registered=(await client.query('SELECT fruit_id FROM mare_game.fruit_registrations WHERE character_id=$1 ORDER BY fruit_id',[id])).rows.map(r=>r.fruit_id);
 return fruitView(registered);
}
export function fruitView(registered:string[]){
 if(registered.length>30||registered.some(v=>!A.byId(v)))throw new AuthFault(503,'fruit_state_unavailable');
 return {rulesetId:'original-fruits-v1',registered};
}
export async function registerFruit(client:PoolClient,id:string,requestId:string,state:CharacterState,itemId:string){
 const fruits=await readFruits(client,id);if(!fruits)throw new AuthFault(503,'fruit_state_unavailable');
 const inventory=await readOriginalInventory(client,id);if(!inventory)throw new AuthFault(409,'original_inventory_required');
 const item=[...inventory.inventory,...Object.values(inventory.equipment)].find(i=>i?.id===itemId);
 if(!item)throw new AuthFault(404,'item_not_found');
 const fruit=A.itemData(item,getGameCatalog().items);if(!fruit)throw new AuthFault(409,'fruit_required');
 if(fruits.registered.includes(fruit.id))throw new AuthFault(409,'fruit_already_registered');
 if(state.version>=Number.MAX_SAFE_INTEGER)throw new AuthFault(503,'state_version_exhausted');
 await client.query('INSERT INTO mare_game.fruit_registrations(character_id,fruit_id,item_id,request_id,version_before) VALUES($1,$2,$3,$4,$5)',[id,fruit.id,item.id,requestId,state.version]);
 await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[id]);
}
