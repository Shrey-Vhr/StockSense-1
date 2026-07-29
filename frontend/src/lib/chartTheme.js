/**
 * lightweight-charts theming, derived from the design tokens.
 *
 * The same ~20 lines of chart configuration were duplicated verbatim across
 * StockDetail, IndexDetail and ETFDetail, and all three hardcoded colours that
 * exist nowhere else in the app — most visibly a #0d1117 canvas sitting on an
 * #0a0e13 page, which left a visible rectangle around every chart.
 *
 * lightweight-charts cannot read CSS variables, so tokens are resolved from the
 * document at call time. That keeps tokens.css authoritative rather than
 * duplicating hex values here.
 */

/** Resolve an RGB-channel token to a CSS colour string. */
function tokenColor(name, alpha = 1) {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${name}`)
    .trim();
  if (!raw) return alpha === 1 ? '#000000' : 'rgba(0,0,0,0)';
  const channels = raw.split(/\s+/).join(', ');
  return alpha === 1 ? `rgb(${channels})` : `rgba(${channels}, ${alpha})`;
}

/**
 * Base chart options. Spread and add `width` / `height` at the call site.
 * The canvas now matches the card it sits in, so the chart reads as part of
 * the page rather than an embedded iframe.
 */
export function chartOptions() {
  return {
    layout: {
      background: { color: 'transparent' },
      textColor: tokenColor('text-tertiary'),
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      fontSize: 11,
    },
    grid: {
      vertLines: { color: tokenColor('surface-800', 0.6) },
      horzLines: { color: tokenColor('surface-800', 0.6) },
    },
    crosshair: {
      mode: 1,
      vertLine: { color: tokenColor('surface-600'), width: 1, style: 3, labelBackgroundColor: tokenColor('surface-700') },
      horzLine: { color: tokenColor('surface-600'), width: 1, style: 3, labelBackgroundColor: tokenColor('surface-700') },
    },
    rightPriceScale: {
      borderColor: tokenColor('surface-800'),
      scaleMargins: { top: 0.1, bottom: 0.25 },
    },
    timeScale: {
      borderColor: tokenColor('surface-800'),
      rightOffset: 4,
    },
  };
}

/** Candlestick series colours — the only place up/down strong tones are used. */
export function candleOptions() {
  const up = tokenColor('up-strong');
  const down = tokenColor('down-strong');
  return {
    upColor: up,
    downColor: down,
    borderUpColor: up,
    borderDownColor: down,
    wickUpColor: up,
    wickDownColor: down,
  };
}

/** Volume histogram — deliberately muted so it never competes with price. */
export function volumeOptions() {
  return {
    color: tokenColor('surface-600'),
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume',
  };
}

/** EMA overlay colours, keyed by period. */
export function emaColor(period) {
  if (period <= 20) return tokenColor('series-1');
  if (period <= 50) return tokenColor('series-2');
  return tokenColor('series-3');
}

export function emaOptions(period) {
  return { color: emaColor(period), lineWidth: 1.5, title: `EMA ${period}`, priceLineVisible: false, lastValueVisible: false };
}
