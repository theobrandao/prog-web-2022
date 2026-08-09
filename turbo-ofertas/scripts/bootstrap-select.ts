// Bootstrap de produção: roda a seleção do dia + criativos UMA vez no deploy,
// para o site já subir com ofertas visíveis (idempotente — se já houver posts
// do dia, selectDaily não duplica). Nunca derruba o boot: erros são logados.
import { prisma } from "../src/lib/db.js";
import { withJob } from "../src/jobs/runner.js";
import { selectDaily } from "../src/jobs/selectDaily.js";
import { makeCreatives } from "../src/jobs/makeCreatives.js";

async function main() {
  const now = new Date();
  const sel = await withJob(prisma, "selectDaily", now, (l) => selectDaily(prisma, { log: l }));
  console.log("bootstrap selectDaily:", sel.status);
  const cre = await withJob(prisma, "makeCreatives", now, (l) => makeCreatives(prisma, { log: l }), { force: true });
  console.log("bootstrap makeCreatives:", cre.status);
}

main()
  .catch((e) => console.error("bootstrap-select falhou (ignorado):", (e as Error).message))
  .finally(() => prisma.$disconnect());
