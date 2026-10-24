'use strict';
// Static regression guard for the decorative layer: gameplay/data remain elsewhere.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const html=read('index.html');
const css=read('ui-art-direction.css');
const tokens=read('ui-tokens.css');
assert.match(html, /<link rel="stylesheet" href="ui-art-direction\.css"\s*\/>/);
const before=html.indexOf('href="ui-responsive.css"');
const after=html.indexOf('href="ui-art-direction.css"');
assert.ok(before>=0 && after>before, 'visual overrides must follow responsive and feature styles');
assert.match(css, /\.topbar\s*,\s*#mainMenu\s*,\s*\.action-panel/);
for(const selector of ['#mainMenu','.skill-button','#journeyHud','.profile-heading','#panelOverlay.inventory-mode','.forge2-shell','.captain-tabs']) {
  assert.ok(css.includes(selector), 'missing subsystem '+selector);
}
assert.match(css, /@media\(max-width:760px\)/);
assert.match(css, /@media\(max-width:390px\)/);
assert.match(css, /@media\(max-height:500px\) and \(orientation:landscape\)/);
assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
assert.ok(!/!important/.test(css.replace(/\/\*[\s\S]*?\*\//g,'')), 'do not add CSS specificity arms race');
assert.match(css, /--helm-timber:/);
assert.match(css, /image-rendering:pixelated/);
assert.match(tokens, /--rpg-wood:#49301f/);
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'balanced CSS blocks');
console.log('Helm visual layer: structural contracts OK');
