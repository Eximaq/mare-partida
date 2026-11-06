import type {PoolClient} from 'pg';
import {originalItemSchema,type CharacterCommand,type CharacterState,type OriginalInventory,type OriginalItemInstance} from '@mare/shared';
import {AuthFault} from '../auth/errors.js';
import {getGameCatalog} from '../gameplay/catalog.js';
import {event,readOriginalInventory,validateInventoryItem,writeInventory} from '../gameplay/inventory.js';

const pageSize=40;
const inventoryCapacity=120;
type Source='dungeon'|'event'|'system';
type OfficialReward={
 source:Source;
 sourceId:string;
 rewardId:string;
 title:string;
 message:string;
 makeAttachments:()=>OriginalItemInstance[];
};
type LetterRow={
 id:string; source:Source; source_id:string; reward_id:string; title:string; message:string;
 created_at:Date; read_at:Date|null; claimed_at:Date|null; attachments:unknown;
};

function parseAttachments(characterId:string,value:unknown):OriginalItemInstance[]{
 const parsed=originalItemSchema.array().min(1).max(24).safeParse(value);
 if(!parsed.success)throw new AuthFault(503,'mail_attachment_invalid');
 const items=parsed.data;
 const defs=getGameCatalog().items;
 if(new Set(items.map(item=>item.id)).size!==items.length||items.some(item=>
  !defs[item.def] ||
  (item.binding==='character')!==(item.boundToCharacter===characterId) ||
  (!!item.boundToCharacter && item.boundToCharacter!==characterId)
 ))throw new AuthFault(503,'mail_attachment_invalid');
 for(const item of items)validateInventoryItem(item,characterId);
 return items;
}

// The caller validates the official reward entitlement in the same transaction.
// The item factory runs once per entitlement, even when the issuing action is retried.
export async function sendOfficialMail(client:PoolClient,characterId:string,reward:OfficialReward):Promise<string>{
 const recipient=await client.query('SELECT id FROM mare_game.characters WHERE id=$1 FOR UPDATE',[characterId]);
 if(!recipient.rowCount)throw new AuthFault(404,'character_not_found');
 const key=[characterId,reward.source,reward.sourceId,reward.rewardId];
 const existing=(await client.query<{id:string}>(
  'SELECT id FROM mare_game.social_mail WHERE character_id=$1 AND source=$2 AND source_id=$3 AND reward_id=$4',key,
 )).rows[0];
 if(existing)return existing.id;
 const items=parseAttachments(characterId,reward.makeAttachments());
 return (await client.query<{id:string}>(
  'INSERT INTO mare_game.social_mail(character_id,source,source_id,reward_id,title,message,attachments) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING id',
  [...key,reward.title,reward.message,JSON.stringify(items)],
 )).rows[0]!.id;
}

export async function readSocialMailCount(client:PoolClient,characterId:string){
 return (await client.query<{pending:number;unread:number}>(
  "SELECT count(*) FILTER (WHERE claimed_at IS NULL)::int AS pending,count(*) FILTER (WHERE read_at IS NULL)::int AS unread FROM mare_game.social_mail WHERE character_id=$1 AND archived_at IS NULL",
  [characterId],
 )).rows[0]!;
}

export async function readSocialMail(client:PoolClient,characterId:string,tab:'pending'|'claimed'='pending',before?:string){
 const rows=(await client.query<LetterRow>(
  "SELECT id,source,source_id,reward_id,title,message,created_at,read_at,claimed_at,attachments FROM mare_game.social_mail"+
  " WHERE character_id=$1 AND (claimed_at IS NOT NULL)=$2 AND archived_at IS NULL"+
  " AND ($3::uuid IS NULL OR (created_at,id)<(SELECT created_at,id FROM mare_game.social_mail WHERE character_id=$1 AND id=$3))"+
  " ORDER BY created_at DESC,id DESC LIMIT $4",
  [characterId,tab==='claimed',before??null,pageSize+1],
 )).rows;
 const page=rows.slice(0,pageSize);
 return {
  ...await readSocialMailCount(client,characterId),
  letters:page.map(row=>({
   id:row.id,source:row.source,sourceId:row.source_id,rewardId:row.reward_id,title:row.title,message:row.message,
   createdAt:row.created_at.toISOString(),readAt:row.read_at?.toISOString()??null,
   claimedAt:row.claimed_at?.toISOString()??null,attachments:parseAttachments(characterId,row.attachments),
  })),
  nextCursor:rows.length>pageSize?page.at(-1)!.id:null,
 };
}

type MailResult={claimed:string[];pending:string[];reason?:'inventory_full'};

async function advanceMailVersion(client:PoolClient,characterId:string,state:CharacterState){
 if(state.version>=Number.MAX_SAFE_INTEGER)throw new AuthFault(503,'state_version_exhausted');
 await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[characterId]);
}

async function claimMail(client:PoolClient,characterId:string,state:CharacterState,requestId:string,mailId?:string):Promise<MailResult>{
 const letters=(await client.query<Pick<LetterRow,'id'|'attachments'|'claimed_at'>>(
  "SELECT id,attachments,claimed_at FROM mare_game.social_mail WHERE character_id=$1 AND archived_at IS NULL"+
  " AND ($2::uuid IS NULL AND claimed_at IS NULL OR id=$2) ORDER BY created_at,id FOR UPDATE",
  [characterId,mailId??null],
 )).rows;
 if(mailId&&!letters.length)throw new AuthFault(404,'mail_not_found');
 const unclaimed=letters.filter(letter=>!letter.claimed_at);
 const result:MailResult={claimed:[],pending:[]};
 if(!unclaimed.length)return result;
 const before=await readOriginalInventory(client,characterId);
 if(!before)throw new AuthFault(409,'original_inventory_required');
 const after:OriginalInventory={...before,inventory:[...before.inventory]};
 const owned=new Set([...after.inventory,...Object.values(after.equipment)].map(item=>item?.id));
 const delivered:string[]=[];
 for(const letter of unclaimed){
  const items=parseAttachments(characterId,letter.attachments);
  if(items.some(item=>owned.has(item.id)))throw new AuthFault(503,'mail_attachment_invalid');
  if(after.inventory.length+items.length>inventoryCapacity){
   result.pending.push(letter.id);
   continue;
  }
  after.inventory.push(...items);
  for(const item of items){owned.add(item.id);delivered.push(item.id);}
  result.claimed.push(letter.id);
 }
 if(result.pending.length)result.reason='inventory_full';
 if(!result.claimed.length)return result;
 await writeInventory(client,characterId,after);
 await client.query(
  'UPDATE mare_game.social_mail SET claimed_at=clock_timestamp(),claimed_request_id=$3 WHERE character_id=$1 AND id=ANY($2::uuid[])',
  [characterId,result.claimed,requestId],
 );
 await event(client,characterId,requestId,state.version,mailId?'mail.claim':'mail.claim-all',before,after,BigInt(state.gold),0n,{letters:result.claimed,items:delivered});
 await advanceMailVersion(client,characterId,state);
 return result;
}

// Caller owns the character lock and the transaction for the command receipt.
export async function executeSocialMail(client:PoolClient,characterId:string,input:CharacterCommand,state:CharacterState):Promise<MailResult>{
 if(input.action==='mail.claim')return claimMail(client,characterId,state,input.requestId,input.payload.mailId);
 if(input.action==='mail.claim-all')return claimMail(client,characterId,state,input.requestId);
 if(input.action==='mail.read'||input.action==='mail.archive'){
  const id=input.payload.mailId;
  const letter=(await client.query<Pick<LetterRow,'read_at'|'claimed_at'>>(
   'SELECT read_at,claimed_at FROM mare_game.social_mail WHERE character_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE',
   [characterId,id],
  )).rows[0];
  if(!letter)throw new AuthFault(404,'mail_not_found');
  if(input.action==='mail.archive'){
   if(!letter.claimed_at)throw new AuthFault(409,'mail_reward_pending');
   await client.query('UPDATE mare_game.social_mail SET archived_at=clock_timestamp() WHERE character_id=$1 AND id=$2',[characterId,id]);
   await advanceMailVersion(client,characterId,state);
  }else if(!letter.read_at){
   await client.query('UPDATE mare_game.social_mail SET read_at=clock_timestamp() WHERE character_id=$1 AND id=$2',[characterId,id]);
   await advanceMailVersion(client,characterId,state);
  }
 }else if(input.action==='mail.archive-claimed'){
  const archived=await client.query(
   'UPDATE mare_game.social_mail SET archived_at=clock_timestamp() WHERE character_id=$1 AND claimed_at IS NOT NULL AND archived_at IS NULL',
   [characterId],
  );
  if(archived.rowCount)await advanceMailVersion(client,characterId,state);
 }else throw new AuthFault(400,'invalid_request');
 return {claimed:[],pending:[]};
}
