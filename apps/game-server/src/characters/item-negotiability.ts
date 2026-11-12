import type {OriginalItemInstance} from '@mare/shared';
import {getGameCatalog} from '../gameplay/catalog.js';

const {items}=getGameCatalog();

export function itemTradeRestriction(item:OriginalItemInstance):'locked'|'bound'|null{
   if(item.locked)return 'locked';
  if(!items[item.def]||item.binding||item.boundToCharacter)return 'bound';
  return null;
}
export function itemTradeQuantity(item:OriginalItemInstance){
  return items[item.def]?.kind==='haki-fragment'?item.qty??1:1;
}
