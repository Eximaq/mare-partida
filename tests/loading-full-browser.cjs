// Exercise the deployed package under a project subpath with real network and cache storage.
const assert = require('node:assert/strict');
const {createServer} = require('node:http');
const {createReadStream} = require('node:fs');
const {readFile, stat} = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');

async function main() {
  const root = path.resolve(process.argv[2] || 'dist');
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  const index = html.match(/data-game-content="(game-content-[a-f0-9]{24}\.json)"/)?.[1];
  assert(index, 'the entry must name an installation catalog');
  const manifest = JSON.parse(await readFile(path.join(root, index), 'utf8'));
  const units = new Set(manifest.units.map(unit => unit[0]));
  const patches = Object.values(manifest.patches || {});
  assert(patches.length, 'full build should reuse shared HD frames');
  for (const [rel] of patches) units.add(rel);
  let received = 0, corruptPatch = null;
  let interrupt = true, transfers = 0, networkDisabled = false;
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const rel = decodeURIComponent(url.pathname.slice('/demo/'.length)) || 'index.html';
    const file = path.resolve(root, rel);
    if (!url.pathname.startsWith('/demo/') || !file.startsWith(root + path.sep)) { res.writeHead(404).end(); return; }
    if (units.has(rel) && url.searchParams.has('install')) {
      transfers++;
      if (interrupt && rel === manifest.units.at(-1)[0]) { interrupt = false; res.writeHead(503).end(); return; }
    }
    if (networkDisabled && manifest.files[rel]) { res.writeHead(503).end(); return; }
    try {
      const info = await stat(file);
      const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
      if (units.has(rel) && url.searchParams.has('install')) received += info.size;
      res.writeHead(200, {'Content-Type':types[path.extname(rel)] || 'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-store'});
      if (rel === corruptPatch) {
        const bytes = await readFile(file);
        bytes[0] ^= 255;
        res.end(bytes);
      } else createReadStream(file).pipe(res);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH});
  try {
    const page = await browser.newPage();
    page.on('pageerror', e => console.error(e.message));
    const url = 'http://127.0.0.1:' + server.address().port + '/demo/';
    const session = await page.context().newCDPSession(page);
    await session.send('Storage.overrideQuotaForOrigin',{origin:new URL(url).origin, quotaSize: 2 * 1024 ** 3});
    const start = Date.now();
    await page.goto(url);
    const loading = page.locator('#gameLoading');
    const retry = loading.getByRole('button');
    await retry.waitFor({timeout: 240000});
    assert(await page.locator('#app').evaluate(el => el.inert));
    assert(Number(await loading.locator('progress').getAttribute('value')) < 100);
    const before = transfers;
    await retry.click();
    await loading.waitFor({state:'hidden',timeout:90000});
    assert(transfers - before < 12, 'retry must reuse completed units');
    assert.equal(await loading.locator('output').textContent(),'100%');
    const fullBytes = manifest.units.reduce((sum, [,size]) => sum + size, 0);
    const expected = new Map(manifest.units.map(([,size,hash]) => [hash, manifest.patches[hash]?.[1] ?? size]));
    assert.equal(received, Array.from(expected.values()).reduce((sum, size) => sum + size, 0));
    console.log('Cold install including retry:', Date.now() - start, 'ms;', received, 'bytes;', fullBytes - received, 'bytes saved');
    networkDisabled = true;
    const installed = transfers;
    const sample = Object.keys(manifest.files).find(name => name.includes('sprites-combat') && name.endsWith('.png'));
    const result = await page.evaluate(async name => {
      const r = await fetch(name+'?v=runtime',{cache:'no-store'});
      const range = await fetch(name,{headers:{Range:'bytes=1-4'}});
      return [r.ok,(await r.blob()).size,range.status,(await range.blob()).size];
    }, sample);
    assert.deepEqual(result,[true,manifest.files[sample][2],206,4]);
    await page.reload();
    await loading.waitFor({state:'hidden',timeout:90000});
    assert.equal(transfers,installed,'return visit must not transfer installed packages');
    // A new release or partial eviction can leave a single archive missing.
    // Corrupt its patch and verify recovery through the original file URL.
    const [targetHash, [patchPath]] = Object.entries(manifest.patches)[0];
    const [targetPath] = manifest.units.find(unit => unit[2] === targetHash);
    const getDigest = name => page.evaluate(async path => {
      const bytes = await (await fetch(path, {cache:'no-store'})).arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,'0')).join('');
    }, name);
    assert.equal(await getDigest(targetPath), targetHash);
    await page.evaluate(async hash => {
      const scope = new URL('./',location.href);
      await (await caches.open('kaizoku-content-bytes:' + scope)).delete(new URL('loading-data/'+hash,scope));
    }, targetHash);
    networkDisabled = false;
    corruptPatch = patchPath;
    await page.reload();
    await loading.waitFor({state:'hidden',timeout:90000});
    assert.equal(transfers - installed, 2, 'only the damaged patch and its original should transfer');
    corruptPatch = null;
    networkDisabled = true;
    assert.equal(await getDigest(targetPath), targetHash);
    await page.locator('#characterName').fill('Nauta');
    await page.locator('#nextToClass').click();
    await page.locator('#nextToAppearance').click();
    await page.locator('#createCharacter').click();
    await page.locator('[data-confirm-accept]').click();
    await loading.waitFor({state:'hidden',timeout:60000});
    await page.locator('#characterMenuTrigger').click();
    assert.equal(await page.locator('#app').evaluate(el => el.inert),false);
    // Limit storage on the next visit. A verified unit can still be served by
    // the current tab after its network endpoint becomes unavailable.
    const unit = manifest.units[manifest.files[sample][0]];
    await page.evaluate(async hash => {
      const scope = new URL('./',location.href).href;
      await (await caches.open('kaizoku-content-bytes:' + scope)).delete(new URL('loading-data/'+hash,scope));
    }, unit[2]);
    await page.addInitScript(hash => {
      const put = Cache.prototype.put;
      Cache.prototype.put = function(key,response) {
        if (String(key).endsWith(hash)) return Promise.reject(new DOMException('Full','QuotaExceededError'));
        return put.call(this,key,response);
      };
    }, unit[2]);
    networkDisabled = false;
    await page.reload();
    await loading.waitFor({state:'hidden',timeout:90000});
    assert.match(await page.locator('.loading-size').textContent(),/nesta aba/);
    networkDisabled = true;
    assert.equal(await page.evaluate(async name => (await (await fetch(name,{cache:'no-store'})).blob()).size,sample),manifest.files[sample][2]);
    console.log('Cold install, retry, cache-only reads, warm reload, character creation and low-storage fallback passed.');
  } finally {
    await browser.close(); server.closeAllConnections(); await new Promise(r=>server.close(r));
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
