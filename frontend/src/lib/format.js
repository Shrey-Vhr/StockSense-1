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

/**
 * Tone for an AI verdict string, for choosing a Badge variant.
 *
 * The model's wording varies between runs ("Take the trade", "Accumulate on
 * dips", "Avoid for now"), so this matches on intent rather than exact text.
 *
 * Shared because the two pages that render verdicts disagreed: StockDetail
 * tested only for "Take"/"Accumulate"/"Buy"/"Avoid" case-sensitively, so the
 * same "Sell" verdict came back red on the AI Analysis page and grey on the
 * stock page.
 */
export function verdictTone(verdict = '') {
  if (/take|accumulate|buy/i.test(verdict)) return 'up';
  if (/avoid|exit|sell/i.test(verdict)) return 'down';
  return 'neutral';
}

/** Strips the exchange suffix for display. `RELIANCE.NS` → `RELIANCE` */
export function displaySymbol(symbol) {
  return typeof symbol === 'string' ? symbol.replace(/\.(NS|BO)$/i, '') : '';
}

const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
  '&apos;': "'", '&#39;': "'", '&nbsp;': ' ', '&#x27;': "'", '&#x2F;': '/',
};

/**
 * Decodes the HTML entities that RSS feeds emit.
 *
 * Headlines arrive escaped — "Top Gainers &amp; Losers", "L&amp;T's order
 * book" — and React renders text verbatim, so the raw entity was visible on
 * both the news page and the dashboard rail.
 *
 * An explicit map rather than the usual textarea-innerHTML trick: this content
 * comes from third-party feeds, and a lookup table cannot be coaxed into
 * parsing markup no matter what arrives.
 */
export function decodeEntities(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39|#x27|#x2F);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/**
 * Relative time for recent items, falling back to an absolute date past a week.
 * "3h ago" tells you more about a headline than "Jul 31, 2026".
 */
export function timeAgo(value, { fallback = 'Recent' } = {}) {
  if (!value) return fallback;
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return fallback;

  const seconds = Math.floor((Date.now() - then.getTime()) / 1000);
  if (seconds < 0) return 'Just now';
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return then.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' });
}
