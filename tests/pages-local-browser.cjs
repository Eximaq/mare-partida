const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function verify() {
  const url = new URL(process.env.MARE_TEST_URL);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  try {
    const page = await browser.newPage();
    const backendRequests = [];
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.route('**/*', route => {
      const target = new URL(route.request().url());
      if (target.origin !== url.origin || !target.pathname.startsWith(url.pathname) ||
          /\/(?:api|v1|account-client|online)\//.test(target.pathname)) {
        backendRequests.push(target.pathname);
        return route.abort();
      }
      return route.continue();
    });
    await page.goto(url.href);
    await page.locator('#gameLoading').waitFor({ state: 'hidden', timeout: 240000 });
    await page.locator('#characterName').fill('Nauta Local');
    await page.locator('#nextToClass').click();
    await page.locator('#nextToAppearance').click();
    await page.locator('#createCharacter').click();
    const confirmation = page.getByRole('alertdialog');
    assert.equal(await confirmation.evaluate(el => getComputedStyle(el).borderImageSource), 'none');
    await confirmation.locator('[data-confirm-accept]').click();
    await page.locator('#startOverlay').waitFor({ state: 'hidden' });
    await page.locator('#characterMenuTrigger').click();
    await page.locator('[data-character-section="hierarchy"]').click();
    await page.locator('.hierarchy-board-status').waitFor();
    assert.deepEqual(backendRequests, [], 'O Pages deve funcionar sem consultar APIs');
    assert.match(await page.locator('.hierarchy-board-status').innerText(), /modo online/i);
    assert.equal(await page.locator('[data-hierarchy-retry]').count(), 0);
    await page.reload();
    await page.locator('#startOverlay').waitFor({ state: 'hidden' });
    const name = await page.evaluate(() => JSON.parse(localStorage.getItem('mare-partida-save-v1')).name);
    assert.equal(name, 'Nauta Local');
    assert.deepEqual(backendRequests, []);
    assert.deepEqual(pageErrors, []);
    console.log('Pages local: criação, confirmação, hierarquia e save após recarga passaram sem acesso à API.');
  } finally {
    await browser.close();
  }
}

verify().catch(error => { console.error(error); process.exitCode = 1; });
