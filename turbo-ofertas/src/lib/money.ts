import Decimal from "decimal.js";
export { formatBRL, formatInt, parseBRL } from "../core/format.js";

/** "R$ 1.234,56" — display helper with prefix. */
export function displayBRL(value: Decimal | number | string): string {
  const d = value instanceof Decimal ? value : new Decimal(value);
  return `R$ ${formatBRLLocal(d)}`;
}

function formatBRLLocal(d: Decimal): string {
  const fixed = d.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${grouped},${decPart}`;
}

export { Decimal };
