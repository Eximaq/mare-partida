import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createWorldPresentation,worldPosition}=require('../../apps/account-client/game-ui.js');
const world=(x=0,patch={})=>({mapId:'lobby',position:{x,y:100},path:[{x:x+400,y:100}],speed:100,direction:'right',serverNow:'2026-01-01T00:00:00Z',motionUntil:'2026-01-01T00:00:04Z',...patch});
test('presentation preserves continuity on delayed snapshots and converges without changing authority',()=>{
 assert.equal(typeof createWorldPresentation,'function');
 const p=createWorldPresentation(),a=world(),b=world(70),copy=structuredClone(b);
 p.update(a,0);assert.equal(p.sample(400).x,40);
 p.update(b,400);assert.equal(p.sample(400).x,40);
 assert.equal(p.sample(600).x,worldPosition(b,200).x);
 assert.deepEqual(b,copy);
});
test('stop correction is continuous, bounded and expires; path is never extrapolated past its lease',()=>{
 assert.equal(typeof createWorldPresentation,'function');
 const p=createWorldPresentation();p.update(world(),0);
 p.update(world(25,{path:[]}),500);assert.equal(p.sample(500).x,50);
 assert.ok(p.sample(600).x>=25&&p.sample(600).x<=50);
 assert.equal(p.sample(700).x,25);assert.equal(p.sample(700).moving,false);
 p.update(world(25),800);assert.equal(p.sample(10000).x,425);
});
test('map changes and large discontinuities snap; repeated snapshots do not restart motion',()=>{
 assert.equal(typeof createWorldPresentation,'function');
 const p=createWorldPresentation(),a=world();p.update(a,0);p.update(a,100);
 assert.equal(p.sample(200).x,20);
 p.update(world(500,{mapId:'island'}),200);assert.equal(p.sample(200).x,500);
 p.update(world(1000,{mapId:'island'}),300);assert.equal(p.sample(300).x,1000);
});
