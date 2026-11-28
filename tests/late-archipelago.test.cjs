'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const A=require('../archipelago.js'),{load}=require('../world-catalog.cjs');
const cases=[
 ['thriller-bark-01','thriller-bark',114,117,'absalom'],
 ['thriller-bark-02','thriller-bark',118,121,'perona'],
 ['thriller-bark-03','thriller-bark',122,126,'ryuma'],
 ['thriller-bark-04','thriller-bark',127,130,'oars'],
 ['sabaody-01','sabaody',131,135,'pacifista'],
 ['sabaody-02','sabaody',136,140,'urouge'],
 ['sabaody-03','sabaody',141,145,'hawkins'],
 ['sabaody-04','sabaody',146,150,'x-drake'],
 ['marineford-01','marineford',151,155,'squard'],
 ['marineford-02','marineford',156,160,'onigumo'],
 ['marineford-03','marineford',161,165,'little-oars-jr'],
 ['marineford-04','marineford',166,170,'izo'],
 ['marineford-05','marineford',171,175,'vista'],
 ['marineford-06','marineford',176,180,'jozu']
];
test('new voyages unlock at their requested level and cards have distinct positions',()=>{
 const U=require('../voyage-ui.js');
 for(const [regionId,count] of [['thriller-bark',4],['sabaody',4],['marineford',6]]){
  const islands=A.list(regionId);assert.equal(islands.length,count,regionId);
  const region=A.regions.find(r=>r.id===regionId);assert(region&&!region.locked);
  const ui=U.voyage({region,regions:A.regions,islands,game:{area:'beach'},scene:'lobby'});
  assert.equal(new Set([...ui.body.matchAll(/style="--map-x:([^;]+);--map-y:([^"]+)"/g)].map(m=>m[0])).size,count);
 }
 for(const [id,region,min,max,type]of cases){
  const island=A.get(id);assert.equal(island.region,region);assert.deepEqual(island.recommended,[min,max]);
  assert(!A.canTravel(id,min-1));assert(A.canTravel(id,min));assert(A.canTravel(id,200));
  assert(island.monster.src.includes('/'+type+'/'));assert.equal(A.byArea(id).id,id);
 }
 assert.equal(A.get('enies-lobby-05').order,23,'existing map reward order is preserved');
});
test('new hunt instances use original maps, safe arrivals and connected patrols',()=>{
 const w=load();
 for(const [id]of cases)assert(w.maps[id],'registered map '+id);
 const late=require('../late-archipelago-world.js'),exports=require('../world-map-exports.js');
 for(const [id,width,height] of [['thriller-bark-01',3840,4992],['sabaody-01',3072,3072],['marineford-01',3072,2304]]){
  const map=w.maps[id],nav=w.navigation(id),spec=late.worlds[id].spec;
  assert.equal(map.width,width);assert.equal(map.height,height);assert(nav.walkable(map.spawn.x,map.spawn.y));
  const expectedReturn=exports.get(id).huntReturnPoint??map.spawn;
  assert.equal(map.returnPoint.x,expectedReturn.x);assert.equal(map.returnPoint.y,expectedReturn.y);
  assert(map.interactions.some(p=>p.id==='return'));assert(!nav.walkable(32,32),'sea remains blocked');
  assert.equal(spec.slots.length,6);
  for(const slot of spec.slots){
   assert(nav.walkable(slot.x,slot.y),slot.id+' walkable');
   assert(nav.path(map.spawn,slot).length,slot.id+' reachable');
   assert(Math.hypot(slot.x-map.spawn.x,slot.y-map.spawn.y)>160,slot.id+' outside arrival');
  }
  assert(nav.path(spec.slots.at(-1),map.returnPoint).length,id+' return route');
  const source=exports.get(id),file=source.imageFile||'map.png',region=spec.region;
  assert(fs.existsSync(source.groundUrl?path.join(__dirname,'..',source.groundUrl):path.join(__dirname,'../assets/exported-maps',region,file)));
  if(source.spriteMode!=='painted')for(const assetId of new Set(source.props.map(p=>p.assetId)))assert(fs.existsSync(path.join(__dirname,'../assets/map-depth/objects',assetId+'.png')),assetId);
 }
 assert.equal(w.maps.marineford.returnPoint,undefined,'weekly arena was not changed into a hunt');
 assert.equal(w.maps.marineford.interactions.length,0);
 for(const [id,,min,,type]of cases){const s=late.worlds[id].spec;assert.equal(s.level,min);assert(s.slots.every(p=>p.type===type&&p.id.startsWith(id+'-')));}
});
test('new hunt progress is independent and reload preserves previous areas',()=>{
 const H=require('../hunt-system.js');
 const old={area:'enies-lobby-05',gold:321,hunts:{areas:{'enies-lobby-05':{kills:8,bosses:0,firstRewardClaimed:false,bossReadyAt:0,respawns:{'enies-lobby-05-0':6543}}}}};
 const migrated=H.migrate(old);assert.deepEqual(migrated.hunts.areas['enies-lobby-05'],old.hunts.areas['enies-lobby-05']);
 assert.equal(migrated.gold,321);assert.equal(migrated.area,'enies-lobby-05');
 for(const [id,,,,type]of cases){assert.equal(migrated.hunts.areas[id]?.kills,0,id);assert(H.sectors(id).every(s=>s.roles.includes(type)));}
 const killed=H.recordKill(migrated,'thriller-bark-01','absalom',100).state;
 assert.equal(killed.hunts.areas['thriller-bark-01'].kills,1);assert.equal(killed.hunts.areas['thriller-bark-02'].kills,0);
 assert.deepEqual(H.migrate(killed),killed);
});
