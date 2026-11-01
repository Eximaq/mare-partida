'use strict';
// Regression: the real game draw path must not disappear while Phoenix takes damage.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const draws = [];
class FileImage {
  set src(file) {
    this.url = file;
    const png = fs.readFileSync(path.join(root, file));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    this.naturalWidth = png.readUInt32BE(16);
    this.naturalHeight = png.readUInt32BE(20);
    this.complete = true;
  }
}
const sandbox = {
  console, Image: FileImage,
  MareZoanArt: { draw() {}, attackTiming() {} },
  world: { hero: { direction: 'north' }, time: 10 }, game: { hp: 100 }, session: {},
  basicAttackPose: () => null,
  ryuSkillActive: () => false, wolfSkillActive: () => false,
  ushiSkillActive: () => false, nekoSkillActive: () => false, bisonSkillActive: () => false,
};
vm.createContext(sandbox);
vm.runInContext(read('sprite-combat-v2-data.js'), sandbox);
vm.runInContext(read('sprite-combat-v2.js'), sandbox);
const source = read('game.js');
const start = source.indexOf('  function drawUpdatedZoan(');
const end = source.indexOf('  function drawPlayerSpriteBase(', start);
assert.ok(start >= 0 && end > start, 'exercise the current production draw function');
vm.runInContext(source.slice(start, end), sandbox);
const S = sandbox.MareSpriteCombatV2;
const context = { save() {}, restore() {}, drawImage(...args) { draws.push(args); } };
const actor = sandbox.world.hero;
function drawAt(time, moving = false) {
  sandbox.world.time = time;
  draws.length = 0;
  assert.equal(sandbox.drawUpdatedZoan(context, { id: 'akuma_tori_phoenix' }, 200, 200, moving), true,
    'Phoenix must remain visible before, during and after damage');
  assert.equal(draws.length, 1);
  return draws[0];
}
assert.match(drawAt(10)[0].url, /idle-north\.png$/);
for (const direction of ['south', 'north', 'east', 'west', 'front', 'back', 'left', 'right']) {
  actor.direction = direction;
  assert.equal(S.hurt(actor, 5, 20), true);
  for (const [time, frame] of [[20, 0], [20.05, 1], [20.10, 2], [20.15, 3]]) {
    const drawn = drawAt(time);
    assert.match(drawn[0].url, /phoenix\/hurt-south\.png$/);
    assert.equal(drawn[1], frame * 132, 'all four approved frames play in original order');
    assert.equal(drawn[3], 132);
    assert.equal(drawn[0].naturalWidth, 528);
    assert.equal(actor.direction, direction, 'visual reaction must not turn the actor');
  }
  assert.equal(S.hurt(actor, 5, 20.16), false, 'another hit cannot extend the reaction');
  assert.match(drawAt(20.181, true)[0].url, /walk-(south|north|east|west)\.png$/);
}
assert.equal(sandbox.game.hp, 100, 'rendering cannot change HP');
assert.equal(S.diagnostics().length, 0);
console.log('Phoenix remains visible through four native Hurt South frames and returns to locomotion after 180ms in all eight facings.');
