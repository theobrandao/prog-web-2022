import Decimal from "decimal.js";
import type { PrismaClient } from "@prisma/client";
import type { CoreProduct, CoreRule, Evaluated, PricePoint } from "../core/types.js";
import { evaluate } from "../core/evaluate.js";
import { select, type SelectResult } from "../core/select.js";
import { daysAgo, truncDay } from "../lib/dates.js";
import { HISTORY_WINDOW_DAYS, REPUBLISH_COOLDOWN_DAYS } from "../core/constants.js";

type DbProduct = Awaited<ReturnType<PrismaClient["product"]["findMany"]>>[number] & {
  links?: { channel: string; url: string }[];
  prices?: { date: Date; price: unknown }[];
};

export function toCoreRule(r: {
  minCommissionR: unknown;
  minCommissionPct: unknown;
  minPrice: unknown;
  maxPrice: unknown;
  minReviews: number;
  minRating: unknown;
  highTicket: unknown;
  slotsPerDay: number;
  blocklist: string;
}): CoreRule {
  return {
    minCommissionR: new Decimal(String(r.minCommissionR)),
    minCommissionPct: new Decimal(String(r.minCommissionPct)),
    minPrice: new Decimal(String(r.minPrice)),
    maxPrice: new Decimal(String(r.maxPrice)),
    minReviews: r.minReviews,
    minRating: new Decimal(String(r.minRating)),
    highTicket: new Decimal(String(r.highTicket)),
    slotsPerDay: r.slotsPerDay,
    blocklist: r.blocklist,
  };
}

export function toCoreProduct(p: DbProduct): CoreProduct {
  return {
    id: p.id,
    source: p.source as CoreProduct["source"],
    title: p.title,
    productUrl: p.productUrl,
    currentPrice: new Decimal(String(p.currentPrice)),
    anchorPrice: p.anchorPrice != null ? new Decimal(String(p.anchorPrice)) : null,
    commissionPct: new Decimal(String(p.commissionPct)),
    coupon: p.coupon,
    couponHowTo: p.couponHowTo,
    priceNote: p.priceNote,
    sellerName: p.sellerName,
    comment: p.comment,
    shippingNote: p.shippingNote,
    urgency: p.urgency,
    reviews: p.reviews,
    rating: new Decimal(String(p.rating)),
    sellerRep: p.sellerRep,
    active: p.active,
    links: (p.links ?? []).map((l) => ({ channel: l.channel, url: l.url })),
  };
}

function toHist(p: DbProduct): PricePoint[] {
  return (p.prices ?? []).map((pp) => ({
    date: pp.date,
    price: new Decimal(String(pp.price)),
  }));
}

/** Load every product with its links and last-90-days price history. */
export async function loadEvaluated(
  prisma: PrismaClient,
  rule: CoreRule,
): Promise<Evaluated[]> {
  const since = daysAgo(HISTORY_WINDOW_DAYS);
  const products = await prisma.product.findMany({
    include: {
      links: true,
      prices: { where: { date: { gte: since } }, orderBy: { date: "asc" } },
    },
  });
  return products.map((p) => {
    const core = toCoreProduct(p as DbProduct);
    const hist = toHist(p as DbProduct);
    return { product: core, hist, result: evaluate(core, rule, hist) };
  });
}

export interface TodayResult extends SelectResult {
  pendingMlLinks: CoreProduct[];
}

/** Compute the day's selection preview (§4.1 /hoje). Pure read — no writes. */
export async function computeToday(
  prisma: PrismaClient,
  rule: CoreRule,
  date: Date = new Date(),
): Promise<TodayResult> {
  const evaluated = await loadEvaluated(prisma, rule);

  // products published in the last 7 days -> not repeated
  const cutoff = daysAgo(REPUBLISH_COOLDOWN_DAYS);
  const recentPosts = await prisma.post.findMany({
    where: { date: { gt: cutoff } },
    select: { productId: true },
  });
  const recentlyPublishedProductIds = new Set(recentPosts.map((p) => p.productId));

  const result = select(evaluated, rule, { recentlyPublishedProductIds });

  // ML pending links: ML products failing only/also on LINK
  const pendingMlLinks = evaluated
    .filter(
      (e) =>
        e.product.source === "ml" &&
        e.result.fails.some((f) => f.code === "LINK"),
    )
    .map((e) => e.product);

  return { ...result, pendingMlLinks };
}

export { truncDay };
