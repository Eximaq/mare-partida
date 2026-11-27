import type {PoolClient} from 'pg';
import type {CharacterState} from '@mare/shared';
import {AuthFault} from '../auth/errors.js';
import {readOriginalInventory,writeInventory,event} from '../gameplay/inventory.js';
import {sendOfficialMail} from './mail.js';
import {readSwordCollection,storeSwordCollection,swordRules,swordAttachments} from './sword-collection-store.js';

export async function activateSword(client:PoolClient,id:string,state:CharacterState,requestId:string,swordId:string){
 const next=swordRules.activate(await readSwordCollection(client,id),swordId);
 if(!next)throw new AuthFault(409,'sword_activation_unavailable');
 if(state.version>=Number.MAX_SAFE_INTEGER)throw new AuthFault(409,'state_version_exhausted');
 const before=await readOriginalInventory(client,id);
 if(!before)throw new AuthFault(409,'original_inventory_required');
 const extra=swordAttachments(next.excess,'Compêndio de Espadas');
 const available=Math.max(0,120-before.inventory.length);
 const items=extra.slice(0,available),pending=extra.slice(available);
 if(items.length){
  const after={...before,inventory:[...before.inventory,...items]};
  await writeInventory(client,id,after);
  await event(client,id,requestId,state.version,'swords.activate',before,after,BigInt(state.gold),0n,{swordId});
 }
 for(let i=0;i<pending.length;i+=24)await sendOfficialMail(client,id,{source:'system',sourceId:'sword-activation:'+swordId,
  rewardId:'excess:'+i,title:'Excedentes do Compêndio de Espadas',message:'Sua espada foi ativada. Resgate os fragmentos excedentes quando houver espaço na mochila.',
  makeAttachments:()=>pending.slice(i,i+24)});
 await storeSwordCollection(client,id,next.collection);
 await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[id]);
}
