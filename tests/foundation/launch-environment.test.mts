import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const manifest = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8')) as { scripts: Record<string, string> };
const keys = ['DATABASE_URL', 'MIGRATION_DATABASE_URL', 'TEST_DATABASE_URL'];

for (const [script, expected] of [
  ['dev:server', 'DATABASE_URL'], ['start:server', 'DATABASE_URL'],
  ['db:migrate', 'MIGRATION_DATABASE_URL'], ['test:integration', 'TEST_DATABASE_URL'],
] as const) {
  test(`${script} loads only its role credentials, ignoring the legacy mixed .env`, async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'mare-env-isolation-'));
    t.after(async () => {
      for (const name of ['.env', '.env.server.local', '.env.migration.local', '.env.test.local']) {
        await unlink(join(dir, name));
      }
      await rmdir(dir);
    });
    await writeFile(join(dir, '.env'), keys.map(key => `${key}=legacy-mixed-canary`).join('\n'));
    for (const [file, key] of [['server', keys[0]], ['migration', keys[1]], ['test', keys[2]]]) {
      await writeFile(join(dir, `.env.${file}.local`), `${key}=isolated-fixture`);
    }
    const command = manifest.scripts[script];
    assert.ok(command);
    const flags = command.split(' ').filter(arg => arg.startsWith('--env-file'));
    assert.equal(flags.length, 1, 'Each launcher declares one credential source');
    const env = { ...process.env };
    for (const key of keys) delete env[key];
    const probe = `console.log(JSON.stringify(Object.fromEntries(${JSON.stringify(keys)}.filter(k=>process.env[k]).map(k=>[k,process.env[k]]))))`;
    const child = spawnSync(process.execPath, [...flags, '--eval', probe], { cwd: dir, env, encoding: 'utf8' });
    assert.equal(child.status, 0, child.stderr);
    assert.deepEqual(JSON.parse(child.stdout), { [expected]: 'isolated-fixture' });
  });
}
