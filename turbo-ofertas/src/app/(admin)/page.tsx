import Link from "next/link";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { computeToday, toCoreProduct, toCoreRule } from "@/services/selection";
import { commissionR } from "@/core/prices";
import { displayBRL } from "@/lib/money";
import { daysAgo, today, truncDay } from "@/lib/dates";

export const dynamic = "force-dynamic";

const DAY_MS = 1000 * 60 * 60 * 24;
const CHART_DAYS = 14;

function dayKey(d: Date): string {
  return truncDay(d).toISOString();
}

export default async function CommandCenterPage() {
  await requireUser();

  const dbRule =
    (await prisma.rule.findUnique({ where: { id: 1 } })) ??
    (await prisma.rule.create({ data: { id: 1 } }));
  const rule = toCoreRule(dbRule);

  const since7 = daysAgo(7);
  const sinceChart = daysAgo(CHART_DAYS - 1);

  const [
    todayPosts,
    clicks7d,
    posts7d,
    failedJobs,
    mlPending,
    chartClicks,
    igSetting,
  ] = await Promise.all([
    prisma.post.findMany({
      where: { date: { gte: today() } },
      include: { product: true },
    }),
    prisma.clickEvent.count({ where: { createdAt: { gte: since7 } } }),
    prisma.post.count({ where: { date: { gte: since7 } } }),
    prisma.job.count({ where: { status: "error" } }),
    prisma.product.count({
      where: { source: "ml", active: true, links: { none: { channel: "cnl" } } },
    }),
    prisma.clickEvent.findMany({
      where: { createdAt: { gte: sinceChart } },
      select: { createdAt: true },
    }),
    prisma.setting.findUnique({ where: { key: "igTokenExpiresAt" } }),
  ]);

  // Comissão potencial hoje — soma de today's posts, senão dos aprovados de hoje.
  let comissaoHoje = new Decimal(0);
  if (todayPosts.length > 0) {
    comissaoHoje = todayPosts.reduce(
      (sum, p) => sum.plus(commissionR(toCoreProduct(p.product))),
      new Decimal(0),
    );
  } else {
    const preview = await computeToday(prisma, rule);
    const approved = [
      ...preview.slots.map((s) => s.product),
      ...preview.approvedNoSlot,
    ];
    comissaoHoje = approved.reduce(
      (sum, p) => sum.plus(commissionR(p)),
      new Decimal(0),
    );
  }

  // 14-day clicks chart buckets.
  const counts = new Map<string, number>();
  for (const ev of chartClicks) {
    const k = dayKey(ev.createdAt);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const startDay = truncDay(sinceChart);
  const days: { label: string; count: number }[] = [];
  for (let i = 0; i < CHART_DAYS; i++) {
    const d = new Date(startDay.getTime() + i * DAY_MS);
    const k = truncDay(d).toISOString();
    days.push({ label: `${d.getDate()}`, count: counts.get(k) ?? 0 });
  }
  const maxCount = Math.max(1, ...days.map((d) => d.count));

  // Alertas ativos (resumo — full em /alertas).
  const alertas: { icon: string; text: string; sev: string }[] = [];
  if (failedJobs > 0) {
    alertas.push({
      icon: "⚠️",
      text: `${failedJobs} job(s) com erro`,
      sev: "badge danger",
    });
  }
  if (mlPending > 0) {
    alertas.push({
      icon: "🔗",
      text: `${mlPending} produto(s) ML sem link de canal (cnl)`,
      sev: "badge accent",
    });
  }
  if (igSetting?.value) {
    const expires = new Date(igSetting.value);
    if (!Number.isNaN(expires.getTime())) {
      const daysLeft = Math.ceil((expires.getTime() - Date.now()) / DAY_MS);
      if (daysLeft <= 10) {
        alertas.push({
          icon: "🔑",
          text:
            daysLeft < 0
              ? "Token do Instagram expirado"
              : `Token do Instagram vence em ${daysLeft} dia(s)`,
          sev: "badge danger",
        });
      }
    }
  }

  return (
    <div>
      <h1>Command Center</h1>
      <p className="muted">Visão geral da operação em tempo real.</p>

      <div className="grid cols-4" style={{ marginBottom: "1.5rem" }}>
        <div className="kpi">
          <div className="value">{displayBRL(comissaoHoje)}</div>
          <div className="label">Comissão potencial hoje</div>
        </div>
        <div className="kpi">
          <div className="value">{clicks7d}</div>
          <div className="label">Cliques próprios 7d</div>
        </div>
        <div className="kpi">
          <div className="value">{posts7d}</div>
          <div className="label">Posts publicados 7d</div>
        </div>
        <div className="kpi">
          <div className="value">{failedJobs}</div>
          <div className="label">Falhas pendentes</div>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: "1rem" }}>Cliques · últimos 14 dias</h2>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            máx {maxCount}/dia
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "0.35rem",
            height: 120,
            marginTop: "0.75rem",
          }}
        >
          {days.map((d, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.25rem",
              }}
              title={`${d.count} clique(s)`}
            >
              <div
                style={{
                  width: "100%",
                  height: `${(d.count / maxCount) * 90}px`,
                  minHeight: 2,
                  background: "var(--accent)",
                  borderRadius: "4px 4px 0 0",
                }}
              />
              <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: "1rem" }}>Alertas ativos</h2>
            <Link href="/alertas" className="btn ghost small">
              Ver todos
            </Link>
          </div>
          {alertas.length === 0 ? (
            <p className="muted" style={{ marginBottom: 0 }}>
              Nenhum alerta ativo.
            </p>
          ) : (
            <div style={{ marginTop: "0.5rem" }}>
              {alertas.map((a, i) => (
                <div
                  className="row"
                  key={i}
                  style={{
                    justifyContent: "space-between",
                    padding: "0.4rem 0",
                    borderBottom:
                      i < alertas.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span style={{ fontSize: "0.9rem" }}>
                    <span style={{ marginRight: "0.5rem" }}>{a.icon}</span>
                    {a.text}
                  </span>
                  <span className={a.sev}>alerta</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ margin: 0, fontSize: "1rem" }}>Atalhos</h2>
          <div
            className="row"
            style={{ marginTop: "0.75rem", alignItems: "stretch" }}
          >
            <Link href="/hoje" className="btn accent">
              Rodar seleção
            </Link>
            <Link href="/importar" className="btn">
              Importar
            </Link>
            <Link href="/links" className="btn ghost">
              Pendentes de link
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
