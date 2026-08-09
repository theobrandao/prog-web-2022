import { describe, it, expect } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
} from "../src/lib/auth.js";

const KEY = "unit-test-secret";

describe("session tokens (HMAC)", () => {
  it("round-trips a valid token", () => {
    const token = createSessionToken({ userId: 7, role: "admin" }, 7, KEY);
    const payload = verifySessionToken(token, KEY);
    expect(payload?.userId).toBe(7);
    expect(payload?.role).toBe("admin");
  });

  it("rejects a tampered payload", () => {
    const token = createSessionToken({ userId: 7, role: "operador" }, 7, KEY);
    const [, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ userId: 1, role: "admin", exp: 9999999999 })).toString("base64url");
    expect(verifySessionToken(`${forged}.${sig}`, KEY)).toBeNull();
  });

  it("rejects a wrong signing key", () => {
    const token = createSessionToken({ userId: 7, role: "admin" }, 7, KEY);
    expect(verifySessionToken(token, "other-key")).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = createSessionToken({ userId: 7, role: "admin" }, -1, KEY);
    expect(verifySessionToken(token, KEY)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifySessionToken(undefined, KEY)).toBeNull();
    expect(verifySessionToken("garbage", KEY)).toBeNull();
    expect(verifySessionToken("a.b.c", KEY)).toBeNull();
  });
});
