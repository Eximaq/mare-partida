const assert = require('node:assert/strict');
const { buildFrame } = require('../tools/paper_doll_96_attack_assembly.cjs');
const { renderOrder } = require('../tools/paper-doll-96-v3/layers.js');
const size = 160, raw = new Uint8ClampedArray(size * size * 4);
const pixel = (x, y, colour) => raw.set(colour, (y * size + x) * 4);
const skin = [220, 145, 80, 255];
for (let y = 65; y < 120; y++) for (let x = 74; x < 87; x++) pixel(x, y, skin);
for (let y = 72; y < 78; y++) for (let x = 84; x < 103; x++) pixel(x, y, skin);
for (let x = 103; x < 133; x++) pixel(x, 74, [150, 150, 155, 255]);
pixel(140, 75, [255, 190, 65, 255]); // unrequested muzzle flash
pixel(137, 72, [45, 25, 20, 255]); // disconnected item fragment
const joint = (label, x, y) => ({ label, x: (x - 16) / 128, y: (y - 16) / 128, z_index: 0 });
const pose = [joint('NOSE', 80, 43), joint('NECK', 80, 65),
  joint('LEFT HIP', 77, 88), joint('RIGHT HIP', 83, 88),
  joint('LEFT ELBOW', 86, 75), joint('LEFT ARM', 100, 75),
  joint('RIGHT ELBOW', 84, 76), joint('RIGHT ARM', 99, 76)];
const reference = Object.fromEntries(['body', 'face', 'hair', 'pants', 'top'].map(role => [role, new Uint8ClampedArray(128 * 128 * 4)]));
const recipe = { size, padding: 16, body: 'masculino', action: 'attack-firearm', direction: 'east',
  targetRest128: pose, rawPoses128: [pose], headSockets: [{ x: 0, y: 0, angle: 0 }], generatedHeadMode: 'socket' };
const snapshot = new Uint8ClampedArray(raw);
const { parts } = buildFrame(raw, reference, recipe, 0);
assert.deepEqual(raw, snapshot, 'assembly preserves the generated source');
assert.deepEqual(Object.keys(parts).sort(), [...renderOrder].sort());
for (const role of renderOrder) assert.equal(parts[role].length, size * size * 4);
assert.equal(parts.body[(75 * size + 98) * 4 + 3], 255, 'hand remains');
assert.equal(parts.body[(90 * size + 80) * 4 + 3], 255, 'torso remains');
for (const [x, y] of [[120, 74], [140, 75], [137, 72]]) for (const role of ['body', 'foreground', 'underArms']) {
  assert.equal(parts[role][(y * size + x) * 4 + 3], 0, `unrequested item removed from ${role}`);
}
console.log('96px assembly: independent parts, source preservation, hand protection and item cleanup passed');
