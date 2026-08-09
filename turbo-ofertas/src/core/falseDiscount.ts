import { median, sortedHist } from "./prices.js";
import type { PricePoint } from "./types.js";
import {
  FALSE_DISCOUNT_DROP_FACTOR,
  FALSE_DISCOUNT_PEAK_FACTOR,
} from "./constants.js";
import Decimal from "decimal.js";

/**
 * §5.4 — Detects a fake discount: price inflated >=25% above the recent baseline
 * and then "cut" >=15% off that inflated peak.
 *
 * @param hist  full price history (any order)
 * @param currentPrice today's price
 * @returns true when the discount is against a peak that never really held
 */
export function falseDiscount(
  hist: PricePoint[],
  currentPrice: Decimal,
): boolean {
  const sorted = sortedHist(hist);
  if (sorted.length === 0) return false;

  // Anchor "recent" to the last data point's day, not wall-clock, so the pure
  // function is deterministic and testable.
  const lastDay = sorted[sorted.length - 1].date.getTime();
  const DAY = 24 * 60 * 60 * 1000;

  const ult30: PricePoint[] = [];
  const ant60: PricePoint[] = [];
  for (const p of sorted) {
    const ageDays = Math.round((lastDay - p.date.getTime()) / DAY);
    if (ageDays < 30) ult30.push(p);
    else if (ageDays < 90) ant60.push(p);
  }

  if (ant60.length < 10) return false; // insufficient data; HISTORICO already guards

  const med = median(ant60.map((p) => p.price));
  const pico = ult30.reduce(
    (m, p) => (p.price.gt(m) ? p.price : m),
    ult30.length ? ult30[0].price : new Decimal(0),
  );

  return (
    pico.gt(med.mul(FALSE_DISCOUNT_PEAK_FACTOR)) &&
    currentPrice.lt(pico.mul(FALSE_DISCOUNT_DROP_FACTOR))
  );
}
