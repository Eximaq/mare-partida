'use strict';
const assert=require('node:assert/strict');
require('../paper-doll.js');require('../paper-doll-assets.js');
const look=require('../paper-doll-look.js'),review=require('../paper-doll-review.js');
const release=require('../pixellab-pip-generations/paper-doll-complete-20261026/player-pack.json');
assert.equal(typeof look.createCatalog,'function','appearance options need a reusable data catalog');
// Aliases of existing clips are fixtures only, never new art in the live catalog.
const data=structuredClone(look.data);
data.groups.hair.options.push({id:'test-copper',label:'Copper <hair>',pieceId:'test-hair',approved:true});
data.groups.outfit.options.push({id:'test-rust',label:'Rust coat',pieceId:'test-outfit',approved:true});
data.groups.hair.options.push({id:'draft',label:'Not reviewed',pieceId:'draft-hair',approved:false});
const catalog=look.createCatalog(data),pack=structuredClone(release);
for(const [slot,id]of [['hair','test-hair'],['outfit','test-outfit']]){
 const piece=structuredClone(pack.pieces.find(p=>p.slot===slot));piece.id=id;pack.pieces.push(piece);
}
const player={classId:'sword',factionId:'pirate',gold:123,equipment:{weapon:{def:0}},inventory:[{id:'kept'}],paperDollLook:{version:1,hair:'test-copper',outfit:'test-rust'}};
const before=JSON.stringify(player),options={production:true,lookCatalog:catalog};
const selected=review.appearance(pack,player,options);
assert.equal(selected.pieces.hair,'test-hair');assert.equal(selected.pieces.outfit,'test-outfit');
assert.deepEqual(selected.hidden,[],'an alternative is a different piece, not a hidden layer');
assert.equal(JSON.stringify(player),before);
const equipped=review.appearance(pack,{...player,equipment:{...player.equipment,coat:{def:6}}},options);
assert.equal(equipped.pieces.outfit,'complete-outfit','real torso equipment wins');
assert.equal(equipped.pieces.hair,'test-hair');
assert.equal(catalog.valid({...player.paperDollLook,hair:'draft'}),false);
assert(!Object.hasOwn(catalog.choices.hair,'draft'));
const fields=catalog.fields('creation-look',player.paperDollLook);
assert(fields.includes('data-creation-look="hair"'));assert(fields.includes('value="test-copper" selected'));
assert(fields.includes('Copper &lt;hair&gt;'));assert(!fields.includes('Not reviewed'));
assert(catalog.render(player,player.paperDollLook).includes('value="test-rust" selected'));
assert.deepEqual(catalog.read(JSON.parse(before)),player.paperDollLook);
const applied=catalog.apply(player,{...player.paperDollLook,gold:999},{production:true});
assert.equal(applied.gold,123);assert.equal(applied.equipment,player.equipment);assert.equal(applied.inventory,player.inventory);
assert.deepEqual(Object.keys(applied.paperDollLook).sort(),['hair','outfit','version']);
assert.deepEqual(catalog.read({}),{version:1,hair:'short-black',outfit:'navy'});
for(const damage of [p=>delete p.animations.walk,p=>p.animations.walk.directions.pop(),p=>p.animations.walk.directions.push('diagonal'),p=>p.approved=false,p=>p.rigId='other',p=>p.animations.idle.frames=1,p=>p.animations.walk.fps=2]){
 const broken=structuredClone(pack);damage(broken.pieces.find(p=>p.id==='test-hair'));
 const fallback=review.appearance(broken,player,options);
 assert.equal(fallback.pieces.hair,'complete-hair');assert.equal(fallback.pieces.outfit,'test-outfit');
 assert(fallback.cosmeticFallbacks.some(x=>x.id==='test-copper'));
 assert.equal(catalog.read(player).hair,'test-copper','an unavailable image must not erase the saved choice');
}
const missing=structuredClone(pack);missing.pieces=missing.pieces.filter(p=>p.id!=='test-outfit');
assert.equal(review.appearance(missing,player,options).pieces.outfit,'complete-outfit');
assert.equal(review.appearance(pack,{...player,zoanTransformed:true},options),null);
const duplicate=structuredClone(data);duplicate.groups.hair.options.push({...duplicate.groups.hair.options[0]});
assert.throws(()=>look.createCatalog(duplicate),/catalog/i);
assert.throws(()=>look.createCatalog({...data,defaults:{...data.defaults,hair:'missing'}}),/catalog/i);
assert.equal(catalog.valid({...player.paperDollLook,hair:'../draft.png'}),false);
assert.equal(look.valid(player.paperDollLook),false,'test alternatives must never leak into the production catalog');
console.log('Appearance catalog: data-driven IDs, v1 persistence, equipment priority, full-clip fallback and safe selectors passed.');
