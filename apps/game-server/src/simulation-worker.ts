import {tickWeeklyBosses} from './characters/weekly-boss-worker.js';
import {parentPort,workerData} from 'node:worker_threads';
import {createRequire} from 'node:module';
import {createPool} from './db/pool.js';
import {partition} from './simulation-partition.js';
import {createTickLane} from './tick-lane.js';
import {tickWorldBattles} from './characters/battle.js';
import {tickPartyBattles} from './characters/party-worker.js';
if(!parentPort)throw Error('Simulation worker requires private parent');
const {databaseUrl,kind,index,count}=workerData;
if(typeof databaseUrl!=='string'||!['solo','party'].includes(kind))throw Error('Invalid private worker configuration');
const shard=partition({index,count}),pool=createPool(databaseUrl,2);
const lane=createTickLane(kind,async()=>kind==='solo'?tickWorldBattles(pool,shard,200,2):(await tickPartyBattles(pool,shard,200,2))+(await tickWeeklyBosses(pool,shard,150)));
let stopped=false,ready=false;
const heartbeat=setInterval(()=>parentPort!.postMessage({type:'heartbeat'}),1000);
const timer=setInterval(()=>{if(!stopped&&ready)lane.tick();},250),report=setInterval(()=>parentPort!.postMessage({type:'metrics',value:lane.flush()}),10000);
parentPort.on('message',message=>{if(message!=='stop'||stopped)return;stopped=true;clearInterval(timer);clearInterval(report);clearInterval(heartbeat);void lane.stop().then(()=>pool.end()).finally(()=>parentPort!.close());});
try{
 await pool.query('SELECT 1');
 // Warm the common navigation grid before accepting the first timed tick.
 if(!stopped){createRequire(import.meta.url)('../../../world-catalog.cjs').load().navigation('dawn');ready=true;parentPort.postMessage({type:'ready'});}
}catch{clearInterval(timer);clearInterval(report);clearInterval(heartbeat);await pool.end();parentPort.close();process.exitCode=1;}
