'use strict';
// Regression: authentic createGame saves, not a hand-picked renderer fixture.
// The hook only exposes detached snapshots. No equipment, appearance or pose overrides.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const url = process.env.MARE_TEST_URL || 'http://127.0.0.1:8157/dist/';
const out = process.env.MARE_EVIDENCE_DIR || 'artifacts/rework-default-game';
const scale = 105 / 374;
const expectedAppearance = { gender: 'masculino', hairStyle: 'original', hairColor: 'black', eyeStyle: 'original', eyeColor: 'blue', skinColor: 'light' };

(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  const evidence = [];
  try {
    for (const [classId, weapon] of [['sword', 0], ['gunner', 4], ['brawler', 2]]) {
      const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/api/akuma/catalog', route => route.fulfill({ status: 404, body: '{}' }));
      await page.route('**/__dev_version', route => route.fulfill({ body: 'stable' }));
      await page.route('**/game.js*', async route => {
        const response = await route.fetch();
        const source = await response.text();
        const marker = '  window.__mareDiagnostics=';
        assert.ok(source.includes(marker), 'Read-only game diagnostic insertion point missing');
        const hook = `window.__reworkDefaultQA=Object.freeze({read(){return JSON.parse(JSON.stringify({identity:game?{classId:game.classId,appearance:game.appearance96,equipment:Object.fromEntries(Object.entries(game.equipment).map(([slot,item])=>[slot,item?.def??null]))}:null,snapshot:lobby96.snapshot()}));}});`;
        await route.fulfill({ response, body: source.replace(marker, hook + '\n' + marker) });
      });
      try {
        // dev selects isolated development storage; it does not opt into a renderer.
        await page.goto(new URL('?dev=1', url).href, { waitUntil: 'networkidle', timeout: 90000 });
        await page.waitForFunction(() => window.__reworkDefaultQA, null, { timeout: 60000 });
        await page.locator('#characterName').fill(`Default rework ${classId}`);
        await page.locator('#nextToClass').click();
        await page.locator(`#classStep [data-class="${classId}"]`).click();
        await page.locator('#nextToAppearance').click();
        await page.locator('#createCharacter').click();
        await page.locator('[data-confirm-accept]').click();
        await page.waitForFunction(() => window.__reworkDefaultQA.read().identity, null, { timeout: 60000 });
        const original = await page.evaluate(() => window.__reworkDefaultQA.read().identity);
        assert.equal(original.classId, classId);
        assert.equal(original.equipment.weapon, weapon, 'Real starter weapon must be retained (including item 0)');
        assert.equal(original.equipment.coat, 6, 'Do not erase the real starter coat to make a renderer pass');
        for (const [key, value] of Object.entries(expectedAppearance)) assert.equal(original.appearance[key], value, `Default appearance ${key}`);

        for (const stage of ['created', 'reloaded', 'narrow']) {
          if (stage === 'reloaded') await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
          if (stage === 'narrow') await page.setViewportSize({ width: 390, height: 844 });
          const handle = await page.waitForFunction(() => {
            const result = window.__reworkDefaultQA?.read();
            const snapshot = result?.snapshot;
            if (!['native-hd', 'rework-default-hd'].includes(snapshot?.renderer)) return false;
            const active = snapshot.renderer === 'native-hd' ? snapshot.nativeHD : snapshot.defaultHD;
            return active?.last?.state === 'rendered' && active.last.physicalScale === 105 / 374 ? result : false;
          }, null, { timeout: 120000 });
          const state = await handle.jsonValue();
          assert.deepEqual(state.identity, original, 'Rendering/reload must not rewrite saved appearance or equipment');
          const active = state.snapshot.renderer === 'native-hd' ? state.snapshot.nativeHD : state.snapshot.defaultHD;
          assert.equal(active.last.physicalScale, scale);
          await page.screenshot({ path: path.join(out, `${classId}-${stage}.png`), fullPage: true });
          evidence.push({ classId, weapon, stage, state, errors: [...errors] });
          await fs.writeFile(path.join(out, 'runtime.json'), JSON.stringify({ url, evidence }, null, 2));
        }
        assert.deepEqual(errors, [], `${classId}: no runtime errors`);
      } catch (error) {
        const state = await page.evaluate(() => window.__reworkDefaultQA?.read()).catch(() => null);
        await fs.writeFile(path.join(out, `${classId}-failure.json`), JSON.stringify({ message: error.message, state, errors }, null, 2));
        await page.screenshot({ path: path.join(out, `${classId}-failure.png`), fullPage: true }).catch(() => {});
        throw error;
      } finally {
        await context.close();
      }
    }
    console.log(`Default rework real-save browser checks passed: ${evidence.length} captures`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
