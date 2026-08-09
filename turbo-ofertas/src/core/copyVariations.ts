import type { CoreProduct, CoreRule, PricePoint } from "@/core/types";
import { pickHook } from "@/core/hooks";
import { buildIgCaption, buildWaMessage, buildTgMessage } from "@/core/texts";

export interface CopyVariation {
  seed: number;
  hook: string;
  unitLine?: string;
  ig: string;
  wa: string;
  tg: string;
}

export interface CopyVariationsOpts {
  seeds: number[];
  publicBaseUrl?: string;
  groupInviteUrl?: string;
  postId?: number;
}

/** Same channel-preference resolution as selectDaily.linkFor (§ local helper). */
function linkFor(product: CoreProduct, channel: string): string {
  const order = [channel, "site", "grp", "cnl", "ig"];
  for (const c of order) {
    const l = product.links.find((x) => x.channel === c && x.url);
    if (l) return l.url;
  }
  return product.productUrl ?? "";
}

/**
 * "Copy IA" (deterministic, no external AI) — build auditable copy VARIATIONS
 * from the existing hook rotation (§5.6) + message templates (§5.5/§7.3).
 * PURE: no I/O. Each seed yields a deterministic hook + IG/WA/TG copy.
 */
export function copyVariations(
  product: CoreProduct,
  hist: PricePoint[],
  rule: CoreRule,
  opts: CopyVariationsOpts,
): CopyVariation[] {
  const postId = opts.postId ?? 0;
  const publicBaseUrl = opts.publicBaseUrl ?? "";
  const groupInviteUrl = opts.groupInviteUrl ?? "";

  return opts.seeds.map((seed) => {
    const { hook, unitLine } = pickHook(product, hist, seed, rule);
    const ig = buildIgCaption(product, { hook });
    const wa = buildWaMessage(product, linkFor(product, "grp"), {
      postId,
      channel: "grp",
      hook,
      unitLine,
      publicBaseUrl,
      groupInviteUrl,
    });
    const tg = buildTgMessage(product, linkFor(product, "cnl"), {
      postId,
      channel: "cnl",
      hook,
      unitLine,
      publicBaseUrl,
      groupInviteUrl,
    });
    return { seed, hook, unitLine, ig, wa, tg };
  });
}
