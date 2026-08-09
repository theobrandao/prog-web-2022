import { describe, it, expect } from "vitest";
import { select } from "../src/core/select.js";
import { evaluate } from "../src/core/evaluate.js";
import type { CoreProduct, Evaluated, PricePoint } from "../src/core/types.js";
import { product, rule, flatHist, D } from "./helpers.js";

function ev(p: CoreProduct, hist: PricePoint[]): Evaluated {
  return { product: p, hist, result: evaluate(p, rule(), hist) };
}

function lowTicket(id: string, pct: number, reviews = 100): Evaluated {
  const p = product({ id, currentPrice: D(100), commissionPct: D(pct), reviews });
  return ev(p, flatHist(20, 100));
}

function highTicket(id: string, price = 400, pct = 10): Evaluated {
  const p = product({ id, currentPrice: D(price), commissionPct: D(pct) });
  return ev(p, flatHist(20, price));
}

describe("select", () => {
  it("reserves vaga 1 for a high-ticket item", () => {
    const evals = [highTicket("H1"), lowTicket("L1", 10), lowTicket("L2", 12)];
    const res = select(evals, rule());
    expect(res.slots).toHaveLength(3);
    expect(res.slots[0].band).toBe("alto");
    expect(res.slots[0].product.id).toBe("H1");
    expect(res.slots[0].slot).toBe(1);
  });

  it("fills only with low-ticket when no high-ticket exists", () => {
    const evals = [lowTicket("L1", 20), lowTicket("L2", 15), lowTicket("L3", 10)];
    const res = select(evals, rule());
    expect(res.slots.map((s) => s.product.id)).toEqual(["L1", "L2", "L3"]);
    expect(res.slots.every((s) => s.band === "baixo")).toBe(true);
  });

  it("publishes fewer than slotsPerDay when approvals are short (R5)", () => {
    const rejected = ev(product({ id: "R1", active: false }), flatHist(20, 100));
    const evals = [lowTicket("L1", 20), rejected];
    const res = select(evals, rule());
    expect(res.slots).toHaveLength(1);
    expect(res.rejected.map((r) => r.product.id)).toContain("R1");
  });

  it("orders by commissionR desc (desempate)", () => {
    const evals = [lowTicket("L1", 10), lowTicket("L2", 25), lowTicket("L3", 18)];
    const res = select(evals, rule());
    expect(res.slots.map((s) => s.product.id)).toEqual(["L2", "L3", "L1"]);
  });

  it("tie on commissionR breaks by reviews desc", () => {
    const evals = [lowTicket("A", 10, 50), lowTicket("B", 10, 300)];
    const res = select(evals, rule());
    expect(res.slots.map((s) => s.product.id)).toEqual(["B", "A"]);
  });

  it("never repeats a product published in the last 7 days", () => {
    const evals = [lowTicket("L1", 20), lowTicket("L2", 15)];
    const res = select(evals, rule(), {
      recentlyPublishedProductIds: new Set(["L1"]),
    });
    expect(res.slots.map((s) => s.product.id)).toEqual(["L2"]);
    expect(res.slots).toHaveLength(1);
  });

  it("a second high-ticket can take a leftover slot", () => {
    const evals = [highTicket("H1", 400, 10), highTicket("H2", 500, 10)];
    const res = select(evals, rule());
    // H2 has higher commissionR (50 > 40) -> vaga1(alto); no low tickets; H1 fills leftover
    expect(res.slots).toHaveLength(2);
    expect(res.slots[0].product.id).toBe("H2");
    expect(res.slots[1].product.id).toBe("H1");
    expect(res.slots[1].band).toBe("alto");
  });

  it("respects slotsPerDay cap and reports approvedNoSlot", () => {
    const evals = [
      lowTicket("L1", 25),
      lowTicket("L2", 20),
      lowTicket("L3", 15),
      lowTicket("L4", 10),
    ];
    const res = select(evals, rule({ slotsPerDay: 3 }));
    expect(res.slots).toHaveLength(3);
    expect(res.approvedNoSlot.map((p) => p.id)).toEqual(["L4"]);
  });
});
