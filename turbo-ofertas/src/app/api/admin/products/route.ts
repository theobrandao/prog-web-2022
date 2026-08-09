import { NextResponse } from "next/server";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { min90, commissionR } from "@/core/prices";
import { toCoreProduct } from "@/services/selection";
import type { PricePoint } from "@/core/types";
import { daysAgo } from "@/lib/dates";
import { HISTORY_WINDOW_DAYS } from "@/core/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const activeParam = url.searchParams.get("active");
  const source = url.searchParams.get("source");
  const q = url.searchParams.get("q");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);

  const where: Record<string, unknown> = {};
  if (activeParam === "true") where.active = true;
  else if (activeParam === "false") where.active = false;
  if (source) where.source = source;
  if (q) where.title = { contains: q };

  const since = daysAgo(HISTORY_WINDOW_DAYS);
  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        links: true,
        prices: { where: { date: { gte: since } }, orderBy: { date: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const items = products.map((p) => {
    const core = toCoreProduct(p);
    const hist: PricePoint[] = p.prices.map((pp) => ({
      date: pp.date,
      price: new Decimal(String(pp.price)),
    }));
    const floor = min90(hist);
    return {
      id: p.id,
      source: p.source,
      title: p.title,
      productUrl: p.productUrl,
      currentPrice: String(p.currentPrice),
      anchorPrice: p.anchorPrice != null ? String(p.anchorPrice) : null,
      commissionPct: String(p.commissionPct),
      commissionR: commissionR(core).toString(),
      min90: floor ? floor.toString() : null,
      reviews: p.reviews,
      rating: String(p.rating),
      sellerRep: p.sellerRep,
      active: p.active,
      links: core.links,
    };
  });

  return NextResponse.json({ items, page, total });
}
