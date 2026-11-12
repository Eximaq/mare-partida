'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'../tools/paper-doll-96-v3'),catalog=require(base+'/weapons.json'),rigs=require(base+'/appearance-rig.json'),manifest=require(base+'/manifest.json'),W=require(base+'/weapons.js');
const item=catalog.items.find(w=>w.itemId===109);
assert.ok(item.views.south,'109 SOUTH needs its isolated reviewed-source fit');
assert.equal(item.views.south.materialScale,.14);
assert.deepEqual(item.views.south.grip,{x:76,y:64});
assert.deepEqual(fs.readFileSync(path.join(base,item.views.south.source)),fs.readFileSync(path.join(base,item.source)),'reuse approved original pixels, without regeneration');
assert.equal(item.materialScale,.23,'other directions retain original fit');
assert.deepEqual(item.grip,{x:84,y:65});
const renderer=W.create(catalog,rigs),before=JSON.stringify(rigs);let count=0;
for(const body of ['masculino','feminino'])for(const action of ['idle','walk','attack-unarmed']){
 const clip=manifest.bodies[body].clips[action].south,spec={width:clip.frame?.width||128,height:clip.frame?.height||128},selected={body,action,direction:'south',clip};
 for(let frame=0;frame<clip.frames;frame++){
  const plan=renderer.plan(selected,frame,spec,{weapon:'weapon-109'});assert.equal(plan.length,2);
  for(const entry of plan){assert.equal(entry.model.source,item.views.south.source);assert.equal(entry.model.materialScale,.14);assert.deepEqual(renderer.point(entry,entry.model.grip),{x:entry.x,y:entry.y});assert(Number.isFinite(entry.angle));count++;}
 }
}
for(const direction of ['east','north'])assert.equal(renderer.descriptor('weapon-109',direction,'attack-unarmed').materialScale,.23);
assert.equal(JSON.stringify(rigs),before,'never mutate existing class poses');
console.log(JSON.stringify({southHandAttachments:count,reusedSource:true,rigUnchanged:true}));
