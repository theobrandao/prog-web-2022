import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { computeToday, toCoreRule } from "@/services/selection";
import { commissionR } from "@/core/prices";
import type { CoreProduct, SelectResult } from "@/core/types";

type TodayView = SelectResult & { pendingMlLinks: CoreProduct[] };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeProduct(p: CoreProduct) {
  return {
    id: p.id,
    source: p.source,
    title: p.title,
    productUrl: p.productUrl ?? null,
    currentPrice: p.currentPrice.toString(),
    anchorPrice: p.anchorPrice != null ? p.anchorPrice.toString() : null,
    commissionPct: p.commissionPct.toString(),
    commissionR: commissionR(p).toString(),
    reviews: p.reviews,
    rating: p.rating.toString(),
    sellerRep: p.sellerRep,
    links: p.links,
  };
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const date = dateParam ? new Date(dateParam) : new Date();

  const dbRule =
    (await prisma.rule.findUnique({ where: { id: 1 } })) ??
    (await prisma.rule.create({ data: { id: 1 } }));

  const result = (await computeToday(
    prisma,
    toCoreRule(dbRule),
    date,
  )) as TodayView;

  return NextResponse.json({
    slots: result.slots.map((s) => ({
      slot: s.slot,
      band: s.band,
      product: serializeProduct(s.product),
    })),
    approvedNoSlot: result.approvedNoSlot.map(serializeProduct),
    rejected: result.rejected.map((r) => ({
      product: serializeProduct(r.product),
      reasons: r.reasons,
    })),
    pendingMlLinks: result.pendingMlLinks.map(serializeProduct),
  });
}
