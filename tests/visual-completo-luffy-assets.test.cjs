'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const base=path.join(__dirname,'../assets/skins/visual-completo/luffy'),atlas=JSON.parse(fs.readFileSync(path.join(base,'atlas.json'),'utf8'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

test('the Luffy package contains all seven classes, 17 equipment variants and 85 complete eight-frame cycles',()=>{
 assert.deepEqual([...new Set(atlas.loadouts.map(row=>row.classId))].sort(),['brawler','cyborg','gunner','healer','rogue','strategist','sword']);
 assert.equal(atlas.loadouts.length,17);
 assert.equal(Object.keys(atlas.clips).length,85);
 assert.equal(Object.keys(atlas.sources).length,340);
 let frames=0;
 for(const [id,clip] of Object.entries(atlas.clips)){
  for(const direction of ['south','north','east','west']){
   const sequence=clip.frames[direction],details=clip.directions[direction];
   assert.equal(sequence?.length,8,`${id}/${direction}`);
   const source=atlas.sources[details.source];
   assert.ok(source);
   assert.ok(Math.abs(details.scale*details.bodyHeight-96)<1e-8);
   assert.equal(new Set(sequence.map(frame=>frame.rect.join(','))).size,8,'each frame has its own cell');
   for(const frame of sequence){
    const [x,y,w,h]=frame.rect,[ax,ay]=frame.anchor;
    assert.ok(x>=0&&y>=0&&x+w<=source.size[0]&&y+h<=source.size[1]);
    assert.ok(ax>=0&&ax<=w&&ay>=0&&ay<=h);
    frames++;
   }
  }
 }
 assert.equal(frames,2720);
 for(const loadout of atlas.loadouts)for(const action of ['idle','walk','attack','hurt'])assert.ok(atlas.clips[action+'_'+loadout.id],loadout.id+' '+action);
});

test('every shipped RGBA atlas has the reviewed dimensions and exact checksum',()=>{
 for(const source of Object.values(atlas.sources)){
  assert.match(source.file,/^atlases\/[a-z0-9_/-]+\.png$/);
  assert.ok(!source.file.includes('..'));
  const bytes=fs.readFileSync(path.join(base,source.file));
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',source.file);
  assert.equal(bytes[25],6,'RGBA: '+source.file);
  assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],source.size,source.file);
  assert.equal(hash(bytes),source.sha256,source.file);
 }
});

test('the item uses the exact portrait supplied by the user',()=>{
 const expected='dacdb2dda30e5b395579f6a1d293b0173df2411f7f82b313f8f2d602e174f4df';
 assert.equal(hash(fs.readFileSync(path.join(base,'icon.png'))),expected);
 assert.equal(require('../visual-completo.js').luffyDefinition.icon_path,'assets/skins/visual-completo/luffy/icon.png');
});
