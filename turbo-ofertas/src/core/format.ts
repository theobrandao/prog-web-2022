import Decimal from "decimal.js";

/** Format a Decimal as Brazilian currency value WITHOUT the "R$ " prefix: 1.234,56 */
export function formatBRL(value: Decimal | number): string {
  const d = value instanceof Decimal ? value : new Decimal(value);
  const fixed = d.toFixed(2); // "1234.56"
  const [intPart, decPart] = fixed.split(".");
  const neg = intPart.startsWith("-");
  const digits = neg ? intPart.slice(1) : intPart;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${neg ? "-" : ""}${grouped},${decPart}`;
}

/** Format an integer with pt-BR thousands separator: 3000 -> "3.000" */
export function formatInt(value: Decimal | number): string {
  const d = value instanceof Decimal ? value : new Decimal(value);
  const digits = d.round().abs().toFixed(0);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Parse a Brazilian-formatted money string into a Decimal.
 * Accepts "1.234,56", "1234,56", "1234.56", "R$ 99,90", 99.9, etc.
 */
export function parseBRL(input: string | number): Decimal {
  if (typeof input === "number") return new Decimal(input);
  let s = input.trim().replace(/r\$\s*/i, "").replace(/\s/g, "");
  if (s === "") return new Decimal(NaN);
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // dot = thousands, comma = decimal
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  // if only dots, assume dot is decimal separator (leave as-is)
  return new Decimal(s);
}
