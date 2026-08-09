import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { withJob } from "@/jobs/runner";
import { selectDaily } from "@/jobs/selectDaily";
import { makeCreatives } from "@/jobs/makeCreatives";
import { waPackage } from "@/jobs/waPackage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Run today's selection now: selectDaily -> makeCreatives -> waPackage.
 * Idempotent — re-running the same day won't duplicate posts (§9).
 */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const now = new Date();
  const sel = await withJob(prisma, "selectDaily", now, (l) => selectDaily(prisma, { log: l }), { force: true });
  const cre = await withJob(prisma, "makeCreatives", now, (l) => makeCreatives(prisma, { log: l }), { force: true });
  const wap = await withJob(prisma, "waPackage", now, (l) => waPackage(prisma, { log: l }), { force: true });

  return NextResponse.json({
    jobId: sel.jobId,
    selection: sel.result ?? null,
    creatives: cre.result ?? null,
    waPackage: wap.result ?? null,
  });
}
