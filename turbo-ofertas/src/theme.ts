/** Visual + fixed-text theme for creatives and captions (§7). Pure constants. */

export const colors = {
  ink: "#15181B",
  paper: "#FFFFFF",
  accent: "#E8B21A",
  ok: "#14624A",
  danger: "#9E2B25",
  muted: "#9AA1A7",
} as const;

export const fonts = {
  display: "Archivo", // 800
  mono: "IBM Plex Mono", // 600
  body: "IBM Plex Sans",
} as const;

export const HANDLE = "@ofertas.turbobr";
export const SELO = "MENOR PREÇO 90 DIAS";

/** CTAs fixos dos criativos (§7). */
export const CTA_FEED = "LINK NA BIO";
export const CTA_STORY = "TOQUE NO LINK";

/** 5 hashtags for the IG caption (§7.3). */
export const IG_HASHTAGS = [
  "#ofertas",
  "#promoção",
  "#achadinhos",
  "#desconto",
  "#ofertasdodia",
] as const;

export const AFFILIATE_DISCLAIMER =
  "Link de afiliado — ganhamos comissão, você não paga nada a mais.";
