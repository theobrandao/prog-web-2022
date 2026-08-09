import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";

/** Create a fresh, isolated SQLite DB for integration tests (never the dev DB). */
export default function setup() {
  const url = "file:../data/test.db";
  for (const f of ["data/test.db", "data/test.db-journal"]) {
    try {
      rmSync(f, { force: true });
    } catch {
      /* ignore */
    }
  }
  execFileSync("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "ignore",
  });
}
