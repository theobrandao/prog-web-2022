import Decimal from "decimal.js";
import type { CoreProduct, CoreRule, PricePoint } from "./types.js";
import { max90, sortedHist } from "./prices.js";
import { formatBRL, formatInt } from "./format.js";

/** Base rotation hooks (§5.6 item 5). Urgency template is appended only when set. */
export const BASE_ROTATION = [
  "MENOR PREÇO DOS ÚLTIMOS 90 DIAS 🔥",
  "JÁ VIU O PREÇO DESSE? 👀",
  "ACHADO DO DIA 🎯",
] as const;

export const URGENCY_TEMPLATE = "⏰ {urgency} — CORRE";

export interface HookResult {
  hook: string;
  unitLine?: string;
}

/** First 5 words of the title, uppercased. */
function firstWordsUpper(title: string, n = 5): string {
  return title
    .trim()
    .split(/\s+/)
    .slice(0, n)
    .join(" ")
    .toUpperCase();
}

/** Ceiling "teto" for the high-ticket hook (§5.6 item 2). */
function tetoFor(price: Decimal): Decimal {
  if (price.gte(1000)) {
    return price.div(1000).ceil().mul(1000);
  }
  return price.div(100).ceil().mul(100);
}

/** Detect a kit and its unit count (§5.6 item 4). Returns n>=2 or null. */
function kitCount(title: string): number | null {
  const m = title.match(/kit\s*(\d+)|(\d+)\s*(unidades|pares|peças|pcs)/i);
  if (!m) return null;
  const n = parseInt(m[1] ?? m[2], 10);
  if (!Number.isFinite(n) || n < 2) return null;
  return n;
}

/**
 * §5.6 — Deterministic hook selection (auditable, no AI).
 * @param seed usually the postId; drives the rotation index.
 */
export function pickHook(
  product: CoreProduct,
  hist: PricePoint[],
  seed: number,
  rule: CoreRule,
  opts: { certifiedFloor?: boolean } = {},
): HookResult {
  // Quando o histórico não certifica o fundo de 90 dias (ex.: Modo Lançamento),
  // o gancho "menor preço 90 dias" é omitido para não afirmar algo não comprovado.
  const certifiedFloor = opts.certifiedFloor !== false;
  const price = product.currentPrice;

  // Kit unit line is additive to the rotation hook; compute early so it can be
  // attached to rotation-based hooks.
  const n = kitCount(product.title);
  const unitLine =
    n !== null
      ? `sai por R$ ${formatBRL(price.div(n).toDecimalPlaces(2, Decimal.ROUND_UP))} cada`
      : undefined;

  // 0. Human curation comment — highest priority, overrides everything.
  if (product.comment && product.comment.trim().length > 0) {
    return { hook: product.comment.trim(), unitLine };
  }

  // 1. Recent drop: today <= 0.90 * yesterday.
  const sorted = sortedHist(hist);
  if (sorted.length >= 2) {
    const ontem = sorted[sorted.length - 2].price;
    if (ontem.gt(0) && price.lte(ontem.mul("0.90"))) {
      return { hook: "BAIXOU‼️", unitLine };
    }
  }

  // 2. High-ticket ceiling.
  if (price.gte(rule.highTicket)) {
    const teto = tetoFor(price);
    if (price.gte(teto.mul("0.85"))) {
      return {
        hook: `${firstWordsUpper(product.title)} POR MENOS DE R$ ${formatInt(teto)}`,
        unitLine,
      };
    }
  }

  // 3. Historical comparison (own data only — never "outros sites").
  const hi = max90(hist);
  if (hi && hi.gte(price.mul("1.15"))) {
    return {
      hook: `JÁ CUSTOU R$ ${formatBRL(hi)} — HOJE R$ ${formatBRL(price)} 👀`,
      unitLine,
    };
  }

  // 4/5. Rotation (kit uses a rotation hook + unitLine).
  const rotation: string[] = BASE_ROTATION.filter(
    (h) => certifiedFloor || !h.startsWith("MENOR PREÇO"),
  );
  if (product.urgency && product.urgency.trim().length > 0) {
    rotation.push(URGENCY_TEMPLATE.replace("{urgency}", product.urgency.trim()));
  }
  const idx = ((seed % rotation.length) + rotation.length) % rotation.length;
  return { hook: rotation[idx], unitLine };
}
