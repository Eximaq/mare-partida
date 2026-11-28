/* Verify the production loader/worker without transferring the full game catalogue. */
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {createServer} = require('node:http');
const {readFile} = require('node:fs/promises');
const {join} = require('node:path');
const {chromium} = require('playwright');

const hex = bytes => createHash('sha256').update(bytes).digest('hex');
const pack = 'loading-packs/shared.bin';
const patch = 'loading-packs/skin.delta';
function release(marker) {
  const data = new Map([[pack, 'prefix-wood-sail'], [patch, 'abc'],
    ['assets/hero.png', 'hero-' + marker], ['assets/never.png', 'never-' + marker],
    ['assets/skin.zip', 'aprefix-bc'], ['assets/retry.png', 'retry-' + marker]]);
  const units = [pack, 'assets/hero.png', 'assets/never.png', 'assets/skin.zip', 'assets/retry.png']
    .map(path => [path, data.get(path).length, hex(data.get(path))]);
  const files = {
    'assets/wood.png': [0, 7, 4, 'image/png'], 'assets/sail.png': [0, 12, 4, 'image/png'],
    ...Object.fromEntries(units.slice(1).map(([path, size], i) =>
      [path, [i+1, 0, size, path.endsWith('.zip') ? 'application/zip' : 'image/png']])),
  };
  const list = JSON.stringify({units, files, patches: {[units[3][2]]: [patch, 3, [[1, 0, 0, 7]]]}});
  return {name: 'game-content-' + hex(list).slice(0, 24) + '.json', list, data};
}

async function main() {
  const first = release('first'), second = release('second');
  let current = first;
  let noAssetNetwork = false, retry = true, corruptPatch = true;
  const counts = new Map();
  const root = join(__dirname, '..');
  const loading = await readFile(join(root, 'game-loading.js'));
  const worker = await readFile(join(root, 'game-content-worker.js'));
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const rel = url.pathname.slice('/demo/'.length);
    if (!url.pathname.startsWith('/demo/')) return res.writeHead(404).end();
    if (!rel || rel === 'index.html') {
      return res.writeHead(200, {'Content-Type': 'text/html','Cache-Control': 'no-store'}).end(
        '<!doctype html><html data-game-content="' + current.name + '"><title>Loading test</title>' +
        '<section id="gameLoading"><progress></progress><output></output><p role="status"></p><button hidden>Repetir</button></section>' +
        '<main id="app" inert aria-busy="true"><button id="move">Andar</button></main><script src="game-loading.js"></script>' +
        '<script>void MareGameLoading.prepare();MareGameLoading.finish();move.onclick=()=>move.dataset.clicked="yes";</script>');
    }
    if (rel === 'game-loading.js' || rel === 'game-content-worker.js') {
      return res.writeHead(200, {'Content-Type': 'text/javascript','Cache-Control': 'no-store'}).end(rel === 'game-loading.js' ? loading : worker);
    }
    const manifest = [first, second].find(it => it.name === rel);
    if (manifest) return res.writeHead(200, {'Content-Type': 'application/json'}).end(manifest.list);
    if (current.data.has(rel)) {
      counts.set(rel, (counts.get(rel) ?? 0)+1);
      if (noAssetNetwork) return res.writeHead(503).end();
      if (rel === 'assets/retry.png' && retry) { retry = false; return res.writeHead(503).end(); }
      const data = rel === patch && corruptPatch ? 'bad' : current.data.get(rel);
      return res.writeHead(200, {'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store'}).end(data);
    }
    res.writeHead(404).end();
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser = await chromium.launch({executablePath: process.env.CHROME_PATH});
    const context = await browser.newContext();
    const url = 'http://127.0.0.1:' + server.address().port + '/demo/';
    const get = (page, name, headers) => page.evaluate(async ([path, args]) => {
      const r = await fetch(path, {headers: args});
      return [r.status, await r.text()];
    }, [name, headers]);
    async function open(version) {
      const page = await context.newPage();
      await page.goto(url);
      await page.locator('#move').click();
      assert.equal(await page.locator('#move').getAttribute('data-clicked'), 'yes');
      await page.waitForFunction(async name => {
        if (!navigator.serviceWorker.controller) return false;
        const source = new URL('./', location.href);
        const metadata = await caches.open('kaizoku-content-index:' + source.href);
        return !!(await metadata.match(new URL(name, source)));
      }, version.name);
      return page;
    }

    const oldTab = await open(first);
    assert.equal(counts.size, 0, 'no game asset transfer is needed before the app becomes interactive');
    assert.deepEqual(await Promise.all([get(oldTab,'assets/wood.png'), get(oldTab,'assets/sail.png')]),
      [[200,'wood'],[200,'sail']]);
    assert.equal(counts.get(pack), 1, 'different views of one pack must share the in-flight download');
    assert.deepEqual(await get(oldTab, 'assets/retry.png'), [200, 'retry-first']);
    assert.equal(counts.get('assets/retry.png'),2, 'a transient failure gets one network retry');
    assert.deepEqual(await get(oldTab, 'assets/skin.zip'), [200,'aprefix-bc']);
    assert.equal(counts.get(patch), 1);
    assert.equal(counts.get('assets/skin.zip'), 1, 'a bad delta falls back to the exact archive');
    assert.deepEqual(await get(oldTab,'assets/hero.png'), [200,'hero-first']);

    noAssetNetwork = true;
    const downloaded = Array.from(counts);
    await oldTab.reload();
    assert.deepEqual(await get(oldTab, 'assets/wood.png', {Range:'bytes=1-2'}), [206,'oo']);
    assert.deepEqual(await get(oldTab, 'assets/hero.png'), [200, 'hero-first']);
    assert.deepEqual(Array.from(counts), downloaded, 'warm/offline requests for cached assets do not reach the server');
    assert(!counts.has('assets/never.png'), 'unused content stays untransferred');

    noAssetNetwork = false;
    corruptPatch = false;
    current = second;
    const freshTab = await open(second);
    assert.deepEqual(await get(freshTab,'assets/hero.png'), [200,'hero-second']);
    assert.deepEqual(await get(oldTab,'assets/hero.png'), [200,'hero-first'], 'the tab keeps its release');
    assert.deepEqual(await get(oldTab,'assets/never.png'), [503,''], 'a missing old unit cannot accept bytes from another release');

    await freshTab.evaluate(async hash => {
      const scope = new URL('./', location.href);
      const cache = await caches.open('kaizoku-content-bytes:' + scope.href);
      await cache.delete(new URL('loading-data/' + hash, scope));
    }, hex('aprefix-bc'));
    assert.deepEqual(await get(freshTab, 'assets/skin.zip'), [200, 'aprefix-bc']);
    assert.equal(counts.get(patch), 2, 'a usable delta reads only the literal bytes');
    assert.equal(counts.get('assets/skin.zip'), 1, 'a usable delta does not transfer the original archive');

    const cdp = await context.newCDPSession(freshTab);
    await cdp.send('Storage.overrideQuotaForOrigin', {origin: new URL(url).origin, quotaSize: 0});
    assert.deepEqual(await get(freshTab,'assets/never.png'), [200,'never-second']);
    noAssetNetwork = true;
    const beforeOffline = counts.get('assets/never.png');
    assert.deepEqual(await get(freshTab,'assets/never.png'), [200,'never-second']);
    assert.equal(counts.get('assets/never.png'), beforeOffline, 'cached or bounded transient bytes remain usable under a storage quota');
    console.log('Nonblocking boot, concurrent pack reuse, retries, offline cache, range reads, quota and release isolation passed.');
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
