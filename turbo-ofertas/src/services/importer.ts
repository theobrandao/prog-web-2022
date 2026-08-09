import Decimal from "decimal.js";
import { parseBRL } from "../core/format.js";
import { parseCollectionDate, isFuture } from "../lib/dates.js";
import type { Source } from "../core/types.js";

/** Exact column order of template-entrada.xlsx (spec protocol §7 / §6). */
export const COLUMNS = [
  "fonte",
  "id_item",
  "titulo",
  "url_produto",
  "url_imagem",
  "url_video",
  "preco_atual",
  "preco_ancora",
  "condicao_preco",
  "comissao_pct",
  "cupom",
  "instrucao_cupom",
  "frete",
  "urgencia",
  "comentario",
  "avaliacoes",
  "nota",
  "reputacao_vendedor",
  "vendedor",
  "link_grp",
  "link_cnl",
  "link_ig",
  "data_coleta",
  "comissao_reais",
] as const;

export type RawRow = Record<string, string>;

export interface ParsedProduct {
  id: string;
  source: Source;
  title: string;
  productUrl: string;
  imageUrl: string;
  videoUrl: string | null;
  currentPrice: Decimal;
  anchorPrice: Decimal | null;
  priceNote: string | null;
  commissionPct: Decimal;
  coupon: string | null;
  couponHowTo: string | null;
  shippingNote: string | null;
  urgency: string | null;
  comment: string | null;
  reviews: number;
  rating: Decimal;
  sellerRep: string;
  sellerName: string | null;
  collectedAt: Date;
  links: { channel: string; url: string }[];
}

export interface RowResult {
  ok: boolean;
  /** 1-based sheet row number (data row), filled by the caller. */
  row?: number;
  reasons: string[];
  warnings: string[];
  product?: ParsedProduct;
  /** true for the ignorable example row */
  skipped?: boolean;
}

const HTTP_RE = /^https?:\/\/.+/i;
const MLB_RE = /^MLB\d+/;
const ASIN_RE = /^[A-Z0-9]{10}$/;

function clean(v: string | undefined): string {
  return (v ?? "").toString().trim();
}

function num(v: string): Decimal {
  return parseBRL(v);
}

/** §6 — validate a single raw row. Pure: no I/O. */
export function validateRow(raw: RawRow): RowResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const fonteRaw = clean(raw.fonte).toLowerCase();
  const id = clean(raw.id_item);
  const title = clean(raw.titulo);

  // Ignorable template example row.
  if (id === "MLB1234567890" && /EXEMPLO/i.test(title)) {
    return { ok: false, reasons: [], warnings: [], skipped: true };
  }

  // fonte
  let source: Source | null = null;
  if (fonteRaw === "tiktok") {
    reasons.push(
      "FONTE_INVALIDA: TikTok Shop não é suportado (R4) — sem módulo TikTok nesta versão",
    );
  } else if (fonteRaw === "ml" || fonteRaw === "shopee" || fonteRaw === "amazon") {
    source = fonteRaw as Source;
  } else {
    reasons.push(`FONTE_INVALIDA: "${fonteRaw}" (use ml|shopee|amazon)`);
  }

  // id_item
  if (!id) {
    reasons.push("ID_INVALIDO: vazio");
  } else if (source === "ml" && !MLB_RE.test(id)) {
    reasons.push(`ID_INVALIDO: ML exige formato MLB\\d+ (recebido "${id}")`);
  } else if (source === "amazon" && !ASIN_RE.test(id)) {
    reasons.push(`ID_INVALIDO: Amazon exige ASIN de 10 caracteres (recebido "${id}")`);
  }

  // titulo
  if (title.length < 8) reasons.push("TITULO_CURTO: mínimo 8 caracteres");

  // urls obrigatórias
  const productUrl = clean(raw.url_produto);
  const imageUrl = clean(raw.url_imagem);
  if (!HTTP_RE.test(productUrl)) reasons.push("URL_INVALIDA: url_produto");
  if (!HTTP_RE.test(imageUrl)) reasons.push("URL_INVALIDA: url_imagem");

  // url_video (opcional; aviso)
  let videoUrl: string | null = null;
  const videoRaw = clean(raw.url_video);
  if (videoRaw) {
    if (HTTP_RE.test(videoRaw) && /\.(mp4|m3u8)(\?|$)/i.test(videoRaw)) {
      videoUrl = videoRaw;
    } else {
      warnings.push("URL_INVALIDA: url_video ignorada (esperado mp4 ou m3u8)");
    }
  }

  // preco_atual
  const currentPrice = num(clean(raw.preco_atual));
  if (currentPrice.isNaN() || currentPrice.lte(0)) {
    reasons.push("PRECO_INVALIDO: preco_atual deve ser número > 0");
  }

  // preco_ancora (opcional; aviso)
  let anchorPrice: Decimal | null = null;
  const anchorRaw = clean(raw.preco_ancora);
  if (anchorRaw) {
    const a = num(anchorRaw);
    if (a.isNaN()) {
      warnings.push("ANCORA_MENOR_QUE_PRECO: âncora ilegível — importado sem âncora");
    } else if (!currentPrice.isNaN() && a.lte(currentPrice)) {
      warnings.push("ANCORA_MENOR_QUE_PRECO: âncora ≤ preço — importado sem âncora");
    } else {
      anchorPrice = a;
    }
  }

  // condicao_preco (<=40)
  const priceNote = capText(clean(raw.condicao_preco), 40);

  // comissao_pct
  const commissionPct = num(clean(raw.comissao_pct));
  if (commissionPct.isNaN() || commissionPct.lte(0) || commissionPct.gt(50)) {
    reasons.push("COMISSAO_INVALIDA: comissao_pct deve ser 0 < x ≤ 50");
  }

  // texts
  const coupon = clean(raw.cupom) || null;
  const couponHowTo = capText(clean(raw.instrucao_cupom), 200);
  const shippingNote = capText(clean(raw.frete), 60);
  const urgency = capText(clean(raw.urgencia), 60);
  const comment = capText(clean(raw.comentario), 120);
  const sellerName = capText(clean(raw.vendedor), 60);

  // avaliacoes / nota (default 0 com aviso)
  let reviews = 0;
  const reviewsRaw = clean(raw.avaliacoes);
  if (reviewsRaw) {
    const n = parseInt(reviewsRaw.replace(/\D/g, ""), 10);
    if (Number.isFinite(n) && n >= 0) reviews = n;
    else warnings.push("avaliacoes ilegível — assumido 0");
  } else {
    warnings.push("avaliacoes ausente — assumido 0");
  }

  let rating = new Decimal(0);
  const ratingRaw = clean(raw.nota);
  if (ratingRaw) {
    const r = num(ratingRaw);
    if (!r.isNaN() && r.gte(0) && r.lte(5)) rating = r;
    else warnings.push("nota fora de 0–5 — assumido 0");
  } else {
    warnings.push("nota ausente — assumido 0");
  }

  // reputacao_vendedor
  let sellerRep = clean(raw.reputacao_vendedor).toLowerCase();
  if (sellerRep !== "verde" && sellerRep !== "outra") sellerRep = "outra";

  // links
  const links: { channel: string; url: string }[] = [];
  for (const [col, channel] of [
    ["link_grp", "grp"],
    ["link_cnl", "cnl"],
    ["link_ig", "ig"],
  ] as const) {
    const url = clean(raw[col]);
    if (!url) continue;
    if (HTTP_RE.test(url)) links.push({ channel, url });
    else reasons.push(`LINK_INVALIDO: ${col}`);
  }

  // data_coleta
  let collectedAt: Date | null = null;
  const dateRaw = clean(raw.data_coleta);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    reasons.push("DATA_INVALIDA: use AAAA-MM-DD");
  } else {
    try {
      const d = parseCollectionDate(dateRaw);
      if (isFuture(d)) reasons.push("DATA_INVALIDA: data_coleta no futuro");
      else collectedAt = d;
    } catch {
      reasons.push("DATA_INVALIDA: data_coleta ilegível");
    }
  }

  if (reasons.length > 0) return { ok: false, reasons, warnings };

  const product: ParsedProduct = {
    id,
    source: source!,
    title,
    productUrl,
    imageUrl,
    videoUrl,
    currentPrice,
    anchorPrice,
    priceNote,
    commissionPct,
    coupon,
    couponHowTo,
    shippingNote,
    urgency,
    comment,
    reviews,
    rating,
    sellerRep,
    sellerName,
    collectedAt: collectedAt!,
    links,
  };

  return { ok: true, reasons, warnings, product };
}

function capText(s: string, max: number): string | null {
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}
