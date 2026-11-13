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
        const hook = `let __lastRealWorldDraw=null,__realWorldDraws=0;const __observeWorldDraw=lobby96.draw.bind(lobby96);lobby96.draw=function(c,p,o){const result=__observeWorldDraw(c,p,o);if(o.consumer==='world'&&c.canvas.id==='worldCanvas'){const snapshot=lobby96.snapshot();__lastRealWorldDraw={count:++__realWorldDraws,at:performance.now(),returned:result,action:o.action,direction:o.direction,scene:o.scene,viewport:[innerWidth,innerHeight],canvas:[c.canvas.width,c.canvas.height],snapshot,heroScreen:camera.worldToScreen(world.hero.x,world.hero.y),camera:{x:camera.x,y:camera.y,width:camera.width,height:camera.height,masked:camera.masked}};}return result;};window.__reworkDefaultQA=Object.freeze({read(){return JSON.parse(JSON.stringify({identity:game?{classId:game.classId,appearance:game.appearance96,equipment:game.equipment,equippedIds:Object.fromEntries(Object.entries(game.equipment).map(([slot,item])=>[slot,item?.def??null]))}:null,snapshot:lobby96.snapshot(),worldDraw:__lastRealWorldDraw}));}});`;
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
          if (stage === 'narrow') {
            await page.setViewportSize({ width: 390, height: 844 });
            // ResizeObserver can clear the backing store after a successful draw.
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          }
          const stageStarted=await page.evaluate(()=>performance.now());
          const handle = await page.waitForFunction(stageStarted => {
            const result = window.__reworkDefaultQA?.read();
            const draw=result?.worldDraw;
            if(!draw?.returned||draw.at<stageStarted||draw.viewport[0]!==innerWidth||draw.viewport[1]!==innerHeight)return false;
            const snapshot = draw.snapshot;
            if(snapshot?.renderer==='native96')return snapshot.worldVisual?.state==='ready'&&snapshot.worldVisual.preparedAt<=draw.at&&snapshot.lastPose?.consumer==='world'&&snapshot.lastPose.direction===MarePaperDoll96Lobby.directionOf(draw.direction)&&snapshot.lastPose.weaponIds?.includes(result.identity.equippedIds.weapon)?result:false;
            if (!['native-hd', 'rework-default-hd'].includes(snapshot?.renderer)) return false;
            const active = snapshot.renderer === 'native-hd' ? snapshot.nativeHD : snapshot.defaultHD;
            return active?.last?.state === 'rendered' && active.last.physicalScale === 105 / 374 && active.last.consumer==='world' && active.last.direction===MarePaperDoll96Lobby.directionOf(draw.direction) ? result : false;
          }, stageStarted, { timeout: 120000 });
          const state = await handle.jsonValue();
          assert.deepEqual(state.identity, original, 'Rendering/reload must not rewrite saved appearance or equipment');
          const worldSnapshot=state.worldDraw.snapshot;
          const active = worldSnapshot.renderer === 'native-hd' ? worldSnapshot.nativeHD : worldSnapshot.defaultHD;
          if(worldSnapshot.renderer==='native96'){
            assert.equal(worldSnapshot.lastPose.consumer,'world');
            assert(worldSnapshot.lastPose.weaponIds.includes(weapon));
            assert(worldSnapshot.worldVisual.coverage.every(p=>p.omitted.length===0&&p.unsupported.length===0));
          }else{
            assert.equal(active.last.physicalScale, scale);
            assert.equal(active.last.sourceScale,1,'native pixels stay intact');
            assert.equal(active.last.consumer,'world','a portrait cannot satisfy world replacement');
          }
          assert(await page.locator('#worldCanvas').isVisible(),'actual game canvas is visible');
          // A successful draw call can still be clipped, cleared by resize, or hidden
          // by presentation. Require real bitmap pixels, then inspect the screenshot
          // only where hit-testing says the world canvas is actually exposed.
          const bitmapReady = await page.waitForFunction(() => {
            const c = document.getElementById('worldCanvas');
            const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
            let bright = 0, samples = 0;
            for (let y = 4; y < c.height; y += 8) for (let x = 4; x < c.width; x += 8) {
              const i = (y * c.width + x) * 4; samples++;
              if (data[i + 3] > 0 && Math.max(data[i], data[i + 1], data[i + 2]) > 40) bright++;
            }
            return bright > samples * .05;
          }, null, {timeout: 15000}).then(() => true, () => false);
          // Keep the raw bitmap even on failure rather than losing the diagnostic.
          const pixels = await page.evaluate(() => {
            const canvas = document.getElementById('worldCanvas');
            const rect = canvas.getBoundingClientRect();
            const ctx = canvas.getContext('2d');
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            const exposed = []; let bright = 0, opaque = 0, samples = 0;
            for (let y = 4; y < canvas.height; y += 8) for (let x = 4; x < canvas.width; x += 8) {
              const i = (y * canvas.width + x) * 4; samples++;
              if (data[i + 3] > 0) opaque++;
              if (data[i + 3] > 0 && Math.max(data[i], data[i + 1], data[i + 2]) > 40) bright++;
              const sx = rect.left + x * rect.width / canvas.width, sy = rect.top + y * rect.height / canvas.height;
              if (document.elementFromPoint(sx, sy) === canvas) exposed.push([Math.floor(sx), Math.floor(sy)]);
            }
            return {samples, opaque, bright, exposed, png: canvas.toDataURL('image/png')};
          });
          await fs.writeFile(path.join(out, `${classId}-${stage}-bitmap.png`), Buffer.from(pixels.png.split(',')[1], 'base64'));
          assert(bitmapReady && pixels.opaque > pixels.samples * .5 && pixels.bright > pixels.samples * .05, 'World bitmap must contain visible map pixels, not a cleared or black canvas');
          const screenshot = await page.screenshot({ path: path.join(out, `${classId}-${stage}.png`), fullPage: true });
          const presented = await page.evaluate(async ({png, points}) => {
            const response = await fetch('data:image/png;base64,' + png);
            const bitmap = await createImageBitmap(await response.blob());
            const surface = new OffscreenCanvas(bitmap.width, bitmap.height), ctx = surface.getContext('2d');
            ctx.drawImage(bitmap, 0, 0);
            const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
            let bright = 0, samples = 0;
            for (const [x, y] of points) if (x >= 0 && y >= 0 && x < bitmap.width && y < bitmap.height) {
              const i = (y * bitmap.width + x) * 4; samples++;
              if (Math.max(data[i], data[i + 1], data[i + 2]) > 40) bright++;
            }
            bitmap.close(); return {samples, bright};
          }, {png: screenshot.toString('base64'), points: pixels.exposed});
          state.pixelProof = {samples: pixels.samples, opaque: pixels.opaque, bright: pixels.bright, exposed: presented};
          await fs.writeFile(path.join(out, `${classId}-${stage}-pixels.json`), JSON.stringify({state}, null, 2));
          assert(presented.samples > 30 && presented.bright > presented.samples * .05, 'Screenshot must show the world in exposed canvas areas, not a black mobile viewport');
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
