const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../tools/paper-doll-96-v3');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
const layers = require('../tools/paper-doll-96-v3/layers.js');
const motion = require('../tools/paper-doll-96-v3/motion.js');
layers.validate(manifest);
const actions = ['attack-sword', 'attack-unarmed', 'attack-firearm', 'attack-daggers', 'attack-tech', 'attack-focus'];
const directions = ['south', 'north', 'west', 'east'];
const jobs = new Set();
let entries = 0;
for (const bodyName of ['masculino', 'feminino']) {
  const body = manifest.bodies[bodyName];
  for (const action of actions) for (const direction of directions) {
    const clip = body.clips[action]?.[direction];
    assert.ok(clip?.modular, `${bodyName}/${action}/${direction} missing`);
    assert.equal(clip.frames, 8);
    assert.equal(clip.fps, 12);
    assert.equal(clip.loop, false, 'attacks finish instead of becoming movement loops');
    assert.equal(clip.source.poseFrames, 8);
    assert.equal(clip.source.temporalInterpolation, false);
    assert.equal(clip.source.sourceFrames.length, 8);
    assert.ok(clip.source.sourceFrames.every(hash => /^[a-f0-9]{64}$/.test(hash)));
    jobs.add(clip.source.bodyJob);
    const spec = motion.clipSpec(manifest, clip);
    assert.equal(spec.width, 160);
    assert.equal(spec.height, 160);
    assert.equal(spec.scale, 1, 'canvas padding must not shrink the character');
    assert.deepEqual(spec.pivot, { x: 80, y: 128 });
    assert.equal(clip.headSockets.length, 8);
    for (const socket of clip.headSockets) assert.ok([socket.x, socket.y, socket.angle].every(Number.isFinite));
    for (const slot of layers.renderOrder) {
      const file = clip.layers[slot];
      assert.ok(file, `${slot} must remain independent`);
      const png = fs.readFileSync(path.join(root, file));
      assert.equal(png.readUInt32BE(16), 160 * 8, file);
      assert.equal(png.readUInt32BE(20), 160, file);
    }
    if (action === 'attack-tech') {
      const firearm = body.clips['attack-firearm'][direction];
      assert.deepEqual(clip.layers, firearm.layers, 'identical old source clips share generated assets');
      assert.equal(clip.sharedWith, 'attack-firearm');
    }
    entries++;
  }
}
assert.equal(entries, 48);
assert.equal(jobs.size, 40, 'one real animation job per distinct source clip');
assert.equal(manifest.productionEnabled, false);
const gallery = JSON.parse(fs.readFileSync(path.join(root, 'gallery-items.json')));
assert.equal(gallery.sheets.length, 100);
assert.equal(new Set(gallery.sheets.map(sheet => sheet.id)).size, 100);
assert.equal(gallery.sheets.filter(sheet => sheet.kind === 'attack').length, 80);
assert.deepEqual(gallery.attackSheet.emptyIndices, [32, 33, 34, 35]);
assert.equal(gallery.attackSheet.cell, 160);
assert.ok(gallery.attackSheet.width <= 1024 && gallery.attackSheet.height <= 1024);
console.log('96px attacks: 48 entries, 40 source animations, 8 independent layers and fixed scale passed');
