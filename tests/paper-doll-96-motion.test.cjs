const assert = require('node:assert/strict');
const motion = require('../tools/paper-doll-96-v3/motion.js');
const rest = [
  ['NECK', .5, .4], ['NOSE', .5, .3],
  ['LEFT SHOULDER', .6, .4], ['RIGHT SHOULDER', .4, .4],
  ['LEFT HIP', .56, .6], ['RIGHT HIP', .44, .6],
  ['LEFT KNEE', .56, .8], ['RIGHT KNEE', .44, .8]
].map(([label, x, y]) => ({ label, x, y }));
const shifted = rest.map(p => ({ ...p, x: p.x + .025, y: p.y - .0125 }));
const head = motion.headTransform(rest, shifted, 16);
assert.ok(Math.abs(head.map({ x: 64, y: 38.4 }).x - 83.2) < 1e-8);
assert.ok(Math.abs(head.map({ x: 64, y: 38.4 }).y - 52.8) < 1e-8);
assert.equal(head.angle, 0);
assert.deepEqual(motion.socketTransform({ x: 64, y: 40 }, { x: 2, y: -1, angle: 0 }, 16).map({ x: 64, y: 40 }), { x: 82, y: 55 });
const torso = motion.torsoTransform(rest, shifted, 16);
assert.ok(Math.abs(torso.map({ x: 64, y: 64 }).x - 83.2) < 1e-8);
assert.ok(Math.abs(torso.map({ x: 64, y: 64 }).y - 78.4) < 1e-8);
const src = new Uint8ClampedArray(8 * 8 * 4);
for (let y = 1; y < 7; y++) for (let x = 2; x < 6; x++) src.set([x * 20, y * 20, 80, 255], (y * 8 + x) * 4);
const quad = [{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 8 }, { x: 0, y: 8 }];
const triangles = [[0, 1, 2], [0, 2, 3]].map(ids => ids.map(i => ({ source: quad[i], target: quad[i] })));
assert.deepEqual([...motion.rasterMesh(src, 8, 8, triangles, 8, 8)], [...src], 'identity mesh is pixel exact');
const identityCloth = motion.clothMesh('pants', rest, rest, { x0: 0, y0: 0, x1: 8, y1: 8 }, 0);
assert.deepEqual([...motion.rasterMesh(src, 8, 8, identityCloth, 8, 8)], [...src], 'the neutral garment mesh does not invent or erase pixels');
const translated = triangles.map(t => t.map(v => ({ ...v, target: { x: v.target.x + 2, y: v.target.y + 1 } })));
const dst = motion.rasterMesh(src, 8, 8, translated, 12, 12);
for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) assert.deepEqual([...dst.slice(((y + 1) * 12 + x + 2) * 4, ((y + 1) * 12 + x + 2) * 4 + 4)], [...src.slice((y * 8 + x) * 4, (y * 8 + x) * 4 + 4)]);
assert.deepEqual(motion.clipSpec({ frame: { width: 128, height: 128 }, pivot: { x: 64, y: 112 }, referenceHeight: 96 }, { frame: { width: 160, height: 160 }, pivot: { x: 80, y: 128 } }), { width: 160, height: 160, pivot: { x: 80, y: 128 }, scale: 1 });
assert.throws(() => motion.rasterMesh(src, 8, 8, triangles, 0, 8));
console.log('96px motion: head/torso sockets, pixel-exact mesh and padded attack scale passed');
