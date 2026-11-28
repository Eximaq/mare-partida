import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {AuthFault} from '../auth/errors.js';
import {getGameCatalog} from '../gameplay/catalog.js';
import {readOriginalInventory,writeInventory} from '../gameplay/inventory.js';
import {kairosekiProducts,spendKairoseki,type KairosekiProduct} from './kairoseki.js';

export async function buyKairosekiProduct(client:PoolClient,id:string,product:KairosekiProduct){
  const offer=kairosekiProducts[product];
  if('item' in offer){
    const stock=await readOriginalInventory(client,id);
    if(!stock)throw new AuthFault(409,'original_inventory_required');
    const catalog=getGameCatalog(),def=catalog.items.findIndex(item=>item.id===offer.item);
    if(def<0)throw new AuthFault(503,'loot_catalog_unavailable');
    if(stock.inventory.length>=catalog.capacity)throw new AuthFault(409,'inventory_full');
    await spendKairoseki(client,id,offer.price);
    stock.inventory.unshift({
      id:randomUUID(),def,level:1,plus:0,rarity:'epic',locked:false,obtainedAt:Date.now(),
      origin:'Loja de Kairoseki',binding:'character',boundToCharacter:id,
    });
    await writeInventory(client,id,stock);
  }else{
    await spendKairoseki(client,id,offer.price,offer.days);
  }
  const updated=await client.query('UPDATE mare_game.characters SET state_version=state_version+1 WHERE id=$1 AND state_version<9007199254740991',[id]);
  if(!updated.rowCount)throw new AuthFault(503,'state_version_exhausted');
}
