import { test } from "node:test";
import assert from "node:assert/strict";
import { clientAddress } from "../../apps/game-server/src/client-address.js";
const req = (
  peer: string,
  value: any = "203.0.113.4",
  raw = ["X-Mare-Client-IP", String(value)],
) =>
  ({
    socket: { remoteAddress: peer },
    headers: { "x-mare-client-ip": value, "x-forwarded-for": "203.0.113.99" },
    rawHeaders: raw,
  }) as any;
test("untrusted forwarded identity cannot bypass limits; exact proxy preserves independent client identity", () => {
  assert.equal(clientAddress(req("192.0.2.1")), "192.0.2.1");
  assert.equal(clientAddress(req("192.0.2.1"), "127.0.0.1"), "192.0.2.1");
  assert.equal(
    clientAddress(req("::ffff:127.0.0.1"), "127.0.0.1"),
    "203.0.113.4",
  );
  assert.equal(
    clientAddress(req("127.0.0.1", "2001:db8::1"), "127.0.0.1"),
    "2001:db8::1",
  );
  for (const value of ["", "unknown", "1.2.3.4,5.6.7.8", ["1.2.3.4"]])
    assert.throws(() => clientAddress(req("127.0.0.1", value), "127.0.0.1"));
  assert.throws(() =>
    clientAddress(
      req("127.0.0.1", "1.2.3.4", [
        "X-Mare-Client-IP",
        "1.2.3.4",
        "x-mare-client-ip",
        "1.2.3.4",
      ]),
      "127.0.0.1",
    ),
  );
});
