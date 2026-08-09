import { describe, it, expect } from "vitest";
import { copyVariations } from "../src/core/copyVariations.js";
import { product, rule, flatHist } from "./helpers.js";

const opts = {
  seeds: [0, 1, 2, 3, 4],
  publicBaseUrl: "https://turbo.example.com",
  groupInviteUrl: "https://t.me/+abc123",
  postId: 42,
};

describe("copyVariations (Copy IA, deterministic)", () => {
  it("different seeds can produce different hooks (deterministic per seed)", () => {
    // urgency set -> rotation length 4, so seeds sweep more hooks.
    const p = product({ urgency: "oferta relâmpago encerra hoje" });
    const hist = flatHist(20, 100);
    const vars = copyVariations(p, hist, rule(), opts);

    const hooks = vars.map((v) => v.hook);
    // deterministic: same seed -> same hook on a second call
    const again = copyVariations(p, hist, rule(), opts);
    expect(again.map((v) => v.hook)).toEqual(hooks);
    // at least two distinct hooks across the seed set
    expect(new Set(hooks).size).toBeGreaterThan(1);
  });

  it("R2: amazon product -> wa routes via /oferta/ and never leaks amazon.com", () => {
    const p = product({
      source: "amazon",
      id: "B0AMAZON",
      productUrl: "https://amazon.com.br/dp/B0AMAZON",
      links: [{ channel: "grp", url: "https://amzn.to/xyz" }],
    });
    const vars = copyVariations(p, flatHist(20, 100), rule(), opts);
    for (const v of vars) {
      expect(v.wa).toContain("/oferta/");
      expect(v.wa).not.toContain("amazon.com");
      expect(v.wa).not.toContain("amzn.to");
    }
  });

  it("every variation has non-empty ig / wa / tg", () => {
    const vars = copyVariations(product(), flatHist(20, 100), rule(), opts);
    expect(vars.length).toBe(5);
    for (const v of vars) {
      expect(v.ig.trim().length).toBeGreaterThan(0);
      expect(v.wa.trim().length).toBeGreaterThan(0);
      expect(v.tg.trim().length).toBeGreaterThan(0);
    }
  });
});
