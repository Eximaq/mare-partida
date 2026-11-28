import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {isLobbyMotionUpdate}=createRequire(import.meta.url)('../../apps/account-client/game-ui.js');

test('only lobby movement can reuse the last player and equipment projection',()=>{
 const first={character:{id:'pirate'},online:{state:{version:1},world:{mapId:'lobby'},lobby:{players:[]},
   battle:null,originalInventory:{equipment:{}},profile:{},party:null}};
 const moved={...first,online:{...first.online,world:{mapId:'lobby',x:3},lobby:{players:[{id:'crew'}]}}};
 assert.equal(isLobbyMotionUpdate(first,moved),true);
 for(const changed of [{world:{mapId:'dawn'}},{battle:{}},{originalInventory:{equipment:{weapon:1}}},
   {state:{version:2}},{profile:{}},{party:{}},{newFeature:true}]){
   assert.equal(isLobbyMotionUpdate(first,{...moved,online:{...moved.online,...changed}}),false);
 }
 assert.equal(isLobbyMotionUpdate(null,moved),false);
 assert.equal(isLobbyMotionUpdate(first,{...moved,character:{id:'other'}}),false);
});
