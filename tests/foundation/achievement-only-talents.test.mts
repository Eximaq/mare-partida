import {test} from 'node:test';
import assert from 'node:assert/strict';
import {talentView} from '../../apps/game-server/src/characters/talents.js';
import type {CharacterState} from '@mare/shared';
const state=(level:number)=>({level} as CharacterState);
test('new server characters have zero PT, level changes grant none, only claims add PT',()=>{
 assert.equal(talentView(undefined,state(1),0).earned,0);assert.equal(talentView(undefined,state(100),0).earned,0);assert.equal(talentView(undefined,state(100),3).earned,3);
});
test('server legacy allowance preserves spent and unspent PT independently of future levels',()=>{
 const row={legacy_budget:30,revision:1,build:{nodes:{'sword-0-0':5},keystone:null,ultimate:null}};
 assert.equal(talentView(row,state(30),2).available,27);assert.equal(talentView(row,state(100),2).available,27);assert.equal(talentView({...row,build:{nodes:{},keystone:null,ultimate:null}},state(100),2).available,32);
});
