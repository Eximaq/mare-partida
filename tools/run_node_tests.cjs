'use strict';
const { readdirSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');
const root = join(__dirname, '..');
const files = readdirSync(join(root, 'tests')).filter(name => name.endsWith('.test.cjs') && name !== 'supa-browser.test.cjs').sort();
let failures = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, [join('tests', file)], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const ok = !result.error && result.status === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${file}`);
  if (!ok) { failures++; console.error(result.error?.message || result.stderr || result.stdout); }
}
console.log(`${files.length - failures}/${files.length} legacy Node files passed; supa-browser.test.cjs requires its separate browser harness.`);
process.exitCode = failures ? 1 : 0;
