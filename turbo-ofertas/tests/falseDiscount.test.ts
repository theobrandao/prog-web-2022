import { describe, it, expect } from "vitest";
import { falseDiscount } from "../src/core/falseDiscount.js";
import { makeHist, D } from "./helpers.js";

describe("falseDiscount", () => {
  it("inflated peak then cut -> true", () => {
    // ant60 baseline 100, ult30 spiked to 200, today 150 (< 200*0.85=170)
    const hist = makeHist(90, (age) => {
      if (age >= 30) return 100;
      if (age >= 1) return 200;
      return 150;
    });
    expect(falseDiscount(hist, D(150))).toBe(true);
  });

  it("legitimate direct drop -> false", () => {
    // baseline 200 for ant60, price simply drops to 100 recently, no inflation
    const hist = makeHist(90, (age) => {
      if (age >= 30) return 200;
      return 100;
    });
    expect(falseDiscount(hist, D(100))).toBe(false);
  });

  it("short history -> false (ant60 < 10)", () => {
    const hist = makeHist(12, () => 100);
    expect(falseDiscount(hist, D(50))).toBe(false);
  });

  it("inflated but current still near peak -> false", () => {
    // spike to 200, today 190 (> 200*0.85=170) -> not a 'discount'
    const hist = makeHist(90, (age) => {
      if (age >= 30) return 100;
      if (age >= 1) return 200;
      return 190;
    });
    expect(falseDiscount(hist, D(190))).toBe(false);
  });
});
