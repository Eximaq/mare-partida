'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {checkSwaps}=require('./rework-slot151-walk-support.cjs');
if(!process.env.SLOT151_LOOK)test('WorldVisual same-character swaps original and custom run in bounded separate processes',{timeout:360000},()=>{for(const look of ['original','custom']){const env={...process.env,SLOT151_LOOK:look};delete env.NODE_TEST_CONTEXT;const r=require('child_process').spawnSync(process.execPath,['--test',__filename],{env,encoding:'utf8',timeout:170000,maxBuffer:2000000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/SLOT151_WORLD_COMPLETE/);console.log(r.stdout);}});
else test('walking keeps the saved head, coat and trousers through swaps',{timeout:160000},()=>checkSwaps(process.env.SLOT151_LOOK,'./fixtures/slot151-custom-baseline.json',[147,168,null,147]));
