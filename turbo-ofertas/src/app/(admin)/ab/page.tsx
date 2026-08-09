import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import AbClient, { type AbTestRow } from "../_components/AbClient";

export const dynamic = "force-dynamic";

export default async function AbPage() {
  await requireUser();

  const tests = await prisma.abTest.findMany({
    orderBy: { createdAt: "desc" },
  });

  const rows: AbTestRow[] = tests.map((t) => ({
    id: t.id,
    name: t.name,
    kind: t.kind,
    variantA: t.variantA,
    variantB: t.variantB,
    status: t.status,
    winner: t.winner,
    startDate: t.startDate.toISOString(),
    note: t.note,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div>
      <h1>Testes A/B</h1>
      <AbClient tests={rows} />
    </div>
  );
}
