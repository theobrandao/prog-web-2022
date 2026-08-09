import Decimal from "decimal.js";
import type { CoreProduct, CoreRule, PricePoint } from "../src/core/types.js";

export function D(v: number | string): Decimal {
  return new Decimal(v);
}

export const defaultRule: CoreRule = {
  minCommissionR: D(5),
  minCommissionPct: D(8),
  minPrice: D(25),
  maxPrice: D(2000),
  minReviews: D(50).toNumber(),
  minRating: D(4.5),
  highTicket: D(300),
  slotsPerDay: 3,
  blocklist: "réplica,replica,similar,inspirado,estilo,genérico",
};

export function rule(overrides: Partial<CoreRule> = {}): CoreRule {
  return { ...defaultRule, ...overrides };
}

export function product(overrides: Partial<CoreProduct> = {}): CoreProduct {
  return {
    id: "MLB1",
    source: "ml",
    title: "Produto de teste com nome longo o suficiente",
    productUrl: "https://mercadolivre.com.br/p/MLB1",
    currentPrice: D(100),
    anchorPrice: null,
    commissionPct: D(10),
    coupon: null,
    couponHowTo: null,
    priceNote: null,
    sellerName: null,
    comment: null,
    shippingNote: null,
    urgency: null,
    reviews: 100,
    rating: D(4.8),
    sellerRep: "verde",
    active: true,
    links: [
      { channel: "grp", url: "https://mercadolivre.com.br/sec/grp" },
      { channel: "cnl", url: "https://mercadolivre.com.br/sec/cnl" },
    ],
    ...overrides,
  };
}

/**
 * Build `days` days of price history ending on `endDate` (default 2024-06-30),
 * one point per day. `priceFor(ageDays)` returns the price for a point that many
 * days before the end (0 = most recent).
 */
export function makeHist(
  days: number,
  priceFor: (ageDays: number) => number | Decimal,
  endDate = new Date("2024-06-30T00:00:00-03:00"),
): PricePoint[] {
  const out: PricePoint[] = [];
  const DAY = 24 * 60 * 60 * 1000;
  for (let age = days - 1; age >= 0; age--) {
    const p = priceFor(age);
    out.push({
      date: new Date(endDate.getTime() - age * DAY),
      price: p instanceof Decimal ? p : D(p),
    });
  }
  return out;
}

/** Flat history at a constant price. */
export function flatHist(days: number, price: number): PricePoint[] {
  return makeHist(days, () => price);
}
