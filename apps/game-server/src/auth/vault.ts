import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
export const opaque = () => randomBytes(32).toString("base64url");
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const equal = (a: string, b: string) => {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};
export class Vault {
  constructor(private readonly key: Buffer) {
    if (key.length !== 32) throw new Error("Invalid vault key");
  }
  private mac(purpose: string, value: string) {
    return createHmac("sha256", this.key)
      .update(purpose + "\0" + value)
      .digest("base64url");
  }
  seal(value: unknown, context: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    cipher.setAAD(Buffer.from(context));
    const bytes = Buffer.concat([
      cipher.update(JSON.stringify(value), "utf8"),
      cipher.final(),
    ]);
    return [
      "v1",
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      bytes.toString("base64url"),
    ].join(".");
  }
  open(value: string, context: string): unknown {
    const [version, iv, tag, data, ...extra] = value.split(".");
    if (version !== "v1" || !iv || !tag || !data || extra.length)
      throw new Error("Invalid encrypted record");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(iv, "base64url"),
    );
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(data, "base64url")),
        decipher.final(),
      ]).toString("utf8"),
    ) as unknown;
  }
  csrf(cookie: string) {
    return this.mac("csrf", cookie);
  }
  rateKey(value: string) {
    return this.mac("rate", value);
  }
  preauth(now = Date.now()) {
    const payload = opaque() + "." + now;
    return payload + "." + this.mac("preauth", payload);
  }
  validPreauth(value: string, now = Date.now()) {
    const [nonce, time, signature, ...extra] = value.split(".");
    return (
      !!nonce &&
      !!time &&
      !!signature &&
      !extra.length &&
      /^[A-Za-z0-9_-]{43}$/.test(nonce) &&
      /^\d+$/.test(time) &&
      Number(time) <= now &&
      now - Number(time) < 600000 &&
      equal(signature, this.mac("preauth", nonce + "." + time))
    );
  }
}
