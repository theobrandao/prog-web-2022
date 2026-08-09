import { describe, it, expect } from "vitest";
import { buildWaMessage, buildTgMessage, buildIgCaption } from "../src/core/texts.js";
import { product, D } from "./helpers.js";

const baseOpts = {
  postId: 42,
  channel: "grp",
  hook: "ACHADO DO DIA 🎯",
  publicBaseUrl: "https://turbo.example.com",
  groupInviteUrl: "https://t.me/+abc123",
};

describe("texts / messages", () => {
  it("with anchor renders 'De R$ x por R$ y'", () => {
    const msg = buildWaMessage(
      product({ anchorPrice: D(199.9), currentPrice: D(149.9) }),
      "https://mercadolivre.com.br/x",
      baseOpts,
    );
    expect(msg).toContain("🔥 De R$ 199,90 por R$ 149,90");
  });

  it("without anchor and no note renders 'R$ y à vista'; never invents an anchor", () => {
    const msg = buildWaMessage(
      product({ anchorPrice: null, currentPrice: D(149.9) }),
      "https://mercadolivre.com.br/x",
      baseOpts,
    );
    expect(msg).toContain("🔥 R$ 149,90 à vista");
    expect(msg).not.toContain("De R$");
  });

  it("high ticket without anchor uses priceNote when present ('via Pix')", () => {
    const msg = buildWaMessage(
      product({ anchorPrice: null, currentPrice: D(1899), priceNote: "via Pix" }),
      "https://mercadolivre.com.br/x",
      baseOpts,
    );
    expect(msg).toContain("🔥 R$ 1.899,00 via Pix");
    expect(msg).not.toContain("De R$");
  });

  it("coupon appears when present, absent otherwise", () => {
    const withC = buildWaMessage(
      product({ coupon: "TURBO10" }),
      "https://mercadolivre.com.br/x",
      baseOpts,
    );
    expect(withC).toContain("🎟️ Cupom: TURBO10");

    const withoutC = buildWaMessage(product({ coupon: null }), "https://mercadolivre.com.br/x", baseOpts);
    expect(withoutC).not.toContain("🎟️");
  });

  it("empty couponHowTo/shipping produce no hollow lines", () => {
    const msg = buildWaMessage(
      product({ couponHowTo: null, shippingNote: null, sellerName: null }),
      "https://mercadolivre.com.br/x",
      baseOpts,
    );
    expect(msg).not.toContain("ℹ️");
    expect(msg).not.toContain("📦");
    expect(msg).not.toContain("🏪");
    // no line is just whitespace-with-a-marker; blank lines are only the intended separators
    expect(msg).not.toMatch(/\n[ \t]+\n/);
  });

  it("group invite footer is present in every message", () => {
    const wa = buildWaMessage(product(), "https://mercadolivre.com.br/x", baseOpts);
    const tg = buildTgMessage(product(), "https://mercadolivre.com.br/x", baseOpts);
    expect(wa).toContain("Convide amigos para o grupo: https://t.me/+abc123");
    expect(tg).toContain("Convide amigos para o grupo: https://t.me/+abc123");
    expect(wa).toContain("Link de afiliado — ganhamos comissão");
  });

  it("kit unitLine is rendered with an arrow when provided", () => {
    const msg = buildWaMessage(
      product(),
      "https://mercadolivre.com.br/x",
      { ...baseOpts, unitLine: "sai por R$ 3,70 cada" },
    );
    expect(msg).toContain("→ sai por R$ 3,70 cada");
  });

  describe("R2 — Amazon never leaks into forward messages", () => {
    it("amazon source routes through the offer page", () => {
      const msg = buildWaMessage(
        product({ id: "B000000000", source: "amazon", sellerRep: "", links: [] }),
        "https://amzn.to/xxxx",
        baseOpts,
      );
      expect(msg).not.toMatch(/amzn\.to|amazon\.com/i);
      expect(msg).toContain("/oferta/42?src=grp");
    });

    it("amazon-looking raw link on any source is also routed", () => {
      const msg = buildTgMessage(
        product({ source: "ml" }),
        "https://www.amazon.com/dp/B000",
        baseOpts,
      );
      expect(msg).not.toMatch(/amzn\.to|amazon\.com/i);
      expect(msg).toContain("/oferta/42");
    });

    it("non-amazon link is used raw", () => {
      const msg = buildWaMessage(product(), "https://mercadolivre.com.br/sec/x", baseOpts);
      expect(msg).toContain("Compre aqui: https://mercadolivre.com.br/sec/x");
    });
  });
});

describe("buildIgCaption", () => {
  it("includes hook, price and the 5 hashtags", () => {
    const cap = buildIgCaption(product({ coupon: "TURBO10", anchorPrice: D(200), currentPrice: D(150) }), {
      hook: "ACHADO DO DIA 🎯",
    });
    expect(cap).toContain("ACHADO DO DIA 🎯");
    expect(cap).toContain("💰 De R$ 200,00 por R$ 150,00");
    expect(cap).toContain("🎟️ Cupom: TURBO10");
    expect(cap).toContain("#ofertas #promoção #achadinhos #desconto #ofertasdodia");
    expect(cap).toContain("👉 Link no story e na bio");
  });
});
