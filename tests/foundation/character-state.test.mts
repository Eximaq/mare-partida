import assert from "node:assert/strict";
import { test } from "node:test";
import { characterStateSchema, progressionAmountSchema } from "@mare/shared";

test("progression amounts are exact bounded decimal strings and malformed input never throws", () => {
  for (const value of ["0", "9007199254740993", "9223372036854775807"])
    assert.equal(progressionAmountSchema.parse(value), value);
  for (const value of ["", "no-number", "-1", "01", "1.5", "1e3", "0x10", "9223372036854775808", "9".repeat(200), 1, null])
    assert.equal(progressionAmountSchema.safeParse(value).success, false, String(value));
});

test("character snapshot rejects forged metadata, invalid levels and unsafe versions", () => {
  const state = { characterId: "11111111-1111-4111-8111-111111111111", version: 0, level: 1, experience: "0", gold: "0" };
  assert.deepEqual(characterStateSchema.parse(state), state);
  for (const extra of [{ ownerId: "forged" }, { accountId: "forged" }, { level: 0 },
    { version: Number.MAX_SAFE_INTEGER + 1 }, { version: -1 }, { gold: 9007199254740992 }])
    assert.equal(characterStateSchema.safeParse({ ...state, ...extra }).success, false);
});
