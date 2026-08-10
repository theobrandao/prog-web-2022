import Decimal from "decimal.js";

export type Source = "ml" | "shopee" | "amazon";
export type Channel = "grp" | "cnl" | "ig" | "site";

/** A single day of price history, date truncated to America/Sao_Paulo. */
export interface PricePoint {
  date: Date;
  price: Decimal;
}

export interface CoreLink {
  channel: string;
  url: string;
}

/**
 * Pure product shape consumed by src/core. Mirrors the Prisma Product but uses
 * Decimal for money and carries only what the rules need — no I/O, no DB rows.
 */
export interface CoreProduct {
  id: string;
  source: Source;
  title: string;
  productUrl?: string;
  currentPrice: Decimal;
  anchorPrice?: Decimal | null;
  commissionPct: Decimal;
  coupon?: string | null;
  couponHowTo?: string | null;
  priceNote?: string | null;
  sellerName?: string | null;
  comment?: string | null;
  shippingNote?: string | null;
  urgency?: string | null;
  reviews: number;
  rating: Decimal;
  sellerRep: string;
  active: boolean;
  links: CoreLink[];
}

export interface CoreRule {
  minCommissionR: Decimal;
  minCommissionPct: Decimal;
  minPrice: Decimal;
  maxPrice: Decimal;
  minReviews: number;
  minRating: Decimal;
  highTicket: Decimal;
  slotsPerDay: number;
  /** comma-separated terms */
  blocklist: string;
  /**
   * Modo Lançamento (§5.2): quando true, HISTORICO e FUNDO_90D deixam de BLOQUEAR
   * a seleção (ainda são registrados no ledger para R6). O selo/gancho "menor preço
   * 90 dias" só aparece quando o histórico é real (ver EvaluateResult.floorCertified).
   */
  launchMode: boolean;
}

/** Fixed check codes, in the exact order they run and appear in the UI (§5.2). */
export type CheckCode =
  | "HISTORICO"
  | "FUNDO_90D"
  | "FAIXA_PRECO"
  | "COMISSAO_PCT"
  | "COMISSAO_R"
  | "AVALIACOES"
  | "NOTA"
  | "REPUTACAO"
  | "BLOCKLIST"
  | "DESCONTO_FALSO"
  | "LINK"
  | "ATIVO";

export interface CheckResult {
  code: CheckCode;
  ok: boolean;
  /** Human-readable detail, only meaningful on failures (e.g. "EM_OBSERVACAO (9/14 dias)"). */
  detail?: string;
}

export interface EvaluateResult {
  ok: boolean;
  passes: CheckResult[];
  fails: CheckResult[];
  /** all checks in order, regardless of outcome */
  checks: CheckResult[];
  /**
   * true só quando o histórico é suficiente (>= MIN_HISTORY_DAYS) E o preço está
   * no fundo dos 90 dias. Autoriza o selo/gancho "menor preço 90 dias". Em Modo
   * Lançamento um produto pode ser selecionado com floorCertified=false.
   */
  floorCertified: boolean;
}

export interface Evaluated {
  product: CoreProduct;
  hist: PricePoint[];
  result: EvaluateResult;
}

export interface Slot {
  slot: number;
  /** "alto" (high ticket) | "baixo" */
  band: "alto" | "baixo";
  product: CoreProduct;
}

export interface SelectResult {
  slots: Slot[];
  approvedNoSlot: CoreProduct[];
  rejected: { product: CoreProduct; reasons: string[] }[];
}
