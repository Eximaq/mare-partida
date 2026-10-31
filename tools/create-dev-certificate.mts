import { generate } from "selfsigned";
import { mkdir, writeFile } from "node:fs/promises";
const cert = await generate([{ name: "commonName", value: "localhost" }], {
  extensions: [
    { name: "basicConstraints", cA: false },
    { name: "keyUsage", digitalSignature: true, keyEncipherment: true },
    { name: "extKeyUsage", serverAuth: true },
    {
      name: "subjectAltName",
      altNames: [
        { type: 2, value: "localhost" },
        { type: 7, ip: "127.0.0.1" },
      ],
    },
  ],
});
await mkdir("infra/local", { recursive: true });
await writeFile("infra/local/localhost.key", cert.private, {
  flag: "wx",
  mode: 0o600,
});
await writeFile("infra/local/localhost.crt", cert.cert, {
  flag: "wx",
  mode: 0o600,
});
console.log(
  "Created ignored loopback TLS files. No trust store or DNS changes.",
);
