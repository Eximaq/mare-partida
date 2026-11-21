// Exercise the deployed package under a project subpath with real network and cache storage.
const assert = require('node:assert/strict');
const {createServer} = require('node:http');
const {createReadStream} = require('node:fs');
const {readdir, readFile, stat} = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');

async function main() {
  const root = path.resolve(process.argv[2] || 'dist');
  const index = (await readdir(root)).find(name => /^game-content-.*\.json$/.test(name));
  const manifest = JSON.parse(await readFile(path.join(root, index), 'utf8'));
  const units = new Set(manifest.units.map(unit => unit[0]));
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
      res.writeHead(200, {'Content-Type':types[path.extname(rel)] || 'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-store'});
      createReadStream(file).pipe(res);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH});
  try {
    const page = await browser.newPage();
    page.on('pageerror', e => console.error(e.message));
    const url = 'http://127.0.0.1:' + server.address().port + '/demo/';
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
    await page.locator('#characterName').fill('Nauta');
    await page.locator('#nextToClass').click();
    await page.locator('#nextToAppearance').click();
    await page.locator('#createCharacter').click();
    await page.locator('[data-confirm-accept]').click();
    await loading.waitFor({state:'hidden',timeout:60000});
    await page.locator('#characterMenuTrigger').click();
    assert.equal(await page.locator('#app').evaluate(el => el.inert),false);
    console.log('Cold install, interrupted transfer, retry, cache-only sprite/range and warm reload passed.');
  } finally {
    await browser.close(); server.closeAllConnections(); await new Promise(r=>server.close(r));
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
