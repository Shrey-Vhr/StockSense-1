import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, TrendingUp, TrendingDown, Target, Info } from 'lucide-react';
import api from '../utils/api';
import MarketChart from '../components/market/MarketChart';
import { Button, PageHeader } from '../components/ui';
import { cn } from '../lib/cn';
import { formatCurrency, formatPercent, formatChange } from '../lib/format';

const ETFDetail = () => {
  const { symbol } = useParams();
  const cleanSymbol = symbol ? symbol.toUpperCase() : 'NIFTYBEES.NS';
  
  const [data, setData] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [watchlistAdded, setWatchlistAdded] = useState(false);

  const fetchETFData = async () => {
    try {
      setLoading(true);
      const [analysisRes, historyRes] = await Promise.all([
        api.get(`/analysis/etf/${encodeURIComponent(cleanSymbol)}`),
        api.get(`/stocks/history/${encodeURIComponent(cleanSymbol)}?period=1y&interval=1d`)
      ]);
      setData(analysisRes.data);
      setHistoricalData(historyRes.data?.history || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch ETF analysis.");
    } finally {
      setLoading(false);
    }
  };

  const addToWatchlist = async () => {
    try {
      const wls = await api.get('/watchlists/');
      let watchlistId;
      
      if (wls.data.length === 0) {
        const created = await api.post('/watchlists/', {
          name: 'My Watchlist'
        });
        watchlistId = created.data.id;
      } else {
        watchlistId = wls.data[0].id;
      }
      
      await api.post(
        `/watchlists/${watchlistId}/stocks`,
        { symbol: cleanSymbol }
      );
      setWatchlistAdded(true);
      setTimeout(() => setWatchlistAdded(false), 3000);
    } catch (e) {
      if (e.response?.data?.detail === 'Stock already in watchlist') {
        setWatchlistAdded(true);
      }
    }
  };

  useEffect(() => {
    fetchETFData();
  }, [cleanSymbol]);

  if (loading) return <div className="p-10 flex justify-center"><Activity className="animate-pulse text-brand-400 w-10 h-10" /></div>;
  if (error) return <div className="p-10 text-red-500">{error}</div>;
  if (!data || data.current_price == null) {
    return (
      <div className="flex items-center justify-center h-96 text-brand-400">
        <Activity className="animate-pulse w-8 h-8" />
      </div>
    );
  }

  const isUp = (data.change_percent ?? 0) >= 0;

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5">
      {/* 1. HEADER */}
      <PageHeader
        title={data.symbol}
        subtitle="ETF analysis"
        icon={TrendingUp}
        actions={
          <>
            <Button
              variant={watchlistAdded ? 'secondary' : 'outline'}
              size="sm"
              onClick={addToWatchlist}
              aria-pressed={watchlistAdded}
            >
              {watchlistAdded ? 'Watchlisted' : '+ Watchlist'}
            </Button>
            <div className="text-left sm:text-right">
              <div className="text-2xl font-semibold text-gray-100 font-mono tnum tracking-tight">
                {data.current_price != null ? formatCurrency(data.current_price) : '—'}
              </div>
              <div className={cn(
                'flex sm:justify-end items-center gap-1 text-sm font-medium mt-0.5 tnum',
                isUp ? 'text-up' : 'text-down',
              )}>
                {isUp ? <TrendingUp size={14} aria-hidden="true" /> : <TrendingDown size={14} aria-hidden="true" />}
                {formatChange(data.change ?? 0)} ({formatPercent(data.change_percent ?? 0, { signed: false })})
              </div>
            </div>
          </>
        }
      />

      {/* 2. CHART */}
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-3">
        <MarketChart data={historicalData} tvSymbol={symbol.replace('.NS','')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 3. ETF METRICS */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
              <p className="text-gray-400 text-xs">Expense Ratio</p>
              <p className="text-white font-bold">
                {data.expense_ratio ? `${data.expense_ratio}%` : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Annual cost</p>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
              <p className="text-gray-400 text-xs">Tracks</p>
              <p className="text-white font-bold text-sm mt-1">
                {data.underlying_index || 'N/A'}
              </p>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
              <p className="text-gray-400 text-xs">Fund House</p>
              <p className="text-white font-bold text-sm mt-1">
                {data.fund_house || 'N/A'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
              <div className="text-2xs font-medium uppercase tracking-wider text-gray-500 mb-1">NAV</div>
              <div className="text-gray-100 font-bold text-lg mt-1 font-mono">{data.nav ? `₹${data.nav}` : 'N/A'}</div>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
              <div className="text-2xs font-medium uppercase tracking-wider text-gray-500 mb-1">Prem/Discount to NAV</div>
              <div className={`font-mono font-bold ${data.premium_discount_pct > 0 ? 'text-down' : 'text-up'}`}>
                {data.premium_discount_pct != null ? `${data.premium_discount_pct}%` : 'N/A'}
              </div>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
              <div className="text-2xs font-medium uppercase tracking-wider text-gray-500 mb-1">AUM</div>
              <div className="text-gray-100 font-bold text-lg mt-1 font-mono">
                {data.aum ? `₹${(data.aum / 10000000).toFixed(2)} Cr` : 'N/A'}
              </div>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
              <div className="text-2xs font-medium uppercase tracking-wider text-gray-500 mb-1">Volume Ratio</div>
              <div className="text-gray-100 font-bold text-lg mt-1 font-mono">{data.volume_ratio ? `${data.volume_ratio}x` : 'N/A'}</div>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
              <div className="text-2xs font-medium uppercase tracking-wider text-gray-500 mb-1">RSI (14)</div>
              <div className="text-gray-100 font-bold text-lg mt-1 font-mono">{data.rsi}</div>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
              <div className="text-2xs font-medium uppercase tracking-wider text-gray-500 mb-1">52W High</div>
              <div className="text-gray-100 font-bold text-lg mt-1 font-mono">₹{data.high_52w}</div>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
              <div className="text-2xs font-medium uppercase tracking-wider text-gray-500 mb-1">52W Low</div>
              <div className="text-gray-100 font-bold text-lg mt-1 font-mono">₹{data.low_52w}</div>
            </div>
          </div>

          {/* 4. RETURNS TABLE */}
          <div className="bg-surface-850 border border-surface-800 rounded-2xl p-5 mt-4 overflow-x-auto">
            <h3 className="text-lg font-bold text-white mb-4">Rolling Returns</h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-3">
              {[
                { key: '1_week', label: '1 Week' },
                { key: '1_month', label: '1 Month' },
                { key: '3_month', label: '3 Month' },
                { key: '6_month', label: '6 Month' },
                { key: '1_year', label: '1 Year' },
              ].map((period) => (
                <div key={period.key} className="bg-surface-900 border border-surface-800 rounded-xl p-2.5 text-center">
                  <div className="text-gray-500 text-xs">{period.label}</div>
                  <div className={`font-semibold text-sm mt-1 font-mono ${data.returns[period.key] >= 0 ? 'text-up' : 'text-down'}`}>
                    {data.returns[period.key] != null ? `${data.returns[period.key]}%` : '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 8. ETF COMPARISON (TRACKING ERROR) */}
          {data.underlying_index && data.underlying_index_return_6m != null && (
            <div className="bg-surface-850 p-4 rounded-xl border border-surface-800 mt-6">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                <Target className="mr-2" size={18} /> ETF Comparison
              </h3>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between items-center bg-surface-900 p-3 rounded border border-surface-800">
                  <span className="text-gray-400">{data.underlying_index} (6M):</span>
                  <span className={`font-bold ${data.underlying_index_return_6m >= 0 ? 'text-up' : 'text-down'}`}>
                    {data.underlying_index_return_6m}%
                  </span>
                </div>
                <div className="flex justify-between items-center bg-surface-900 p-3 rounded border border-surface-800">
                  <span className="text-gray-400">{data.symbol.replace('.NS', '')} (6M):</span>
                  <span className={`font-bold ${data.returns['6_month'] >= 0 ? 'text-up' : 'text-down'}`}>
                    {data.returns['6_month'] != null ? `${data.returns['6_month']}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-surface-900 p-3 rounded border border-surface-800">
                  <span className="text-gray-400">Tracking Difference:</span>
                  <span className={`font-bold ${data.tracking_difference >= 0 ? 'text-up' : 'text-down'}`}>
                    {data.tracking_difference != null ? `${data.tracking_difference > 0 ? '+' : ''}${data.tracking_difference}%` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* 6. ETF-SPECIFIC VERDICT
              The border was built as `border-${...}` with the colour spliced in
              at runtime. Tailwind's JIT scans source statically, so it never saw
              the finished class name and never emitted the rule — this border
              has never rendered in the intended colour since it was written.
              Static class strings are the only ones Tailwind can compile. */}
          <div className={cn(
            'p-5 rounded-xl border bg-surface-900',
            data.verdict_color === 'green' ? 'border-up/40'
              : data.verdict_color === 'red' ? 'border-down/40'
              : 'border-surface-700',
          )}>
            <h3 className="text-2xs font-semibold uppercase tracking-wider text-gray-500">ETF verdict</h3>
            <p className={cn(
              'text-lg font-semibold mt-1.5',
              data.verdict_color === 'green' ? 'text-up'
                : data.verdict_color === 'red' ? 'text-down'
                : 'text-gray-100',
            )}>
              {data.verdict}
            </p>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              {data.action}
            </p>
          </div>

          {/* 5. PREMIUM/DISCOUNT INDICATOR */}
          {data.premium_discount_pct != null && (
            <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center"><Info className="mr-2" size={18} /> Premium / Discount</h3>
              <div className="bg-surface-900 p-3 rounded">
                <span className="text-gray-400 text-sm">Status: </span>
                {data.premium_discount_pct > 0 ? (
                   <span className="text-down font-bold">Trading {data.premium_discount_pct}% above NAV</span>
                ) : data.premium_discount_pct < 0 ? (
                   <span className="text-up font-bold">Trading {Math.abs(data.premium_discount_pct)}% below NAV — Good entry</span>
                ) : (
                   <span className="text-white font-bold">Trading exactly at NAV</span>
                )}
              </div>
            </div>
          )}

          {/* 7. SIP GUIDANCE */}
          <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center"><Target className="mr-2" size={18} /> SIP Guidance</h3>
            <p className="text-sm text-gray-400 mb-2">
              For long-term SIP investors: <br />
              <span className="text-white font-mono">RSI &lt; 45 + Price &gt; EMA 200 = Excellent entry</span>
            </p>
            <div className="text-sm bg-surface-900 p-2 rounded">
              Current status: <br/> 
              <span className="font-mono text-gray-200">
                RSI = {data.rsi}, {data.above_ema200 ? 'Above' : 'Below'} EMA 200
              </span>
            </div>
            <p className="mt-3 text-sm font-bold text-white">
              → {data.rsi < 45 && data.above_ema200 ? "Excellent entry! Consider adding lump sum." : "Continue SIP. Not ideal for extra lump sum."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ETFDetail;
