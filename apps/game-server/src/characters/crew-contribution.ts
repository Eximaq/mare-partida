import {createRequire} from 'node:module';
import type {PoolClient} from 'pg';
import {AuthFault} from '../auth/errors.js';
import {getGameCatalog} from '../gameplay/catalog.js';
import {readOriginalInventory,writeInventory} from '../gameplay/inventory.js';
import {crewMissionRules,rankCFragmentPrice,type CrewMissionKind} from './crew-config.js';
const fragments=createRequire(import.meta.url)('../../../../boss-dungeon-system.js');
type Mission={id:string;cycle:number;kind:CrewMissionKind};

export async function readContributionCoins(client:PoolClient,id:string){
 const totals=(await client.query<{balance:number;earned:number;bought:number}>(`
   SELECT COALESCE(sum(amount),0)::int balance,
     COALESCE(sum(amount) FILTER(WHERE amount>0),0)::int earned,
     count(*) FILTER(WHERE amount<0)::int bought
   FROM mare_game.crew_contribution_coins WHERE character_id=$1`,[id])).rows[0]!;
 const claims=(await client.query<Mission>(`
   SELECT m.id,m.cycle,m.kind FROM mare_game.crew_missions m
   WHERE m.completed_at IS NOT NULL AND m.kind IN ('kills','bosses','donations')
     AND EXISTS (SELECT 1 FROM mare_game.crew_activity_events e WHERE e.character_id=$1 AND e.mission_id=m.id)
     AND NOT EXISTS (SELECT 1 FROM mare_game.crew_contribution_coins c
       WHERE c.character_id=$1 AND c.cycle=m.cycle AND c.mission_kind=m.kind)
   ORDER BY m.cycle DESC,m.kind,m.id LIMIT 24`,[id])).rows;
 return {...totals,price:rankCFragmentPrice,claims:claims.map(m=>({...m,...crewMissionRules[m.kind]}))};
}

export async function claimContributionCoins(client:PoolClient,id:string,missionId:string){
 const mission=(await client.query<Mission>(`
   SELECT m.id,m.cycle,m.kind FROM mare_game.crew_missions m
   WHERE m.id=$2 AND m.completed_at IS NOT NULL AND m.kind IN ('kills','bosses','donations')
     AND EXISTS (SELECT 1 FROM mare_game.crew_activity_events e WHERE e.character_id=$1 AND e.mission_id=m.id)`,[id,missionId])).rows[0];
 if(!mission)throw new AuthFault(409,'crew_coin_ineligible');
 await client.query(`INSERT INTO mare_game.crew_contribution_coins(character_id,reference_id,amount,cycle,mission_kind)
   VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,[id,mission.id,crewMissionRules[mission.kind].coins,mission.cycle,mission.kind]);
}

export async function buyRankCFragment(client:PoolClient,id:string,requestId:string){
 const {balance}=await readContributionCoins(client,id);
 if(balance<rankCFragmentPrice)throw new AuthFault(409,'crew_coin_insufficient');
 const inventory=await readOriginalInventory(client,id);
 if(!inventory)throw new AuthFault(409,'original_inventory_unavailable');
 const item=fragments.addTradeableFragment(inventory.inventory,getGameCatalog().items,'C','Loja da Tripulação',()=>requestId);
 if(!item)throw new AuthFault(409,'inventory_full');
 await writeInventory(client,id,inventory);
 await client.query('INSERT INTO mare_game.crew_contribution_coins(character_id,reference_id,amount) VALUES($1,$2,$3)',[id,requestId,-rankCFragmentPrice]);
}
