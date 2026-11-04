'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),F=require('../forge-system.js'),C=require('../item-catalog.js').create({forge:F,prison:require('../prison-system.js'),haki:require('../haki-system.js'),akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')}),W=require('../tools/paper-doll-96-v3/weapons.js'),catalog=require('../tools/paper-doll-96-v3/weapons.json'),rigs=require('../tools/paper-doll-96-v3/appearance-rig.json'),manifest=require('../tools/paper-doll-96-v3/manifest.json');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
test('remaining ten append after 119 preserved definitions, completing 1/2/1 per class',()=>{
 const baseline={items:C.items.slice(0,119),slots:[...C.inventorySlotsLeft,...C.inventorySlotsRight],capacity:C.capacity,healerWeaponIndex:C.healerWeaponIndex};
 assert.equal(hash(JSON.stringify(baseline)),'1702173f0fa0090e321f24aa4718aa50a470e6a49527d7e66eb2eda18e0b7892');assert.equal(C.items.length,129);
 for(const type of ['brawler','gunner','cyborg','strategist','healer'])assert.deepEqual(C.items.slice(109).filter(i=>i.type===type).map(i=>i.rarity),['epic','legendary','legendary','supreme']);
 assert.deepEqual(C.items.slice(119).map(i=>i.type),['cyborg','cyborg','strategist','strategist','strategist','strategist','healer','healer','healer','healer']);
 assert.deepEqual(C.items.slice(119).map((d,i)=>F.itemStats({def:i+119,rarity:d.rarity,level:1,plus:0,extras:[]},C.items).attack),[44,72,22,40,44,72,19,36,40,66]);
 for(let id=119;id<129;id++){const def=C.items[id],item=F.normalizeItem({id:'remaining-'+id,def:id,rarity:def.rarity,level:1,plus:0},C.items,()=>.4);assert(item.extras.every(e=>def.extraPool.includes(e.stat)));assert.deepEqual(F.normalizeItem(item,C.items),item);}
});
test('remaining materials and projectile art retain PixelLab provenance and transparent PNG contracts',()=>{
 assert(W.validate(catalog));
 for(const m of catalog.items.filter(m=>m.itemId>=119)){
  assert.equal(m.name,C.items[m.itemId].name);assert.equal(m.effect,null);assert.equal(m.renderDensity,3);
  assert.equal(hash(fs.readFileSync(path.join(__dirname,'..',m.reference))),m.referenceSha256);
  for(const material of [m,...Object.values(m.views||{}),...(m.armour?[m.armour]:[])]){const bytes=fs.readFileSync(path.join(__dirname,'../tools/paper-doll-96-v3',material.source));assert.equal(hash(bytes),material.sha256);assert.equal(bytes.readUInt32BE(16),128);assert.equal(bytes.readUInt32BE(20),128);assert.equal(bytes[25],6);assert.equal(material.generation.tool,'pixellab');}
 }
 const vfx=Object.values(require('../assets/effects/class-weapons/manifest.json'));assert.equal(vfx.length,8);
 for(const v of vfx){const bytes=fs.readFileSync(path.join(__dirname,'..',v.source));assert.equal(hash(bytes),v.sha256);assert.equal(bytes[25],6);assert.equal(v.generation.tool,'pixellab');}
});
test('South and side focus attacks prioritize every weapon over hands and gloves',()=>{
 const renderer=W.create(catalog,rigs);let frames=0;
 for(const m of catalog.items)for(const body of ['masculino','feminino'])for(const action of ['idle','walk',m.attackAction||'attack-'+m.category])for(const direction of ['south','north','east']){
  const clip=manifest.bodies[body].clips[action][direction],size=clip.frame?.width||128;
  for(let f=0;f<clip.frames;f++)for(const e of renderer.plan({body,action,direction,clip},f,{width:size,height:size},{weapon:m.id})){
   const front=direction==='south'||action==='attack-focus'&&direction==='east';assert.equal(e.frontOfHand,front);if(front)assert.equal(e.depth,'front');assert(Number.isFinite(renderer.point(e).x));assert.deepEqual(renderer.point(e,e.model.grip),{x:e.x,y:e.y});frames++;
  }
 }assert(frames>5000);
});
test('all remaining projectile styles preserve the existing one-hit lifecycle',()=>{
 const V=require('../class-weapon-vfx.js'),combat=require('../combat-vfx.js');
 for(let id=119;id<129;id++){const style=V.style(C.items[id]);assert(style);const kind=id<121?'cyborg':id<125?'mage':'healer',p=combat.projectile(kind,{x:0,y:0},'t',{weaponStyle:style}),target={id:'t',x:100,y:0,alive:true};let hits=0;for(let i=0;i<150;i++)combat.step(p,.01,{target,onHit:()=>hits++});assert.equal(hits,1);assert.equal(p.phase,'done');}
});
test('Serafim masculine North/South uses the feminine arm gesture without changing body or shared rigs',()=>{
 const renderer=W.create(catalog,rigs),before=JSON.stringify(rigs);let poses=0;
 for(const action of ['idle','walk','attack-tech'])for(const direction of ['south','north'])for(let f=0;f<manifest.bodies.masculino.clips[action][direction].frames;f++){
  const clip=manifest.bodies.masculino.clips[action][direction],selected={body:'masculino',action,direction,clip},native=rigs.clips.masculino[action][direction].poses[f],reference=rigs.clips.feminino[action][direction].poses[f],actual=renderer.armPose(selected,f,{weapon:'weapon-120'}),neck=actual.find(j=>j.label==='NECK'),rn=reference.find(j=>j.label==='NECK');
  assert.deepEqual(actual.filter(j=>!/^(LEFT|RIGHT) (ARM|ELBOW)$/.test(j.label)),native.filter(j=>!/^(LEFT|RIGHT) (ARM|ELBOW)$/.test(j.label)));
  for(const j of actual.filter(j=>/^(LEFT|RIGHT) (ARM|ELBOW)$/.test(j.label))){const r=reference.find(p=>p.label===j.label);assert(Math.abs(j.x-neck.x-r.x+rn.x)<1e-8);assert(Math.abs(j.y-neck.y-r.y+rn.y)<1e-8);}
  assert.equal(renderer.armPose({...selected,body:'feminino'},f,{weapon:'weapon-120'}),null);assert.equal(renderer.armPose(selected,f,{weapon:'weapon-118'}),null);poses++;
 }assert.equal(poses,40);assert.equal(JSON.stringify(rigs),before);
});
