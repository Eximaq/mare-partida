'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const R=path.resolve(process.env.KAIZOKU_REPO||path.join(__dirname,'..')),get=f=>require(R+'/'+f);
const release=path.resolve(process.argv[2]||path.join(R,'dist')),fs=require('node:fs'),prefix='tools/rework-sword0-checkpoint/';
get('player-rework-sword0-checkpoint.js');
const {make,cv}=get('tests/rework-integration-support.cjs'),A=get('character-appearance.js'),
 W=get('paper-doll-96-lobby.js'),cats=get('tools/paper-doll-96-v3/weapons.json'),records=get('tools/rework-weapon-layers-hd/index.json').femaleRegistrations;
const own=global.MareReworkModularOutfitsHD,seen=[];
global.MareReworkModularOutfitsHD={...own,createOwnLayerIndex(rows){
 const index=own.createOwnLayerIndex(rows);
 if(!rows.some(r=>r.slot==='weapon'&&r.body==='female'&&r.action==='attack-sword'))return index;
 return {...index,resolve(key){seen.push(key);return index.resolve(key);}};
}};
const api=make({fetchJSON:async f=>JSON.parse(fs.readFileSync(path.join(f.startsWith(prefix)?release:R,f)))}),weaponAPI=global.MareReworkFemaleEquipmentHD.create({schema:'female-native-equipment-registration-v1',records},{makeCanvas:cv.createCanvas});
const opts={action:'attack-sword',consumer:'world'};
(async()=>{
 await api.ready;assert(await api.warmSwordCheckpoint());let checks=0;const keys=new Set(),sources=new Set();
 for(const item of [0,1,67,68,69,70])for(const direction of ['north','south','east','west']){
  const o={...opts,direction},archive=records.find(r=>r.item===item&&r.direction===direction&&r.action===o.action),expected={slot:'weapon',item,body:'female',action:o.action,direction};
  assert(archive);
  const part=archive.states[0].parts[0];
  // This call is the actual production asset-loading entry, not just metadata.
  seen.length=0;
  assert(weaponAPI.requiredFiles(archive).includes(part.url));
  assert.deepEqual(seen,[expected]);
  const indexed=weaponAPI.resolveOwnWeaponSource(archive);assert.equal(indexed.state,'available');assert(!indexed.mirrorX);
  assert.equal(indexed.source.url,part.url);assert.equal(indexed.source.sha256,part.sha256);
  assert.deepEqual(indexed.source.sourceNativeSize,item===69?[768,768]:[640,640]);
  const empty={...archive,states:archive.states.map(s=>({...s,parts:[]}))};
  seen.length=0;
  assert(!weaponAPI.requiredFiles(empty).includes(part.url),'explicit no-blade projection must not load the indexed blade');
  assert.deepEqual(seen,[],'do not resolve the weapon for intentionally empty phases');
  const mixed={...archive,states:archive.states.map((s,i)=>i===0?{...s,parts:[]}:s)};
  assert(!weaponAPI.requiredFiles(mixed,{frame:0}).includes(part.url));
  assert(weaponAPI.requiredFiles(mixed,{frame:1}).includes(part.url));
  const different={...archive,states:archive.states.map(s=>({...s,parts:s.parts.map(p=>({...p,sha256:'0'.repeat(64)}))}))};
  assert.throws(()=>weaponAPI.requiredFiles(different),/Missing exact own sword source/,'nonempty different blade must not be replaced');
  keys.add(indexed.key);sources.add(indexed.source.sha256);
  for(const skinColor of ['light','ebony']){
   const p={classId:'sword',appearance96:A.normalize({gender:'feminino',skinColor,hairStyle:'original',hairColor:'black',eyeColor:'blue'}),
    equipment:{weapon:{def:item},legs:{def:22}}},snapshot=JSON.stringify(p);
   for(const action of ['attack-sword','attack','skill']){
    const r=W.selectWorldHD(api,cats,p,{...o,action});if(r?.hdKind!=='female-equipment')continue;
    const own=weaponAPI.resolveOwnWeaponSource(r);assert.equal(own.key,indexed.key);
    assert(weaponAPI.requiredFiles({...r,material:null}).includes(part.url));
    assert.deepEqual(r.states,archive.states);
    assert.deepEqual(r.pack.directions[direction].clip,archive.baseRecord.pack.directions[direction].clip);checks++;
   }
   assert.equal(JSON.stringify(p),snapshot);
  }
 }
 assert.equal(keys.size,24);assert.equal(sources.size,6);assert(checks>=24);
 console.log('PASS six own sword textures, 24 authentic direction keys,',checks,'existing saved appearance pose lookups');
})().catch(e=>{console.error(e);process.exitCode=1});
