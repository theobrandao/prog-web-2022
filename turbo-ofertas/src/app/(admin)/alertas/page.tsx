import Decimal from "decimal.js";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { daysAgo } from "@/lib/dates";

export const dynamic = "force-dynamic";

type Severity = "alta" | "média" | "baixa";

interface Alert {
  icon: string;
  text: string;
  severity: Severity;
}

const SEVERITY_BADGE: Record<Severity, string> = {
  alta: "badge danger",
  média: "badge accent",
  baixa: "badge muted",
};

export default async function AlertasPage() {
  await requireUser();

  const alerts: Alert[] = [];

  // 1. Jobs com falha (recentes)
  const failedJobs = await prisma.job.findMany({
    where: { status: "error", createdAt: { gte: daysAgo(7) } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  for (const job of failedJobs) {
    alerts.push({
      icon: "⚠️",
      text: `Falha no job ${job.type}`,
      severity: "alta",
    });
  }

  // 2. ML pendentes de link (sem link 'cnl')
  const mlPending = await prisma.product.count({
    where: {
      source: "ml",
      active: true,
      links: { none: { channel: "cnl" } },
    },
  });
  if (mlPending > 0) {
    alerts.push({
      icon: "🔗",
      text: `${mlPending} produto(s) ML ativo(s) sem link de canal (cnl)`,
      severity: "média",
    });
  }

  // 3. Queda de preço forte (>= 15% entre os dois últimos preços)
  const productsForDrop = await prisma.product.findMany({
    where: { active: true },
    include: {
      prices: { orderBy: { date: "desc" }, take: 2 },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  for (const p of productsForDrop) {
    if (p.prices.length < 2) continue;
    const latest = new Decimal(String(p.prices[0].price));
    const prev = new Decimal(String(p.prices[1].price));
    if (prev.lte(0)) continue;
    const dropPct = prev.minus(latest).div(prev).times(100);
    if (dropPct.gte(15)) {
      alerts.push({
        icon: "📉",
        text: `Queda de ${dropPct.toFixed(0)}% em "${p.title}"`,
        severity: "média",
      });
    }
  }

  // 4. Token IG a vencer (dentro de 10 dias)
  const igSetting = await prisma.setting.findUnique({
    where: { key: "igTokenExpiresAt" },
  });
  if (igSetting?.value) {
    const expires = new Date(igSetting.value);
    if (!Number.isNaN(expires.getTime())) {
      const msLeft = expires.getTime() - Date.now();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      if (daysLeft <= 10) {
        alerts.push({
          icon: "🔑",
          text:
            daysLeft < 0
              ? "Token do Instagram expirado"
              : `Token do Instagram vence em ${daysLeft} dia(s)`,
          severity: "alta",
        });
      }
    }
  }

  return (
    <div>
      <h1>Alertas Inteligentes</h1>
      <p className="muted">
        Alertas calculados a partir dos dados atuais do sistema.
      </p>

      {alerts.length === 0 ? (
        <p className="muted">Nenhum alerta ativo.</p>
      ) : (
        <div>
          {alerts.map((a, i) => (
            <div className="card" key={i}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.95rem" }}>
                  <span style={{ marginRight: "0.5rem" }}>{a.icon}</span>
                  {a.text}
                </span>
                <span className={SEVERITY_BADGE[a.severity]}>{a.severity}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
