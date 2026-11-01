import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readConfig } from '../../apps/game-server/src/config.js';

const environment = { DATABASE_URL: 'postgresql://runtime:private@127.0.0.1:55432/mare_dev' };
test('binds locally by default and accepts an explicit valid port', () => {
  const config = readConfig(environment);
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.port, 8787);
  assert.equal(readConfig({ ...environment, PORT: '9123' }).port, 9123);
});
test('fails closed for missing database, invalid port/URL or production use', () => {
  for (const invalid of [{}, { ...environment, PORT: '0' }, { ...environment, PORT: '8.5' },
    { ...environment, PORT: '70000' }, { ...environment, DATABASE_URL: 'https://example.com' },
    { ...environment, NODE_ENV: 'production' }]) assert.throws(() => readConfig(invalid));
});
test('configuration errors do not echo connection strings or passwords', () => {
  assert.throws(() => readConfig({ DATABASE_URL: 'https://runtime:private@example.com' }),
    (error: unknown) => error instanceof Error && !error.message.includes('private'));
});
