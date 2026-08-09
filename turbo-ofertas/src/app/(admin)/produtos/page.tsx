import Link from "next/link";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { min90, commissionR } from "@/core/prices";
import { toCoreProduct, toCoreRule } from "@/services/selection";
import { evaluate } from "@/core/evaluate";
import { displayBRL } from "@/lib/money";
import type { PricePoint } from "@/core/types";
import { daysAgo } from "@/lib/dates";
import { HISTORY_WINDOW_DAYS } from "@/core/constants";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "todas", label: "Todas" },
  { key: "aprovados", label: "Aprovados" },
  { key: "analise", label: "Em análise" },
  { key: "bloqueados", label: "Bloqueados" },
] as const;

type TabKey = (typeof TABS)[number]["key"];
type Category = "aprovados" | "analise" | "bloqueados";

const PAGE_SIZE = 100;

/** Tiny inline SVG sparkline from the last ~30 price points. */
function Sparkline({ hist }: { hist: PricePoint[] }) {
  const pts = hist.slice(-30);
  if (pts.length < 2) return <span className="muted">—</span>;

  const w = 90;
  const h = 24;
  const vals = pts.map((p) => p.price.toNumber());
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const step = w / (pts.length - 1);
  const points = vals
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / span) * (h - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const last = vals[vals.length - 1];
  const first = vals[0];
  const stroke = last <= first ? "var(--ok)" : "var(--danger)";

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();

  const sp = await searchParams;
  const first = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const tab = (
    TABS.some((t) => t.key === first(sp.tab)) ? first(sp.tab) : "todas"
  ) as TabKey;
  const source = first(sp.source) ?? "";
  const q = (first(sp.q) ?? "").trim();
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? "1", 10) || 1);

  const dbRule = await prisma.rule.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  const rule = toCoreRule(dbRule);

  const since = daysAgo(HISTORY_WINDOW_DAYS);
  const where: {
    source?: string;
    title?: { contains: string };
  } = {};
  if (source === "ml" || source === "shopee" || source === "amazon") {
    where.source = source;
  }
  if (q) where.title = { contains: q };

  const products = await prisma.product.findMany({
    where,
    include: {
      links: true,
      prices: { where: { date: { gte: since } }, orderBy: { date: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  const rows = products.map((p) => {
    const core = toCoreProduct(p);
    const hist: PricePoint[] = p.prices.map((pp) => ({
      date: pp.date,
      price: new Decimal(String(pp.price)),
    }));
    const result = evaluate(core, rule, hist);
    let category: Category;
    if (result.ok) {
      category = "aprovados";
    } else if (result.fails.every((f) => f.code === "HISTORICO")) {
      category = "analise";
    } else {
      category = "bloqueados";
    }
    return { p, core, hist, category };
  });

  const visible = rows.filter((r) => tab === "todas" || r.category === tab);

  const tabHref = (key: TabKey) => {
    const params = new URLSearchParams();
    params.set("tab", key);
    if (source) params.set("source", source);
    if (q) params.set("q", q);
    return `/produtos?${params.toString()}`;
  };

  const catBadge: Record<Category, string> = {
    aprovados: "badge ok",
    analise: "badge muted",
    bloqueados: "badge danger",
  };
  const catLabel: Record<Category, string> = {
    aprovados: "aprovado",
    analise: "em observação",
    bloqueados: "bloqueado",
  };

  return (
    <div>
      <h1>Produtos</h1>
      <p className="muted">
        {visible.length} de {products.length} produtos nesta página
        {page > 1 ? ` · página ${page}` : ""}.
      </p>

      <form method="get" className="row" style={{ marginBottom: "1rem" }}>
        <input type="hidden" name="tab" value={tab} />
        <div>
          <label htmlFor="q">Buscar título</label>
          <input id="q" name="q" defaultValue={q} placeholder="ex.: fone" />
        </div>
        <div>
          <label htmlFor="source">Origem</label>
          <select id="source" name="source" defaultValue={source}>
            <option value="">Todas</option>
            <option value="ml">ML</option>
            <option value="shopee">Shopee</option>
            <option value="amazon">Amazon</option>
          </select>
        </div>
        <button type="submit" className="accent">
          Filtrar
        </button>
      </form>

      <div className="row" style={{ gap: "0.5rem", marginBottom: "1rem" }}>
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={tabHref(t.key)}
            className={`btn ${t.key === tab ? "accent" : "ghost"} small`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Origem</th>
              <th>Preço</th>
              <th>Mín. 90d</th>
              <th>Comissão R$</th>
              <th>Tendência</th>
              <th>Avaliações</th>
              <th>Nota</th>
              <th>Reputação</th>
              <th>Status</th>
              <th>Ativo</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={11} className="muted">
                  Nenhum produto nesta aba.
                </td>
              </tr>
            ) : (
              visible.map(({ p, core, hist, category }) => {
                const floor = min90(hist);
                return (
                  <tr key={p.id}>
                    <td>
                      {p.productUrl ? (
                        <a
                          href={p.productUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ textDecoration: "underline" }}
                        >
                          {p.title}
                        </a>
                      ) : (
                        p.title
                      )}
                    </td>
                    <td>
                      <span className={`badge ${p.source}`}>{p.source}</span>
                    </td>
                    <td>{displayBRL(String(p.currentPrice))}</td>
                    <td>{floor ? displayBRL(floor) : "—"}</td>
                    <td>{displayBRL(commissionR(core))}</td>
                    <td>
                      <Sparkline hist={hist} />
                    </td>
                    <td>{p.reviews}</td>
                    <td>{String(p.rating)}</td>
                    <td>{p.sellerRep || "—"}</td>
                    <td>
                      <span className={catBadge[category]}>
                        {catLabel[category]}
                      </span>
                    </td>
                    <td>{p.active ? "sim" : "não"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {(page > 1 || products.length === PAGE_SIZE) && (
        <div className="row" style={{ marginTop: "1rem" }}>
          {page > 1 && (
            <Link
              href={tabHref(tab) + `&page=${page - 1}`}
              className="btn ghost small"
            >
              ← Anterior
            </Link>
          )}
          {products.length === PAGE_SIZE && (
            <Link
              href={tabHref(tab) + `&page=${page + 1}`}
              className="btn ghost small"
            >
              Próxima →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
