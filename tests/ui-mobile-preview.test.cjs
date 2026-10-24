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
// The preview was originally a separate visual proposal. Once approved, the
// shared skin may also be enabled in production without invalidating QA.
const themeLink=/<link rel="stylesheet" href="ui-art-direction\.css"/;
if(themeLink.test(production)){
  assert.match(production,/helm-portrait-ribbon/,'public theme must include the captain-log HUD');
} else {
  assert.doesNotMatch(production,/helm-portrait-ribbon/,'unapproved production layout must stay unchanged');
}
assert.match(preview,/<link rel="stylesheet" href="ui-art-direction\.css"/);
assert.match(preview,/helm-portrait-ribbon/);
assert.match(skin,/\.topbar/);
assert.match(build,/web_files = \['index\.html', 'ui-preview\.html', 'ui-art-direction\.css'/);
assert.match(build,/for page in \['index\.html', 'ui-preview\.html'\]:/);
console.log('Mobile live preview: production entry preserved and static release configured');
