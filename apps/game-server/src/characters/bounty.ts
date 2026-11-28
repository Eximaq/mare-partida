import {createRequire} from 'node:module';
import type {PoolClient} from 'pg';
import type {CharacterState} from '@mare/shared';
import {readCrewPower} from './crew.js';
import {readAchievements} from './achievements.js';
import type {readPublicProfileInputs} from './combat-inputs.js';
import {readPrison} from './prison.js';
import {readHaki,type hakiView} from './haki.js';

const require=createRequire(import.meta.url);
const B=require('../../../../bounty-system.js'),H=require('../../../../hierarchy-system.js'),
  P=require('../../../../prison-system.js'),K=require('../../../../haki-system.js').progression;
type Sources={
  power:number; factionId:string; crewAvailable:boolean;
  hierarchy:{tier:number};
  prison:Awaited<ReturnType<typeof readPrison>>;
  haki:ReturnType<typeof hakiView>|null;
  achievements:Awaited<ReturnType<typeof readAchievements>>;
};

export async function readBounty(client:PoolClient,state:CharacterState,sources:Sources){
  const {hierarchy,prison,haki,achievements}=sources;
  const crew=sources.crewAvailable?await readCrewPower(client,state.characterId,sources.power):0;
  const learned=haki?K.ids.filter((id:string)=>K.learned({has_haki_unlocked:haki.state.unlocked,haki:haki.state},id)).length:0;
  // Only official result processors may write to the personal victory ledger.
  const competitive=Object.entries(B.rules.competitive).filter(([,enabled])=>enabled).map(([id])=>id);
  const victories=competitive.length?(await client.query<{mode:string;wins:string}>(`
    SELECT mode,count(*)::text AS wins FROM mare_game.bounty_victories
    WHERE character_id=$1 AND mode=ANY($2::text[]) GROUP BY mode`,[state.characterId,competitive])).rows:[];
  const wins=Object.fromEntries(victories.map(r=>[r.mode,Number(r.wins)]));
  return B.calculate({
    power:sources.power,level:state.level,hierarchy:hierarchy?.tier,hierarchyMax:H.titles[sources.factionId]?.length,
    impel:prison?.cleared,impelMax:P.FLOOR_COUNT,haki:learned,achievements:B.countAchievements(achievements?.entries),
    berry:state.gold,crew,gvg:wins.gvg,duels:wins.duels
  }).berry;
}

export async function readPublicBounty(client:PoolClient,inputs:NonNullable<Awaited<ReturnType<typeof readPublicProfileInputs>>>,factionId:string,tier:number,power:number){
  const {state,fruits,crewAvailable}=inputs,id=state.characterId;
  const prison=await readPrison(client,id),haki=await readHaki(client,id);
  const achievements=await readAchievements(client,id,state,{power,prison,haki,fruits});
  const bounty=await readBounty(client,state,{power,factionId,crewAvailable,hierarchy:{tier},achievements,prison,haki});
  return String(bounty);
}
