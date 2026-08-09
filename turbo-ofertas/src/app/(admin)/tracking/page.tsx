import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { today, daysAgo } from "@/lib/dates";

export const dynamic = "force-dynamic";

function fmt(d: Date | null): string {
  if (!d) return "—";
  return d.toISOString().replace("T", " ").slice(0, 16);
}

const CHANNELS = ["grp", "cnl", "ig", "site", "direct"] as const;

export default async function TrackingPage() {
  await requireUser();

  const day0 = today();
  const d7 = daysAgo(7);
  const d30 = daysAgo(30);

  const [clicksToday, clicks7d, clicks30d, bySrc, recent] = await Promise.all([
    prisma.clickEvent.count({ where: { createdAt: { gte: day0 } } }),
    prisma.clickEvent.count({ where: { createdAt: { gte: d7 } } }),
    prisma.clickEvent.count({ where: { createdAt: { gte: d30 } } }),
    prisma.clickEvent.groupBy({
      by: ["src"],
      where: { createdAt: { gte: d30 } },
      _count: { _all: true },
    }),
    prisma.clickEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { post: { include: { product: { select: { title: true } } } } },
    }),
  ]);

  const countBySrc = new Map<string, number>();
  for (const g of bySrc) countBySrc.set(g.src, g._count._all);
  const maxSrc = Math.max(1, ...CHANNELS.map((c) => countBySrc.get(c) ?? 0));

  return (
    <div>
      <h1>Tracking</h1>
      <p className="muted">
        Cliques próprios registrados via páginas <code>/oferta</code>. Não
        representam os totais do programa de afiliados — apenas os redirecionamentos
        contabilizados por nós.
      </p>

      <div className="grid cols-4" style={{ marginBottom: "1.5rem" }}>
        <div className="kpi">
          <div className="value">{clicksToday}</div>
          <div className="label">Cliques hoje</div>
        </div>
        <div className="kpi">
          <div className="value">{clicks7d}</div>
          <div className="label">Últimos 7 dias</div>
        </div>
        <div className="kpi">
          <div className="value">{clicks30d}</div>
          <div className="label">Últimos 30 dias</div>
        </div>
      </div>

      <h2>Por canal (últimos 30 dias)</h2>
      <div className="card">
        {CHANNELS.map((c) => {
          const n = countBySrc.get(c) ?? 0;
          const pct = Math.round((n / maxSrc) * 100);
          return (
            <div
              className="row"
              key={c}
              style={{ alignItems: "center", marginBottom: "0.5rem" }}
            >
              <div style={{ width: "70px" }}>
                <span className="badge">{c}</span>
              </div>
              <div className="bar-track" style={{ flex: 1 }}>
                <div className="bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div style={{ width: "48px", textAlign: "right" }}>{n}</div>
            </div>
          );
        })}
      </div>

      <h2 style={{ marginTop: "1.5rem" }}>Últimos cliques</h2>
      {recent.length === 0 ? (
        <p className="muted">Nenhum clique registrado.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Canal</th>
                <th>Post</th>
                <th>Produto</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.id}>
                  <td>{fmt(c.createdAt)}</td>
                  <td>
                    <span className="badge">{c.src}</span>
                  </td>
                  <td>#{c.postId}</td>
                  <td>{c.post?.product?.title ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
