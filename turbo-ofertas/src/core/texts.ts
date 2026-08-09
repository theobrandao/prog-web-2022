import type { CoreProduct } from "./types.js";
import { formatBRL } from "./format.js";
import { AFFILIATE_DISCLAIMER, IG_HASHTAGS } from "../theme.js";

export interface MessageOpts {
  postId: number;
  channel: string; // grp | cnl | ig | site
  hook: string;
  unitLine?: string;
  publicBaseUrl: string;
  groupInviteUrl: string;
}

const AMAZON_LINK_RE = /amzn\.to|amazon\.com/i;

/**
 * R2 — Amazon links never appear in WhatsApp/Telegram messages. If the product
 * is Amazon, or the raw link points at Amazon, route through the offer page.
 */
export function resolveMessageLink(
  product: CoreProduct,
  rawLink: string,
  opts: Pick<MessageOpts, "postId" | "channel" | "publicBaseUrl">,
): string {
  if (product.source === "amazon" || AMAZON_LINK_RE.test(rawLink)) {
    const base = opts.publicBaseUrl.replace(/\/$/, "");
    return `${base}/oferta/${opts.postId}?src=${opts.channel}`;
  }
  return rawLink;
}

/** Price line: uses the anchor only when it exists; never invents one. */
function priceLine(product: CoreProduct, emoji: string, fallbackNote: string): string {
  if (product.anchorPrice) {
    return `${emoji} De R$ ${formatBRL(product.anchorPrice)} por R$ ${formatBRL(product.currentPrice)}`;
  }
  const note = product.priceNote?.trim() || fallbackNote;
  return `${emoji} R$ ${formatBRL(product.currentPrice)} ${note}`.trimEnd();
}

/** Shared builder for WhatsApp/Telegram messages (§5.5). Empty fields vanish. */
function buildForwardMessage(
  product: CoreProduct,
  rawLink: string,
  opts: MessageOpts,
): string {
  const link = resolveMessageLink(product, rawLink, opts);

  const lines: string[] = [];
  lines.push(opts.hook);
  lines.push(""); // blank line after hook
  lines.push(product.title);
  lines.push(priceLine(product, "🔥", "à vista"));
  if (opts.unitLine) lines.push(`→ ${opts.unitLine}`);
  if (product.coupon?.trim()) lines.push(`🎟️ Cupom: ${product.coupon.trim()}`);
  if (product.couponHowTo?.trim()) lines.push(`ℹ️ ${product.couponHowTo.trim()}`);
  if (product.sellerName?.trim()) lines.push(`🏪 Vendido por ${product.sellerName.trim()} ✅`);
  if (product.shippingNote?.trim()) lines.push(`📦 ${product.shippingNote.trim()}`);
  lines.push("");
  lines.push(`Compre aqui: ${link}`);
  lines.push("");
  lines.push(`Convide amigos para o grupo: ${opts.groupInviteUrl}`);
  lines.push(AFFILIATE_DISCLAIMER);

  return lines.join("\n");
}

export function buildWaMessage(
  product: CoreProduct,
  rawLink: string,
  opts: MessageOpts,
): string {
  return buildForwardMessage(product, rawLink, opts);
}

export function buildTgMessage(
  product: CoreProduct,
  rawLink: string,
  opts: MessageOpts,
): string {
  return buildForwardMessage(product, rawLink, opts);
}

export interface CaptionOpts {
  hook: string;
}

/** §7.3 — Instagram caption. Link lives in bio/story, never in the caption. */
export function buildIgCaption(product: CoreProduct, opts: CaptionOpts): string {
  const lines: string[] = [];
  lines.push(opts.hook);
  lines.push(product.title);
  if (product.anchorPrice) {
    lines.push(`💰 De R$ ${formatBRL(product.anchorPrice)} por R$ ${formatBRL(product.currentPrice)}`);
  } else {
    lines.push(`💰 R$ ${formatBRL(product.currentPrice)} à vista`);
  }
  if (product.coupon?.trim()) lines.push(`🎟️ Cupom: ${product.coupon.trim()}`);
  lines.push("");
  lines.push("👉 Link no story e na bio");
  lines.push(AFFILIATE_DISCLAIMER);
  lines.push(".");
  lines.push(IG_HASHTAGS.join(" "));
  return lines.join("\n");
}
