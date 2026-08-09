import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

function fmt(d: Date | null): string {
  if (!d) return "—";
  return d.toISOString().replace("T", " ").slice(0, 16);
}

const INTEGRATIONS = [
  "TELEGRAM_BOT_TOKEN",
  "IG_ACCESS_TOKEN",
  "SHOPEE_APP_ID",
  "PUBLIC_BASE_URL",
] as const;

export default async function HealthPage() {
  await requireUser();

  let dbOk = false;
  let dbError = "";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  const [pending, running, error, lastSelect] = await Promise.all([
    prisma.job.count({ where: { status: "pending" } }),
    prisma.job.count({ where: { status: "running" } }),
    prisma.job.count({ where: { status: "error" } }),
    prisma.job.findFirst({
      where: { type: "selectDaily" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const present = INTEGRATIONS.map((k) => ({ key: k, ok: !!env(k) }));

  return (
    <div>
      <h1>Health Monitor</h1>
      <p className="muted">Estado do sistema em tempo real.</p>

      <div className="grid cols-2">
        <div className="card">
          <h2>Banco</h2>
          {dbOk ? (
            <p>
              <span className="badge ok">OK</span> Conexão respondendo.
            </p>
          ) : (
            <>
              <p>
                <span className="badge danger">erro</span> Falha na conexão.
              </p>
              <p className="error">{dbError}</p>
            </>
          )}
        </div>

        <div className="card">
          <h2>Fila de jobs</h2>
          <p>
            <span className="badge muted">pending</span> {pending}
          </p>
          <p>
            <span className="badge accent">running</span> {running}
          </p>
          <p>
            <span className="badge danger">error</span> {error}
          </p>
        </div>

        <div className="card">
          <h2>Integrações</h2>
          <p className="muted" style={{ fontSize: "0.8rem" }}>
            Presença de credenciais (nunca os valores). Ausência ativa modo
            dry-run.
          </p>
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
            {present.map((p) => (
              <li key={p.key}>
                {p.ok ? "✓" : "✗"} {p.key}
                {!p.ok && (
                  <span className="badge muted" style={{ marginLeft: "0.5rem" }}>
                    dry-run
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2>Última seleção</h2>
          {lastSelect ? (
            <>
              <p>
                <span
                  className={`badge ${
                    lastSelect.status === "done"
                      ? "ok"
                      : lastSelect.status === "error"
                        ? "danger"
                        : "muted"
                  }`}
                >
                  {lastSelect.status}
                </span>
              </p>
              <p className="muted">runDate: {fmt(lastSelect.runDate)}</p>
              <p className="muted">criado: {fmt(lastSelect.createdAt)}</p>
            </>
          ) : (
            <p className="muted">Nenhuma execução de selectDaily registrada.</p>
          )}
        </div>
      </div>
    </div>
  );
}
