import type {OriginalItemInstance} from '@mare/shared';
import {getGameCatalog} from '../gameplay/catalog.js';

const {items}=getGameCatalog();
const forbidden=new Set(['weapon-fragment','akuma-fragment','xp-boost','profession-material','quest']);

export function itemTradeRestriction(item:OriginalItemInstance):'locked'|'bound'|null{
  const def=items[item.def];
  if(item.locked)return 'locked';
  if(!def||item.binding||item.boundToCharacter||def.transferable===false||def.tradable===false||def.binding||def.questOnly||forbidden.has(String(def.kind)))return 'bound';
  return null;
}
export function itemTradeQuantity(item:OriginalItemInstance){
  return items[item.def]?.kind==='haki-fragment'?item.qty??1:1;
}
