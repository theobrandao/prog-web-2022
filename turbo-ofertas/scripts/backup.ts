import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { DateTime } from "luxon";

/** §11.5 — tar.gz of the SQLite DB + downloaded media, datestamped. */
const stamp = DateTime.now().setZone("America/Sao_Paulo").toFormat("yyyyLLdd-HHmm");
mkdirSync("backups", { recursive: true });
const out = `backups/turbo-ofertas-${stamp}.tar.gz`;

try {
  execFileSync(
    "tar",
    ["-czf", out, "data", "public/img/products", "public/img/creatives", "public/vid/products"],
    { stdio: "inherit" },
  );
  console.log(`Backup criado: ${out}`);
} catch (e) {
  console.error("Falha no backup:", (e as Error).message);
  process.exit(1);
}
