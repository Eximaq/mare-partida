// Synthetic benchmark only. Imported exclusively by run-local-capacity.mjs.
// No production entry point imports this module or accepts these assignments.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {syncBuiltinESMExports,createRequire} from 'node:module';
import {workerData,isMainThread,parentPort} from 'node:worker_threads';
import pg from 'pg';
import {AsyncLocalStorage} from 'node:async_hooks';
const require=createRequire(import.meta.url),streams=new Map();
const context=new AsyncLocalStorage(),defaultScope=isMainThread?'setup':`worker:${workerData.kind}:${workerData.index}`;
const currentScope=()=>context.getStore()??defaultScope;
let assignment,rooms=[];
const sqlErrors={};
let tickFailures=0;
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function next(key){let n=streams.get(key)??parseInt(hash('capacity-v1:'+key).slice(0,8),16);n=(Math.imul(n,1664525)+1013904223)>>>0;streams.set(key,n);return n/2**32;}
function scoped(key,fn){return context.run(key,fn);}
function isolated(url){const u=new URL(url);assert(['127.0.0.1','localhost','[::1]'].includes(u.hostname)&&u.port!=='55432'&&!/^\/(mare_local_alpha|mare_auth_dev)$/.test(u.pathname),'Isolated fixture only');}
isolated(isMainThread?process.env.TEST_DATABASE_URL:workerData.databaseUrl);
assignment=isMainThread?process.env.MARE_LOAD_LAYOUT:workerData.capacityLayout;
assert(['6/6','8/4','4/8','7/5'].includes(assignment),'Unsupported controlled layout');
if(!isMainThread){assert.match(new URL(workerData.databaseUrl).pathname,/^\/mare_test_[a-f0-9]{32}$/);rooms=workerData.capacityRooms;assert.equal(rooms.length,12);}
// UUID streams are independent of cryptographic session tokens/randomBytes.
// Setup and each room consume their own reproducible sequence, never shared
// across partitions. Wall clocks, tick cadence and session policy stay real.
crypto.randomUUID=()=>{const scope=currentScope(),h=hash(`uuid:${scope}:${streams.get('uuid:'+scope)??0}`);streams.set('uuid:'+scope,(streams.get('uuid:'+scope)??0)+1);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;};
crypto.randomInt=(min,max)=>{const scope=currentScope();assert.equal(typeof max,'number');assert(isMainThread||!scope.startsWith('worker:'),'Fixture RNG requires a room transaction');return Math.floor(next(scope)*(max-min))+min;};
syncBuiltinESMExports();
const party=require('../../party-battle.cjs'),step=party.step;
party.step=(room,actors,options)=>scoped(room.id,()=>step(room,actors,{...options,rng:()=>next(room.id)}));
const originalQuery=pg.Pool.prototype.query;
pg.Pool.prototype.query=function(sql,values,...args){
 if(typeof sql==='string'&&sql.includes('FROM mare_game.party_instances WHERE mod(hashtextextended(id::text,34001)&2147483647,$2::bigint)=$1::bigint')){
  assert.equal(values[1],2);assert(rooms.length===12);const split=Number(assignment.split('/')[0]);
  sql=sql.replace('mod(hashtextextended(id::text,34001)&2147483647,$2::bigint)=$1::bigint','id=ANY($1::uuid[])');
  // Explicit stable tie order only in the fixture, identical in all layouts.
  sql=sql.replace('ORDER BY tick_at LIMIT','ORDER BY tick_at,id LIMIT');
  values=[values[0]===0?rooms.slice(0,split):rooms.slice(split)];
 }
 return originalQuery.call(this,sql,values,...args);
};
if(!isMainThread){
 const query=pg.Client.prototype.query;
 const observe=error=>{if(error)parentPort.postMessage({type:'capacity_sql_error',code:/^[A-Z0-9]{5}$/.test(error.code)?error.code:'unknown'});};
 pg.Client.prototype.query=function(...args){
  const sql=typeof args[0]==='string'?args[0]:args[0]?.text??'';
  if(/SELECT \*,clock_timestamp\(\) now FROM mare_game\.party_instances WHERE id=\$1/.test(sql)){
   assert(currentScope().startsWith('worker:'),'Room transaction must begin with a fresh fixture scope');
   assert.match(args[1][0],/^[a-f0-9-]{36}$/);context.enterWith('loot:'+args[1][0]);
  }else if(/^\s*(COMMIT|ROLLBACK)\s*$/i.test(sql))context.enterWith(defaultScope);
  if(typeof args.at(-1)==='function'){const cb=args.pop();return query.call(this,...args,(error,...values)=>{observe(error);cb(error,...values);});}
  return query.apply(this,args).catch(error=>{observe(error);throw error;});
 };
}
function canonical(value){
 if(typeof value==='number'&&value>1e12)return '<wall-clock>';
 if(typeof value==='string'&&/^\d{4}-\d\d-\d\dT/.test(value))return '<wall-clock>';
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().filter(k=>k!=='rulesHash').map(k=>[k,canonical(value[k])]));
 return value;
}
export const fixture={
 async prepare(pool){
  assert(isMainThread);assert.match(new URL(pool.options.connectionString).pathname,/^\/mare_test_[a-f0-9]{32}$/);
  const roomRows=(await pool.query('SELECT id,simulation FROM mare_game.party_instances ORDER BY id')).rows;
  rooms=roomRows.map(r=>r.id);assert.equal(rooms.length,12);
  const battles=(await pool.query('SELECT character_id,simulation FROM mare_game.character_battles ORDER BY character_id')).rows;
  const worlds=(await pool.query('SELECT character_id,map_id,area,x,y,path,speed,direction FROM mare_game.character_world ORDER BY character_id')).rows;
  return {version:3,layout:assignment,initialStateHash:hash(JSON.stringify(canonical({rooms:roomRows,battles,worlds}))),roomSetHash:hash(JSON.stringify(rooms)),rng:'Independent engine and loot LCG streams per room, seed SHA256 capacity-v1',realClock:true};
 },
 workerOptions(options){return {...options,workerData:{...options.workerData,capacityLayout:assignment,capacityRooms:rooms}};},
 workerEvent(message){if(message?.type==='capacity_sql_error')sqlErrors[message.code]=(sqlErrors[message.code]??0)+1;if(message?.type==='metrics')tickFailures+=message.value?.failed??0;},
 integrity(){return {sqlErrors:{...sqlErrors},tickFailures,valid:Object.keys(sqlErrors).length===0&&tickFailures===0};},
 partitions(){return assignment.split('/').map((v,i)=>({lane:'party',shard:i,total:Number(v)}));}
};
