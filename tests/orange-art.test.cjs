'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),manifest=require('../assets/orange-town/manifest.json');
function png(url){
  assert(!url.startsWith('/')&&!url.includes('..'),'relative public asset');
  const file=path.join(root,url),bytes=fs.readFileSync(file);
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  return [bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
}
assert.equal(manifest.ready,true);
assert.deepEqual(png(manifest.street.url),[64,64]);
assert.deepEqual(png(manifest.buildings.url),[256,256]);assert.equal(manifest.buildings.cell_size,128);
const ids=Object.values(require('../orange-world.js').skins).map(s=>s.id);
assert.deepEqual(Object.keys(manifest.monsters).sort(),ids.sort());
for(const [id,m] of Object.entries(manifest.monsters)){
  assert.deepEqual(m.directions,['south','north','west','east']);assert.equal(m.render_scale,1.5);
  for(const [action,a] of Object.entries(m.animations)){
    assert.deepEqual(png(a.url),[a.frame_width*a.frames,a.frame_height*4]);
    assert.equal(a.frames,action==='idle'?1:9);
    assert.equal(a.frame_width,action==='idle'?48:id==='awning-raider'?64:68);
    assert.equal(a.frame_height,a.frame_width);
    assert(a.anchor[0]>0&&a.anchor[0]<a.frame_width&&a.anchor[1]>0&&a.anchor[1]<a.frame_height);
  }
  assert.deepEqual(png('assets/orange-town/'+id+'-portrait.png'),[48,48]);
}
console.log('Orange art: complete roster, native poses, all nine walking frames, anchors and relative PNG sources passed.');
