import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout} from 'node:timers/promises';
import {simulationBudget} from '../../apps/game-server/src/simulation-budget.js';
test('an elapsed budget still permits one commit and then yields between transactions',async()=>{
 const budget=simulationBudget(1);await setTimeout(15);
 assert.equal(budget.exhausted(),false);budget.commit();assert.equal(budget.exhausted(),true);
});
test('unbounded legacy callers preserve their batch and invalid budgets fail before database access',()=>{
 const budget=simulationBudget();budget.commit();assert.equal(budget.exhausted(),false);
 for(const value of [0,-1,NaN,1001])assert.throws(()=>simulationBudget(value),RangeError);
});
