import assert from "node:assert/strict";
import { test } from "node:test";
import { characterCommandSchema } from "@mare/shared";

test("commands accept only known intentions and bounded version/lease metadata", () => {
  const input = { requestId: "11111111-1111-4111-8111-111111111111", action: "state.sync",
    expectedVersion: 0, control: { epoch: 1, token: "x".repeat(43) }, payload: {} };
  assert.deepEqual(characterCommandSchema.parse(input), input);
  assert.deepEqual(characterCommandSchema.parse({ ...input, action: "journey.begin" }), { ...input, action: "journey.begin" });
  for (const extra of [{ requestId: "invalid" }, { expectedVersion: Number.MAX_SAFE_INTEGER + 1 },
    { expectedVersion: 0.5 }, { expectedVersion: "0" }, { action: "gold.grant" }, { ownerId: "forged" },
    { payload: { gold: 1 } }, { payload: [] }, { control: { ...input.control, epoch: 0 } },
    { control: { ...input.control, token: "short" } }, { control: { ...input.control, ownerId: "forged" } }])
    assert.equal(characterCommandSchema.safeParse({ ...input, ...extra }).success, false);
});
