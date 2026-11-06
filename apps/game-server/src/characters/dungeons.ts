import {boostXp} from './contracts.js';
import {createRequire} from 'node:module';
import {randomInt,randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {dungeonActions,dungeonStateSchema,type CharacterCommand,type CharacterState,type OriginalInventory,type OriginalItemInstance} from '@mare/shared';
import {AuthFault} from '../auth/errors.js';
import {readOriginalInventory,writeInventory,event} from '../gameplay/inventory.js';
import {getGameCatalog} from '../gameplay/catalog.js';
import {legacyXpNeeded} from '../gameplay/character.js';
import {advanceLevel} from './progression.js';
import {readBattle,storeBattle} from './battle.js';
import {readWorld,storeWorld} from './world.js';
import {readFighter} from './fighter.js';
import {sendOfficialMail} from './mail.js';
import {rewardWalletBaseline} from './reward-wallet.js';
const require=createRequire(import.meta.url),D=require('../../../../boss-dungeon-system.js'),E=require('../../../../world-battle.cjs'),maps=require('../../../../world-catalog.cjs').load;
const rng=()=>randomInt(0,0x100000000)/0x100000000,max=9223372036854775807n;
export const isDungeonAction=(a:string)=>(dungeonActions as readonly string[]).includes(a);
export async function readDungeons(client:PoolClient,id:string,includeMailStatus=true){
 if(!(await client.query("SELECT to_regclass('mare_game.character_dungeons') present")).rows[0].present)return null;
 const row=(await client.query('SELECT state FROM mare_game.character_dungeons WHERE character_id=$1',[id])).rows[0];
 const state=dungeonStateSchema.parse(D.migrate({characterId:id,bossDungeons:row?.state}).bossDungeons);
 if(Object.values(state.records).some(r=>r?.ownerId!==id||r.reward&&r.reward.boundToCharacter!==id)||state.reveal&&state.reveal.boundToCharacter!==id)throw new AuthFault(503,'dungeon_state_unavailable');
 if(includeMailStatus){
  const letters=Object.values(state.records).filter(record=>record?.mailId);
  if(letters.length){
   const rows=(await client.query<{id:string;claimed_at:Date}>("SELECT id,claimed_at FROM mare_game.social_mail WHERE character_id=$1 AND id=ANY($2::uuid[]) AND source='dungeon' AND claimed_at IS NOT NULL",[id,letters.map(record=>record!.mailId)])).rows;
   const times=new Map(rows.map(row=>[row.id,row.claimed_at.getTime()]));
   for(const record of letters){const at=times.get(record!.mailId!);if(at!==undefined)record!.mailClaimedAt=at;}
  }
 }
 return state;
}
async function save(client:PoolClient,id:string,state:any){await client.query('INSERT INTO mare_game.character_dungeons(character_id,state) VALUES($1,$2) ON CONFLICT(character_id) DO UPDATE SET state=EXCLUDED.state',[id,JSON.stringify(dungeonStateSchema.parse(state))]);}
export async function lifetimeGold(client:PoolClient,id:string,current:string,presentation=false){
 const row=(await client.query(`WITH events AS (
 SELECT request_id,gold_delta::numeric amount FROM mare_game.game_inventory_events WHERE character_id=$1
 UNION ALL SELECT request_id,gold_delta FROM mare_game.inventory_ledger WHERE character_id=$1
 UNION ALL SELECT request_id,gold_delta FROM mare_game.contract_claims WHERE character_id=$1
 UNION ALL SELECT request_id,gold_after-gold_before FROM mare_game.combat_rewards WHERE character_id=$1
 UNION ALL SELECT request_id,gold_after-gold_before FROM mare_game.character_hunt_rewards WHERE character_id=$1
 ) SELECT GREATEST($2::numeric,COALESCE(sum(amount),0))::text earned FROM (SELECT request_id,GREATEST(0,max(amount)) amount FROM events GROUP BY request_id) unique_events`,[id,await rewardWalletBaseline(client,id,current)])).rows[0];
 const value=BigInt(row.earned);if(value>BigInt(Number.MAX_SAFE_INTEGER)){if(presentation)return Number.MAX_SAFE_INTEGER;throw new AuthFault(409,'original_currency_limit');}return Number(value);
}
async function inventoryChange(client:PoolClient,id:string,input:CharacterCommand,state:CharacterState,before:OriginalInventory,after:OriginalInventory|null,gold=0,xp=0){
 if(!Number.isSafeInteger(gold)||gold<0||!Number.isSafeInteger(xp)||xp<0||BigInt(state.gold)+BigInt(gold)>max||BigInt(state.experience)+BigInt(xp)>max)throw new AuthFault(409,'progression_limit');
 xp=Number(await boostXp(client,id,BigInt(xp)));
 if(!Number.isSafeInteger(xp)||BigInt(state.experience)+BigInt(xp)>max)throw new AuthFault(409,'progression_limit');
 if(after)await writeInventory(client,id,after);
 await client.query('UPDATE mare_game.character_progression SET gold=gold+$2,experience=experience+$3 WHERE character_id=$1',[id,String(gold),String(xp)]);
 await event(client,id,input.requestId,state.version,input.action,before,after??before,BigInt(state.gold),BigInt(gold),{experience:String(xp)});
 await advanceLevel(client,id,input.requestId,state);
 return xp;
}
export async function mutateDungeon(client:PoolClient,id:string,input:CharacterCommand,state:CharacterState){
 if(!isDungeonAction(input.action))return;
 const progress=await readDungeons(client,id,false);if(!progress)throw new AuthFault(503,'dungeons_unavailable');
 if(state.version>=Number.MAX_SAFE_INTEGER||progress.seq>=Number.MAX_SAFE_INTEGER)throw new AuthFault(503,'state_version_exhausted');
 const stock=await readOriginalInventory(client,id);if(!stock)throw new AuthFault(409,'original_inventory_required');
 const b=await readBattle(client,id),w=await readWorld(client,id);if(!b||!w)throw new AuthFault(409,'battle_not_started');
 if(b.rulesHash!==E.rulesHash)throw new AuthFault(503,'battle_rules_changed');
 const now=(await client.query('SELECT clock_timestamp() now')).rows[0].now as Date;
 const base={...stock,characterId:id,level:state.level,gold:0,xp:0,bossDungeons:progress};
 let result:any;
 if(input.action==='dungeon.enter'){
  const dungeonId=input.payload.dungeonId,d=D.byId[dungeonId],old=progress.records[dungeonId];
  if(state.level<d.level)throw new AuthFault(409,'dungeon_level_required');
  if(old?.phase==='claimed')throw new AuthFault(409,'dungeon_already_claimed');
  if(b.hp<=0)throw new AuthFault(409,'character_dead');
  result=D.begin({...base,stats:{goldEarned:await lifetimeGold(client,id,state.gold)}},dungeonId,randomUUID(),now.getTime());
  if(!result.ok)throw new AuthFault(409,'dungeon_unavailable');
  result.record.spawnId=old?.spawnId??randomUUID();
  const stolen=(await client.query('SELECT total FROM mare_game.battle_talent_steals WHERE character_id=$1 AND spawn_id=$2',[id,result.record.spawnId])).rows[0]?.total??0;
  const fighter=await readFighter(client,id,state);if(fighter.rulesetId!=='original-character-v1')throw new AuthFault(409,'original_inventory_required');
  const hero={...maps().maps['quest-dungeons'].spawn};E.enterDungeon(b,dungeonId,result.record,fighter.stats,hero,{stolen});
  Object.assign(w,{mapId:'quest-dungeons',area:'quest-dungeons',position:hero,path:[],speed:0,direction:'front',serverNow:now.toISOString(),motionUntil:now.toISOString()});
  await storeWorld(client,id,w);await storeBattle(client,id,b);await client.query('UPDATE mare_game.character_battles SET tick_at=$2,control_epoch=$3 WHERE character_id=$1',[id,now,input.control.epoch]);
 }else if(input.action==='dungeon.claim'){
  const dungeonId=input.payload.dungeonId,r=progress.records[dungeonId],chest=maps().maps['quest-dungeons'].interactions[0];
  if(!r||r.phase!=='pending'||!r.reward)throw new AuthFault(409,'dungeon_reward_unavailable');
  if(!b.dungeon||b.dungeon.id!==dungeonId||b.dungeon.record.runId!==r.runId||w.mapId!=='quest-dungeons'||b.hp<=0||Math.hypot(w.position.x-chest.x,w.position.y-chest.y)>chest.radius)throw new AuthFault(409,'dungeon_chest_out_of_range');
  const reward=r.reward,name:string=D.byId[dungeonId].name,receipt='dungeon:'+id+':'+dungeonId;
  const mailId=await sendOfficialMail(client,id,{
   source:'dungeon',sourceId:dungeonId,rewardId:'chest',title:'Baú de '+name,
   message:'Itens da sua vitória em Masmorra de Chefes.',
   makeAttachments:()=>{
    const materialId='materialId' in reward?reward.materialId:undefined;
    const def=getGameCatalog().items.findIndex(item=>materialId?
     (item.kind==='akuma-fragment'||item.kind==='weapon-fragment')&&item.materialId===materialId:
     item.kind==='haki-book'&&item.id==='will-book');
    if(def<0)throw new AuthFault(503,'dungeon_reward_catalog_unavailable');
    const item:OriginalItemInstance={id:receipt,def,level:1,plus:0,locked:false,obtainedAt:now.getTime(),
     binding:'character',boundToCharacter:id,origin:'Masmorra de Chefes · '+name,sources:[receipt],
     ...(materialId?{materialId,quantity:reward.quantity}:{}),
     ...(materialId==='akuma_fragment_e'?{rank:'E',rarity:'rare'}:{rarity:'epic'}),
    };
    return [item];
   },
  });
  Object.assign(r,{phase:'claimed',claimedAt:now.getTime(),receipt,mailId});
  progress.seq++;
  result={state:{bossDungeons:progress}};
  const xp=await inventoryChange(client,id,input,state,stock,null,reward.berry,reward.xp);
  await client.query('INSERT INTO mare_game.dungeon_claims(character_id,dungeon_id,request_id,experience_delta,gold_delta) VALUES($1,$2,$3,$4,$5)',[id,dungeonId,input.requestId,xp,r.reward.berry]);
  // Emission, XP/Berry and the claimant's relocation share one transaction.
  delete b.partyInstanceId;
  E.changeArea(b,null,now.getTime(),rng);const port=maps().maps.lobby.spawn;Object.assign(w,{mapId:'lobby',area:null,position:{...port},path:[],speed:0,direction:'front',serverNow:now.toISOString(),motionUntil:now.toISOString()});await storeWorld(client,id,w);await storeBattle(client,id,b);
 }else if(input.action==='dungeon.craft'){
  result=D.craft(base,{expectedSeq:input.payload.expectedSeq,defs:getGameCatalog().items,catalog:require('../../../../akuma-system.js').catalog,random:rng,commit:()=>true,now:now.getTime()});
  if(!result.ok)throw new AuthFault(409,'dungeon_craft_unavailable');
  await inventoryChange(client,id,input,state,stock,{...stock,inventory:result.state.inventory});
 }else if(input.action==='dungeon.acknowledge'){
  result=D.acknowledge(base,input.payload.itemId,()=>true);if(!result.ok)throw new AuthFault(409,'dungeon_reveal_unavailable');
 }
 await save(client,id,result.state.bossDungeons);await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[id]);
}
export async function completeDungeonVictory(client:PoolClient,id:string,requestId:string,state:CharacterState,b:any,kill:any,now:Date){
 const p=await readDungeons(client,id,false),r=p?.records[kill.dungeonId as keyof typeof p.records];
 if(!p||!r||!b.dungeon||b.dungeon.id!==kill.dungeonId||r.spawnId!==kill.id||r.runId!==kill.runId||r.encounterId!==kill.encounterId)throw new AuthFault(503,'dungeon_victory_invalid');
 const result=D.defeat({characterId:id,level:state.level,bossDungeons:p},kill.dungeonId,{runId:kill.runId,encounterId:kill.encounterId},legacyXpNeeded,now.getTime());
 if(!result.ok)throw new AuthFault(503,'dungeon_victory_invalid');
 await client.query('INSERT INTO mare_game.dungeon_victories(character_id,dungeon_id,run_id,spawn_id,request_id,reward,rules_hash) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,kill.dungeonId,kill.runId,kill.id,requestId,result.record.reward===null?null:JSON.stringify(result.record.reward),E.rulesHash]);
 await save(client,id,result.state.bossDungeons);b.dungeon.record=result.record;
}
