import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { withJob } from "@/jobs/runner";
import { publishTg, publishIg } from "@/jobs/publish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Publish today's posts to the channels NOW (Telegram channel + Instagram),
 * on demand from /hoje. Session-guarded. Idempotent per (job, day) via withJob,
 * and publishTg/publishIg skip posts already sent. In dry-run (no credentials)
 * it just logs.
 */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const now = new Date();
  const ig = await withJob(prisma, "publishIgManual", now, (l) => publishIg(prisma, { kinds: ["feed", "story"], log: l }), { force: true });
  const tg = await withJob(prisma, "publishTgManual", now, (l) => publishTg(prisma, { log: l }), { force: true });

  return NextResponse.json({ ig: ig.result ?? null, tg: tg.result ?? null });
}
