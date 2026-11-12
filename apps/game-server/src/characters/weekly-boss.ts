import {weeklyBossLootRules} from './weekly-boss-loot.js';
import type {PoolClient} from 'pg';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import type {CharacterCommand,CharacterState,WorldSnapshot} from '@mare/shared';
import {AuthFault} from '../auth/errors.js';
import {readBattle,readBattleRows,storeBattle} from './battle.js';
import {readWorld,readWorlds,storeWorld} from './world.js';
import {readCombatInputs} from './combat-inputs.js';
import {readHierarchyTiers} from './hierarchy.js';
import {lockPeer} from './party.js';
import {weeklyBossAvailable,weeklyOperator,weeklyRoom,weeklyRoster,weeklyAudit,authorizeWeeklyBoss} from './weekly-boss-store.js';
const require=createRequire(import.meta.url),A=require('../../../../akainu-combat.js'),R=require('../../../../weekly-boss-rules.cjs'),E=require('../../../../world-battle.cjs'),maps=require('../../../../world-catalog.cjs').load;
type WeeklyCommand=Extract<CharacterCommand,{action:'weeklyBoss.execute'}>;
// Private rehearsal only. These are not official balance values or public spawns.
const rehearsalProfile={hp:20000,attack:20,defense:0,magicDefense:0,speed:70,reach:65,attackSec:2.5,aoeCooldown:8,aoeRadius:110,aoeWindup:1.2,aoeMultiplier:1.5,level:50,leash:480};
async function now(c:PoolClient):Promise<Date>{return (await c.query('SELECT clock_timestamp() now')).rows[0].now;}
export async function weeklyInputs(c:PoolClient,ids:string[]){
 const result=new Map<string,any>();for(let i=0;i<ids.length;i+=4)for(const [id,input]of await readCombatInputs(c,ids.slice(i,i+4)))result.set(id,input);return result;
}
function navigation(id:string){return maps().maps[id]?maps().navigation(id):null;}
function rehearsalConfig(){
 const nav=navigation('quest-dungeons');if(!nav)throw new AuthFault(409,'weekly_boss_test_map_unavailable');
 const entry={...nav.map.spawn},spawn=nav.nearest({x:entry.x,y:entry.y-180});
 if(!spawn||!nav.projectileClear(entry,spawn))throw new AuthFault(409,'weekly_boss_spawn_blocked');
 return {mapId:'quest-dungeons',spawn,entry,maxPlayers:2,minLevel:1,durationMinutes:15,balanceApproved:false,profile:{...rehearsalProfile}};
}
async function bump(c:PoolClient,id:string){await c.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1 AND state_version<9007199254740991',[id]);}
/** Caller owns the event row and peer character/session locks. Test state is restored,
 * never converted into normal progress; official players return safely to the port. */
export async function leaveWeeklyBoss(c:PoolClient,id:string){
 const member=(await c.query('SELECT * FROM mare_game.weekly_boss_members WHERE character_id=$1',[id])).rows[0];if(!member)return;
 const row=await weeklyRoom(c,member.event_id),at=await now(c);let b=await readBattle(c,id),w:WorldSnapshot;
 if(row?.mode==='test'){
  b=member.return_battle;w=member.return_world;
 }else{
  const rules=maps(),nav=rules.navigation('lobby');
  w={rulesetId:'original-world-v1',rulesHash:rules.rulesHash,mapId:'lobby',area:null,position:{...nav.map.spawn},path:[],speed:0,direction:'front',serverNow:at.toISOString(),motionUntil:at.toISOString()};
  if(b){b.area=null;b.mobs=[];}
 }
 await c.query('DELETE FROM mare_game.weekly_boss_members WHERE character_id=$1',[id]);
 if(b){delete b.weeklyBossInstanceId;delete b.weeklyBossTest;E.cancel(b);E.resetHaki(b);b.talents=null;await storeBattle(c,id,b,false);}
 await storeWorld(c,id,{...w!,path:[],speed:0,serverNow:at.toISOString(),motionUntil:at.toISOString()});
 await c.query('UPDATE mare_game.character_battles SET tick_at=$2 WHERE character_id=$1',[id,at]);await bump(c,id);
}
async function join(c:PoolClient,id:string,row:any,epoch:number,state:CharacterState){
 const operator=await weeklyOperator(c,id),at=await now(c);
 if(row.status!=='active'||row.closes_at<=at||(row.mode==='test'&&!operator))throw new AuthFault(404,'weekly_boss_event_unavailable');
 const existing=(await c.query('SELECT event_id FROM mare_game.weekly_boss_members WHERE character_id=$1',[id])).rows[0];
 if(existing){if(existing.event_id===row.id)return;throw new AuthFault(409,'weekly_boss_already_joined');}
 const w=await readWorld(c,id,at),b=await readBattle(c,id),config=row.config;
 if(!w||!b||b.hp<=0||b.partyInstanceId||b.prison||b.dungeon||w.mapId!=='lobby')throw new AuthFault(409,'weekly_boss_return_to_port');
 if(row.mode==='test'&&(await c.query('SELECT 1 FROM mare_game.party_members WHERE character_id=$1',[id])).rowCount)throw new AuthFault(409,'weekly_boss_test_leave_party');
 if(state.level<config.minLevel)throw new AuthFault(409,'weekly_boss_level_required');
 if((await c.query('SELECT count(*)::int n FROM mare_game.weekly_boss_members WHERE event_id=$1',[row.id])).rows[0].n>=config.maxPlayers)throw new AuthFault(409,'weekly_boss_full');
 if(Object.keys(row.simulation.contributions).length>=256&&!row.simulation.contributions[id])throw new AuthFault(409,'weekly_boss_full');
 const nav=navigation(row.map_id);if(!nav||!nav.walkable(config.entry.x,config.entry.y))throw new AuthFault(409,'weekly_boss_map_unavailable');
 await c.query('INSERT INTO mare_game.weekly_boss_members(character_id,event_id,control_epoch,return_world,return_battle) VALUES($1,$2,$3,$4,$5)',[id,row.id,epoch,JSON.stringify(w),JSON.stringify(b)]);
 E.cancel(b);E.resetHaki(b);b.talents=null;b.area=row.map_id;b.weeklyBossInstanceId=row.id;b.weeklyBossTest=row.mode==='test';b.mobs=row.simulation.mobs;
 await storeBattle(c,id,b,false);
 await storeWorld(c,id,{...w,mapId:row.map_id,area:row.map_id,position:{...config.entry},path:[],speed:0,direction:'back',serverNow:at.toISOString(),motionUntil:at.toISOString()});
 await c.query('UPDATE mare_game.character_battles SET tick_at=$2,control_epoch=$3 WHERE character_id=$1',[id,at,epoch]);
}
/** One authenticated command family; no raw damage, HP, clocks or rewards supplied by clients. */
export async function executeWeeklyBoss(c:PoolClient,id:string,input:WeeklyCommand,state:CharacterState){
 if(!await weeklyBossAvailable(c))throw new AuthFault(503,'weekly_boss_unavailable');
 if(state.version>=Number.MAX_SAFE_INTEGER)throw new AuthFault(503,'state_version_exhausted');
 const p=input.payload;await authorizeWeeklyBoss(c,id,p.op);const account=await weeklyOperator(c,id);let receipt:{eventId?:string;revision?:number}={};
 if(p.op==='configure'||p.op==='activate'||p.op==='test'){
  const settings=(await c.query("SELECT * FROM mare_game.weekly_boss_settings WHERE boss_id='akainu' FOR UPDATE")).rows[0];
  if(p.op!=='test'&&p.revision!==settings.revision)throw new AuthFault(409,'weekly_boss_revision_conflict');
  if(p.op==='configure'){
   if((await c.query("SELECT 1 FROM mare_game.weekly_boss_events WHERE mode='official' AND status='active'")).rowCount)throw new AuthFault(409,'weekly_boss_already_active');
   A.validateProfile(p.config.profile);await c.query("UPDATE mare_game.weekly_boss_settings SET revision=revision+1,config=$1 WHERE boss_id='akainu'",[JSON.stringify(p.config)]);
   receipt={revision:settings.revision+1};await weeklyAudit(c,'configure',account,null,{revision:receipt.revision});
  }else{
   const test=p.op==='test',config=test?rehearsalConfig():settings.config;
   if(!config)throw new AuthFault(409,'weekly_boss_config_required');
   if(!test){try{R.canActivate(config,{map:navigation});}catch(e){throw new AuthFault(409,(e as Error).message);}}
   const mode=test?'test':'official';let row=(await c.query("SELECT *,clock_timestamp() now FROM mare_game.weekly_boss_events WHERE mode=$1 AND status='active' FOR UPDATE",[mode])).rows[0];
   if(row&&!test)throw new AuthFault(409,'weekly_boss_already_active');
   if(!row){
    const at=await now(c),key=randomUUID(),end=new Date(Math.min(at.getTime()+config.durationMinutes*60000,R.cycleEnd(at.getTime())));
    const boss=A.create({id:randomUUID(),x:config.spawn.x,y:config.spawn.y,profile:config.profile,now:at.getTime()});boss.balanceVersion=E.balanceVersion;
    const room={id:key,mapId:config.mapId,config,mode,rulesVersion:1,mobs:[boss],contributions:{}};
    row=(await c.query("INSERT INTO mare_game.weekly_boss_events(id,mode,map_id,cycle_key,config,simulation,created_by,opened_at,closes_at,tick_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$8) RETURNING *",[key,mode,config.mapId,R.cycleKey(at.getTime()),JSON.stringify(config),JSON.stringify(room),account,at,end])).rows[0];
    await weeklyAudit(c,p.op,account,key,{mode});
   }
   if(test)await join(c,id,row,input.control.epoch,state);receipt={eventId:row.id};
  }
 }else if(p.op==='join'){
  const row=(await c.query('SELECT * FROM mare_game.weekly_boss_events WHERE id=$1 FOR UPDATE',[p.eventId])).rows[0];if(!row)throw new AuthFault(404,'weekly_boss_event_unavailable');
  await join(c,id,row,input.control.epoch,state);receipt={eventId:row.id};
 }else if(p.op==='leave'){
  await leaveWeeklyBoss(c,id);
 }else if(p.op==='cancel'){
  const row=(await c.query('SELECT * FROM mare_game.weekly_boss_events WHERE id=$1 FOR UPDATE',[p.eventId])).rows[0];
  if(!row||row.status!=='active')throw new AuthFault(409,'weekly_boss_event_unavailable');
  if(p.version!==row.version)throw new AuthFault(409,'weekly_boss_revision_conflict');
  const roster=await weeklyRoster(c,row.id);for(const m of roster)if(m.character_id!==id)await lockPeer(c,m);
  await c.query("UPDATE mare_game.weekly_boss_events SET status='cancelled',ended_at=clock_timestamp(),version=version+1 WHERE id=$1",[row.id]);
  for(const m of roster)await leaveWeeklyBoss(c,m.character_id);
  await weeklyAudit(c,'cancel',account,row.id);receipt={eventId:row.id};
 }
 if(p.op!=='leave')await bump(c,id);return receipt;
}
/** Read only public event information; heartbeat cannot prolong a revoked/stale lease. */
export async function readWeeklyBoss(c:PoolClient,id:string,sessionId:string){
 if(!await weeklyBossAvailable(c))return null;
 const context=(await c.query(`SELECT clock_timestamp() now,
 EXISTS(SELECT 1 FROM mare_game.weekly_boss_operators o JOIN mare_game.characters ch ON ch.account_id=o.account_id WHERE ch.id=$1) can_manage,
 EXISTS(SELECT 1 FROM mare_game.weekly_boss_members WHERE character_id=$1) member,
 EXISTS(SELECT 1 FROM mare_game.weekly_boss_events WHERE mode='official' AND status='active' AND closes_at>clock_timestamp()) public_active,
 (SELECT cycle_key::text FROM mare_game.weekly_boss_entitlements WHERE character_id=$1 ORDER BY cycle_key DESC LIMIT 1) cycle`,[id])).rows[0];
 // Closed events must not add N+1 queries or a changing clock to unrelated state.
 if(!context.can_manage&&!context.member&&!context.public_active)return {canManage:false,events:[],current:null,peers:[],serverNow:null,rewardPendingCycle:context.cycle??null};
 const canManage=!!context.can_manage,at:Date=context.now;
 await c.query(`UPDATE mare_game.weekly_boss_members m SET last_seen=$2 FROM mare_game.character_control cc JOIN mare_game.app_sessions s ON s.id=cc.session_id JOIN mare_game.accounts a ON a.id=s.account_id WHERE m.character_id=$1 AND cc.character_id=m.character_id AND cc.expires_at>$2 AND s.kind='play' AND s.revoked_at IS NULL AND s.expires_at>$2 AND s.idle_expires_at>$2 AND s.provider_valid_until>$2 AND s.account_epoch=a.auth_epoch AND s.id=$3`,[id,at,sessionId]);
 const current=(await c.query('SELECT e.* FROM mare_game.weekly_boss_members m JOIN mare_game.weekly_boss_events e ON e.id=m.event_id WHERE m.character_id=$1',[id])).rows[0];
 const rows=(await c.query("SELECT id,mode,map_id,status,version,closes_at,config,simulation->'mobs'->0 boss,(SELECT count(*)::int FROM mare_game.weekly_boss_members WHERE event_id=e.id) members FROM mare_game.weekly_boss_events e WHERE status='active' AND closes_at>$1 AND (mode='official' OR $2) ORDER BY opened_at LIMIT 2",[at,canManage])).rows;
 const view=(r:any)=>({id:r.id,mode:r.mode,status:r.status,version:r.version,mapId:r.map_id,endsAt:r.closes_at.toISOString(),maxPlayers:r.config.maxPlayers,minLevel:r.config.minLevel,members:r.members??0,boss:{name:'Akainu',hp:Math.max(0,(r.boss??r.simulation?.mobs[0])?.hp??0),maxHp:(r.boss??r.simulation?.mobs[0])?.maxHP??0},rewardsConfigured:r.mode==='official'});
 const settings=canManage?(await c.query("SELECT revision,config FROM mare_game.weekly_boss_settings WHERE boss_id='akainu'")).rows[0]:undefined;
 const rights={cycle:context.cycle};
 const peers:any[]=[];
 if(current){
  const roster=(await weeklyRoster(c,current.id)).filter(m=>m.connected),ids=roster.map(m=>m.character_id),inputs=await weeklyInputs(c,ids),worlds=await readWorlds(c,ids,at),battles=await readBattleRows(c,ids);
  const names=new Map((await c.query('SELECT id,name,class_id,faction_id FROM mare_game.characters WHERE id=ANY($1::uuid[])',[ids])).rows.map(r=>[r.id,r]));
  const tiers=await readHierarchyTiers(c,ids);
  for(const m of roster){const input=inputs.get(m.character_id),b=battles.get(m.character_id)?.simulation,w=worlds.get(m.character_id);if(!input||!b||!w||b.weeklyBossInstanceId!==current.id)continue;const f=input.fighter(b),n=names.get(m.character_id),equipment:any={};
   if(!input.preferences.hideItems)for(const slot of ['weapon','head','coat','cloak','gloves','legs','boots']){const item=input.inventory?.equipment[slot];if(item)equipment[slot]={def:item.def};}
   peers.push({id:m.character_id,name:n.name,classId:n.class_id,factionId:n.faction_id,hierarchyTier:tiers.get(m.character_id)??null,level:input.state.level,hp:Math.max(0,b.hp),maxHp:f.maxHp,connected:true,world:w,instanceId:current.id,appearance96:input.appearance,hideHeadgear:!!input.preferences.hideHeadgear,equipment,action:b.pending||b.skillJob?'attack':'idle',fruitId:f.fruitId,zoanTransformed:b.fruit?.transformed===true,haki:b.haki?{active:b.haki.active,eyeFX:b.haki.eyeFX,kingFX:b.haki.kingFX}:null});
  }
 }
 return {canManage,lootRules:weeklyBossLootRules,events:rows.map(view),current:current?view(current):null,peers,serverNow:at.toISOString(),rewardPendingCycle:rights?.cycle??null,...(settings?{revision:settings.revision,config:settings.config,marinefordReady:!!maps().maps.marineford}: {})};
}
