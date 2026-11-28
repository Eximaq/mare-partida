import type {OriginalItemInstance} from '@mare/shared';
import {getGameCatalog} from '../gameplay/catalog.js';

const {items}=getGameCatalog();

export function itemTradeRestriction(item:OriginalItemInstance):'locked'|'bound'|null{
  if(item.locked)return 'locked';
  const definition=items[item.def];
  if(!definition||definition.tradable===false||item.binding||item.boundToCharacter)return 'bound';
  return null;
}
export function itemTradeQuantity(item:OriginalItemInstance){
  return ['haki-fragment','sword-fragment'].includes(String(items[item.def]?.kind))?item.qty??1:1;
}
