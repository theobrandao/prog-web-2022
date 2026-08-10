import { readFile } from "node:fs/promises";
import path from "node:path";
import { mediaDir } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Serve o vídeo (MP4) do disco persistente (/data/media/videos). */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const safe = path.basename(name);
  try {
    const buf = await readFile(path.join(mediaDir(), "videos", safe));
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": "video/mp4", "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
