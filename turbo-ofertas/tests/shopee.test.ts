import { describe, it, expect } from "vitest";
import { sign } from "../src/services/shopee.js";

describe("shopee.sign", () => {
  it("matches the known SHA256(AppId+Timestamp+Payload+Secret) vector", () => {
    const out = sign("APP123", 1700000000, '{"query":"{ping}"}', "shh");
    expect(out).toBe("c10e568b341ac2708a7b58b9b045a4bc42a71740b10c65b0a5311f487ebc5f35");
  });

  it("is deterministic and changes with any input", () => {
    const a = sign("APP123", 1700000000, "{}", "shh");
    const b = sign("APP123", 1700000001, "{}", "shh");
    expect(a).not.toBe(b);
    expect(a).toBe(sign("APP123", 1700000000, "{}", "shh"));
  });
});
