const assert=require('node:assert/strict');
const {create,slots,directions}=require('../paper-doll.js');
const catalog=require('../paper-doll-assets.js');
const rig={id:'test',frameWidth:3,frameHeight:3,pivotX:1,pivotY:2,scale:2,requiredSlots:['body','hair','outfit','weapon'],animations:{idle:{frames:4,fps:4,loop:true,directions},walk:{frames:8,fps:8,loop:true,directions},attack:{frames:8,fps:12,loop:false,directions}}};
const images=new Map(),canvases=[];let loads=0;
function canvas(w,h){const calls=[],context={imageSmoothingEnabled:true,drawImage:(...args)=>calls.push(args)};const c={width:w,height:h,calls,getContext:()=>context};canvases.push(c);return c;}
function image(url){loads++;return images.get(url);}
function piece(slot,extra={}){
 const p={id:slot,rigId:'test',slot,revision:1,approved:true,animations:{}};
 for(const [id,a]of Object.entries(rig.animations)){
  const url=slot+'-'+id;images.set(url,{complete:true,naturalWidth:a.frames*3,naturalHeight:12});
  p.animations[id]={...a,directions:[...directions],url,frameWidth:3,frameHeight:3};
 }
 return {...p,...extra};
}
const engine=create({getImage:image,createCanvas:canvas,validatePixels:()=>null,maxCacheBytes:108,maxCacheEntries:2});
engine.registerRig(rig);const definitions=rig.requiredSlots.map(s=>piece(s));for(const p of definitions)engine.registerPiece(p);
const appearance={rigId:'test',pieces:Object.fromEntries(rig.requiredSlots.map(s=>[s,s]))};
for(const animationId of ['idle','walk','attack'])for(const direction of directions)for(let frameIndex=0;frameIndex<rig.animations[animationId].frames;frameIndex++){
 const plan=engine.resolve(appearance,{animationId,direction,frameIndex});assert(plan.valid);assert.equal(plan.layers.length,4);
 for(const l of plan.layers){assert.equal(l.frameIndex,frameIndex);assert.equal(l.sx,frameIndex*3);assert.equal(l.sy,directions.indexOf(direction)*3);assert.equal(l.pivotX,1);assert.equal(l.pivotY,2);}
}
assert.equal(engine.sample('test','attack','back',99).frameIndex,7);assert.equal(engine.sample('test','idle','front',1).frameIndex,0);
assert.equal(engine.sample('test','walk','left',.375).frameIndex,3);assert.equal(engine.sample('test','skill','south'),null);
const outputCalls=[],output={save(){},restore(){},drawImage:(...args)=>outputCalls.push(args)};
const pose={animationId:'attack',direction:'south',frameIndex:3};assert(engine.draw(output,appearance,pose,100,100));
assert.equal(outputCalls[0][1],98);assert.equal(outputCalls[0][2],96);assert.equal(output.imageSmoothingEnabled,false);
assert(engine.draw(output,appearance,pose,100,100));assert.equal(engine.stats().compositions,1);assert.equal(engine.stats().hits,1);
assert(engine.draw(output,appearance,{...pose,frameIndex:4},100,100));assert(engine.draw(output,appearance,{...pose,frameIndex:5},100,100));assert(engine.stats().cacheEntries<=2);assert(engine.stats().cacheBytes<=108);
const changed=piece('weapon');changed.animations.attack.directionOverrides={north:{zIndex:-20,offsetX:1}};changed.animations.attack.poseOverrides={south:[{},{},{},{zIndex:90,offsetY:-1}]};engine.registerPiece(changed);
let plan=engine.resolve(appearance,{...pose,direction:'north'});assert.equal(plan.layers[0].slot,'weapon');assert.equal(plan.layers[0].offsetX,1);
plan=engine.resolve(appearance,pose);assert.equal(plan.layers.at(-1).zIndex,90);assert.equal(plan.layers.at(-1).offsetY,-1);
assert(engine.draw(output,appearance,pose,100,100));assert.equal(outputCalls.at(-1)[0].height,4,'negative offset expands the composition instead of clipping');
const callsBefore=outputCalls.length;const missing={...appearance,pieces:{...appearance.pieces,hair:'unknown'}};
assert(!engine.draw(output,missing,pose,0,0,{hidden:['hair']}));assert.equal(outputCalls.length,callsBefore,'fallback draws no partial layers');
assert.equal(engine.resolve(missing,pose).missing[0].code,'missing-piece');
for(const [mutation,code]of [
 [p=>p.rigId='other','incompatible-rig'],[p=>p.available=false,'missing-source'],[p=>p.approved=false,'unapproved-piece'],
 [p=>delete p.animations.attack,'missing-animation'],[p=>p.animations.attack.frames=1,'incompatible-animation'],
 [p=>p.animations.attack.directions=['south'],'incompatible-animation'],[p=>p.animations.attack.offsetX=.5,'invalid-transform']
]){
 const p=piece('hair');mutation(p);engine.registerPiece(p);assert.equal(engine.resolve(appearance,pose).missing[0].code,code);
}
engine.registerPiece(piece('hair'));const original=images.get('hair-attack');
images.set('hair-attack',{complete:false});assert.equal(engine.resolve(appearance,pose).missing[0].code,'loading-image');
images.set('hair-attack',{complete:true,naturalWidth:0,naturalHeight:0});assert.equal(engine.resolve(appearance,pose).missing[0].code,'failed-image');
images.set('hair-attack',{...original,naturalWidth:1});assert.equal(engine.resolve(appearance,pose).missing[0].code,'invalid-sheet-size');images.set('hair-attack',original);
assert.equal(engine.resolve(appearance,{...pose,frameIndex:8}).missing[0].code,'unsupported-pose');
assert.equal(engine.resolve({...appearance,rigId:'missing'},pose).missing[0].code,'missing-rig');
assert.throws(()=>engine.registerRig({...rig,pivotX:.5}),TypeError);assert.throws(()=>engine.registerPiece({id:'x',slot:'invalid',rigId:'test'}),TypeError);
for(const code of ['empty-frame','static-animation','unreadable-image']){
 const invalid=create({getImage:image,createCanvas:canvas,validatePixels:()=>code});invalid.registerRig(rig);for(const p of definitions)invalid.registerPiece(p);assert(invalid.resolve(appearance,pose).missing.every(m=>m.code===code));
}
assert.equal(slots.length,7);
const failedCanvas=create({getImage:image,createCanvas:()=>({getContext:()=>null}),validatePixels:()=>null});failedCanvas.registerRig(rig);for(const p of definitions)failedCanvas.registerPiece(p);assert(!failedCanvas.draw(output,appearance,pose,0,0),'canvas allocation failure uses legacy fallback');
const failedLoader=create({getImage:()=>{throw Error('invalid image URL')},createCanvas:canvas});failedLoader.registerRig(rig);for(const p of definitions)failedLoader.registerPiece(p);assert(failedLoader.resolve(appearance,pose).missing.every(m=>m.code==='failed-image'));
const player={classId:'sword',factionId:'pirate',equipment:{weapon:{def:0},coat:{def:6}}},untouched=JSON.stringify(player);
let a=catalog.appearance(player);assert.equal(a.pieces.weapon,'human-weapon-0');assert.equal(JSON.stringify(player),untouched,'appearance does not mutate save data');
player.equipment.weapon={def:1};a=catalog.appearance(player);assert.equal(a.pieces.weapon,'human-weapon-1');
player.equipment.weapon=null;assert.equal(catalog.appearance(player).pieces.weapon,'human-weapon-0');
player.equipment.coat={def:7};assert.equal(catalog.appearance(player).pieces.outfit,'human-coat-7');player.equipment.coat=null;assert.equal(catalog.appearance(player).pieces.outfit,'human-outfit-pirate');
player.equipment.head={def:19};assert(catalog.appearance(player).blocked.some(x=>x.code==='unmapped-equipment'));
// All 28 profiles share body/hair/movement. Class and faction never own anatomy.
const bodies=new Set(),hairs=new Set();
for(const classId of Object.keys(catalog.classes))for(const factionId of Object.keys(catalog.factions)){
 const candidate={classId,factionId,equipment:{}},before=JSON.stringify(candidate),profile=catalog.profile(candidate),look=catalog.appearance(candidate);
 assert(catalog.eligible(candidate));assert.equal(look.rigId,'human-v1');assert.equal(look.blocked.length,0);bodies.add(look.pieces.body);hairs.add(look.pieces.hair);
 assert.equal(catalog.animationId(candidate,'idle'),'idle');assert.equal(catalog.animationId(candidate,'walk'),'walk');
 assert.equal(catalog.animationId(candidate,'attack'),'attack-'+profile.category);assert.equal(catalog.animationId(candidate,'skill-1'),null);
 assert.equal(look.pieces.outfit,'human-outfit-'+factionId);assert.equal(JSON.stringify(candidate),before);
 candidate.equipment.weapon={def:catalog.classes[classId].weapon};assert.equal(catalog.appearance(candidate).blocked.length,0);
 const ref=catalog.referenceFor(candidate,'attack');assert.equal(ref.animated,classId==='sword'&&factionId==='pirate');
}
assert.equal(bodies.size,1);assert.equal(hairs.size,1);
assert.equal(catalog.profile({classId:'healer',factionId:'pirate'}).category,catalog.profile({classId:'strategist',factionId:'marine'}).category);
for(const candidate of [{classId:'unknown',factionId:'pirate'},{classId:'sword',factionId:'unknown'},{classId:'toString',factionId:'pirate'}])assert(!catalog.eligible(candidate));
const switching={classId:'sword',factionId:'pirate',equipment:{}};const identity=catalog.appearance(switching).pieces.body;
switching.classId='gunner';assert.equal(catalog.appearance(switching).pieces.body,identity);assert.equal(catalog.appearance(switching).pieces.weapon,'human-weapon-4');
switching.equipment.weapon={def:0};assert.equal(catalog.appearance(switching).blocked[0].code,'incompatible-weapon');
switching.equipment.weapon={def:4};assert.equal(catalog.appearance(switching).blocked.length,0);switching.factionId='marine';assert.equal(catalog.appearance(switching).pieces.body,identity);
assert(!catalog.eligible({...player,zoanTransformed:true}));
global.MarePaperDoll=require('../paper-doll.js');const before=loads,empty=catalog.createRuntime({getImage:image});
const config=catalog.appearance({classId:'sword',factionId:'pirate',equipment:{}}),frame=catalog.sample(empty,{classId:'sword',factionId:'pirate'},'attack','south',0);
let sharedPoses=0;
for(const classId of Object.keys(catalog.classes))for(const factionId of Object.keys(catalog.factions)){
 const player={classId,factionId,equipment:{}},config=catalog.appearance(player);
 for(const action of ['idle','walk','attack'])for(const direction of directions){
  const clip=catalog.sharedRig.animations[catalog.animationId(player,action)];
  for(let i=0;i<clip.frames;i++){
   const pose=catalog.sample(empty,player,action,direction,(i+.01)/clip.fps);
   assert.equal(pose.frameIndex,i);assert.equal(pose.direction,direction);assert.equal(empty.resolve(config,pose).missing.length,4);sharedPoses++;
  }
 }
}
assert.equal(sharedPoses,2240);assert.equal(loads,before,'all 28 profiles keep missing art explicit with no image requests');
assert.equal(empty.resolve(config,frame).missing.length,4);assert(!empty.draw(output,config,frame,0,0));assert.equal(loads,before,'missing placeholders never request invented URLs');
console.log('Paper Doll: 80 poses x4 layers, pivots, depth/offsets, cache bounds, atomic fallback, invalid art, equipment updates, save purity and class/faction/Zoan scope passed.');
