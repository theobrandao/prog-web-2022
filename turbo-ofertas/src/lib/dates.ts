import { DateTime } from "luxon";

export const TZ = "America/Sao_Paulo";

/** Start-of-day in America/Sao_Paulo, returned as a JS Date (the instant of 00:00 -03). */
export function truncDay(input: Date | string = new Date()): Date {
  const dt =
    typeof input === "string"
      ? DateTime.fromISO(input, { zone: TZ })
      : DateTime.fromJSDate(input, { zone: TZ });
  return dt.startOf("day").toJSDate();
}

/** Today's truncated day in America/Sao_Paulo. */
export function today(): Date {
  return truncDay(new Date());
}

/** Parse an AAAA-MM-DD collection date into a truncated day; throws on invalid. */
export function parseCollectionDate(s: string): Date {
  const dt = DateTime.fromFormat(s.trim(), "yyyy-MM-dd", { zone: TZ });
  if (!dt.isValid) throw new Error(`data inválida: ${s}`);
  return dt.startOf("day").toJSDate();
}

/** True if the given day is strictly in the future relative to today (SP). */
export function isFuture(d: Date): boolean {
  return truncDay(d).getTime() > today().getTime();
}

/** N days ago, truncated (SP). */
export function daysAgo(n: number): Date {
  return DateTime.now().setZone(TZ).startOf("day").minus({ days: n }).toJSDate();
}
