'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const F=require('../forge-system.js'),C=require('../item-catalog.js').create({forge:F,prison:require('../prison-system.js'),haki:require('../haki-system.js'),akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')}),W=require('../tools/paper-doll-96-v3/weapons.js'),catalog=require('../tools/paper-doll-96-v3/weapons.json'),rigs=require('../tools/paper-doll-96-v3/appearance-rig.json'),manifest=require('../tools/paper-doll-96-v3/manifest.json');
const expected=['Manoplas do Coral Negro','Punhos do Dragão Carmesim','Luva do Abalo Sísmico','Manoplas da Ruptura dos Mares','Mosquete do Vento Cortante'];
test('five class armaments append after all 109 preserved definitions',()=>{
 assert(C.items.length>=114);assert.deepEqual(C.items.slice(109,114).map(d=>d.name),expected);
 const summary={items:C.items.slice(0,109),slots:[...C.inventorySlotsLeft,...C.inventorySlotsRight],capacity:C.capacity,healerWeaponIndex:C.healerWeaponIndex};
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(summary)).digest('hex'),'07758ab92d0d8459806c10bce2f4643f549236f49a120b413553094c07f26ee5');
 assert.deepEqual(C.items.slice(109,114).map(d=>d.rarity),['epic','legendary','legendary','supreme','epic']);
 assert(C.items.slice(109,114).every(d=>d.fixedRarity));
});
test('intrinsic attributes follow class, rarity and level once; rerolls preserve them',()=>{
 const bare=id=>F.normalizeItem({id:'armament-'+id,def:id,rarity:C.items[id].rarity,level:1,plus:0,extras:[]},C.items);
 const stats=[109,110,111,112,113].map(id=>F.itemStats(bare(id),C.items));
 assert.deepEqual(stats.map(s=>s.attack),[26,44,40,66,29]);
 assert.deepEqual(stats[0].attributes,{strength:7,dexterity:2,vitality:5,intelligence:0,spirit:0});
 assert(stats[2].attributes.vitality>stats[1].attributes.vitality);assert(stats[3].attack>Math.max(...stats.slice(0,3).map(s=>s.attack)));
 assert.equal(stats[4].attributes.dexterity,7);assert.equal(stats[4].crit,.0072);
 for(let id=109;id<=113;id++){
  const item=bare(id),d=C.items[id],rolled=F.normalizeItem({...item,extras:undefined},C.items,()=>.5);
  assert.equal(rolled.extras.length,F.rarity[d.rarity].extras);assert(rolled.extras.every(e=>d.extraPool.includes(e.stat)));
  const original=structuredClone(rolled);assert.deepEqual(F.normalizeItem(rolled,C.items),original,'reload does not reroll');
  const state={gold:100000,materials:10000,inventory:[item],equipment:{},forgeSeq:0};
  const result=F.execute(state,{type:'reforge',itemId:item.id,expectedSeq:0},C.items,()=>.5);assert(result.ok);
  assert.deepEqual(result.state.inventory[0].baseStats,item.baseStats);assert.deepEqual(C.items[id].attributes,d.attributes);
  const gear=F.aggregate({weapon:item},C.items);assert.deepEqual(gear.attributes,F.itemStats(item,C.items).attributes);
 }
});
test('PixelLab sources, 3x density, grip sockets, side mirroring and all animation plans',()=>{
 assert(W.validate(catalog));const renderer=W.create(catalog,rigs);let poses=0;
 for(const item of catalog.items.filter(w=>w.itemId>=109&&w.itemId<114)){
  assert.equal(item.name,C.items[item.itemId].name);assert.equal(item.generation.tool,'pixellab');assert.equal(item.generation.model,'pro');assert.equal(item.renderDensity,3);assert(item.materialScale>0&&item.materialScale<1);assert.equal(item.effect,null);
  for(const m of [item,...Object.values(item.views||{})]){const file=fs.readFileSync(path.join(__dirname,'../tools/paper-doll-96-v3',m.source));assert.equal(crypto.createHash('sha256').update(file).digest('hex'),m.sha256);assert.equal(file.readUInt32BE(16),128);assert.equal(file.readUInt32BE(20),128);}
  if(item.itemId<113){assert(item.attachment.palmInward&&item.attachment.coverPalm);assert(item.views.north);assert.notEqual(item.views.north.sha256,item.sha256,'North has an authored reverse surface');}
  if(item.itemId===110){assert(item.armour);assert.equal(item.armour.generation.tool,'pixellab');assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../tools/paper-doll-96-v3',item.armour.source))).digest('hex'),item.armour.sha256);}
  for(const body of ['masculino','feminino'])for(const action of ['idle','walk','attack-'+item.category])for(const direction of ['south','north','east']){
   const clip=manifest.bodies[body].clips[action][direction],size=clip.frame?.width||128,spec={width:size,height:size},selected={body,action,direction,clip};
   const pad=renderer.padding(selected,spec,{weapon:item.id});assert(Math.max(...Object.values(pad))<84);
   for(let frame=0;frame<clip.frames;frame++){const entries=renderer.plan(selected,frame,spec,{weapon:item.id});assert.equal(entries.length,item.paired?2:1);for(const entry of entries){const grip=renderer.point(entry,entry.model.grip);assert.equal(grip.x,entry.x);assert.equal(grip.y,entry.y);assert(Number.isFinite(renderer.point(entry).x));}poses++;}
  }
 }
 assert.equal(poses,600);
});
test('combat signatures are presentation-only and preserve existing projectile rules',()=>{
 const V=require('../class-weapon-vfx.js'),combat=require('../combat-vfx.js');
 for(let id=109;id<=113;id++)assert(V.style(C.items[id]));assert.equal(V.style(C.items[0]),null);
 const p=combat.projectile('gunner',{x:0,y:0},'target',{weaponStyle:V.style(C.items[113])}),target={id:'target',x:60,y:0,alive:true};let hits=0;
 for(let i=0;i<100;i++)combat.step(p,.01,{target,onHit:()=>hits++});assert.equal(hits,1);assert.equal(p.phase,'done');
 assert.equal(V.projectile({}, {...p}),true);assert.equal(V.style({weaponVisual:'injected'}),null);
});
