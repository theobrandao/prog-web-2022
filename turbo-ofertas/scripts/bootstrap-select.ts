// Bootstrap de produção: roda APENAS a seleção do dia no deploy (leve, sem I/O
// de imagem), para o site subir garantido com ofertas visíveis. A geração de
// criativos (sharp/satori, pesada de memória) NÃO roda no boot para não arriscar
// OOM no Starter (512MB) — ela acontece sob demanda (/hoje → "Rodar seleção") ou
// no tick agendado, com o servidor já saudável. Nunca derruba o boot.
import { prisma } from "../src/lib/db.js";
import { withJob } from "../src/jobs/runner.js";
import { selectDaily } from "../src/jobs/selectDaily.js";

async function main() {
  const now = new Date();
  const sel = await withJob(prisma, "selectDaily", now, (l) => selectDaily(prisma, { log: l }));
  console.log("bootstrap selectDaily:", sel.status);
}

main()
  .catch((e) => console.error("bootstrap-select falhou (ignorado):", (e as Error).message))
  .finally(() => prisma.$disconnect());
