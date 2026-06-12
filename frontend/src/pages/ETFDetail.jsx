import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createChart } from 'lightweight-charts';
import { Activity, TrendingUp, TrendingDown, Target, Info } from 'lucide-react';
import api from '../utils/api';

const ETFDetail = () => {
  const { symbol } = useParams();
  const cleanSymbol = symbol ? symbol.toUpperCase() : 'NIFTYBEES.NS';
  
  const [data, setData] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [legendData, setLegendData] = useState({ ema20: null, ema50: null, ema200: null });
  const [watchlistAdded, setWatchlistAdded] = useState(false);

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

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

  const calculateEMA = (data, period) => {
    if (!data || data.length === 0) return [];
    const k = 2 / (period + 1);
    let emaArray = [];
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
  };

  useEffect(() => {
    if (!chartContainerRef.current || !historicalData || historicalData.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: { background: { color: '#0d1117' }, textColor: '#e6edf3' },
      grid: { vertLines: { color: '#21262d' }, horzLines: { color: '#21262d' } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#21262d' },
      timeScale: { borderColor: '#21262d' },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00c853', downColor: '#ff1744',
      borderUpColor: '#00c853', borderDownColor: '#ff1744',
      wickUpColor: '#00c853', wickDownColor: '#ff1744',
    });

    const cleanDate = (dateStr) => {
      if (!dateStr) return null;
      return String(dateStr).split(' ')[0].split('T')[0];
    };

    const candleData = historicalData
      .map(d => ({
        time: cleanDate(d.date),
        open: parseFloat(d.open), high: parseFloat(d.high),
        low: parseFloat(d.low), close: parseFloat(d.close),
      }))
      .filter(d => d.time !== null);
    candleSeries.setData(candleData);

    const ema20Data = calculateEMA(candleData, 20);
    const ema50Data = calculateEMA(candleData, 50);
    const ema200Data = calculateEMA(candleData, 200);

    const ema20Series = chart.addLineSeries({ color: '#f0b429', lineWidth: 1, title: 'EMA 20' });
    ema20Series.setData(ema20Data);
    const ema50Series = chart.addLineSeries({ color: '#2196f3', lineWidth: 1, title: 'EMA 50' });
    ema50Series.setData(ema50Data);
    const ema200Series = chart.addLineSeries({ color: '#ff5252', lineWidth: 1, title: 'EMA 200' });
    ema200Series.setData(ema200Data);
    
    setLegendData({
      ema20: ema20Data.length > 0 ? ema20Data[ema20Data.length - 1].value : null,
      ema50: ema50Data.length > 0 ? ema50Data[ema50Data.length - 1].value : null,
      ema200: ema200Data.length > 0 ? ema200Data[ema200Data.length - 1].value : null,
    });

    chart.timeScale().fitContent();
    chartRef.current = chart;

    setTimeout(() => {
      if (chartContainerRef.current) {
        const tvLink = chartContainerRef.current.querySelector('a[href*="tradingview.com"]');
        if (tvLink) {
          const baseSymbol = symbol.replace('.NS', '');
          const tvSymbol = `NSE:${baseSymbol}`;
          const finalUrl = `https://in.tradingview.com/chart/?symbol=${tvSymbol}`;
          
          tvLink.href = finalUrl;
          tvLink.target = '_blank';
          
          tvLink.addEventListener('click', (e) => {
            e.stopPropagation();
          });
        }
      }
    }, 100);

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [historicalData]);

  if (loading) return <div className="p-10 flex justify-center"><Activity className="animate-pulse text-[#f0b429] w-10 h-10" /></div>;
  if (error) return <div className="p-10 text-red-500">{error}</div>;
  if (!data) return null;

  const isUp = data.change >= 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">{data.symbol}</h1>
            <button
              onClick={addToWatchlist}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                watchlistAdded
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {watchlistAdded ? '✓ Watchlisted' : '+ Watchlist'}
            </button>
          </div>
          <p className="text-gray-400">ETF Analysis</p>
        </div>
        <div className="mt-4 md:mt-0 text-right">
          <div className="text-3xl font-mono font-bold text-white">₹{data.current_price.toFixed(2)}</div>
          <div className={`flex justify-end items-center text-lg font-mono font-medium ${isUp ? 'text-[#00c853]' : 'text-[#ff1744]'}`}>
            {isUp ? <TrendingUp className="mr-1" size={20} /> : <TrendingDown className="mr-1" size={20} />}
            {isUp ? '+' : ''}{data.change.toFixed(2)} ({data.change_percent.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* 2. CHART */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
        <div className="relative w-full">
          <div className="absolute top-2 left-2 z-10 text-xs font-mono bg-[#161b22]/80 p-3 rounded-lg border border-[#30363d] shadow-lg backdrop-blur-sm pointer-events-none">
            <div className="text-white mb-2 font-bold uppercase tracking-wider text-[10px]">EMAs</div>
            <div className="space-y-1">
              {legendData.ema20 && <div className="flex items-center text-[#f0b429]"><span className="w-2 h-2 rounded-full bg-[#f0b429] mr-2"></span>EMA 20: {legendData.ema20}</div>}
              {legendData.ema50 && <div className="flex items-center text-[#2196f3]"><span className="w-2 h-2 rounded-full bg-[#2196f3] mr-2"></span>EMA 50: {legendData.ema50}</div>}
              {legendData.ema200 && <div className="flex items-center text-[#ff5252]"><span className="w-2 h-2 rounded-full bg-[#ff5252] mr-2"></span>EMA 200: {legendData.ema200}</div>}
            </div>
          </div>
          <div ref={chartContainerRef} className="w-full h-[400px]" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 3. ETF METRICS */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
              <p className="text-gray-400 text-xs">Expense Ratio</p>
              <p className="text-white font-bold">
                {data.expense_ratio ? `${data.expense_ratio}%` : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Annual cost</p>
            </div>
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
              <p className="text-gray-400 text-xs">Tracks</p>
              <p className="text-white font-bold text-sm mt-1">
                {data.underlying_index || 'N/A'}
              </p>
            </div>
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
              <p className="text-gray-400 text-xs">Fund House</p>
              <p className="text-white font-bold text-sm mt-1">
                {data.fund_house || 'N/A'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
              <div className="text-gray-400 text-xs mb-1">NAV</div>
              <div className="text-white font-mono font-bold">{data.nav ? `₹${data.nav}` : 'N/A'}</div>
            </div>
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
              <div className="text-gray-400 text-xs mb-1">Prem/Discount to NAV</div>
              <div className={`font-mono font-bold ${data.premium_discount_pct > 0 ? 'text-[#ff1744]' : 'text-[#00c853]'}`}>
                {data.premium_discount_pct != null ? `${data.premium_discount_pct}%` : 'N/A'}
              </div>
            </div>
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
              <div className="text-gray-400 text-xs mb-1">AUM</div>
              <div className="text-white font-mono font-bold">
                {data.aum ? `₹${(data.aum / 10000000).toFixed(2)} Cr` : 'N/A'}
              </div>
            </div>
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
              <div className="text-gray-400 text-xs mb-1">Volume Ratio</div>
              <div className="text-white font-mono font-bold">{data.volume_ratio ? `${data.volume_ratio}x` : 'N/A'}</div>
            </div>
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
              <div className="text-gray-400 text-xs mb-1">RSI (14)</div>
              <div className="text-white font-mono font-bold">{data.rsi}</div>
            </div>
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
              <div className="text-gray-400 text-xs mb-1">52W High</div>
              <div className="text-white font-mono font-bold">₹{data.high_52w}</div>
            </div>
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
              <div className="text-gray-400 text-xs mb-1">52W Low</div>
              <div className="text-white font-mono font-bold">₹{data.low_52w}</div>
            </div>
          </div>

          {/* 4. RETURNS TABLE */}
          <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] overflow-x-auto">
            <h3 className="text-lg font-bold text-white mb-4">Rolling Returns</h3>
            <table className="w-full text-left font-mono">
              <thead>
                <tr className="border-b border-[#30363d] text-gray-500">
                  <th className="pb-2">1 Week</th>
                  <th className="pb-2">1 Month</th>
                  <th className="pb-2">3 Month</th>
                  <th className="pb-2">6 Month</th>
                  <th className="pb-2">1 Year</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {['1_week', '1_month', '3_month', '6_month', '1_year'].map((period) => (
                    <td key={period} className={`pt-2 ${data.returns[period] >= 0 ? 'text-[#00c853]' : 'text-[#ff1744]'}`}>
                      {data.returns[period] != null ? `${data.returns[period]}%` : '-'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* 8. ETF COMPARISON (TRACKING ERROR) */}
          {data.underlying_index && data.underlying_index_return_6m != null && (
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] mt-6">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                <Target className="mr-2" size={18} /> ETF Comparison
              </h3>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between items-center bg-[#0d1117] p-3 rounded border border-[#30363d]">
                  <span className="text-gray-400">{data.underlying_index} (6M):</span>
                  <span className={`font-bold ${data.underlying_index_return_6m >= 0 ? 'text-[#00c853]' : 'text-[#ff1744]'}`}>
                    {data.underlying_index_return_6m}%
                  </span>
                </div>
                <div className="flex justify-between items-center bg-[#0d1117] p-3 rounded border border-[#30363d]">
                  <span className="text-gray-400">{data.symbol.replace('.NS', '')} (6M):</span>
                  <span className={`font-bold ${data.returns['6_month'] >= 0 ? 'text-[#00c853]' : 'text-[#ff1744]'}`}>
                    {data.returns['6_month'] != null ? `${data.returns['6_month']}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-[#0d1117] p-3 rounded border border-[#30363d]">
                  <span className="text-gray-400">Tracking Difference:</span>
                  <span className={`font-bold ${data.tracking_difference >= 0 ? 'text-[#00c853]' : 'text-[#ff1744]'}`}>
                    {data.tracking_difference != null ? `${data.tracking_difference > 0 ? '+' : ''}${data.tracking_difference}%` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* 6. ETF-SPECIFIC VERDICT */}
          <div className={`p-6 rounded-xl border border-${data.verdict_color === 'green' ? '[#00c853]' : data.verdict_color === 'red' ? '[#ff1744]' : '[#f0b429]'} bg-[#161b22]`}>
            <h3 className="text-xl font-bold text-white mb-2">ETF Verdict</h3>
            <p className={`text-lg ${data.verdict_color === 'green' ? 'text-[#00c853]' : data.verdict_color === 'red' ? 'text-[#ff1744]' : 'text-[#f0b429]'}`}>
              {data.verdict}
            </p>
            <p className="text-sm text-gray-300 mt-2">
              💡 {data.action}
            </p>
          </div>

          {/* 5. PREMIUM/DISCOUNT INDICATOR */}
          {data.premium_discount_pct != null && (
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center"><Info className="mr-2" size={18} /> Premium / Discount</h3>
              <div className="bg-[#0d1117] p-3 rounded">
                <span className="text-gray-400 text-sm">Status: </span>
                {data.premium_discount_pct > 0 ? (
                   <span className="text-[#ff1744] font-bold">Trading {data.premium_discount_pct}% above NAV</span>
                ) : data.premium_discount_pct < 0 ? (
                   <span className="text-[#00c853] font-bold">Trading {Math.abs(data.premium_discount_pct)}% below NAV — Good entry</span>
                ) : (
                   <span className="text-white font-bold">Trading exactly at NAV</span>
                )}
              </div>
            </div>
          )}

          {/* 7. SIP GUIDANCE */}
          <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center"><Target className="mr-2" size={18} /> SIP Guidance</h3>
            <p className="text-sm text-gray-400 mb-2">
              For long-term SIP investors: <br />
              <span className="text-white font-mono">RSI &lt; 45 + Price &gt; EMA 200 = Excellent entry</span>
            </p>
            <div className="text-sm bg-[#0d1117] p-2 rounded">
              Current status: <br/> 
              <span className="font-mono text-[#f0b429]">
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
