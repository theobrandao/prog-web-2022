import { readFile } from "node:fs/promises";
import path from "node:path";
import { mediaDir } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Serve a imagem de produto do disco persistente (/data/media/products). */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const safe = path.basename(name); // evita path traversal
  try {
    const buf = await readFile(path.join(mediaDir(), "products", safe));
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
