import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function fmt(d: Date | null): string {
  if (!d) return "—";
  return d.toISOString().replace("T", " ").slice(0, 16);
}

function statusClass(status: string): string {
  if (status === "done") return "ok";
  if (status === "error") return "danger";
  return "muted";
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  await requireUser();

  const sp = await searchParams;
  const status = sp.status?.trim() || "";
  const type = sp.type?.trim() || "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type) where.type = { contains: type };

  const [jobs, total, done, error, pending] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.job.count(),
    prisma.job.count({ where: { status: "done" } }),
    prisma.job.count({ where: { status: "error" } }),
    prisma.job.count({ where: { status: "pending" } }),
  ]);

  return (
    <div>
      <h1>Automações (Jobs)</h1>

      <div className="grid cols-4" style={{ marginBottom: "1.5rem" }}>
        <div className="kpi">
          <div className="value">{total}</div>
          <div className="label">Total</div>
        </div>
        <div className="kpi">
          <div className="value">{done}</div>
          <div className="label">Concluídos</div>
        </div>
        <div className="kpi">
          <div className="value">{error}</div>
          <div className="label">Com erro</div>
        </div>
        <div className="kpi">
          <div className="value">{pending}</div>
          <div className="label">Pendentes</div>
        </div>
      </div>

      <form method="get" className="row" style={{ marginBottom: "1rem" }}>
        <div style={{ flex: 1, minWidth: "180px" }}>
          <label htmlFor="type">Tipo</label>
          <input
            id="type"
            name="type"
            defaultValue={type}
            placeholder="ex.: selectDaily"
          />
        </div>
        <div style={{ flex: 1, minWidth: "180px" }}>
          <label htmlFor="status">Status</label>
          <input
            id="status"
            name="status"
            defaultValue={status}
            placeholder="done | error | pending | running"
          />
        </div>
        <button type="submit" className="accent">
          Filtrar
        </button>
      </form>

      {jobs.length === 0 ? (
        <p className="muted">Nenhum job encontrado.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Status</th>
                <th>runDate</th>
                <th>Criado</th>
                <th>Log</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>{j.type}</td>
                  <td>
                    <span className={`badge ${statusClass(j.status)}`}>
                      {j.status}
                    </span>
                  </td>
                  <td>{fmt(j.runDate)}</td>
                  <td>{fmt(j.createdAt)}</td>
                  <td>
                    {j.log ? (
                      <details>
                        <summary>ver log</summary>
                        <pre
                          style={{
                            whiteSpace: "pre-wrap",
                            fontSize: "0.78rem",
                            margin: "0.5rem 0 0",
                          }}
                        >
                          {j.log}
                        </pre>
                      </details>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
