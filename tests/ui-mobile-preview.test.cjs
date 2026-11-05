'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const production=read('index.html');
const preview=read('ui-preview.html');
const skin=read('ui-art-direction.css');
const build=read('tools/build_pages.py');
const scripts=doc=>[...doc.matchAll(/<script\b[^>]+src="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(scripts(preview),scripts(production),'preview must execute the same scripts as production');
// Production and review entry points must share the current HUD owner.
for(const doc of [production,preview]){
  assert.match(doc,/nautical-profile/);
  assert.match(doc,/<link rel="stylesheet" href="hud-nautical\.css"/);
  assert.match(doc,/class="hud-vitals"/);
}
assert.match(build,/'hud-nautical\.css'/);
assert.match(skin,/\.topbar/);
assert.match(build,/web_files = \['index\.html', 'ui-preview\.html', 'ui-art-direction\.css'/);
assert.match(build,/for page in \['index\.html', 'ui-preview\.html'\]:/);
console.log('Mobile live preview: production entry preserved and static release configured');
