/**
 * Number, currency and percentage formatting.
 *
 * These call sites were duplicated roughly thirty times across the pages, each
 * re-spelling the same `toLocaleString('en-IN', …)` options inline — and not
 * always identically, which is why the same price renders with two decimals in
 * one place and none in another.
 *
 * Every helper takes explicit options rather than guessing, so adopting it at a
 * call site is a like-for-like swap. Each page phase verifies its own output
 * against the previous rendering before the swap is committed.
 *
 * `null` / `undefined` / `NaN` return the `fallback` instead of "NaN" or "₹0",
 * which is what several of the current call sites accidentally render when the
 * API is rate-limited or a field is missing.
 */

const LOCALE = 'en-IN';

const isBlank = (v) => v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v));

/**
 * Grouped number, no currency symbol. `formatNumber(1234.5)` → "1,234.50"
 */
export function formatNumber(value, { decimals = 2, fallback = '—' } = {}) {
  if (isBlank(value)) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n.toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Rupee amount. `formatCurrency(19883)` → "₹19,883.00"
 * Pass `decimals: 0` for summary tiles, which is what Portfolio does today.
 */
export function formatCurrency(value, { decimals = 2, fallback = '—' } = {}) {
  if (isBlank(value)) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  // Sign goes outside the symbol: "-₹186.00", not "₹-186.00".
  // Portfolio currently renders losses with no sign at all — `₹186.00` in red —
  // which encodes the loss purely in colour. Anyone who cannot distinguish the
  // two reds reads a loss as a gain.
  const sign = n < 0 ? '-' : '';
  return `${sign}₹${Math.abs(n).toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Signed percentage. `formatPercent(2.4567)` → "+2.46%"
 * The leading sign is what makes a delta readable at a glance, so it is on by
 * default; pass `signed: false` for things like allocation shares.
 */
export function formatPercent(value, { decimals = 2, signed = true, fallback = '—' } = {}) {
  if (isBlank(value)) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const sign = signed && n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

/**
 * Signed absolute change. `formatChange(-10.6)` → "-10.60"
 */
export function formatChange(value, { decimals = 2, fallback = '—' } = {}) {
  if (isBlank(value)) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}`;
}

/**
 * Indian-notation compact volume, matching what StockDetail renders today.
 * `formatCompact(15200000)` → "1.52Cr", `formatCompact(250000)` → "2.50L"
 */
export function formatCompact(value, { fallback = '—' } = {}) {
  if (isBlank(value)) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const abs = Math.abs(n);
  if (abs >= 10000000) return `${(n / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${(n / 100000).toFixed(2)}L`;
  return n.toLocaleString(LOCALE, { maximumFractionDigits: 0 });
}

/**
 * Direction of a value, for choosing semantic colour.
 * Returns 'up' | 'down' | 'flat' — never a colour, so callers stay honest about
 * the fact that green and red mean market direction and nothing else.
 */
export function direction(value) {
  if (isBlank(value)) return 'flat';
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return 'flat';
  return n > 0 ? 'up' : 'down';
}

/** Strips the exchange suffix for display. `RELIANCE.NS` → `RELIANCE` */
export function displaySymbol(symbol) {
  return typeof symbol === 'string' ? symbol.replace(/\.(NS|BO)$/i, '') : '';
}
