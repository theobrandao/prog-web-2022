import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIDE = 1600;
const TIMEOUT_MS = 15_000;
const PRODUCTS_DIR = path.join(process.cwd(), "public", "img", "products");

export interface ImageResult {
  ok: boolean;
  /** public path, e.g. /img/products/{id}.jpg */
  imageLocal?: string;
  error?: string;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: ctrl.signal, redirect: "follow" });
  } finally {
    clearTimeout(t);
  }
}

/**
 * §6 / §10 — download, validate content-type, re-encode (never serve origin
 * bytes), fix EXIF rotation, resize longest side to 1600px, save as JPEG.
 * 2 retries with backoff. Returns {ok:false} on failure (caller sets imageLocal=null).
 */
export async function downloadProductImage(
  id: string,
  url: string,
): Promise<ImageResult> {
  // Lazy import so pure/test paths don't require the native module.
  const sharp = (await import("sharp")).default;

  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) {
        lastErr = `HTTP ${res.status}`;
        continue;
      }
      const ct = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      if (!ACCEPTED.includes(ct)) {
        return { ok: false, error: `content-type não aceito: ${ct || "desconhecido"}` };
      }
      const input = Buffer.from(await res.arrayBuffer());

      const output = await sharp(input)
        .rotate() // apply EXIF orientation, then strip metadata
        .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();

      await mkdir(PRODUCTS_DIR, { recursive: true });
      await writeFile(path.join(PRODUCTS_DIR, `${id}.jpg`), output);
      return { ok: true, imageLocal: `/img/products/${id}.jpg` };
    } catch (e) {
      lastErr = (e as Error).message;
    }
  }
  return { ok: false, error: lastErr || "falha desconhecida" };
}
