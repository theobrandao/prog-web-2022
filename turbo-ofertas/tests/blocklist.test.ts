import { describe, it, expect } from "vitest";
import { normalize, matchedBlocklistTerm } from "../src/core/blocklist.js";

describe("blocklist", () => {
  it("normalizes accents and case", () => {
    expect(normalize("Réplica")).toBe("replica");
    expect(normalize("INSPIRADO")).toBe("inspirado");
    expect(normalize("  Estilo   Genérico ")).toBe("estilo generico");
  });

  it("matches accented/cased title against the blocklist", () => {
    const bl = "réplica,replica,similar,inspirado,estilo,genérico";
    expect(matchedBlocklistTerm("Tênis Réplica Premium", bl)).not.toBeNull();
    expect(matchedBlocklistTerm("Camisa INSPIRADO no time", bl)).toBe("inspirado");
    expect(matchedBlocklistTerm("Relógio genuíno original", bl)).toBeNull();
  });
});
