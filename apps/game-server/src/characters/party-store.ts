import type {PoolClient} from 'pg';
export async function partyAvailable(c:PoolClient){return !!(await c.query("SELECT to_regclass('mare_game.party_members') present")).rows[0].present;}
export async function membership(c:PoolClient,id:string){if(!await partyAvailable(c))return undefined;return (await c.query('SELECT party_id FROM mare_game.party_members WHERE character_id=$1',[id])).rows[0]?.party_id as string|undefined;}
export async function lockParty(c:PoolClient,id:string){const party=await membership(c,id);if(party)await c.query('SELECT id FROM mare_game.parties WHERE id=$1 FOR UPDATE',[party]);return party;}
export async function partyRoom(c:PoolClient,id:string){return (await c.query('SELECT * FROM mare_game.party_instances WHERE id=$1 AND ended_at IS NULL',[id])).rows[0];}
export async function storeRoom(c:PoolClient,room:any){await c.query('UPDATE mare_game.party_instances SET simulation=$2 WHERE id=$1',[room.id,JSON.stringify(room)]);}
