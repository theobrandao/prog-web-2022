import Decimal from "decimal.js";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { min90, commissionR } from "@/core/prices";
import { toCoreProduct } from "@/services/selection";
import { displayBRL } from "@/lib/money";
import type { PricePoint } from "@/core/types";
import { daysAgo } from "@/lib/dates";
import { HISTORY_WINDOW_DAYS } from "@/core/constants";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  await requireUser();

  const since = daysAgo(HISTORY_WINDOW_DAYS);
  const products = await prisma.product.findMany({
    include: {
      links: true,
      prices: { where: { date: { gte: since } }, orderBy: { date: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1>Produtos</h1>
      <p className="muted">{products.length} produtos monitorados.</p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Origem</th>
              <th>Preço</th>
              <th>Mín. 90d</th>
              <th>Comissão R$</th>
              <th>Avaliações</th>
              <th>Nota</th>
              <th>Reputação</th>
              <th>Ativo</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const core = toCoreProduct(p);
              const hist: PricePoint[] = p.prices.map((pp) => ({
                date: pp.date,
                price: new Decimal(String(pp.price)),
              }));
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
                  <td>{p.reviews}</td>
                  <td>{String(p.rating)}</td>
                  <td>{p.sellerRep || "—"}</td>
                  <td>{p.active ? "sim" : "não"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
