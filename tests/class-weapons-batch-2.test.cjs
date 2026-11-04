'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),F=require('../forge-system.js'),C=require('../item-catalog.js').create({forge:F,prison:require('../prison-system.js'),haki:require('../haki-system.js'),akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')}),W=require('../tools/paper-doll-96-v3/weapons.js'),catalog=require('../tools/paper-doll-96-v3/weapons.json'),rigs=require('../tools/paper-doll-96-v3/appearance-rig.json'),manifest=require('../tools/paper-doll-96-v3/manifest.json');
test('batch two appends five items without changing the first 114 identities',()=>{
 const summary={items:C.items.slice(0,114),slots:[...C.inventorySlotsLeft,...C.inventorySlotsRight],capacity:C.capacity,healerWeaponIndex:C.healerWeaponIndex};
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(summary)).digest('hex'),'851dbb28d6a13fb1f2f3f7a1de19fb4e6b03dbf74c31e166f1c82ccd39fd1720');
 assert(C.items.length>=119);assert.deepEqual(C.items.slice(114,119).map(i=>i.type),['gunner','gunner','gunner','cyborg','cyborg']);assert.deepEqual(C.items.slice(114,119).map(i=>i.rarity),['legendary','legendary','supreme','epic','legendary']);
 const stats=C.items.slice(114,119).map((d,i)=>F.itemStats({def:114+i,rarity:d.rarity,level:1,plus:0,extras:[]},C.items));assert.deepEqual(stats.map(s=>s.attack),[48,52,84,22,40]);assert.deepEqual(stats.map(s=>s.defense),[0,0,0,12,16]);assert.equal(stats[3].attributes.vitality,7);assert.equal(stats[4].attributes.vitality,16);
 for(let id=114;id<119;id++){const def=C.items[id],item=F.normalizeItem({id:'batch2-'+id,def:id,rarity:def.rarity,level:1,plus:0},C.items,()=>.3);assert(item.extras.every(e=>def.extraPool.includes(e.stat)));assert.deepEqual(F.normalizeItem(item,C.items),item);}
});
test('dedicated PixelLab directional materials retain original pixels and existing attack families',()=>{
 assert(W.validate(catalog));const renderer=W.create(catalog,rigs);let poses=0;
 for(const model of catalog.items.filter(w=>w.itemId>=114&&w.itemId<119)){
  assert.equal(model.name,C.items[model.itemId].name);assert.equal(model.renderDensity,3);assert.equal(model.effect,null);assert(model.views.north);if(model.itemId!==117)assert(model.views.south);
  for(const material of [model,...Object.values(model.views)]){const bytes=fs.readFileSync(path.join(__dirname,'../tools/paper-doll-96-v3',material.source));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),material.sha256);assert.equal(bytes.readUInt32BE(16),128);assert.equal(bytes.readUInt32BE(20),128);assert.equal(material.generation.tool,'pixellab');assert.equal(material.generation.model,'pro');}
  for(const body of ['masculino','feminino'])for(const action of ['idle','walk',model.attackAction||'attack-'+model.category])for(const direction of ['south','north','east']){const clip=manifest.bodies[body].clips[action][direction],size=clip.frame?.width||128,selected={body,action,direction,clip},spec={width:size,height:size};for(let f=0;f<clip.frames;f++){const entries=renderer.plan(selected,f,spec,{weapon:model.id});assert.equal(entries.length,model.paired?2:1);assert(entries.every(e=>Number.isFinite(renderer.point(e).x)));poses++;}}
 }
 assert.equal(poses,600);assert.equal(catalog.items.find(w=>w.itemId===114).paired,true);assert.equal(catalog.items.find(w=>w.itemId===117).attackAction,'attack-unarmed');
});
test('new shot signatures use the original one-projectile/one-hit lifecycle',()=>{
 const V=require('../class-weapon-vfx.js'),combat=require('../combat-vfx.js');
 for(let id=114;id<=118;id++){const style=V.style(C.items[id]);assert(style);const kind=id<117?'gunner':'cyborg',p=combat.projectile(kind,{x:0,y:0},'t',{weaponStyle:style}),target={id:'t',x:100,y:0,alive:true};let hits=0;for(let t=0;t<100;t++)combat.step(p,.01,{target,onHit:()=>hits++});assert.equal(hits,1);assert.equal(p.phase,'done');}
});
test('South firearms render in front of the hand through locomotion and attacks',()=>{
 const renderer=W.create(catalog,rigs);
 for(const id of [113,114,115,116])for(const body of ['masculino','feminino'])for(const action of ['idle','walk','attack-firearm'])for(const direction of ['south','north','east']){
  const clip=manifest.bodies[body].clips[action][direction],size=clip.frame?.width||128;
  for(let frame=0;frame<clip.frames;frame++)for(const entry of renderer.plan({body,action,direction,clip},frame,{width:size,height:size},{weapon:'weapon-'+id}))assert.equal(entry.frontOfHand,direction==='south');
 }
});
