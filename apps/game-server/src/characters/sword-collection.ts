import type {PoolClient} from 'pg';
import type {CharacterState} from '@mare/shared';
import {AuthFault} from '../auth/errors.js';
import {readOriginalInventory,writeInventory,event} from '../gameplay/inventory.js';
import {sendOfficialMail} from './mail.js';
import {getGameCatalog} from '../gameplay/catalog.js';
import {readSwordCollection,storeSwordCollection,swordRules,swordAttachments} from './sword-collection-store.js';

export async function activateSword(client:PoolClient,id:string,state:CharacterState,requestId:string,swordId:string){
 const current=await readSwordCollection(client,id),before=await readOriginalInventory(client,id);
 if(!before)throw new AuthFault(409,'original_inventory_required');
 const defs=getGameCatalog().items;
 const complete=before.inventory.find(item=>!item.locked&&defs[item.def]?.kind==='sword-collection'&&defs[item.def]?.swordId===swordId);
 const next=complete?swordRules.activateComplete(current,swordId):swordRules.activate(current,swordId);
 if(!next)throw new AuthFault(409,'sword_activation_unavailable');
 if(state.version>=Number.MAX_SAFE_INTEGER)throw new AuthFault(409,'state_version_exhausted');
 const inventory=complete?before.inventory.filter(item=>item.id!==complete.id):before.inventory;
 const extra=swordAttachments(next.excess,'Compêndio de Espadas');
 const available=Math.max(0,120-inventory.length);
 const items=extra.slice(0,available),pending=extra.slice(available);
 if(complete||items.length){
  const after={...before,inventory:[...inventory,...items]};
  await writeInventory(client,id,after);
  await event(client,id,requestId,state.version,'swords.activate',before,after,BigInt(state.gold),0n,{swordId});
 }
 for(let i=0;i<pending.length;i+=24)await sendOfficialMail(client,id,{source:'system',sourceId:'sword-activation:'+swordId,
  rewardId:'excess:'+i,title:'Excedentes do Compêndio de Espadas',message:'Sua espada foi ativada. Resgate os fragmentos excedentes quando houver espaço na mochila.',
  makeAttachments:()=>pending.slice(i,i+24)});
 await storeSwordCollection(client,id,next.collection);
 await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1',[id]);
}
