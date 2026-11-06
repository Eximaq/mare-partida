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
  assert.equal(route.length,24);assert.deepEqual({...route[0]},{x:2184,y:1128});
  assert.deepEqual({...route.at(-1)},{x:2304.423881155701,y:1851.783344798676});
  assert.equal(lookups,0,'per-sample VM global lookups amplify cold path CPU');
 }finally{vm.createContext=create;delete require.cache[file];if(old)require.cache[file]=old;}
});
