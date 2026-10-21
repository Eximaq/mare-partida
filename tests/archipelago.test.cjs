const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const a=require('../archipelago.js');
const names=['Ilha Dawn','Cidade das Conchas','Orange Town','Ilha dos Animais Raros','Vila Syrup','Baratie','Parque Arlong','Loguetown'];
assert.deepEqual(a.list('east-blue').map(i=>i.name),names);
assert.equal(new Set(a.islands.map(i=>i.id)).size,8);
a.islands.forEach((i,n)=>{
  assert.deepEqual(i.recommended,[n*5+1,n*5+5]);
  assert.equal(i.order,n+1);
  assert.equal(a.get(i.id),i);
  assert(Object.isFrozen(i));
});
assert.deepEqual(a.regions.map(r=>[r.id,r.locked]),[['east-blue',false],['alabasta',true]]);
assert.deepEqual(a.list('alabasta'),[]);
assert.deepEqual(a.list('missing'),[]);
assert.equal(a.byArea(null),null);
assert.equal(a.byArea('missing'),null);
assert.equal(a.get('missing'),null);
assert.equal(a.byArea('beach').id,'dawn');
assert.equal(a.byArea('swamp').id,'conchas');
assert.equal(a.canTravel('dawn',1),true);
assert.equal(a.canTravel('dawn',80),true);
assert.equal(a.canTravel('conchas',5),false);
assert.equal(a.canTravel('conchas',5),false);
assert.equal(a.canTravel('conchas',6),true);
for(const level of [undefined,null,NaN,Infinity,'10',-1,0])assert.equal(a.canTravel('dawn',level),false);
assert.equal(a.canTravel('missing',80),false);
assert.equal(a.byArea('orange').id,'orange-town');assert(!a.canTravel('orange-town',10));assert(a.canTravel('orange-town',11));assert(a.canTravel('orange-town',100));
assert.equal(a.byArea('rare').id,'animais-raros');
assert(!a.canTravel('animais-raros',15));
assert(a.canTravel('animais-raros',16));
assert(!a.canTravel('syrup',20));assert(a.canTravel('syrup',21));
assert(!a.canTravel('baratie',25));assert(a.canTravel('baratie',26));assert(!a.canTravel('arlong',30));assert(a.canTravel('arlong',31));
for(const i of a.islands.slice(7)){
  assert.equal(i.area,null);assert.equal(i.monster,null);assert.equal(i.drops,null);
  assert.equal(a.canTravel(i.id,999),false);
}
for(const i of a.islands.slice(0,7)){
  assert(fs.existsSync(path.join(__dirname,'..',i.monster.src)));
  assert(i.drops.length>0);
}
console.log('Archipelago: catalog, progression, compatibility, gates and preview sources passed.');
