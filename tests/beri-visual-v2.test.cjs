'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
const section = source.slice(source.indexOf('  function drawFruitFrame('), source.indexOf('  function captureBeriSprite('));
const separation = source.slice(source.indexOf('  function drawBeriSeparation('), source.indexOf('  const pendingFruitRegistrations='));
function harness() {
  const meta = {
    kuku: { skill_columns: 3, skill_frames: 9 },
    akuma_beri_beri: { skill_columns: 6, skill_frames: 36, skill_frame_size: 192, skill_render_size: 192, skill_anchor_x: .5, skill_anchor_y: .75, skill_fps: 24 }
  };
  const sheets = { kuku: { complete: true, naturalWidth: 144, naturalHeight: 144 }, akuma_beri_beri: { complete: true, naturalWidth: 1152, naturalHeight: 1152 } };
  const calls = [];
  const context = () => ({ save() {}, restore() {}, drawImage(...args) { calls.push(args.slice(1)); } });
  const world = context();
  const sandbox = { MareAkuma: { byId: id => meta[id] }, fruitSkillSheets: sheets, FRUIT_VFX_FPS: 12, ctx: world, session: { beriSpheres: null } };
  vm.createContext(sandbox);
  vm.runInContext(section + '\n' + separation, sandbox);
  return { sandbox, sheets, calls, world, portrait: context() };
}
test('legacy 48px sheets retain source cells and destination anchor', () => {
  const h = harness();
  assert.equal(h.sandbox.drawFruitFrame(h.world, 100, 200, 'kuku', 4, 2), true);
  assert.deepEqual(h.calls.pop(), [48, 48, 48, 48, 52, 104, 96, 96]);
});
test('Beri uses a 192px cell and the world feet anchor', () => {
  const h = harness();
  assert.equal(h.sandbox.drawFruitFrame(h.world, 100, 200, 'akuma_beri_beri', 35), true);
  assert.deepEqual(h.calls.pop(), [960, 960, 192, 192, 4, 56, 192, 192]);
});
test('Beri plays 24fps while legacy fruit remains at 12fps', () => {
  const h = harness();
  h.sandbox.drawFruitBurst(h.world, 100, 200, 'akuma_beri_beri', .5);
  assert.deepEqual(h.calls.pop().slice(0, 4), [0, 384, 192, 192]);
  h.sandbox.drawFruitBurst(h.world, 100, 200, 'kuku', .5);
  assert.deepEqual(h.calls.pop().slice(0, 4), [0, 96, 48, 48]);
});
test('Beri clamps to first and last frames', () => {
  const h = harness();
  h.sandbox.drawFruitBurst(h.world, 100, 200, 'akuma_beri_beri', -1);
  assert.deepEqual(h.calls.pop().slice(0, 4), [0, 0, 192, 192]);
  h.sandbox.drawFruitBurst(h.world, 100, 200, 'akuma_beri_beri', 2);
  assert.deepEqual(h.calls.pop().slice(0, 4), [960, 960, 192, 192]);
});
test('missing or undersized sheets leave the existing fallback available', () => {
  const h = harness();
  h.sheets.akuma_beri_beri.complete = false;
  assert.equal(h.sandbox.drawFruitFrame(h.world, 100, 200, 'akuma_beri_beri', 0), false);
  h.sheets.akuma_beri_beri.complete = true;
  h.sheets.akuma_beri_beri.naturalWidth = 1151;
  assert.equal(h.sandbox.drawFruitFrame(h.world, 100, 200, 'akuma_beri_beri', 0), false);
  assert.equal(h.calls.length, 0);
});
test('portrait uses its original 48px bounds rather than world VFX size', () => {
  const h = harness();
  h.sandbox.drawBeriSeparation(h.portrait, 36, 70, .5, 64 / 48);
  assert.deepEqual(h.calls.pop().slice(4), [4, 6, 64, 64]);
  h.sandbox.drawBeriSeparation(h.world, 100, 200, .5);
  assert.deepEqual(h.calls.pop().slice(4), [4, 56, 192, 192]);
});
