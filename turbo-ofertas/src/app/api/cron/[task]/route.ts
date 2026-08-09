import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { withJob } from "@/jobs/runner";
import { selectDaily } from "@/jobs/selectDaily";
import { makeCreatives } from "@/jobs/makeCreatives";
import { publishTg, publishIg } from "@/jobs/publish";
import { waPackage } from "@/jobs/waPackage";
import { weeklyReport } from "@/jobs/weeklyReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Token-protected cron endpoints (driven by an external scheduler / Render Cron).
 * Runs the jobs INSIDE the web service, sharing its SQLite disk. Each task is
 * idempotent per day via withJob, so accidental double-hits are safe.
 *
 *   GET/POST /api/cron/{task}?token=CRON_SECRET
 *   tasks: daily | publish1 | publish2 | publish3 | weekly | links
 */
async function handle(req: Request, task: string) {
  const secret = env("CRON_SECRET");
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  }
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || req.headers.get("x-cron-token");
  if (token !== secret) {
    return NextResponse.json({ error: "token inválido" }, { status: 401 });
  }

  const now = new Date();
  const out: Record<string, unknown> = { task };

  switch (task) {
    case "daily": {
      out.selectDaily = await withJob(prisma, "selectDaily", now, (l) => selectDaily(prisma, { log: l }));
      out.makeCreatives = await withJob(prisma, "makeCreatives", now, (l) => makeCreatives(prisma, { log: l }), { force: true });
      out.waPackage = await withJob(prisma, "waPackage", now, (l) => waPackage(prisma, { log: l }));
      break;
    }
    case "publish1":
    case "publish2":
    case "publish3": {
      const slot = Number(task.slice(-1));
      const kinds = slot === 2 ? (["feed", "story"] as const) : (["story"] as const);
      out.ig = await withJob(prisma, `publishIg${slot}`, now, (l) => publishIg(prisma, { slot, kinds: [...kinds], log: l }));
      out.tg = await withJob(prisma, `publishTg${slot}`, now, (l) => publishTg(prisma, { slot, log: l }));
      break;
    }
    case "weekly": {
      out.weekly = await withJob(prisma, "weeklyReport", now, (l) => weeklyReport(prisma, { log: l }));
      break;
    }
    case "links": {
      out.links = await withJob(prisma, "linksReminder", now, async (l) => {
        const n = await prisma.product.count({
          where: { source: "ml", active: true, links: { none: { channel: "cnl" } } },
        });
        l.log(`ML pendentes de link: ${n}`);
      });
      break;
    }
    default:
      return NextResponse.json({ error: `task desconhecida: ${task}` }, { status: 400 });
  }

  return NextResponse.json({ ok: true, ...out });
}

export async function GET(req: Request, ctx: { params: Promise<{ task: string }> }) {
  const { task } = await ctx.params;
  return handle(req, task);
}
export async function POST(req: Request, ctx: { params: Promise<{ task: string }> }) {
  const { task } = await ctx.params;
  return handle(req, task);
}
