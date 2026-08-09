import { describe, it, expect } from "vitest";
import { evaluate } from "../src/core/evaluate.js";
import type { CheckCode } from "../src/core/types.js";
import { product, rule, flatHist, makeHist, D } from "./helpers.js";

function failCodes(codes: CheckCode[]) {
  return codes;
}

describe("evaluate", () => {
  it("approves a clean product", () => {
    const r = evaluate(product(), rule(), flatHist(20, 100));
    expect(r.ok).toBe(true);
    expect(r.fails).toHaveLength(0);
    expect(r.checks.map((c) => c.code)).toEqual([
      "HISTORICO",
      "FUNDO_90D",
      "FAIXA_PRECO",
      "COMISSAO_PCT",
      "COMISSAO_R",
      "AVALIACOES",
      "NOTA",
      "REPUTACAO",
      "BLOCKLIST",
      "DESCONTO_FALSO",
      "LINK",
      "ATIVO",
    ]);
  });

  it("HISTORICO: under 14 days -> EM_OBSERVACAO", () => {
    const r = evaluate(product(), rule(), flatHist(9, 100));
    expect(r.ok).toBe(false);
    const h = r.fails.find((f) => f.code === "HISTORICO");
    expect(h?.detail).toBe("EM_OBSERVACAO (9/14 dias)");
  });

  it("FUNDO_90D: above 90d floor fails", () => {
    const r = evaluate(product({ currentPrice: D(120) }), rule(), flatHist(20, 100));
    expect(r.fails.map((f) => f.code)).toContain("FUNDO_90D");
  });

  it("FUNDO_90D: exact tie within tolerance passes", () => {
    // current == min90 exactly
    const r = evaluate(product({ currentPrice: D(100) }), rule(), flatHist(20, 100));
    expect(r.fails.map((f) => f.code)).not.toContain("FUNDO_90D");
  });

  it("FAIXA_PRECO: below min and above max fail", () => {
    const low = evaluate(product({ currentPrice: D(10) }), rule(), flatHist(20, 10));
    expect(low.fails.map((f) => f.code)).toContain("FAIXA_PRECO");
    const high = evaluate(product({ currentPrice: D(2500) }), rule(), flatHist(20, 2500));
    expect(high.fails.map((f) => f.code)).toContain("FAIXA_PRECO");
  });

  it("COMISSAO_PCT: below minimum fails", () => {
    const r = evaluate(product({ commissionPct: D(5) }), rule(), flatHist(20, 100));
    expect(r.fails.map((f) => f.code)).toContain("COMISSAO_PCT");
  });

  it("COMISSAO_R: below minimum in reais fails", () => {
    // price 30, pct 10 => R$3 < R$5
    const r = evaluate(product({ currentPrice: D(30), commissionPct: D(10) }), rule(), flatHist(20, 30));
    expect(r.fails.map((f) => f.code)).toContain("COMISSAO_R");
  });

  it("AVALIACOES: below minimum fails", () => {
    const r = evaluate(product({ reviews: 10 }), rule(), flatHist(20, 100));
    expect(r.fails.map((f) => f.code)).toContain("AVALIACOES");
  });

  it("NOTA: below minimum fails", () => {
    const r = evaluate(product({ rating: D(4.0) }), rule(), flatHist(20, 100));
    expect(r.fails.map((f) => f.code)).toContain("NOTA");
  });

  it("REPUTACAO: ML with non-green rep fails; non-ML is exempt", () => {
    const ml = evaluate(product({ sellerRep: "outra" }), rule(), flatHist(20, 100));
    expect(ml.fails.map((f) => f.code)).toContain("REPUTACAO");

    const amazon = evaluate(
      product({ id: "B000000000", source: "amazon", sellerRep: "outra", links: [] }),
      rule(),
      flatHist(20, 100),
    );
    expect(amazon.fails.map((f) => f.code)).not.toContain("REPUTACAO");
  });

  it("BLOCKLIST: barred term fails", () => {
    const r = evaluate(
      product({ title: "Tênis Réplica Premium importado top" }),
      rule(),
      flatHist(20, 100),
    );
    expect(r.fails.map((f) => f.code)).toContain("BLOCKLIST");
  });

  it("LINK: ML without both grp and cnl fails", () => {
    const onlyGrp = evaluate(
      product({ links: [{ channel: "grp", url: "https://mercadolivre.com.br/x" }] }),
      rule(),
      flatHist(20, 100),
    );
    expect(onlyGrp.fails.map((f) => f.code)).toContain("LINK");

    const none = evaluate(product({ links: [] }), rule(), flatHist(20, 100));
    expect(none.fails.map((f) => f.code)).toContain("LINK");
  });

  it("LINK: amazon is exempt from link requirement", () => {
    const r = evaluate(
      product({ id: "B000000000", source: "amazon", sellerRep: "", links: [] }),
      rule(),
      flatHist(20, 100),
    );
    expect(r.fails.map((f) => f.code)).not.toContain("LINK");
  });

  it("LINK: shopee (fase 1) requires grp", () => {
    const ok = evaluate(
      product({ id: "SHP1", source: "shopee", sellerRep: "", links: [{ channel: "grp", url: "https://shopee.com.br/x" }] }),
      rule(),
      flatHist(20, 100),
    );
    expect(ok.fails.map((f) => f.code)).not.toContain("LINK");

    const missing = evaluate(
      product({ id: "SHP2", source: "shopee", sellerRep: "", links: [] }),
      rule(),
      flatHist(20, 100),
    );
    expect(missing.fails.map((f) => f.code)).toContain("LINK");
  });

  it("ATIVO: inactive product fails", () => {
    const r = evaluate(product({ active: false }), rule(), flatHist(20, 100));
    expect(r.fails.map((f) => f.code)).toContain("ATIVO");
  });

  it("DESCONTO_FALSO: inflated peak then cut fails the check", () => {
    // baseline ~100 for days 31..90, spike to 200 in last 30, current 150
    const hist = makeHist(90, (age) => {
      if (age >= 30) return 100; // ant60
      if (age >= 1) return 200; // ult30 spike
      return 150; // today
    });
    const r = evaluate(product({ currentPrice: D(150) }), rule(), hist);
    expect(r.fails.map((f) => f.code)).toContain("DESCONTO_FALSO");
  });
});
