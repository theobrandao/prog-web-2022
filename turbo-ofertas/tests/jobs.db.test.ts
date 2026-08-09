process.env.DATABASE_URL ||= "file:../data/test.db";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { withJob } from "../src/jobs/runner.js";

const prisma = new PrismaClient();

async function cleanup() {
  await prisma.job.deleteMany({ where: { type: { in: ["testJob", "failJob"] } } });
}
beforeAll(cleanup);
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("withJob idempotency (§9)", () => {
  it("runs once per (type, day) and skips the second time", async () => {
    const day = new Date("2024-06-15T12:00:00-03:00");
    let runs = 0;
    const first = await withJob(prisma, "testJob", day, async (l) => {
      runs++;
      l.log("ran");
      return "ok";
    });
    expect(first.status).toBe("done");
    expect(runs).toBe(1);

    const second = await withJob(prisma, "testJob", day, async () => {
      runs++;
      return "ok";
    });
    expect(second.status).toBe("skipped");
    expect(runs).toBe(1); // fn NOT called again
  });

  it("records error status and does not skip on retry", async () => {
    const day = new Date("2024-06-16T12:00:00-03:00");
    const r = await withJob(prisma, "failJob", day, async () => {
      throw new Error("boom");
    });
    expect(r.status).toBe("error");
    const job = await prisma.job.findFirst({ where: { type: "failJob" } });
    expect(job?.status).toBe("error");
    expect(job?.log).toContain("boom");
  });
});
