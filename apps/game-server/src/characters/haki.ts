import {createRequire} from 'node:module';
import type {PoolClient} from 'pg';
import {hakiActions,hakiStateSchema,type CharacterCommand,type CharacterState} from '@mare/shared';
import {AuthFault} from '../auth/errors.js';
import {readBattle,storeBattle} from './battle.js';
import {readWorld} from './world.js';
import {readOriginalInventory,writeInventory,event} from '../gameplay/inventory.js';
import {getGameCatalog} from '../gameplay/catalog.js';
const require=createRequire(import.meta.url),H=require('../../../../haki-system.js'),E=require('../../../../world-battle.cjs');
const maps=require('../../../../world-catalog.cjs').load;
export const isHakiAction=(action:string)=>(hakiActions as readonly string[]).includes(action);
export function hakiView(b:any){
 const state=hakiStateSchema.parse(b?.haki??H.migrate({}).haki);
 return {state,runtime:b?.hakiRuntime??H.start()};
}
export async function readHaki(client:PoolClient,id:string){
 const b=await readBattle(client,id);return b?hakiView(b):null;
}
export async function mutateHaki(client:PoolClient,id:string,input:CharacterCommand,state:CharacterState){
 const b=await readBattle(client,id);if(!b)throw new AuthFault(409,'battle_not_started');
 if(b.rulesHash!==E.rulesHash)throw new AuthFault(503,'battle_rules_changed');
 const {state:h}=hakiView(b);if(state.version>=Number.MAX_SAFE_INTEGER||h.mastery.seq>=Number.MAX_SAFE_INTEGER)throw new AuthFault(503,'state_version_exhausted');
 const stock=await readOriginalInventory(client,id);if(!stock)throw new AuthFault(409,'original_inventory_required');
 const game={...stock,level:state.level,has_haki_unlocked:h.unlocked,haki:h};let next:any=game;
 b.haki=h;E.hakiGame(b);
 if(input.action==='haki.unlock'){
  const r=H.unlock(game,input.payload.itemId,getGameCatalog().items);if(!r.ok)throw new AuthFault(409,'haki_unlock_unavailable');next=r.state;
 }else if(input.action==='haki.invest'){
  const r=H.progression.invest(game,input.payload.nodeId,input.payload.expectedSeq,getGameCatalog().items,()=>true);if(!r.ok)throw new AuthFault(409,'haki_invest_unavailable');next=r.state;
 }else if(input.action==='haki.configure'){
  next=H.configure(game,input.payload.branch,input.payload.enabled);if(!next)throw new AuthFault(409,'haki_unlearned');b.hakiRuntime.active=null;
 }else if(input.action==='haki.toggle'){
  if(!E.hakiToggle(b,input.payload.branch).ok)throw new AuthFault(409,'haki_toggle_unavailable');
 }else if(input.action==='haki.cast'){
  const w=await readWorld(client,id);if(!w)throw new AuthFault(409,'world_not_started');
  const now=(await client.query('SELECT clock_timestamp() now')).rows[0].now as Date;
  if(!E.hakiCast(b,{hero:w.position,nav:maps().navigation(w.mapId),now:now.getTime()}).ok)throw new AuthFault(409,'haki_cast_unavailable');
 }
 b.haki=hakiStateSchema.parse(next.haki);
 if(input.action==='haki.unlock'||input.action==='haki.invest'){
  const after={...stock,inventory:next.inventory};await writeInventory(client,id,after);
  await event(client,id,input.requestId,state.version,input.action,stock,after,BigInt(state.gold),0n,{unlocked:b.haki.unlocked,masterySeq:b.haki.mastery.seq});
 }
 await storeBattle(client,id,b);await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[id]);
}
