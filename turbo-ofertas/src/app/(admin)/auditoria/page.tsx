import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

function fmt(d: Date | null): string {
  if (!d) return "—";
  return d.toISOString().replace("T", " ").slice(0, 16);
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const action = sp.action?.trim() || "";

  const where: Record<string, unknown> = {};
  if (action) where.action = { contains: action };

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const userIds = Array.from(
    new Set(logs.map((l) => l.userId).filter((id): id is number => id != null)),
  );
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  return (
    <div>
      <h1>Auditoria</h1>
      <p className="muted">
        Registro de ações administrativas. Exibindo os {logs.length} eventos mais
        recentes.
      </p>

      <form method="get" className="row" style={{ marginBottom: "1rem" }}>
        <div style={{ flex: 1, minWidth: "220px" }}>
          <label htmlFor="action">Filtrar por ação</label>
          <input
            id="action"
            name="action"
            defaultValue={action}
            placeholder="ex.: user.approve"
          />
        </div>
        <button type="submit" className="accent">
          Filtrar
        </button>
      </form>

      {logs.length === 0 ? (
        <p className="muted">Nenhum evento encontrado.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{fmt(l.createdAt)}</td>
                  <td>
                    {l.userId != null
                      ? `${nameById.get(l.userId) ?? "?"} (#${l.userId})`
                      : "—"}
                  </td>
                  <td>
                    <span className="badge">{l.action}</span>
                  </td>
                  <td>{l.detail || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
