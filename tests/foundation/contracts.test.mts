import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeClientMessage } from '../../packages/shared/src/index.js';

const ping = { v: 1, requestId: '13a29176-c290-4d93-9ba3-e3fbebbcdd49', sequence: 1, type: 'ping', payload: {} };

test('accepts a versioned intent without economic or identity authority', () => {
  assert.deepEqual(decodeClientMessage(JSON.stringify(ping)), ping);
});

for (const invalid of [
  { ...ping, v: 2 }, { ...ping, sequence: -1 }, { ...ping, sequence: 1.5 },
  { ...ping, sequence: Number.MAX_SAFE_INTEGER + 1 }, { ...ping, requestId: 'unbounded-client-id' },
  { ...ping, playerId: 'another-player' }, { ...ping, payload: { gold: 999999 } },
  { ...ping, type: 'grantReward' }, null, [],
]) {
  test(`rejects unsupported or untrusted payload: ${JSON.stringify(invalid)}`, () => {
    assert.throws(() => decodeClientMessage(JSON.stringify(invalid)));
  });
}

test('rejects malformed JSON and bounds UTF-8 bytes before decoding', () => {
  assert.throws(() => decodeClientMessage('{"sequence":NaN}'));
  assert.throws(() => decodeClientMessage(' '.repeat(4097)));
  assert.throws(() => decodeClientMessage('é'.repeat(2049)));
});
