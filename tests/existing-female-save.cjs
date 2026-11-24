'use strict';
const assert = require('node:assert/strict');

// Resume an isolated, previously saved appearance through the normal boot path.
// A one-shot fixture runs before boot, after unload has finished saving the old page.
module.exports = async function resumeFemaleSave(page, appearance = {}) {
  const key = 'mare-partida-save-v1';
  await page.waitForFunction(key => !!localStorage.getItem(key), key);
  const save = await page.evaluate(({key, appearance}) => {
    const saved = JSON.parse(localStorage.getItem(key));
    return MareCharacterAppearance.apply(saved, {...saved.appearance96, ...appearance, gender:'feminino'});
  }, {key, appearance});
  await page.evaluate(save => sessionStorage.setItem('qa-resume-female', JSON.stringify(save)), save);
  await page.addInitScript(key => {
    const fixture = sessionStorage.getItem('qa-resume-female');
    if (fixture) {
      sessionStorage.removeItem('qa-resume-female');
      localStorage.setItem(key, fixture);
    }
  }, key);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => window.__mareDiagnostics && !document.querySelector('#startOverlay')?.offsetHeight);
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).appearance96.gender, key), 'feminino');
};
