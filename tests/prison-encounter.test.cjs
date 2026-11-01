
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),P=require('../prison-system.js');
const catalog={a:{name:'A',hp:100,atk:20,def:10},b:{name:'B',hp:200,atk:30,def:20},boss:{name:'Guardião',hp:350,atk:50,def:30,boss:true}};
const save=()=>({gold:20,hp:12,energy:4,inventory:[],equipment:{},impelDown:{cleared:0,claimed:[]}});
test('one authorized preview roll survives serialization, reopen and battle without resource changes',()=>{
 const original=save(),snapshot=JSON.stringify(original);let rolls=0;
 const prepared=P.prepareEncounter(original,1,catalog,()=>{rolls++;return .99;});
 assert(prepared.ok&&prepared.changed);assert.equal(rolls,1);assert.equal(JSON.stringify(original),snapshot);
 for(const k of ['gold','hp','energy','inventory','equipment'])assert.deepEqual(prepared.state[k],original[k]);
 const reopened=P.prepareEncounter(JSON.parse(JSON.stringify(prepared.state)),1,catalog,()=>{throw Error('must not reroll');});
 assert(reopened.ok&&!reopened.changed);assert.deepEqual(reopened.enemy,prepared.enemy);
 const run=P.createRun({catalog,prepared:reopened.state.impelDown.encounter,random:()=>{throw Error('must not reroll');}});
 assert.equal(run.phase,'idle');assert.deepEqual(run.startFloor(),prepared.enemy);
 assert.equal(run.startFloor(),run.enemy);assert.equal(run.defeat(run.enemy.token),true);
 const complete=P.completeFloor(reopened.state,1,true,[]);
 assert(complete.ok);assert(!complete.state.impelDown.encounter);
 assert.deepEqual(complete.state.impelDown.lastEncounter,reopened.state.impelDown.encounter);
 assert.equal(run.advance(),true);assert.equal(run.prepareFloor(complete.state.impelDown.lastEncounter),false);
});
test('all current commons retain their equal intervals and boss previews never draw from RNG',()=>{
 const pool=P.commonPool(catalog);
 for(let n=0;n<pool.length;n++){
  const r=P.prepareEncounter(save(),1,catalog,()=>n/pool.length);
  assert.equal(r.enemy.type,pool[n].type);
 }
 const g=save();g.impelDown.cleared=4;
 const r=P.prepareEncounter(g,5,catalog,()=>{throw Error('boss is deterministic');});
 assert(r.ok);assert.equal(r.enemy.type,'boss');assert.equal(r.enemy.placeholder,true);
 assert.deepEqual(P.resolveEncounter(r.state.impelDown.encounter,catalog),r.enemy);
});
test('locked, completed, terminal, malformed and unconfigured encounters stay honest',()=>{
 for(const f of [0,2,5,101])assert.equal(P.prepareEncounter(save(),f,catalog).ok,false);
 const g=save();g.impelDown.cleared=100;assert.equal(P.prepareEncounter(g,100,catalog).ok,false);
 for(const identity of [null,{floor:1,type:'boss',token:'impel-x'},{floor:5,type:'a',token:'impel-x'},{floor:1,type:'missing',token:'impel-x'},{floor:1,type:'a',token:'<bad>'}])assert.equal(P.resolveEncounter(identity,catalog),null);
 assert.equal(P.floorDetails(1,catalog).monsters.length,0);
 assert.equal(P.prepareEncounter(save(),1,{}).ok,false);
 for(const roll of [-1,1,NaN,Infinity])assert.equal(P.prepareEncounter(save(),1,catalog,()=>roll).ok,false);
});
test('a prepared next floor is not a started combat and failed persistence can retain the same proposal',()=>{
 const r=P.prepareEncounter(save(),1,catalog,()=>0),run=P.createRun({catalog});
 assert.equal(run.prepareFloor(r.state.impelDown.encounter),true);
 assert.equal(run.phase,'idle');assert.equal(run.defeat(r.enemy.token),false);
 assert.deepEqual(run.startFloor(),r.enemy);
 assert.equal(run.prepareFloor(r.state.impelDown.encounter),false);
});
