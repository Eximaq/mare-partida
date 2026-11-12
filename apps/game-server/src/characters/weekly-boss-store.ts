import type {PoolClient} from 'pg';
import {AuthFault} from '../auth/errors.js';
export async function weeklyBossAvailable(c:PoolClient):Promise<boolean>{return !!(await c.query("SELECT to_regclass('mare_game.weekly_boss_settings') present")).rows[0].present;}
export async function weeklyOperator(c:PoolClient,id:string):Promise<string|null>{
 if(!await weeklyBossAvailable(c))return null;
 return (await c.query('SELECT o.account_id FROM mare_game.weekly_boss_operators o JOIN mare_game.characters ch ON ch.account_id=o.account_id WHERE ch.id=$1',[id])).rows[0]?.account_id??null;
}
export async function authorizeWeeklyBoss(c:PoolClient,id:string,op:string){
 if(['configure','activate','test','cancel'].includes(op)&&!await weeklyOperator(c,id))throw new AuthFault(403,'weekly_boss_operator_required');
}
export async function lockWeeklyBoss(c:PoolClient,id:string){
 if(!await weeklyBossAvailable(c))return null;
 const m=(await c.query('SELECT event_id FROM mare_game.weekly_boss_members WHERE character_id=$1',[id])).rows[0];
 if(m)await c.query('SELECT id FROM mare_game.weekly_boss_events WHERE id=$1 FOR UPDATE',[m.event_id]);
 return m?.event_id??null;
}
export async function weeklyRoom(c:PoolClient,id:string){return (await c.query("SELECT *,clock_timestamp() now FROM mare_game.weekly_boss_events WHERE id=$1",[id])).rows[0]??null;}
export async function storeWeeklyRoom(c:PoolClient,room:any){await c.query('UPDATE mare_game.weekly_boss_events SET simulation=$2 WHERE id=$1',[room.id,JSON.stringify(room)]);}
export async function weeklyRoster(c:PoolClient,id:string){return (await c.query(`SELECT m.*,ch.account_id,cc.epoch,cc.session_id,
 (m.last_seen>clock_timestamp()-interval '10 seconds' AND cc.expires_at>clock_timestamp() AND s.kind='play' AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp() AND s.idle_expires_at>clock_timestamp() AND s.provider_valid_until>clock_timestamp() AND s.account_epoch=a.auth_epoch) connected
 FROM mare_game.weekly_boss_members m JOIN mare_game.characters ch ON ch.id=m.character_id
 LEFT JOIN mare_game.character_control cc ON cc.character_id=ch.id LEFT JOIN mare_game.app_sessions s ON s.id=cc.session_id LEFT JOIN mare_game.accounts a ON a.id=ch.account_id
 WHERE m.event_id=$1 ORDER BY m.character_id`,[id])).rows;}
export async function weeklyAudit(c:PoolClient,action:string,account:string|null,eventId:string|null,detail:unknown={}){await c.query('INSERT INTO mare_game.weekly_boss_audit(action,account_id,event_id,detail) VALUES($1,$2,$3,$4)',[action,account,eventId,JSON.stringify(detail)]);}
