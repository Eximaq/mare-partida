const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {readFileSync} = require('node:fs');
const {createServer} = require('node:http');
const {join} = require('node:path');
const {test} = require('node:test');
const {chromium} = require('playwright');

test('two game tabs share installation and a visit after logout reuses the bytes', async () => {
  const bytes = Buffer.from('beta map');
  const hash = data => createHash('sha256').update(data).digest('hex');
  const manifest = JSON.stringify({units:[['assets/map.bin', bytes.length, hash(bytes)]],
    files:{'assets/map.bin':[0, 0, bytes.length, 'application/octet-stream']}});
  const catalog = 'game-content-' + hash(manifest).slice(0,24) + '.json';
  const html = `<html data-game-content="${catalog}"><div id="gameLoading">
    <progress></progress><output></output><p role="status"></p><p class="loading-size"></p><button></button></div>
    <div id="app"></div><script src="/game-loading.js"></script></html>`;
  let transfers = 0;
  let releaseDownload;
  const gate = new Promise(resolve => { releaseDownload = resolve; });
  const server = createServer(async (req,res) => {
    const url = new URL(req.url, 'http://localhost');
    res.setHeader('Cache-Control','no-store');
    if (url.pathname === '/game') res.setHeader('Content-Type','text/html').end(html);
    else if (url.pathname === '/online/') res.end('Login');
    else if (url.pathname === '/' + catalog) res.setHeader('Content-Type','application/json').end(manifest);
    else if (['/game-content-worker.js','/game-loading.js'].includes(url.pathname))
      res.setHeader('Content-Type','text/javascript').end(readFileSync(join(__dirname,'..',url.pathname.slice(1))));
    else if (url.pathname === '/assets/map.bin' && url.searchParams.has('install')) {
      transfers++;
      await gate;
      res.end(bytes);
    } else res.writeHead(404).end();
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({executablePath:process.env.CHROME_PATH});
    const context = await browser.newContext();
    const a = await context.newPage(), b = await context.newPage();
    for (const page of [a,b]) {
      await page.goto(origin+'/game');
      await page.evaluate(() => {void window.MareGameLoading.prepare();});
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    }
    await a.waitForFunction(() => document.querySelector('[role=status]').textContent.includes('Preparando mapas'));
    // Wait until B is either waiting for the installer lock, or has started its own download.
    await b.waitForFunction(async () => (await navigator.locks.query()).pending.length > 0 ||
      document.querySelector('[role=status]').textContent.includes('Preparando mapas'));
    releaseDownload();
    for (const page of [a,b]) {
      await page.waitForFunction(() => window.MareGameLoading.prepared);
      assert.equal(await page.evaluate(() => fetch('/assets/map.bin').then(r=>r.text())), bytes.toString());
      await page.goto(origin+'/online/');
    }
    // The full install can exhaust the browser's disk quota. Persisting a new
    // document binding is only a cache hint and must not break navigation.
    await context.serviceWorkers()[0].evaluate(() => {
      const put = Cache.prototype.put;
      Cache.prototype.put = function(key,response) {
        if (String(key).includes('/loading-session/')) return Promise.reject(new DOMException('Full','QuotaExceededError'));
        return put.call(this,key,response);
      };
    });
    await a.goto(origin+'/game');
    await a.evaluate(() => window.MareGameLoading.prepare());
    assert.equal(await a.evaluate(() => fetch('/assets/map.bin').then(r=>r.text())), bytes.toString());
    assert.equal(transfers,1,'the static map must download exactly once in this browser');
  } finally {
    releaseDownload();
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
  }
});
