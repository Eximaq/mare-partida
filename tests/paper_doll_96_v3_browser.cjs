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
    const audit = await page.evaluate(async () => {
      const q = window.__review96v3, size = q.manifest.frame;
      const canvas = () => Object.assign(document.createElement('canvas'), size);
      const results = [];
      const fitTemplate=await(await fetch(new URL(q.catalog.template,location.href))).json();
      for (const [bodyName, body] of Object.entries(q.manifest.bodies)) for (const [direction, pieces] of Object.entries(body.layers)) {
        await q.render(bodyName, 'static', direction);
        const expected = canvas(), actual = canvas();
        const referenceDirection=q.catalog.canonicalMirror?.allLayers&&direction==='west'?'east':direction;
        const ec=expected.getContext('2d');if(referenceDirection!==direction)ec.setTransform(-1,0,0,1,129,0);
        ec.drawImage(await q.image(body.references[referenceDirection]),0,0);ec.resetTransform();
        const staticImages=new Map(await Promise.all(Object.values(pieces).map(async f=>[f,await q.image(f)])));
        MareLayers96.draw(actual.getContext('2d'),staticImages,pieces,0,size);
        const a = actual.getContext('2d').getImageData(0, 0, 128, 128).data;
        const b = expected.getContext('2d').getImageData(0, 0, 128, 128).data;
        let max = 0, changed = 0;
        const edgeChanges=fitTemplate.referenceNormalization.boundaryCorrections[bodyName][referenceDirection].map(p=>referenceDirection!==direction?{...p,x:128-p.x}:p);
        const edges=new Map(edgeChanges.map(p=>[p.y*128+p.x,p]));
        for (let i = 0; i < a.length; i += 4) {
          const p=i/4,edge=edges.get(p),referenceAlpha=b[i+3];
          if(edge&&edge.referenceAlpha!==referenceAlpha)throw Error('Reference boundary source changed');
          const alpha=edge?edge.normalizedAlpha:(referenceAlpha>=128?255:0);
          let diff=Math.abs(a[i+3]-alpha);
          if(alpha&&a[i+3]&&!edge)diff=Math.max(diff,...[0,1,2].map(c=>Math.abs(a[i+c]-b[i+c])));
          max=Math.max(max,diff);if(diff>2)changed++;
        }
        let toggles = 0;
        for (const slot of ['hair', 'face', 'pants', 'top']) {
          const isolated = staticImages.get(pieces[slot]), ic = canvas(); ic.getContext('2d').drawImage(isolated, 0, 0);
          const pixels = ic.getContext('2d').getImageData(0, 0, 128, 128).data;
          if (![...pixels].some((n, i) => i % 4 === 3 && n > 100)) continue;
          const hidden = canvas(); MareLayers96.draw(hidden.getContext('2d'),staticImages,pieces,0,size,[slot]);
          const h = hidden.getContext('2d').getImageData(0, 0, 128, 128).data;
          if (h.some((v, i) => Math.abs(v - a[i]) > 10)) toggles++;
        }
        results.push({ bodyName, direction, max, changed, toggles, normalizedBoundary:edgeChanges.length,referenceDirection });
      }
      const clips = [];
      for (const [bodyName, body] of Object.entries(q.manifest.bodies)) for (const [action, directions] of Object.entries(body.clips)) for (const [direction, clip] of Object.entries(directions)) {
        if (!clip.modular) continue;
        const digests = new Set(); let edgePixels = 0;
        for (let f = 0; f < clip.frames; f++) {
          const c = await q.render(bodyName, action, direction, f);
          const w = c.width, h = c.height;
          const d = c.getContext('2d').getImageData(0, 0, w, h).data;
          for (let n = 0; n < Math.max(w,h); n++) for (const p of [n < w ? n : -1, n < h ? n * w : -1, n < h ? n * w + w - 1 : -1, n < w ? (h - 1) * w + n : -1]) if (p >= 0 && d[p * 4 + 3] > 100) edgePixels++;
          digests.add(c.toDataURL());
        }
        clips.push({ bodyName, action, direction, frames: clip.frames, unique: digests.size, edgePixels });
      }
      return { results, clips, cacheSize: q.cacheSize, imageCacheSize: q.imageCacheSize, storage: localStorage.length, disabled: q.manifest.productionEnabled === false };
    });
    assert.equal(audit.results.length, 8);
    assert.ok(audit.disabled);
    assert.ok(audit.cacheSize <= 64);
    assert.ok(audit.imageCacheSize <= 32);
    assert.equal(audit.storage, 0);
    for (const result of audit.results) {
      assert.equal(result.changed, 0, JSON.stringify(result));
      assert.ok(result.toggles >= (result.direction === 'north' ? 2 : 3), JSON.stringify(result));
    }
    for (const clip of audit.clips) { assert.equal(clip.frames, clip.action === 'idle' ? 4 : 8); assert.ok(clip.unique >= (clip.action === 'idle' ? 3 : 6)); assert.equal(clip.edgePixels, 0); }
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
