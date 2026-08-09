// Calibration constants for the false-discount detector (§5.4).
// Kept here (not theme.ts) so they can be tuned without touching visuals.

/** Peak must exceed the recent-baseline median by this factor to look inflated. */
export const FALSE_DISCOUNT_PEAK_FACTOR = 1.25;

/** Current price must be below `peak * this` for the "discount" to be off an inflated peak. */
export const FALSE_DISCOUNT_DROP_FACTOR = 0.85;

/** Minimum days of history required to evaluate a product at all (§5.2 HISTORICO). */
export const MIN_HISTORY_DAYS = 14;

/** Window (in days) of price history considered relevant. */
export const HISTORY_WINDOW_DAYS = 90;

/** Tolerance applied to the 90-day floor check so exact ties pass (§5.2 FUNDO_90D). */
export const FLOOR_TOLERANCE = 1.001;

/** A product cannot be re-published within this many days (§5.3). */
export const REPUBLISH_COOLDOWN_DAYS = 7;
