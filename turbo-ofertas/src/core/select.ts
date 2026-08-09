import Decimal from "decimal.js";
import type {
  CoreProduct,
  CoreRule,
  Evaluated,
  PricePoint,
  SelectResult,
  Slot,
} from "./types.js";
import { commissionR, min90 } from "./prices.js";
import { reasonsFrom } from "./evaluate.js";

export interface SelectOptions {
  /** Product ids published in the last 7 days — never repeated (§5.3). */
  recentlyPublishedProductIds?: Set<string>;
}

/** % drop of today's price vs the previous 90d floor (history excluding the latest day). */
function dropVsPrevFloor(product: CoreProduct, hist: PricePoint[]): Decimal {
  if (hist.length < 2) return new Decimal(0);
  const sorted = [...hist].sort((a, b) => a.date.getTime() - b.date.getTime());
  const prev = sorted.slice(0, -1);
  const prevMin = min90(prev);
  if (!prevMin || prevMin.lte(0)) return new Decimal(0);
  return prevMin.minus(product.currentPrice).div(prevMin);
}

/** Descending comparator: commissionR, then drop%, then reviews, then id (stable). */
function makeComparator() {
  return (a: Evaluated, b: Evaluated): number => {
    const cr = commissionR(b.product).cmp(commissionR(a.product));
    if (cr !== 0) return cr;
    const drop = dropVsPrevFloor(b.product, b.hist).cmp(
      dropVsPrevFloor(a.product, a.hist),
    );
    if (drop !== 0) return drop;
    if (b.product.reviews !== a.product.reviews) {
      return b.product.reviews - a.product.reviews;
    }
    return a.product.id.localeCompare(b.product.id);
  };
}

/**
 * §5.3 — Pick the day's slots. Never lowers a criterion, never repeats a product
 * published in the last 7 days, and publishes fewer than slotsPerDay when there
 * aren't enough approved products (R5).
 */
export function select(
  evaluated: Evaluated[],
  rule: CoreRule,
  opts: SelectOptions = {},
): SelectResult {
  const recent = opts.recentlyPublishedProductIds ?? new Set<string>();

  const rejected = evaluated
    .filter((e) => !e.result.ok)
    .map((e) => ({ product: e.product, reasons: reasonsFrom(e.result) }));

  const approved = evaluated.filter(
    (e) => e.result.ok && !recent.has(e.product.id),
  );

  const cmp = makeComparator();
  const alto = approved
    .filter((e) => e.product.currentPrice.gte(rule.highTicket))
    .sort(cmp);
  const baixo = approved
    .filter((e) => e.product.currentPrice.lt(rule.highTicket))
    .sort(cmp);

  const slots: Slot[] = [];
  const used = new Set<string>();
  const cap = rule.slotsPerDay;

  // Vaga 1 reserved for a high-ticket item when one exists.
  if (alto.length > 0) {
    slots.push({ slot: 1, band: "alto", product: alto[0].product });
    used.add(alto[0].product.id);
  }

  // Fill remaining slots with low-ticket items.
  for (const e of baixo) {
    if (slots.length >= cap) break;
    if (used.has(e.product.id)) continue;
    slots.push({ slot: slots.length + 1, band: "baixo", product: e.product });
    used.add(e.product.id);
  }

  // Any leftover slot can be taken by additional high-ticket items.
  for (const e of alto) {
    if (slots.length >= cap) break;
    if (used.has(e.product.id)) continue;
    slots.push({ slot: slots.length + 1, band: "alto", product: e.product });
    used.add(e.product.id);
  }

  const approvedNoSlot = approved
    .filter((e) => !used.has(e.product.id))
    .map((e) => e.product);

  return { slots, approvedNoSlot, rejected };
}
