import type {PoolClient} from 'pg';
import {randomInt,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {AuthFault} from '../auth/errors.js';
import {sendOfficialMail} from './mail.js';
import {swordAttachments,swordRules} from './sword-collection-store.js';

const require=createRequire(import.meta.url);
const arena=require('../../../../daily-sword-arena-data.js');
const battle=require('../../../../daily-sword-battle.cjs');
const rules=require('../../../../sword-compendium.js');
const engine=require('../../../../world-battle.cjs');

async function clock(client:PoolClient,knownTime?:Date){
 const at:Date=knownTime??(await client.query('SELECT clock_timestamp() AS now')).rows[0].now;
 const day=rules.day(at);
 const times=(await client.query("SELECT ($1::date + make_time($2,0,0)) AT TIME ZONE $4 AS opens, ($1::date + make_time($3,0,0)) AT TIME ZONE $4 AS closes",[day.key,rules.openingHour,rules.closingHour,rules.timeZone])).rows[0];
 return {at,day,opens:times.opens as Date,closes:times.closes as Date};
}
export async function readDailySwords(client:PoolClient,now:Date){
 const {at,day,opens,closes}=await clock(client,now);
 const event=(await client.query(`SELECT status,(SELECT count(*)::int FROM mare_game.weekly_boss_members WHERE event_id=e.id) members
  FROM mare_game.weekly_boss_events e WHERE map_id='arena-espadachins' AND cycle_key=$1`,[day.key])).rows[0];
 const status=event?.status==='won'?'won':event&&event.status!=='active'?'closed':day.status;
 return {boss:day.boss,name:rules.bossNames[day.boss],status,opensAt:opens.toISOString(),endsAt:closes.toISOString(),serverNow:at.toISOString(),minLevel:battle.policy.minLevel,maxPlayers:battle.policy.maxPlayers,members:event?.members??0};
}
export async function openDailySwords(client:PoolClient,characterId:string,knownTime?:Date){
 const {at,day,opens,closes}=await clock(client,knownTime);
 if(day.status!=='open')throw new AuthFault(409,'sword_event_closed');
 await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['daily-swords:'+day.key]);
 const existing=(await client.query("SELECT * FROM mare_game.weekly_boss_events WHERE map_id='arena-espadachins' AND cycle_key=$1 FOR UPDATE",[day.key])).rows[0];
 if(existing){
  if(existing.status!=='active')throw new AuthFault(409,'sword_event_closed');
  return existing;
 }
 const character=(await client.query('SELECT account_id FROM mare_game.characters WHERE id=$1',[characterId])).rows[0];
 if(!character)throw new AuthFault(404,'character_not_found');
 const id=randomUUID(),mapId='arena-espadachins',mode='official';
 const boss=battle.create({id:randomUUID(),boss:day.boss,x:arena.bossSpawn.x,y:arena.bossSpawn.y,now:at.getTime()});
 boss.balanceVersion=engine.balanceVersion;
 const config={mapId,spawn:arena.bossSpawn,entry:arena.entryPoints[0],entries:arena.entryPoints,maxPlayers:battle.policy.maxPlayers,minLevel:battle.policy.minLevel,profile:boss.profile};
 const simulation={id,mapId,config,mode,rulesVersion:1,mobs:[boss],contributions:{}};
 return (await client.query(`
  INSERT INTO mare_game.weekly_boss_events(id,boss_id,mode,map_id,cycle_key,config,simulation,created_by,opened_at,closes_at,tick_at)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
 `,[id,day.boss,mode,mapId,day.key,JSON.stringify(config),JSON.stringify(simulation),character.account_id,opens,closes,at])).rows[0];
}
export async function rewardDailySwords(client:PoolClient,eventId:string,characterId:string,contribution:{damage:number;healing:number}){
 const previous=(await client.query('SELECT 1 FROM mare_game.daily_sword_victories WHERE event_id=$1 AND character_id=$2',[eventId,characterId])).rowCount;
 if(previous)return;
 const loot=swordRules.roll(()=>randomInt(1_000_000)/1_000_000);
 await client.query('INSERT INTO mare_game.daily_sword_victories(event_id,character_id,damage,healing,loot) VALUES($1,$2,$3,$4,$5)',[eventId,characterId,contribution.damage,contribution.healing,JSON.stringify(loot)]);
 for(const [id,count] of Object.entries(loot))await sendOfficialMail(client,characterId,{
  source:'event',sourceId:eventId,rewardId:'daily-sword:'+id,title:'Recompensa do Desafio das Sete Lâminas',
  message:'Resgate seus fragmentos. O estado da espada no momento do resgate determina o destino.',
  makeAttachments:()=>swordAttachments({[id]:count},'Desafio das Sete Lâminas'),
 });
}
