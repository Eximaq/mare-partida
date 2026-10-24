'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const crypto=require('node:crypto');
const N=require('../neko-system.js'),A=require('../akuma-system.js');
assert.deepEqual(N.rules,require('../assets/akuma/neko/rules.json'));
assert.deepEqual(N.clips,require('../assets/akuma/neko/clips.json'));
for(const asset of require('../assets/akuma/neko/manifest.json').assets){
 const bytes=fs.readFileSync(require.resolve('../assets/akuma/neko/'+asset.asset));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256);
}
assert.equal(A.byId(N.rules.id).rank,'D');assert.equal(A.byId(N.rules.id).family,'zoan');
assert.equal(A.activeSkills(N.rules.id).length,2);
assert.equal(A.cooldownKey(N.rules.id,'1'),N.rules.id+':1');
for(const [f,dx,dy] of [['south',0,1],['north',0,-1],['east',1,0],['west',-1,0]]){
 assert.equal(N.backstab(dx,dy,f),true);assert.equal(N.backstab(-dx,-dy,f),false);assert.equal(N.backstab(-dy,dx,f),false);
}
assert.equal(N.backstab(0,0,'south'),false);assert.equal(N.backstab(1,0,'unknown'),false);
assert.equal(N.segmentHit({x:0,y:0},{x:200,y:0},{x:100,y:0}),true,'swept segment catches a target between frames');
assert.equal(N.segmentHit({x:0,y:0},{x:200,y:0},{x:100,y:25}),false);
const action={nextHit:0};assert.deepEqual(N.dueHits(action,0),[0]);assert.deepEqual(N.dueHits(action,165),[]);assert.deepEqual(N.dueHits(action,498),[1,2,3]);assert.deepEqual(N.dueHits(action,1000),[]);
const source=JSON.parse(fs.readFileSync(require.resolve('../assets/akuma/neko/slash-tiger.json'),'utf8'));
assert.deepEqual(N.vfx.frames,source.frames.map(f=>({...f.frame,duration:f.duration})));
assert.deepEqual(N.vfx.anchor,source.meta.anchor);assert.equal(N.vfx.duration,747);
assert.equal(N.vfxFrame(746),N.vfx.frames[8]);assert.equal(N.vfxFrame(800),N.vfx.frames[8]);assert.equal(N.vfxFrame(897),null);
for(const [action,dirs] of Object.entries(N.clips))for(const [direction,clip] of Object.entries(dirs)){
 assert.equal(clip.frames,{idle:1,walk:8,attack:6,dash:9}[action]);assert.equal(clip.feet.length,clip.frames);
 const png=fs.readFileSync(require.resolve('../'+clip.image));assert.equal(png.readUInt32BE(16),96*clip.frames);assert.equal(png.readUInt32BE(20),96);
 assert.ok(clip.feet.every(y=>y>0&&y<=96),action+direction);
}
const game=fs.readFileSync(require.resolve('../game.js'),'utf8');
const hero=game.slice(game.indexOf('  function drawTalentedHero('),game.indexOf('  function drawForegroundLayer('));
assert.ok(hero.indexOf("supaImages.shield")<hero.indexOf('drawPlayerSprite'),'retaliation draws behind the hero');
assert.ok(!game.slice(game.indexOf('  function drawWorld(')).split('    for(let f of world.fx)')[0].includes('supaImages.shield'),'shield is not redrawn above the hero');
console.log('Neko: Rank D, dual skills, backstab directions, swept collision, four distinct hits, supplied JSON, fade, all native clips and Supa depth passed');
