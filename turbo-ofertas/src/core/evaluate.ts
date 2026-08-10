import Decimal from "decimal.js";
import type {
  CheckResult,
  CoreProduct,
  CoreRule,
  EvaluateResult,
  PricePoint,
} from "./types.js";
import { commissionR, min90 } from "./prices.js";
import { matchedBlocklistTerm } from "./blocklist.js";
import { falseDiscount } from "./falseDiscount.js";
import { FLOOR_TOLERANCE, MIN_HISTORY_DAYS } from "./constants.js";

function hasChannel(p: CoreProduct, channel: string): boolean {
  return p.links.some(
    (l) => l.channel === channel && !!l.url && l.url.trim().length > 0,
  );
}

/**
 * §5.2 — Evaluate one product against the Rule. Pure: no I/O, no DB.
 * Checks run in the fixed order defined by the spec and every check is recorded
 * (pass or fail) so the UI can show the full ledger.
 */
export function evaluate(
  product: CoreProduct,
  rule: CoreRule,
  hist: PricePoint[],
): EvaluateResult {
  const checks: CheckResult[] = [];
  const push = (code: CheckResult["code"], ok: boolean, detail?: string) =>
    checks.push({ code, ok, detail });

  // 1. HISTORICO
  const days = hist.length;
  const histOk = days >= MIN_HISTORY_DAYS;
  push(
    "HISTORICO",
    histOk,
    histOk ? undefined : `EM_OBSERVACAO (${days}/${MIN_HISTORY_DAYS} dias)`,
  );

  // 2. FUNDO_90D
  const floor = min90(hist);
  const atFloor =
    floor !== null &&
    product.currentPrice.lte(floor.mul(FLOOR_TOLERANCE));
  push(
    "FUNDO_90D",
    atFloor,
    atFloor
      ? undefined
      : floor === null
        ? "sem histórico de preço"
        : `acima do mínimo 90d (R$ ${floor.toFixed(2)})`,
  );

  // 3. FAIXA_PRECO
  const inRange =
    product.currentPrice.gte(rule.minPrice) &&
    product.currentPrice.lte(rule.maxPrice);
  push(
    "FAIXA_PRECO",
    inRange,
    inRange
      ? undefined
      : `fora da faixa R$ ${rule.minPrice.toFixed(2)}–${rule.maxPrice.toFixed(2)}`,
  );

  // 4. COMISSAO_PCT
  const pctOk = product.commissionPct.gte(rule.minCommissionPct);
  push(
    "COMISSAO_PCT",
    pctOk,
    pctOk ? undefined : `comissão ${product.commissionPct}% < ${rule.minCommissionPct}%`,
  );

  // 5. COMISSAO_R
  const cr = commissionR(product);
  const crOk = cr.gte(rule.minCommissionR);
  push(
    "COMISSAO_R",
    crOk,
    crOk ? undefined : `comissão R$ ${cr.toFixed(2)} < R$ ${rule.minCommissionR.toFixed(2)}`,
  );

  // 6. AVALIACOES
  const reviewsOk = product.reviews >= rule.minReviews;
  push(
    "AVALIACOES",
    reviewsOk,
    reviewsOk ? undefined : `${product.reviews} avaliações < ${rule.minReviews}`,
  );

  // 7. NOTA
  const ratingOk = product.rating.gte(rule.minRating);
  push(
    "NOTA",
    ratingOk,
    ratingOk ? undefined : `nota ${product.rating} < ${rule.minRating}`,
  );

  // 8. REPUTACAO (ML only)
  if (product.source === "ml") {
    const repOk = product.sellerRep === "verde";
    push("REPUTACAO", repOk, repOk ? undefined : `reputação "${product.sellerRep || "outra"}" (exige verde)`);
  } else {
    push("REPUTACAO", true);
  }

  // 9. BLOCKLIST
  const term = matchedBlocklistTerm(product.title, rule.blocklist);
  push("BLOCKLIST", term === null, term ? `termo barrado: "${term}"` : undefined);

  // 10. DESCONTO_FALSO
  const fake = falseDiscount(hist, product.currentPrice);
  push("DESCONTO_FALSO", !fake, fake ? "desconto sobre preço inflado" : undefined);

  // 11. LINK
  let linkOk: boolean;
  let linkDetail: string | undefined;
  if (product.source === "amazon") {
    linkOk = true; // dispensado
  } else if (product.source === "ml") {
    linkOk = hasChannel(product, "grp") && hasChannel(product, "cnl");
    if (!linkOk) linkDetail = "ML exige link grp E cnl (gerados no Portal do Afiliado)";
  } else {
    // shopee (fase 1): link grp na planilha
    linkOk = hasChannel(product, "grp");
    if (!linkOk) linkDetail = "Shopee (fase 1) exige link grp na planilha";
  }
  push("LINK", linkOk, linkDetail);

  // 12. ATIVO
  push("ATIVO", product.active, product.active ? undefined : "produto inativo");

  const fails = checks.filter((c) => !c.ok);
  const passes = checks.filter((c) => c.ok);

  // "Menor preço 90 dias" só é certificado com histórico real E preço no fundo.
  const floorCertified = histOk && atFloor;

  // Modo Lançamento: HISTORICO e FUNDO_90D deixam de bloquear (mas seguem no ledger).
  const blockingFails = rule.launchMode
    ? fails.filter((c) => c.code !== "HISTORICO" && c.code !== "FUNDO_90D")
    : fails;

  return { ok: blockingFails.length === 0, passes, fails, checks, floorCertified };
}

/** Convenience: build human-readable reasons[] from a result's failures. */
export function reasonsFrom(result: EvaluateResult): string[] {
  return result.fails.map((f) => (f.detail ? `${f.code}: ${f.detail}` : f.code));
}

export { Decimal };
