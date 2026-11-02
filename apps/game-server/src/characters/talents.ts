import {readFighter} from './fighter.js';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import type {PoolClient} from 'pg';
import {talentSnapshotSchema,talentBuildSchema,type CharacterState,type CharacterCommand} from '@mare/shared';
import {AuthFault} from '../auth/errors.js';
import {readWorld} from './world.js';
import {readBattle,storeBattle} from './battle.js';
const require=createRequire(import.meta.url),T=require('../../../../talent-system.js');
export const talentRulesHash=createHash('sha256').update(['talent-system.js','talent-combat.js','ultimate-system.js'].map(f=>readFileSync(new URL('../../../../'+f,import.meta.url),'utf8').replaceAll('\r\n','\n')).join('\0')).digest('hex');
export async function readTalents(client:PoolClient,id:string,state:CharacterState){
 if(!(await client.query("SELECT to_regclass('mare_game.character_talents') present")).rows[0].present)return null;
 const row=(await client.query('SELECT build,revision FROM mare_game.character_talents WHERE character_id=$1',[id])).rows[0];
 const build=talentBuildSchema.parse(row?.build??T.empty()),spent=T.spent(build),earned=state.level;
 // Achievement points require a future server-owned claim ledger, never browser saves.
 return talentSnapshotSchema.parse({rulesetId:'original-talents-v1',revision:Number(row?.revision??0),earned,spent,available:earned-spent,build});
}
export async function mutateTalents(client:PoolClient,id:string,input:CharacterCommand,state:CharacterState){
 if(input.action!=='talents.commit'&&input.action!=='talents.reset')throw new AuthFault(400,'invalid_request');
 const before=await readTalents(client,id,state);if(!before)throw new AuthFault(503,'talents_unavailable');
 if(state.version>=Number.MAX_SAFE_INTEGER||before.revision>=Number.MAX_SAFE_INTEGER)throw new AuthFault(503,'state_version_exhausted');
 const w=await readWorld(client,id);if(!w)throw new AuthFault(409,'world_not_started');
 const b=await readBattle(client,id);if(!b)throw new AuthFault(409,'battle_not_started');
 const classId=(await client.query('SELECT class_id FROM mare_game.characters WHERE id=$1',[id])).rows[0].class_id;
 let after;
 if(input.action==='talents.reset'){
  if(w.area!==null||w.mapId!=='lobby')throw new AuthFault(409,'talent_reset_port_only');
  if(!before.spent)throw new AuthFault(409,'talent_build_unchanged');
  after=T.empty();b.talents=null; // Absolute cooldowns deliberately survive a reset.
 }else{
  const parsed=talentBuildSchema.safeParse(input.payload.build);if(!parsed.success)throw new AuthFault(400,'invalid_request');
  const next=parsed.data,old=before.build;
  if(T.validate(classId,next,before.earned,old)||T.nodes(classId).some((n:any)=>(next.nodes[n.id]??0)<(old.nodes[n.id]??0))||(old.keystone&&next.keystone!==old.keystone)||(old.ultimate&&next.ultimate!==old.ultimate)||T.spent(next)<=before.spent)throw new AuthFault(409,'talent_build_invalid');
  after=next;
 }
 await client.query('INSERT INTO mare_game.character_talent_events(character_id,request_id,action,revision_before,build_before,build_after,earned,rules_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,input.requestId,input.action,before.revision,JSON.stringify(before.build),JSON.stringify(after),before.earned,talentRulesHash]);
 await client.query('INSERT INTO mare_game.character_talents(character_id,build,revision) VALUES($1,$2,$3) ON CONFLICT(character_id) DO UPDATE SET build=EXCLUDED.build,revision=EXCLUDED.revision',[id,JSON.stringify(after),before.revision+1]);
 await storeBattle(client,id,b);
 const fighter=await readFighter(client,id,state);b.hp=Math.min(b.hp,fighter.maxHp);if(fighter.rulesetId==='original-character-v1')b.energy=Math.min(b.energy,fighter.stats.maxEnergy);
 await storeBattle(client,id,b);
 await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[id]);
}
