import Decimal from "decimal.js";
import type { CoreProduct, PricePoint } from "./types.js";

/** Sort price history ascending by date (does not mutate input). */
export function sortedHist(hist: PricePoint[]): PricePoint[] {
  return [...hist].sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Minimum price over history. Returns null on empty history. */
export function min90(hist: PricePoint[]): Decimal | null {
  if (hist.length === 0) return null;
  return hist.reduce(
    (m, p) => (p.price.lt(m) ? p.price : m),
    hist[0].price,
  );
}

/** Maximum price over history. Returns null on empty history. */
export function max90(hist: PricePoint[]): Decimal | null {
  if (hist.length === 0) return null;
  return hist.reduce(
    (m, p) => (p.price.gt(m) ? p.price : m),
    hist[0].price,
  );
}

/** Commission in reais = currentPrice * commissionPct / 100 (full precision). */
export function commissionR(p: CoreProduct): Decimal {
  return p.currentPrice.mul(p.commissionPct).div(100);
}

/** Median of a list of Decimals. Assumes non-empty. */
export function median(values: Decimal[]): Decimal {
  const sorted = [...values].sort((a, b) => a.cmp(b));
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return sorted[mid - 1].plus(sorted[mid]).div(2);
}
