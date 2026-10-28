const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const origin = process.argv.find(value => /^https?:\/\//.test(value)) || 'http://127.0.0.1:8154/';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(new URL('tools/paper-doll-96-v3/', origin).href);
    assert.equal(response.status(), 200);
    await page.waitForFunction(() => window.__review96v3);
    const audit = await page.evaluate(() => {
      const q = window.__review96v3, size = q.manifest.frame;
      const canvas = () => Object.assign(document.createElement('canvas'), size);
      const results = [];
      for (const [bodyName, body] of Object.entries(q.manifest.bodies)) for (const [direction, pieces] of Object.entries(body.layers)) {
        const expected = canvas(), actual = canvas();
        expected.getContext('2d').drawImage(q.loaded.get(body.references[direction]), 0, 0);
        MareLayers96.draw(actual.getContext('2d'), q.loaded, pieces, 0, size);
        const a = actual.getContext('2d').getImageData(0, 0, 128, 128).data;
        const b = expected.getContext('2d').getImageData(0, 0, 128, 128).data;
        let max = 0, changed = 0;
        for (let i = 0; i < a.length; i += 4) {
          // Compare premultiplied colour; low-alpha decoding has unstable RGB.
          const diff = Math.max(Math.abs(a[i + 3] - b[i + 3]), ...[0, 1, 2].map(c => Math.abs(a[i + c] * a[i + 3] / 255 - b[i + c] * b[i + 3] / 255)));
          max = Math.max(max, diff); if (diff > 2) changed++;
        }
        let toggles = 0;
        for (const slot of ['hair', 'face', 'pants', 'top']) {
          const isolated = q.loaded.get(pieces[slot]), ic = canvas(); ic.getContext('2d').drawImage(isolated, 0, 0);
          const pixels = ic.getContext('2d').getImageData(0, 0, 128, 128).data;
          if (![...pixels].some((n, i) => i % 4 === 3 && n > 100)) continue;
          const hidden = canvas(); MareLayers96.draw(hidden.getContext('2d'), q.loaded, pieces, 0, size, [slot]);
          const h = hidden.getContext('2d').getImageData(0, 0, 128, 128).data;
          if (h.some((v, i) => Math.abs(v - a[i]) > 10)) toggles++;
        }
        results.push({ bodyName, direction, max, changed, toggles });
      }
      const clips = [];
      for (const [bodyName, body] of Object.entries(q.manifest.bodies)) for (const [action, directions] of Object.entries(body.clips)) for (const [direction, clip] of Object.entries(directions)) {
        if (!clip.modular) continue;
        const digests = new Set(); let edgePixels = 0;
        for (let f = 0; f < clip.frames; f++) {
          const c = canvas(); MareLayers96.draw(c.getContext('2d'), q.loaded, clip.layers, f, size);
          const d = c.getContext('2d').getImageData(0, 0, 128, 128).data;
          for (let n = 0; n < 128; n++) for (const p of [n, n * 128, n * 128 + 127, 127 * 128 + n]) if (d[p * 4 + 3] > 100) edgePixels++;
          digests.add(c.toDataURL());
        }
        clips.push({ bodyName, action, direction, frames: clip.frames, unique: digests.size, edgePixels });
      }
      return { results, clips, storage: localStorage.length, disabled: q.manifest.productionEnabled === false };
    });
    assert.equal(audit.results.length, 8);
    assert.ok(audit.disabled);
    assert.equal(audit.storage, 0);
    for (const result of audit.results) {
      assert.equal(result.changed, 0, JSON.stringify(result));
      assert.ok(result.toggles >= (result.direction === 'north' ? 2 : 3), JSON.stringify(result));
    }
    for (const clip of audit.clips) { assert.equal(clip.frames, 8); assert.ok(clip.unique >= 6); assert.equal(clip.edgePixels, 0); }
    for (const body of ['feminino', 'masculino']) for (const direction of ['south', 'north', 'west', 'east']) {
      await page.selectOption('#body', body); await page.selectOption('#direction', direction);
      for (const layer of ['hair', 'face', 'pants', 'top']) { await page.uncheck(`[data-layer="${layer}"]`); await page.check(`[data-layer="${layer}"]`); }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    if (process.env.MARE_EVIDENCE_DIR) await page.screenshot({ path: process.env.MARE_EVIDENCE_DIR + '/96-v3-mobile.png', fullPage: true });
    console.log(JSON.stringify(audit));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
