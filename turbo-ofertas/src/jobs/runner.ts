import type { PrismaClient } from "@prisma/client";
import { makeJobLogger } from "../lib/log.js";
import { truncDay } from "../lib/dates.js";

/**
 * Run a unit of work wrapped in a Job row (§9). Idempotent per (type, runDate):
 * if a Job already ran successfully for the day, it is skipped.
 */
export async function withJob<T>(
  prisma: PrismaClient,
  type: string,
  day: Date,
  fn: (log: ReturnType<typeof makeJobLogger>) => Promise<T>,
  opts: { force?: boolean } = {},
): Promise<{ jobId: number; status: string; result?: T }> {
  const runDate = truncDay(day);
  const existing = await prisma.job.findUnique({ where: { type_runDate: { type, runDate } } });
  if (existing?.status === "done" && !opts.force) {
    return { jobId: existing.id, status: "skipped" };
  }

  const job = await prisma.job.upsert({
    where: { type_runDate: { type, runDate } },
    create: { type, runDate, status: "running" },
    update: { status: "running", log: "" },
  });

  const log = makeJobLogger(type);
  try {
    const result = await fn(log);
    await prisma.job.update({ where: { id: job.id }, data: { status: "done", log: log.toString() } });
    return { jobId: job.id, status: "done", result };
  } catch (e) {
    log.log(`ERRO: ${(e as Error).message}`);
    await prisma.job.update({ where: { id: job.id }, data: { status: "error", log: log.toString() } });
    return { jobId: job.id, status: "error" };
  }
}
