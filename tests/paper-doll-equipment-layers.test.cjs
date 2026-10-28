'use strict';
const assert=require('node:assert/strict');
const engine=require('../paper-doll.js'),catalog=require('../paper-doll-assets.js');
require('../paper-doll-look.js');const review=require('../paper-doll-review.js');
const release=require('../pixellab-pip-generations/paper-doll-complete-20261026/player-pack.json');
for(const slot of ['pants','boots','gloves','cloak','head','eyewear','necklace','belt','ring','charm'])assert(engine.slots.includes(slot),`independent ${slot} layer`);
const pack=structuredClone(release),byGear={legs:'pants',boots:'boots',coat:'outfit',gloves:'gloves',cloak:'cloak',necklace:'necklace',belt:'belt',ring:'ring',charm:'charm'};
// Geometry-only fixtures reuse approved clip metadata in memory, never production artwork.
for(const slot of [...Object.values(byGear),'head','eyewear']){
 const p=structuredClone(pack.pieces.find(p=>p.slot==='outfit'));p.id='fixture-'+slot;p.slot=slot;delete p.zIndex;
 for(const clip of Object.values(p.animations)){delete clip.zIndex;if(slot==='cloak')clip.directionOverrides={south:{zIndex:-10},north:{zIndex:38}};}
 pack.pieces.push(p);
}
pack.bindings={weapon:pack.bindings.weapon};
const equipment={weapon:{def:0}};let def=200;
for(const [gear,slot]of Object.entries(byGear)){pack.bindings[gear]={slot,items:{[def]:'fixture-'+slot}};equipment[gear]={def:def++};}
pack.bindings.head={slot:'head',items:{[def]:{layers:{head:'fixture-head',eyewear:'fixture-eyewear'}}}};equipment.head={def};
const player={classId:'sword',factionId:'pirate',equipment,inventory:[{id:'kept'}],paperDollLook:{version:1,hair:'short-black',outfit:'navy'},gold:500},before=JSON.stringify(player);
const appearance=review.appearance(pack,player,{production:true});
for(const slot of [...Object.values(byGear),'head','eyewear'])assert.equal(appearance.pieces[slot],'fixture-'+slot);
assert.equal(appearance.pieces.body,'complete-body');assert.equal(appearance.pieces.hair,'complete-hair');assert.deepEqual(appearance.substitutions,[]);
const removed=review.appearance(pack,{...player,equipment:{...equipment,cloak:null,gloves:null,head:null}},{production:true});
for(const slot of ['cloak','gloves','head','eyewear'])assert.equal(removed.pieces[slot],undefined);
assert.equal(removed.pieces.pants,'fixture-pants');assert.equal(removed.pieces.outfit,'fixture-outfit');
const accidentalDefault=structuredClone(pack);accidentalDefault.appearance.pieces.cloak='fixture-cloak';
assert.equal(review.appearance(accidentalDefault,{...player,equipment:{...equipment,cloak:null}},{production:true}).pieces.cloak,undefined,'unequipped gear cannot leak through manifest defaults');
const brokenBundle=structuredClone(pack);brokenBundle.pieces.find(p=>p.id==='fixture-eyewear').available=false;
const bundleFallback=review.appearance(brokenBundle,player,{production:true});assert.equal(bundleFallback.pieces.head,undefined);assert.equal(bundleFallback.pieces.eyewear,undefined,'a bundled item is applied atomically');
const noArt=structuredClone(pack);noArt.pieces.find(p=>p.id==='fixture-gloves').approved=false;delete noArt.pieces.find(p=>p.id==='fixture-cloak').animations['attack-tech'];
const fallback=review.appearance(noArt,player,{production:true});assert.equal(fallback.pieces.gloves,undefined);assert.equal(fallback.pieces.cloak,undefined);assert.equal(fallback.pieces.boots,'fixture-boots');
assert(fallback.substitutions.some(x=>x.slot==='gloves'));assert(fallback.substitutions.some(x=>x.slot==='cloak'));
const wrong=structuredClone(pack);wrong.bindings.gloves={slot:'weapon',items:{[equipment.gloves.def]:'complete-sword'}};
assert.equal(review.appearance(wrong,player,{production:true}).pieces.weapon,'complete-sword','a glove binding must not replace the weapon');
const swapped=review.appearance(pack,{...player,equipment:{...equipment,boots:{def:9999}}},{production:true});assert.equal(swapped.pieces.boots,undefined);assert.equal(swapped.pieces.pants,'fixture-pants');
const alternative=structuredClone(pack.pieces.find(p=>p.id==='fixture-boots'));alternative.id='fixture-boots-alt';pack.pieces.push(alternative);pack.bindings.boots.items[350]=alternative.id;
const otherShoes=review.appearance(pack,{...player,equipment:{...equipment,boots:{def:350}}},{production:true});assert.equal(otherShoes.pieces.boots,'fixture-boots-alt');assert.equal(otherShoes.pieces.cloak,'fixture-cloak');
assert.equal(JSON.stringify(player),before);assert.deepEqual(JSON.parse(JSON.stringify(player)),player);assert.equal(review.appearance(pack,{...player,zoanTransformed:true},{production:true}),null);
const images=new Map();for(const p of pack.pieces)for(const a of Object.values(p.animations)){
 images.set(a.url,{complete:true,naturalWidth:a.kind==='rigid-attachment'?(a.source?.width||64):84*a.frames,naturalHeight:a.kind==='rigid-attachment'?(a.source?.height||64):84*a.directions.length});
 for(const s of Object.values(a.sources||{}))images.set(s.url,{complete:true,naturalWidth:s.width,naturalHeight:s.height});
}
const compositions=[],runtime=catalog.createRuntime({getImage:url=>images.get(url),validatePixels:()=>null,createCanvas:(w,h)=>({width:w,height:h,getContext:()=>({drawImage:(...args)=>compositions.push(args)})})});
runtime.registerRig(pack.rig);pack.pieces.forEach(p=>runtime.registerPiece(p));
for(const animationId of ['idle','walk','attack-sword'])for(const direction of engine.directions)for(let frameIndex=0;frameIndex<pack.rig.animations[animationId].frames;frameIndex++){
 const plan=runtime.resolve(appearance,{animationId,direction,frameIndex});assert(plan.valid,JSON.stringify(plan.missing));
 for(const slot of [...Object.values(byGear),'head','eyewear']){const layer=plan.layers.find(l=>l.slot===slot);assert.equal(layer.frameIndex,frameIndex);assert.equal(layer.pivotX,42);assert.equal(layer.pivotY,65);}
 assert(plan.layers.find(l=>l.slot==='head').zIndex>plan.layers.find(l=>l.slot==='hair').zIndex,'a fitted hat must cover the existing approved hair');
 assert(plan.layers.find(l=>l.slot==='eyewear').zIndex>plan.layers.find(l=>l.slot==='head').zIndex,'lenses sit in front of headgear by default');
 assert.equal(plan.layers.find(l=>l.slot==='cloak').zIndex,direction==='north'?38:-10);
}
const pose={animationId:'idle',direction:'south',frameIndex:0},out={save(){},restore(){},drawImage(){}};
assert(runtime.draw(out,appearance,pose,10,10));const count=runtime.stats().compositions;assert(runtime.draw(out,appearance,pose,10,10));assert.equal(runtime.stats().compositions,count);
assert(runtime.draw(out,removed,pose,10,10));assert.equal(runtime.stats().compositions,count+1,'equipment removal invalidates composition cache');
assert(runtime.draw(out,otherShoes,pose,10,10));assert.equal(runtime.stats().compositions,count+2,'a different item selects and caches a different visual piece');
assert.equal(out.imageSmoothingEnabled,false);
console.log('Equipment layers: simultaneous pieces, per-item bundles, removal, whole-piece fallback, depth, synchronized frames, cache and immutable saves passed.');
