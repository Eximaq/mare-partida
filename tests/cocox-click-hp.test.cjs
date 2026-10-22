'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const renderer=fs.readFileSync(path.join(__dirname,'..','rare-renderer.js'),'utf8');
const game=fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8');
new vm.Script(renderer,{filename:'rare-renderer.js'});
new vm.Script(game,{filename:'game.js'});
const sandbox={
  MareRare:{TILE:64,returnPoint:{x:0,y:0}},
  Image:class {constructor(){this.complete=true;this.naturalWidth=100;this.src='';}}
};
vm.runInNewContext(renderer,sandbox);
const r=sandbox.MareRareRenderer;
const mob={type:'cocox',x:180,y:300,emberFacing:'south',attackAnim:0,moving:0,bob:0,hit:0};
for(const state of [
  {moving:0,attackAnim:0},
  {moving:1,attackAnim:0},
  {moving:0,attackAnim:.3}
]){
  Object.assign(mob,state);
  const box=r.cocoxLayout(mob);
  assert.ok(box.top<mob.y-50,'80px sprite extends above monster feet');
  assert.equal(box.dest,80);assert.equal(box.halfWidth,40);
  assert.equal(r.cocoxHealthBarY(mob),box.top-22,'HP stays above sprite for every animation');
  assert.ok(r.cocoxHitTest(mob,mob.x,box.top+16),'clicking sprite body selects Cocox');
  assert.ok(r.cocoxHitTest(mob,mob.x+box.halfWidth-2,box.top+24),'sprite edge clickable');
  assert.ok(!r.cocoxHitTest(mob,mob.x+box.halfWidth+5,mob.y-30),'outside sprite not clickable');
  assert.ok(!r.cocoxHitTest(mob,mob.x,mob.y+25),'far below feet not clickable');
  let placement;
  const ctx={save(){},restore(){},drawImage(...args){placement=args}};
  assert.equal(r.monster(ctx,mob,1),true);
  assert.equal(placement[6],box.top,'renderer shares anchor with hitbox and HP');
}
Object.assign(mob,{moving:0,attackAnim:0});
const idleBar=r.cocoxHealthBarY(mob);
mob.moving=1;
assert.ok(Math.abs(r.cocoxHealthBarY(mob)-idleBar)<20,'80px animation frames keep the HP bar aligned');
assert.match(game,/MareRareRenderer\.cocoxHitTest\(m,x,y\)/);
assert.match(game,/MareRareRenderer\.cocoxHealthBarY\(m\)/);
assert.ok(!game.includes("m.type==='cocox'?118"),'no fixed HP offset remains');
console.log('Cocox sprite: adaptive selection and health bar tested for idle, run and attack.');
