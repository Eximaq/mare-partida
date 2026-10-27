'use strict';
const assert=require('node:assert/strict');
require('../paper-doll.js');require('../paper-doll-assets.js');
const R=require('../paper-doll-review.js'),L=require('../paper-doll-look.js'),pack=require('../pixellab-pip-generations/paper-doll-complete-20261026/review-pack.json');
for(const classId of Object.keys(MarePaperDollCatalog.classes)){
 const oldWeapon={id:'old',def:1,plus:9,locked:true,pearls:[{level:3}]},boots={id:'boots',def:8,plus:4};
 const target=MarePaperDollCatalog.classes[classId].weapon,replacement={id:'owned',def:target,plus:7};
 const g={devSandbox:true,classId,factionId:'pirate',equipment:{weapon:oldWeapon,boots,amulet:{id:'amulet',def:10}},inventory:[replacement],gold:123},before=JSON.stringify(g);
 const r=R.prepareEquipment(pack,g,{makeWeapon:()=>{throw Error('must reuse owned weapon');}});
 assert(r.ok);assert.equal(JSON.stringify(g),before);assert(R.equipmentStatus(pack,r.state).ready);
 assert(r.state.inventory.includes(oldWeapon));assert(r.state.inventory.includes(boots));assert.equal(r.state.gold,123);assert.equal(r.state.equipment.amulet,g.equipment.amulet);
 assert.equal(r.state.equipment.weapon,classId==='brawler'?null:replacement);
 assert.equal(R.prepareEquipment(pack,r.state).state,r.state,'idempotent; never duplicate a kit');
 assert(!R.prepareEquipment(pack,g,{capacity:0}).ok);assert.equal(JSON.stringify(g),before);
 assert(!R.prepareEquipment(pack,{...g,devSandbox:false}).ok);
 assert(!R.prepareEquipment(pack,{...g,zoanTransformed:true}).ok);
}
const base={devSandbox:true,classId:'sword',factionId:'pirate',equipment:{},inventory:[]};let calls=0;
const r=R.prepareEquipment(pack,base,{makeWeapon:def=>(calls++,{id:'test',def})});assert(r.ok);assert.equal(calls,1);assert.equal(r.state.equipment.weapon.def,0);
assert(!R.prepareEquipment(pack,base,{makeWeapon:()=>({id:'bad',def:4})}).ok);
assert(!R.prepareEquipment({...pack,productionEnabled:true},base).ok);
assert(!R.prepareEquipment({...pack,completeCategories:false},base).ok);
const full={...base,inventory:Array.from({length:120},(_,i)=>({id:'item'+i,def:i===0?0:8})),equipment:{weapon:{id:'wrong',def:1}}};
assert(R.prepareEquipment(pack,full).ok,'reuse frees capacity before returning old equipment');
const report=R.equipmentStatus(pack,{...base,equipment:{boots:{id:'b',def:8}}});
const defs=[];defs[8]={name:'<script>unsafe</script>'};const html=L.render(base,L.defaults,'',report,defs);
assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));assert(html.includes('data-doll-kit'));
console.log('Equipment readiness: seven classes, owned item reuse, no loss/duplication, full bag atomicity, DEV/Zoan gates and escaped UI passed.');
