const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const engine=require('../paper-doll.js'),catalog=require('../paper-doll-assets.js');
require('../paper-doll-look.js');const review=require('../paper-doll-review.js');
const root=path.resolve(__dirname,'../pixellab-pip-generations/paper-doll-trousers-20261028');
const pack=JSON.parse(fs.readFileSync(path.join(root,'review-pack.json')));
assert.equal(pack.productionEnabled,false);assert.equal(pack.full_character_artwork_approved,false);
assert.deepEqual(Object.keys(pack.rig.animations),['idle','walk']);
const pants=pack.pieces.find(p=>p.id==='trousers-mare-alta');assert.equal(pants.approved,false);
for(const action of ['idle','walk'])assert.deepEqual(pants.animations[action].directions,['west','east']);
const runtime=engine.create({getImage(url){const b=fs.readFileSync(path.join(root,url));return {complete:true,naturalWidth:b.readUInt32BE(16),naturalHeight:b.readUInt32BE(20)};},validatePixels:()=>null});
runtime.registerRig(pack.rig);pack.pieces.forEach(p=>runtime.registerPiece(p));
for(const classId of Object.keys(catalog.classes)){
 const player={classId,factionId:'pirate',equipment:{legs:{def:22}},inventory:[{id:'unchanged'}],paperDollLook:{version:1,hair:'short-black',outfit:'navy'}};
 const before=JSON.stringify(player),pieces=catalog.equipmentPieces(pack,player).pieces;
 assert.equal(pieces.pants,pants.id);
 const appearance={rigId:pack.rig.id,pieces:{...pack.appearance.pieces,...pieces}};
 for(const action of ['idle','walk'])for(const direction of ['west','east'])for(let frameIndex=0;frameIndex<pack.rig.animations[action].frames;frameIndex++){
  const plan=runtime.resolve(appearance,{animationId:action,direction,frameIndex},{allowDraft:true});assert.equal(plan.valid,true);assert(plan.layers.some(l=>l.slot==='pants'));
 }
 assert.equal(catalog.equipmentPieces(pack,{...player,equipment:{}}).pieces.pants,undefined);
 assert.equal(catalog.equipmentPieces(pack,player,{production:true}).pieces.pants,undefined,'draft cannot leak into normal appearance');
 assert.equal(catalog.equipmentPieces(pack,{...player,equipment:{legs:{def:21}}}).pieces.pants,undefined,'another existing item cannot silently gain this look');
 assert.equal(review.appearance(pack,{...player,zoanTransformed:true}),null,'animal transformations remain outside the human compositor');
 assert.equal(review.requested('?paperDollReview=trousers',true),false,'partial review must not be a game combat override');
 assert.equal(JSON.stringify(player),before,'no save/inventory mutation');
}
const release=require('../pixellab-pip-generations/paper-doll-complete-20261026/player-pack.json');
assert.equal(catalog.equipmentBinding(release,'legs',22).length,0,'normal release has not activated the partial garment');
console.log('Trousers partial study: seven classes, 24 poses, equip/remove and production blocking');
