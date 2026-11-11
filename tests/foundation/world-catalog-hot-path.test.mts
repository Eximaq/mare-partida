import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url);

test('cold Dawn route does not resolve Math through the VM global proxy for every terrain sample',()=>{
 const file=require.resolve('../../world-catalog.cjs'),old=require.cache[file],create=vm.createContext;
 let lookups=0;
 // Count the VM boundary, not a substitute for the terrain/path implementation.
 vm.createContext=((sandbox:any,options:any)=>{
  const math=sandbox.Math;
  Object.defineProperty(sandbox,'Math',{configurable:true,get(){lookups++;return math;}});
  return create(sandbox,options);
 }) as typeof vm.createContext;
 delete require.cache[file];
 try{
  const world=require(file).load(),nav=world.navigation('dawn');lookups=0;
  const route=nav.path({x:2137.7381123218383,y:1057.5929338939222},{x:2304.423881155701,y:1851.783344798676});
  assert.equal(route.length,4);assert.deepEqual({...route[0]},{x:2440,y:1512});
  assert.deepEqual({...route.at(-1)},{x:2304.423881155701,y:1851.783344798676});
  assert.equal(lookups,0,'per-sample VM global lookups amplify cold path CPU');
 }finally{vm.createContext=create;delete require.cache[file];if(old)require.cache[file]=old;}
});

test('exported Dawn ground uses the static mask for clear open segments',()=>{
 const world=require('../../world-catalog.cjs').load(),nav=world.navigation('dawn');
 const start={x:872,y:1608},end={x:872,y:1640};
 const exact=world.originalNavigation('dawn');assert.equal(exact.clear(start,end),true);
 let calls=0;const sample=nav.map.terrainWalkable;
 nav.map.terrainWalkable=(...args:any[])=>{calls++;return sample(...args);};
 try{assert.equal(nav.clear(start,end),true);assert.equal(calls,0);}
 finally{nav.map.terrainWalkable=sample;}
});
