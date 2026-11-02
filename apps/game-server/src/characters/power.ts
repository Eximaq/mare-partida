import {readFruits} from './fruits.js';
import type {PoolClient} from 'pg';
import type {CharacterState} from '@mare/shared';
import {readOriginalInventory} from '../gameplay/inventory.js';
import {deriveOriginalFighter} from '../gameplay/character.js';
import {readAttributes} from './attributes.js';
import {readTalents} from './talents.js';
// No temporary combat effects, preview builds or caller-supplied stats.
export async function permanentCharacterPower(client:PoolClient,id:string,state:CharacterState){
 const inventory=await readOriginalInventory(client,id);if(!inventory)return 0;
 const identity=(await client.query('SELECT class_id,faction_id FROM mare_game.characters WHERE id=$1',[id])).rows[0];
 const attributes=await readAttributes(client,id,state),talents=await readTalents(client,id,state);
 const f=deriveOriginalFighter(identity.class_id,identity.faction_id,state,attributes.allocated,inventory,talents?.build,undefined,undefined,await readFruits(client,id));
 return f.rulesetId==='original-character-v1'?Math.min(1000000000,Math.max(0,Math.floor(f.stats.power))):0;
}
