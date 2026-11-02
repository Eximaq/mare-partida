'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../boss-dungeon-combat.js'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');globalThis.MareSpriteCombatV2Data={};require('../dungeon-boss-art-data.js');
test('every authored direction damages once at its contact, including skipped frame deltas',()=>{
 for(const [key,entry]of Object.entries(MareSpriteCombatV2Data))for(const [dir,clip]of Object.entries(entry.clips.attack)){
  assert(clip.impact_frame<clip.frames);assert(fs.existsSync(path.join(root,clip.image)));const m={alive:true},t={},hits=[];assert(C.begin(m,t,clip));assert(!C.begin(m,t,clip));
  C.step(m,clip.impact_frame/clip.fps-.001,{hit:x=>hits.push(x)});assert.equal(hits.length,0,key+dir);C.step(m,.002,{hit:x=>hits.push(x)});assert.deepEqual(hits,[t],key+dir);C.step(m,5,{hit:x=>hits.push(x)});assert.equal(hits.length,1);assert.equal(m.dungeonAttack,null);
 }
});
test('interruption, invalid target and zero elapsed cannot emit extra hits',()=>{
 const clip={frames:9,fps:12,impact_frame:5};for(const reason of ['blocked','dead','range']){const m={alive:true};let hits=0;C.begin(m,{},clip);C.step(m,0,{hit:()=>hits++});assert.equal(hits,0);if(reason==='dead')m.alive=false;C.step(m,2,{blocked:reason==='blocked',valid:()=>reason!=='range',hit:()=>hits++});assert.equal(hits,0);assert.equal(m.dungeonAttack,null);}
});

test('all nine native manifests have valid dimensions, pivots and isolated current resources',()=>{
 for(const [key,e]of Object.entries(MareSpriteCombatV2Data)){
  assert.equal(e.dungeonBoss,true);assert.equal(e.world_scale,1);assert.equal(key==='dungeon-alvida'?e.worldHeight<96:e.worldHeight>96,true,key+' approved proportion');
  for(const action of ['idle','walk','attack'])for(const dir of ['east','north','south','west'])assert(e.clips[action][dir]);
  assert(e.clips.hurt.south);for(const [action,dirs]of Object.entries(e.clips))for(const c of Object.values(dirs)){
   assert(c.image.startsWith('assets/sprites-combat-v2/'+key+'/'));const b=fs.readFileSync(path.join(root,c.image));assert.equal(b.readUInt32BE(16),c.size*c.frames);assert.equal(b.readUInt32BE(20),c.size);assert.equal(b[25],6,'true RGBA transparency');assert.equal(c.bounds.length,c.frames);assert.equal(c.anchor[0],c.size/2);assert(c.anchor[1]>0&&c.anchor[1]<=c.size);
  }
 }
});
