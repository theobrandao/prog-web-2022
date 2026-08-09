import crypto from "node:crypto";

export interface SessionPayload {
  userId: number;
  role: "admin" | "operador";
  /** epoch seconds */
  exp: number;
}

export const SESSION_COOKIE = "to_session";
const SESSION_TTL_DAYS = 7;

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET não configurado");
  return s;
}

function sign(payloadB64: string, key = secret()): string {
  return b64url(crypto.createHmac("sha256", key).update(payloadB64).digest());
}

/** Create a signed session token. Pure given the secret. */
export function createSessionToken(
  data: Omit<SessionPayload, "exp">,
  ttlDays = SESSION_TTL_DAYS,
  key = secret(),
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlDays * 86400;
  const payload: SessionPayload = { ...data, exp };
  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload)));
  return `${payloadB64}.${sign(payloadB64, key)}`;
}

/** Verify and decode a session token. Returns null if invalid or expired. */
export function verifySessionToken(
  token: string | undefined | null,
  key = secret(),
): SessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payloadB64, key);
  // constant-time compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_DAYS * 86400,
  };
}

// --- Password hashing (argon2id). Imported lazily so pure token logic stays
// testable without the native module. ---

export async function hashPassword(plain: string): Promise<string> {
  const argon2 = (await import("argon2")).default;
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    const argon2 = (await import("argon2")).default;
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
