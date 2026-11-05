import type {PoolClient} from 'pg';
import {effectiveProfession,professionLevel,professions,type ProfessionId} from './crew-profession-rules.js';

export type CrewBenefits=Record<ProfessionId,number>;
type SpecialistRow={recipient:string;facilities:Record<string,number>;profession:ProfessionId;experience:number};
export const noCrewBenefits:Readonly<CrewBenefits>=Object.freeze({doctor:0,command:0,cook:0,carpenter:0,navigator:0});
const available=async(client:PoolClient)=>Boolean((await client.query("SELECT to_regclass('mare_game.character_professions') present")).rows[0]?.present);

function benefitMap(rows:SpecialistRow[]){
 const all=new Map<string,CrewBenefits>();
 for(const row of rows){
  const benefits=all.get(row.recipient)??{...noCrewBenefits};
  all.set(row.recipient,benefits);
  benefits[row.profession]=Math.max(benefits[row.profession],effectiveProfession(row.profession,professionLevel(row.experience),row.facilities[professions[row.profession].facility]??1));
 }
 return all;
}
export async function readCrewProfessionBenefits(client:PoolClient,crewId:string):Promise<Readonly<CrewBenefits>>{
 if(!await available(client))return noCrewBenefits;
 const {rows}=await client.query<SpecialistRow>(`
  SELECT c.id recipient,c.facilities,p.profession,p.experience FROM mare_game.crews c
  JOIN mare_game.crew_members m ON m.crew_id=c.id
  JOIN mare_game.character_professions p ON p.character_id=m.character_id
  WHERE c.id=$1 AND c.dissolved_at IS NULL`,[crewId]);
 return benefitMap(rows).get(crewId)??noCrewBenefits;
}
export async function readCrewBenefitsForCharacters(client:PoolClient,ids:readonly string[],schemaAvailable?:boolean){
 if(!ids.length||!(schemaAvailable??await available(client)))return new Map<string,CrewBenefits>();
 const {rows}=await client.query<SpecialistRow>(`
  SELECT own.character_id recipient,c.facilities,p.profession,p.experience FROM mare_game.crew_members own
  JOIN mare_game.crews c ON c.id=own.crew_id AND c.dissolved_at IS NULL
  JOIN mare_game.crew_members specialist ON specialist.crew_id=c.id
  JOIN mare_game.character_professions p ON p.character_id=specialist.character_id
  WHERE own.character_id=ANY($1::uuid[])`,[[...new Set(ids)]]);
 return benefitMap(rows);
}
export async function readCharacterCrewBenefits(client:PoolClient,id:string):Promise<Readonly<CrewBenefits>>{
 return (await readCrewBenefitsForCharacters(client,[id])).get(id)??noCrewBenefits;
}
