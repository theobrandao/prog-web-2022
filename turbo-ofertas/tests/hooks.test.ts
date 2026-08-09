import { describe, it, expect } from "vitest";
import { pickHook, BASE_ROTATION } from "../src/core/hooks.js";
import { product, rule, flatHist, makeHist, D } from "./helpers.js";

describe("pickHook", () => {
  it("human comment is the hook and overrides everything", () => {
    const p = product({
      comment: "Testei esse e vale muito a pena",
      currentPrice: D(2669),
    });
    const r = pickHook(p, flatHist(20, 2669), 0, rule());
    expect(r.hook).toBe("Testei esse e vale muito a pena");
  });

  it("recent >=10% drop -> BAIXOU", () => {
    // yesterday 200, today 150 (<= 0.90*200=180)
    const hist = makeHist(20, (age) => (age === 0 ? 150 : 200));
    const r = pickHook(product({ currentPrice: D(150) }), hist, 0, rule());
    expect(r.hook).toBe("BAIXOU‼️");
  });

  it("high-ticket ceiling: R$ 2.669 -> 'POR MENOS DE R$ 3.000'", () => {
    const p = product({ title: "Smart TV 55 polegadas 4K UHD", currentPrice: D(2669) });
    const r = pickHook(p, flatHist(20, 2669), 0, rule());
    expect(r.hook).toContain("POR MENOS DE R$ 3.000");
  });

  it("high-ticket ceiling does NOT fire for R$ 2.100 (below 0.85*teto)", () => {
    const p = product({ title: "Smart TV barata", currentPrice: D(2100) });
    const r = pickHook(p, flatHist(20, 2100), 0, rule());
    expect(r.hook).not.toContain("POR MENOS DE");
  });

  it("historical comparison fires when max90 >= 1.15*price", () => {
    // low ticket so teto is skipped; old peak 130, yesterday==today 100
    const hist = makeHist(20, (age) => (age === 15 ? 130 : 100));
    const r = pickHook(product({ currentPrice: D(100) }), hist, 0, rule());
    expect(r.hook).toBe("JÁ CUSTOU R$ 130,00 — HOJE R$ 100,00 👀");
    expect(r.hook.toLowerCase()).not.toContain("outros sites");
  });

  it("historical comparison does NOT fire when max90 < 1.15*price", () => {
    const hist = makeHist(20, (age) => (age === 15 ? 110 : 100));
    const r = pickHook(product({ currentPrice: D(100) }), hist, 0, rule());
    expect(r.hook).not.toContain("JÁ CUSTOU");
  });

  it("kit: 10 x R$37 -> unitLine 'sai por R$ 3,70 cada'", () => {
    const p = product({ title: "Kit 10 unidades de meia esportiva", currentPrice: D(37) });
    const r = pickHook(p, flatHist(20, 37), 0, rule());
    expect(r.unitLine).toBe("sai por R$ 3,70 cada");
    expect(BASE_ROTATION).toContain(r.hook as (typeof BASE_ROTATION)[number]);
  });

  it("urgency hook only appears when urgency field is set", () => {
    const withUrg = product({ urgency: "oferta relâmpago encerra hoje" });
    // rotation length becomes 4; seed 3 -> index 3 = urgency template
    const r = pickHook(withUrg, flatHist(20, 100), 3, rule());
    expect(r.hook).toBe("⏰ oferta relâmpago encerra hoje — CORRE");

    // without urgency, no seed ever yields the urgency hook
    const noUrg = product({ urgency: null });
    for (let seed = 0; seed <= 10; seed++) {
      const rr = pickHook(noUrg, flatHist(20, 100), seed, rule());
      expect(rr.hook).not.toContain("CORRE");
    }
  });

  it("rotation is deterministic on seed (no urgency -> 3 hooks)", () => {
    const p = product();
    expect(pickHook(p, flatHist(20, 100), 0, rule()).hook).toBe(BASE_ROTATION[0]);
    expect(pickHook(p, flatHist(20, 100), 1, rule()).hook).toBe(BASE_ROTATION[1]);
    expect(pickHook(p, flatHist(20, 100), 2, rule()).hook).toBe(BASE_ROTATION[2]);
    expect(pickHook(p, flatHist(20, 100), 3, rule()).hook).toBe(BASE_ROTATION[0]);
  });
});
