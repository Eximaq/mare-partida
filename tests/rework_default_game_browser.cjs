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
        const hook = `let __lastRealWorldDraw=null,__realWorldDraws=0;const __observeWorldDraw=lobby96.draw.bind(lobby96);lobby96.draw=function(c,p,o){const result=__observeWorldDraw(c,p,o);if(o.consumer==='world'&&c.canvas.id==='worldCanvas'){const snapshot=lobby96.snapshot();__lastRealWorldDraw={count:++__realWorldDraws,at:performance.now(),returned:result,action:o.action,direction:o.direction,scene:o.scene,viewport:[innerWidth,innerHeight],canvas:[c.canvas.width,c.canvas.height],snapshot};}return result;};window.__reworkDefaultQA=Object.freeze({read(){return JSON.parse(JSON.stringify({identity:game?{classId:game.classId,appearance:game.appearance96,equipment:game.equipment,equippedIds:Object.fromEntries(Object.entries(game.equipment).map(([slot,item])=>[slot,item?.def??null]))}:null,snapshot:lobby96.snapshot(),worldDraw:__lastRealWorldDraw}));}});`;
        await route.fulfill({ response, body: source.replace(marker, hook + '\n' + marker) });
      });
      try {
        // A new browser context isolates storage; no DEV or renderer opt-in is needed.
        await page.goto(new URL(url).href, { waitUntil: 'networkidle', timeout: 90000 });
        await page.waitForFunction(() => window.__reworkDefaultQA, null, { timeout: 60000 });
        // New characters accept 3–12 graphemes; an invalid fixture cannot leave step 1.
        await page.locator('#characterName').fill(`QA ${classId}`);
        await page.locator('#factionStep [data-faction="pirate"]').click();
        assert.equal(await page.locator('#characterName').getAttribute('aria-invalid'), 'false', 'Fixture name must be accepted by the real creation validator');
        assert.equal(await page.locator('#creationError').textContent(), '', 'Creation must not be blocked by invalid input');
        await page.locator('#nextToClass').click();
        await page.locator(`#classStep [data-class="${classId}"]`).click();
        await page.locator('#nextToAppearance').click();
        await page.locator('#createCharacter').click();
        await page.locator('[data-confirm-accept]').click();
        await page.waitForFunction(() => window.__reworkDefaultQA.read().identity, null, { timeout: 60000 });
        const original = await page.evaluate(() => window.__reworkDefaultQA.read().identity);
        assert.equal(original.classId, classId);
        assert.equal(original.equippedIds.weapon, weapon, 'Real starter weapon must be retained (including item 0)');
        assert.equal(original.equippedIds.coat, 6, 'Do not erase the real starter coat to make a renderer pass');
        for (const [key, value] of Object.entries(expectedAppearance)) assert.equal(original.appearance[key], value, `Default appearance ${key}`);

        for (const stage of ['created', 'reloaded', 'narrow']) {
          if (stage === 'reloaded') await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
          if (stage === 'narrow') await page.setViewportSize({ width: 390, height: 844 });
          const stageStarted=await page.evaluate(()=>performance.now());
          const handle = await page.waitForFunction(stageStarted => {
            const result = window.__reworkDefaultQA?.read();
            const draw=result?.worldDraw;
            if(!draw?.returned||draw.at<stageStarted||draw.viewport[0]!==innerWidth||draw.viewport[1]!==innerHeight)return false;
            const snapshot = draw.snapshot;
            if (!['native-hd', 'rework-default-hd'].includes(snapshot?.renderer)) return false;
            const active = snapshot.renderer === 'native-hd' ? snapshot.nativeHD : snapshot.defaultHD;
            return active?.last?.state === 'rendered' && active.last.physicalScale === 105 / 374 && active.last.consumer==='world' && active.last.direction===MarePaperDoll96Lobby.directionOf(draw.direction) ? result : false;
          }, stageStarted, { timeout: 120000 });
          const state = await handle.jsonValue();
          assert.deepEqual(state.identity, original, 'Rendering/reload must not rewrite saved appearance or equipment');
          const worldSnapshot=state.worldDraw.snapshot;
          const active = worldSnapshot.renderer === 'native-hd' ? worldSnapshot.nativeHD : worldSnapshot.defaultHD;
          assert.equal(active.last.physicalScale, scale);
          assert.equal(active.last.sourceScale,1,'native pixels stay intact');
          assert.equal(active.last.consumer,'world','a portrait cannot satisfy world replacement');
          assert(await page.locator('#worldCanvas').isVisible(),'actual game canvas is visible');
          await page.screenshot({ path: path.join(out, `${classId}-${stage}.png`), fullPage: true });
          await page.locator('#worldCanvas').screenshot({path:path.join(out,`${classId}-${stage}-world.png`)});
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
