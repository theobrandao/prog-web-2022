import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { prisma } from "@/lib/db";
import { withJob } from "@/jobs/runner";
import { selectDaily } from "@/jobs/selectDaily";
import { makeCreatives } from "@/jobs/makeCreatives";
import { publishTg, publishIg } from "@/jobs/publish";
import { waPackage } from "@/jobs/waPackage";
import { weeklyReport } from "@/jobs/weeklyReport";
import { info } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";
type G = typeof globalThis & { __cronArmed?: boolean; __cronToken?: string };
const g = globalThis as G;

async function runDaily() {
  const now = new Date();
  await withJob(prisma, "selectDaily", now, (l) => selectDaily(prisma, { log: l }));
  await withJob(prisma, "makeCreatives", now, (l) => makeCreatives(prisma, { log: l }), { force: true });
  await withJob(prisma, "waPackage", now, (l) => waPackage(prisma, { log: l }));
}
async function runPublish(slot: number) {
  const now = new Date();
  const kinds = slot === 2 ? (["feed", "story"] as const) : (["story"] as const);
  await withJob(prisma, `publishIg${slot}`, now, (l) => publishIg(prisma, { slot, kinds: [...kinds], log: l }));
  await withJob(prisma, `publishTg${slot}`, now, (l) => publishTg(prisma, { slot, log: l }));
}

/** Runs every minute; fires the §9 jobs when the SP wall-clock matches. Idempotent per day. */
async function tick() {
  try {
    const dt = DateTime.now().setZone(TZ);
    const hhmm = dt.toFormat("HH:mm");
    const dow = dt.weekday; // 1=Mon .. 7=Sun
    if (hhmm === "06:00") await runDaily();
    else if (hhmm === "09:00") await runPublish(1);
    else if (hhmm === "12:30") await runPublish(2);
    else if (hhmm === "20:00") await runPublish(3);
    else if (dow === 5 && hhmm === "18:00")
      await withJob(prisma, "weeklyReport", new Date(), (l) => weeklyReport(prisma, { log: l }));
    else if (dow === 7 && hhmm === "08:00")
      await withJob(prisma, "linksReminder", new Date(), async (l) => {
        const n = await prisma.product.count({ where: { source: "ml", active: true, links: { none: { channel: "cnl" } } } });
        l.log(`ML pendentes de link: ${n}`);
      });
  } catch (e) {
    info(`cron tick erro: ${(e as Error).message}`);
  }
}

/**
 * Arms the in-process scheduler exactly once. Called by src/instrumentation.ts at
 * boot via an internal fetch with the in-memory token, so no external caller or
 * shared secret is needed. Also runs an immediate daily bootstrap so the site
 * always has fresh content.
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("t");
  if (!g.__cronToken || token !== g.__cronToken) {
    return NextResponse.json({ error: "interno" }, { status: 403 });
  }
  if (g.__cronArmed) return NextResponse.json({ armed: true, already: true });
  g.__cronArmed = true;
  setInterval(() => void tick(), 60_000);
  info("cron interno armado (self-scheduler, TZ=America/Sao_Paulo)");
  // bootstrap imediato (idempotente)
  void runDaily();
  return NextResponse.json({ armed: true });
}
