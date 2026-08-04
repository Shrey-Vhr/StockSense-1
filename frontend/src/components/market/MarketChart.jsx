import { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { chartOptions, candleOptions, emaOptions } from '../../lib/chartTheme';
import { cn } from '../../lib/cn';

/**
 * Candlestick chart with EMA 20/50/200 overlays and a floating legend.
 *
 * IndexDetail and ETFDetail carried byte-identical copies of this — the chart
 * config, the EMA maths, the legend state, the TradingView link rewrite and the
 * resize handler, about 90 lines each. The only difference between them was how
 * the TradingView symbol was derived, which is now a prop.
 *
 * Deliberately NOT used by StockDetail: that chart additionally carries a
 * volume series, AI price lines and a candle-series ref used to draw trade
 * levels. Folding those in would mean re-opening a page committed in Phase 6
 * and modelling three features this component does not need.
 */

/** Swatches must match the series tokens the chart actually draws with. */
const LEGEND = [
  { period: 20, key: 'ema20', swatch: 'bg-series-1' },
  { period: 50, key: 'ema50', swatch: 'bg-series-2' },
  { period: 200, key: 'ema200', swatch: 'bg-series-3' },
];

function calculateEMA(data, period) {
  if (!data || data.length === 0) return [];
  const k = 2 / (period + 1);
  const emaArray = [];
  let ema = data[0].close;

  data.forEach((candle, index) => {
    if (index === 0) {
      ema = candle.close;
    } else {
      ema = candle.close * k + ema * (1 - k);
    }
    if (index >= period - 1) {
      emaArray.push({ time: candle.time, value: parseFloat(ema.toFixed(2)) });
    }
  });
  return emaArray;
}

const cleanDate = (dateStr) => {
  if (!dateStr) return null;
  return String(dateStr).split(' ')[0].split('T')[0];
};

export default function MarketChart({ data, tvSymbol, height = 400, className }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const [legend, setLegend] = useState({ ema20: null, ema50: null, ema200: null });

  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      ...chartOptions(),
    });

    const candleSeries = chart.addCandlestickSeries(candleOptions());

    const candleData = data
      .map(d => ({
        time: cleanDate(d.date),
        open: parseFloat(d.open), high: parseFloat(d.high),
        low: parseFloat(d.low), close: parseFloat(d.close),
      }))
      .filter(d => d.time !== null);
    candleSeries.setData(candleData);

    const series = [20, 50, 200].map((period) => {
      const values = calculateEMA(candleData, period);
      const line = chart.addLineSeries(emaOptions(period));
      line.setData(values);
      return [period, values];
    });

    setLegend(Object.fromEntries(
      series.map(([period, values]) => [
        `ema${period}`,
        values.length > 0 ? values[values.length - 1].value : null,
      ]),
    ));

    chart.timeScale().fitContent();
    chartRef.current = chart;

    // lightweight-charts renders its own attribution link; point it at the
    // matching TradingView chart rather than the library homepage.
    const linkTimer = setTimeout(() => {
      const tvLink = containerRef.current?.querySelector('a[href*="tradingview.com"]');
      if (tvLink && tvSymbol) {
        tvLink.href = `https://in.tradingview.com/chart/?symbol=NSE:${tvSymbol}`;
        tvLink.target = '_blank';
        tvLink.addEventListener('click', (e) => e.stopPropagation());
      }
    }, 100);

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(linkTimer);
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [data, tvSymbol, height]);

  return (
    <div className={cn('relative w-full', className)}>
      <div className="absolute top-3 left-3 z-10 rounded-lg px-3 py-2 pointer-events-none
                      bg-surface-900/80 backdrop-blur-sm border border-surface-800 shadow-sm">
        <div className="text-2xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">EMAs</div>
        <dl className="space-y-1 text-xs font-mono tnum">
          {LEGEND.map(({ period, key, swatch }) => legend[key] != null && (
            <div key={key} className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full shrink-0', swatch)} aria-hidden="true" />
              <dt className="text-gray-500">EMA {period}</dt>
              <dd className="text-gray-200 ml-auto">{legend[key]}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div ref={containerRef} style={{ height }} className="w-full" />
    </div>
  );
}
