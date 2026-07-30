import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, TrendingUp, TrendingDown, Target } from 'lucide-react';
import api from '../utils/api';
import MarketChart from '../components/market/MarketChart';
import { PageHeader } from '../components/ui';
import { cn } from '../lib/cn';
import { formatCurrency, formatPercent, formatChange } from '../lib/format';

const IndexDetail = () => {
  const { symbol } = useParams();
  // Decode symbol to handle ^
  const cleanSymbol = symbol ? symbol.replace('IDX-', '^') : '^NSEI';
  
  const [data, setData] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchIndexData = async () => {
    try {
      setLoading(true);
      const [analysisRes, historyRes] = await Promise.all([
        api.get(`/analysis/index/${encodeURIComponent(cleanSymbol)}`),
        api.get(`/stocks/history/${encodeURIComponent(cleanSymbol)}?period=1y&interval=1d`)
      ]);
      setData(analysisRes.data);
      setHistoricalData(historyRes.data?.history || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch index analysis.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndexData();
  }, [cleanSymbol]);

  if (loading) return <div className="p-10 flex justify-center"><Activity className="animate-pulse text-brand-400 w-10 h-10" /></div>;
  if (error) return <div className="p-10 text-red-500">{error}</div>;
  if (!data) return null;

  const isUp = data.change >= 0;

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5">
      {/* 1. HEADER */}
      <PageHeader
        title={data.symbol}
        subtitle="Index analysis"
        icon={Activity}
        actions={
          <div className="text-left sm:text-right">
            <div className="text-2xl font-semibold text-gray-100 font-mono tnum tracking-tight">
              {formatCurrency(data.current_value)}
            </div>
            <div className={cn(
              'flex sm:justify-end items-center gap-1 text-sm font-medium mt-0.5 tnum',
              isUp ? 'text-up' : 'text-down',
            )}>
              {isUp ? <TrendingUp size={14} aria-hidden="true" /> : <TrendingDown size={14} aria-hidden="true" />}
              {formatChange(data.change)} ({formatPercent(data.change_percent, { signed: false })})
            </div>
          </div>
        }
      />

      {/* 2. CHART */}
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-3">
        <MarketChart data={historicalData} tvSymbol={cleanSymbol.replace('.NS','').replace('^','')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 3. KEY METRICS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
              <div className="text-2xs font-medium uppercase tracking-wider text-gray-500 mb-1">52W High</div>
              <div className="text-gray-100 font-bold text-lg mt-1 font-mono">₹{data.high_52w}</div>
              <div className="text-xs text-gray-500">{data.pct_from_high}% from high</div>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
              <div className="text-2xs font-medium uppercase tracking-wider text-gray-500 mb-1">52W Low</div>
              <div className="text-gray-100 font-bold text-lg mt-1 font-mono">₹{data.low_52w}</div>
              <div className="text-xs text-gray-500">+{data.pct_from_low}% from low</div>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
              <div className="text-2xs font-medium uppercase tracking-wider text-gray-500 mb-1">RSI (14)</div>
              <div className="text-gray-100 font-bold text-lg mt-1 font-mono">{data.rsi}</div>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
              <div className="text-2xs font-medium uppercase tracking-wider text-gray-500 mb-1">Trend</div>
              <div className={`font-bold ${data.trend_color === 'green' ? 'text-up' : data.trend_color === 'red' ? 'text-down' : 'text-gray-100'}`}>
                {data.trend}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {/* NEW: PE Ratio */}
            <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
              <div className="text-2xs font-medium uppercase tracking-wider text-gray-500 mb-1">Index PE</div>
              <div className={`font-mono font-bold ${data.pe_ratio > 22 ? 'text-down' : data.pe_ratio < 18 ? 'text-up' : 'text-gray-100'}`}>
                {data.pe_ratio}x
              </div>
              <div className="text-xs text-gray-500">Fair value: 18-22x</div>
            </div>

            {/* NEW: INDIA VIX */}
            <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
              <div className="text-2xs font-medium uppercase tracking-wider text-gray-500 mb-1">India VIX</div>
              <div className={`font-mono font-bold ${data.india_vix < 12 ? 'text-up' : data.india_vix < 16 ? 'text-gray-100' : data.india_vix < 20 ? 'text-amber-400' : 'text-down'}`}>
                {data.india_vix}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {data.india_vix < 12 ? "Low Fear" : data.india_vix < 16 ? "Normal Volatility" : data.india_vix < 20 ? "Elevated Fear" : "High Fear"}
              </div>
            </div>

            {/* NEW: Market Breadth */}
            <div className="col-span-2 md:col-span-1 bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
              <div className="text-2xs font-medium uppercase tracking-wider text-gray-500 mb-1 flex justify-between">
                <span>Market Breadth</span>
                <span className={`font-bold ${data.market_breadth?.ratio > 1 ? 'text-up' : 'text-down'}`}>Ratio: {data.market_breadth?.ratio}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-mono mt-1">
                <span className="text-up">Adv: {data.market_breadth?.advances}</span>
                <span className="text-down">Dec: {data.market_breadth?.declines}</span>
                <span className="text-gray-400">Unch: {data.market_breadth?.unchanged}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-700 mt-2 rounded-full overflow-hidden flex">
                <div style={{ width: `${(data.market_breadth?.advances / (data.market_breadth?.advances + data.market_breadth?.declines)) * 100}%` }} className="bg-up h-full" />
                <div style={{ width: `${(data.market_breadth?.declines / (data.market_breadth?.advances + data.market_breadth?.declines)) * 100}%` }} className="bg-down h-full" />
              </div>
            </div>
          </div>
          
          {/* NEW: FII/DII FLOW */}
          <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700 mt-4">
            <div className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">FII/DII Flow (Last 5 Days)</div>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <div className="text-sm text-gray-400">FII (Foreign Inst.)</div>
                <div className={`font-mono font-bold text-lg ${data.fii_dii?.fii >= 0 ? 'text-up' : 'text-down'}`}>
                  {data.fii_dii?.fii >= 0 ? '+' : ''}₹{data.fii_dii?.fii?.toLocaleString('en-IN')} Cr
                  <span className="text-xs ml-2 font-normal opacity-70">({data.fii_dii?.fii >= 0 ? 'buying' : 'selling'})</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">DII (Domestic Inst.)</div>
                <div className={`font-mono font-bold text-lg ${data.fii_dii?.dii >= 0 ? 'text-up' : 'text-down'}`}>
                  {data.fii_dii?.dii >= 0 ? '+' : ''}₹{data.fii_dii?.dii?.toLocaleString('en-IN')} Cr
                  <span className="text-xs ml-2 font-normal opacity-70">({data.fii_dii?.dii >= 0 ? 'buying' : 'selling'})</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. RETURNS TABLE */}
          <div className="bg-surface-850 p-4 rounded-xl border border-surface-800 overflow-x-auto">
            <h3 className="text-lg font-bold text-white mb-4">Rolling Returns</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-3">
              {[
                { key: '1_week', label: '1 Week' },
                { key: '1_month', label: '1 Month' },
                { key: '3_month', label: '3 Month' },
                { key: '6_month', label: '6 Month' },
                { key: '1_year', label: '1 Year' },
                { key: 'ytd', label: 'YTD' },
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
        </div>

        <div className="space-y-6">
          {/* 6. INDEX VERDICT BOX */}
          <div className="bg-surface-850 border border-surface-700 rounded-2xl p-5">
            <h3 className="text-base font-bold text-gray-100 mb-2">Market Verdict</h3>
            <p className={`text-lg ${data.verdict_color === 'green' ? 'text-up' : data.verdict_color === 'red' ? 'text-down' : 'text-gray-100'}`}>
              {data.verdict}
            </p>
            <p className="text-sm text-gray-300 mt-2">
              💡 {data.action}
            </p>
          </div>

          {/* 5. EMA STATUS */}
          <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
            <h3 className="text-lg font-bold text-white mb-3">EMA Status</h3>
            <div className="space-y-2 font-mono">
              <div className="flex justify-between items-center bg-surface-900 p-2 rounded">
                <span className="text-gray-400">Price vs EMA 20</span>
                <span>{data.above_ema20 ? 'Above ✅' : 'Below ❌'}</span>
              </div>
              <div className="flex justify-between items-center bg-surface-900 p-2 rounded">
                <span className="text-gray-400">Price vs EMA 50</span>
                <span>{data.above_ema50 ? 'Above ✅' : 'Below ❌'}</span>
              </div>
              <div className="flex justify-between items-center bg-surface-900 p-2 rounded">
                <span className="text-gray-400">Price vs EMA 200</span>
                <span>{data.above_ema200 ? 'Above ✅' : 'Below ❌'}</span>
              </div>
            </div>
          </div>
          
          {/* 7. WHEN TO INVEST */}
          <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 transition-colors duration-fast hover:border-surface-700">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center"><Target className="mr-2" size={18} /> Investment Guidance</h3>
            <p className="text-sm text-gray-400 mb-2">
              Best time to add lump sum to Index ETFs: <br />
              <span className="text-white font-mono">RSI &lt; 50 AND price &gt; EMA 200</span>
            </p>
            <div className="text-sm bg-surface-900 p-2 rounded">
              Current status: <br/> 
              <span className="font-mono text-gray-200">
                RSI = {data.rsi}, Price {data.above_ema200 ? 'above' : 'below'} EMA 200
              </span>
            </div>
            <p className="mt-3 text-sm font-bold text-white">
              → {data.rsi < 50 && data.above_ema200 ? "Good entry point for lump sum." : "Neutral. Regular SIP recommended."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndexDetail;
