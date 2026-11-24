'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { gunzipSync } = require('node:zlib');
const { isDeepStrictEqual } = require('node:util');
const { weapons, gear, slots } = require('../tools/audit-hd-wardrobe-product.cjs');

// One actual hunt cycle for each requested weapon and direction. Keep the
// inventory and the character alive across successive attacks of the same class.
module.exports = async function observeBatch({ page, out, put, observeAttack, captureMapCycle }) {
  let cases;
  if (process.env.MARE_MAP_BATCH) {
    cases = JSON.parse(await fs.readFile(process.env.MARE_MAP_BATCH, 'utf8'));
  } else {
    const file = path.resolve(__dirname, '../docs/native-hd/qa-wardrobe/manopla-e-adagas-laterais/ciclos-no-mapa-114.json.gz');
    const report = JSON.parse(gunzipSync(await fs.readFile(file)));
    cases = report.rows.map(({ weapon, role, body, action, direction, ids }) => ({
      weapon, role, body, action, direction, clothing: Object.fromEntries(slots.map(s => [s, ids[s]]))
    }));
    assert.equal(cases.length, 114);
  }
  if (process.env.MARE_MAP_ROLE) cases = cases.filter(c => c.role === process.env.MARE_MAP_ROLE);
  assert(cases.length > 0, 'Empty list of map contexts');
  const keys = new Set();
  let previousRole, equipped, appearance;
  for (const { weapon, role, body, action, direction, clothing } of cases) {
    const key = [weapon, body, direction, action].join('-');
    assert(!keys.has(key), 'Duplicate context ' + key);
    keys.add(key);
    assert.equal(weapons.find(w => w.id === weapon)?.role, role);
    assert(['masculino', 'feminino'].includes(body));
    assert(['north', 'south', 'east', 'west'].includes(direction));
    assert.match(action, /^attack-[a-z]+$/);
    for (const [i, slot] of slots.entries()) assert(gear[i].includes(clothing[slot]));
    const wanted = { weapon, ...clothing };
    const proofFile = path.join(out, key + '.json');
    const imageFile = path.join(out, key + '-ciclo.png');
    const build = process.env.MARE_MAP_BUILD;
    if (build) {
      const prior = await fs.readFile(proofFile, 'utf8').catch(e => {
        if (e.code !== 'ENOENT') throw e;
      });
      if (prior) {
        const row = JSON.parse(prior);
        if (row.build === build && isDeepStrictEqual(row.ids, wanted)) {
          const image = await fs.readFile(imageFile).catch(e => {
            if (e.code !== 'ENOENT') throw e;
          });
          if (image && createHash('sha256').update(image).digest('hex') === row.sha256) continue;
        }
      }
    }
    const roleKey = role + '/' + body;
    if (previousRole !== roleKey) {
      const look = { gender: body, skinColor: 'ebony', hairColor: 'blue', eyeColor: 'green' };
      const available = [...weapons.filter(w => w.role === role).map(w => w.id), ...gear.flat()];
      await page.evaluate(({ role, available, look }) => __hdSlotQA.seedWardrobe(role, available, look),
        { role, available, look });
      equipped = {};
      previousRole = roleKey;
      appearance = await page.evaluate(() => __hdSlotQA.read().appearance);
    }
    for (const [slot, id] of Object.entries(wanted)) {
      if (equipped[slot] !== id) await put(id);
    }
    const drawn = await observeAttack(action, key, direction, wanted, false);
    const route = drawn.visual.coverage[0];
    assert.deepEqual(route.omitted, []);
    assert.deepEqual(route.unsupported, []);
    assert(Number.isInteger(route.frames) && route.frames > 0, key);
    await captureMapCycle(action, wanted, key, route.frames, direction, true);
    assert.deepEqual(await page.evaluate(() => __hdSlotQA.read().appearance), appearance);
    const image = await fs.readFile(imageFile);
    assert.equal(image.readUInt32BE(16), route.frames * 160);
    const proof = { weapon, role, body, action, direction, build, frames: route.frames, ids: wanted,
      sources: route.slotRoutes, sha256: createHash('sha256').update(image).digest('hex') };
    await fs.writeFile(proofFile + '.tmp', JSON.stringify(proof) + '\n');
    await fs.rename(proofFile + '.tmp', proofFile);
    equipped = wanted;
  }
};
