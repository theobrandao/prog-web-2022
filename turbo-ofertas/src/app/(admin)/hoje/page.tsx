import Link from "next/link";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { computeToday, toCoreRule } from "@/services/selection";
import { commissionR } from "@/core/prices";
import { displayBRL } from "@/lib/money";
import type { CoreProduct, SelectResult } from "@/core/types";
import RunSelectionButton from "../_components/RunSelectionButton";

type TodayView = SelectResult & { pendingMlLinks: CoreProduct[] };

export const dynamic = "force-dynamic";

function SourceBadge({ source }: { source: string }) {
  return <span className={`badge ${source}`}>{source}</span>;
}

function PriceLine({ p }: { p: CoreProduct }) {
  return (
    <p style={{ margin: "0.25rem 0" }}>
      <span className="price">{displayBRL(p.currentPrice.toString())}</span>{" "}
      {p.anchorPrice && (
        <span className="strike">{displayBRL(p.anchorPrice.toString())}</span>
      )}
    </p>
  );
}

export default async function HojePage() {
  await requireUser();

  const dbRule =
    (await prisma.rule.findUnique({ where: { id: 1 } })) ??
    (await prisma.rule.create({ data: { id: 1 } }));
  const rule = toCoreRule(dbRule);

  const [todayRaw, totalProducts] = await Promise.all([
    computeToday(prisma, rule),
    prisma.product.count(),
  ]);
  const today = todayRaw as TodayView;

  const aprovados = today.slots.length + today.approvedNoSlot.length;
  const barrados = today.rejected.length;
  const comissaoDia = today.slots.reduce(
    (sum, s) => sum.plus(commissionR(s.product)),
    new Decimal(0),
  );

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>Hoje</h1>
        <RunSelectionButton />
      </div>

      <div className="grid cols-4" style={{ marginBottom: "1.5rem" }}>
        <div className="kpi">
          <div className="value">{totalProducts}</div>
          <div className="label">Monitorados</div>
        </div>
        <div className="kpi">
          <div className="value">{aprovados}</div>
          <div className="label">Aprovados</div>
        </div>
        <div className="kpi">
          <div className="value">{barrados}</div>
          <div className="label">Barrados</div>
        </div>
        <div className="kpi">
          <div className="value">{displayBRL(comissaoDia)}</div>
          <div className="label">Comissão potencial do dia</div>
        </div>
      </div>

      <h2>Vagas do dia</h2>
      {today.slots.length === 0 ? (
        <div className="card">
          <p className="muted">
            Nenhuma oferta passou no filtro hoje. Regra da casa: não completar
            cota.
          </p>
        </div>
      ) : (
        <div className="grid cols-2">
          {today.slots.map((s) => (
            <div className="card" key={s.slot}>
              <span className="badge accent">
                Vaga {s.slot} · ticket {s.band}
              </span>{" "}
              <SourceBadge source={s.product.source} />
              <h3 style={{ fontSize: "1rem", marginTop: "0.5rem" }}>
                {s.product.title}
              </h3>
              <PriceLine p={s.product} />
              <p className="muted" style={{ fontSize: "0.8rem" }}>
                Comissão: {displayBRL(commissionR(s.product))}
              </p>
            </div>
          ))}
        </div>
      )}

      <details style={{ marginTop: "1.5rem" }}>
        <summary>Aprovados sem vaga ({today.approvedNoSlot.length})</summary>
        {today.approvedNoSlot.length === 0 ? (
          <p className="muted">Nenhum.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Origem</th>
                  <th>Preço</th>
                </tr>
              </thead>
              <tbody>
                {today.approvedNoSlot.map((p) => (
                  <tr key={p.id}>
                    <td>{p.title}</td>
                    <td>
                      <SourceBadge source={p.source} />
                    </td>
                    <td>{displayBRL(p.currentPrice.toString())}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </details>

      <h2 style={{ marginTop: "1.5rem" }}>Barrados ({barrados})</h2>
      {today.rejected.length === 0 ? (
        <p className="muted">Nenhum produto barrado.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Origem</th>
                <th>Motivos</th>
              </tr>
            </thead>
            <tbody>
              {today.rejected.map((r) => (
                <tr key={r.product.id}>
                  <td>{r.product.title}</td>
                  <td>
                    <SourceBadge source={r.product.source} />
                  </td>
                  <td className="reasons">{r.reasons.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ marginTop: "1.5rem" }}>
        ML pendentes de link ({today.pendingMlLinks.length})
      </h2>
      {today.pendingMlLinks.length === 0 ? (
        <p className="muted">Nenhum link pendente.</p>
      ) : (
        <div className="card">
          <ul>
            {today.pendingMlLinks.map((p) => (
              <li key={p.id}>{p.title}</li>
            ))}
          </ul>
          <Link href="/links" className="btn accent small">
            Gerenciar links
          </Link>
        </div>
      )}
    </div>
  );
}
