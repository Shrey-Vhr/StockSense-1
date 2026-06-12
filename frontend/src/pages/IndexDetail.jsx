import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createChart } from 'lightweight-charts';
import { Activity, TrendingUp, TrendingDown, Target } from 'lucide-react';
import api from '../utils/api';

const IndexDetail = () => {
  const { symbol } = useParams();
  // Decode symbol to handle ^
  const cleanSymbol = symbol ? symbol.replace('IDX-', '^') : '^NSEI';
  
  const [data, setData] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [legendData, setLegendData] = useState({ ema20: null, ema50: null, ema200: null });

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

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
          const baseSymbol = cleanSymbol.replace('.NS', '').replace('^', '');
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
          <h1 className="text-3xl font-bold text-white">{data.symbol}</h1>
          <p className="text-gray-400">Index Analysis</p>
        </div>
        <div className="mt-4 md:mt-0 text-right">
          <div className="text-3xl font-mono font-bold text-white">₹{data.current_value.toFixed(2)}</div>
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
          {/* 3. KEY METRICS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
              <div className="text-gray-400 text-xs mb-1">52W High</div>
              <div className="text-white font-mono font-bold">₹{data.high_52w}</div>
              <div className="text-xs text-gray-500">{data.pct_from_high}% from high</div>
            </div>
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
              <div className="text-gray-400 text-xs mb-1">52W Low</div>
              <div className="text-white font-mono font-bold">₹{data.low_52w}</div>
              <div className="text-xs text-gray-500">+{data.pct_from_low}% from low</div>
            </div>
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
              <div className="text-gray-400 text-xs mb-1">RSI (14)</div>
              <div className="text-white font-mono font-bold">{data.rsi}</div>
            </div>
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
              <div className="text-gray-400 text-xs mb-1">Trend</div>
              <div className={`font-bold ${data.trend_color === 'green' ? 'text-[#00c853]' : data.trend_color === 'red' ? 'text-[#ff1744]' : 'text-[#f0b429]'}`}>
                {data.trend}
              </div>
            </div>

            {/* NEW: PE Ratio */}
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
              <div className="text-gray-400 text-xs mb-1">Index PE</div>
              <div className={`font-mono font-bold ${data.pe_ratio > 22 ? 'text-[#ff1744]' : data.pe_ratio < 18 ? 'text-[#00c853]' : 'text-[#f0b429]'}`}>
                {data.pe_ratio}x
              </div>
              <div className="text-xs text-gray-500">Fair value: 18-22x</div>
            </div>

            {/* NEW: INDIA VIX */}
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
              <div className="text-gray-400 text-xs mb-1">India VIX</div>
              <div className={`font-mono font-bold ${data.india_vix < 12 ? 'text-[#00c853]' : data.india_vix < 16 ? 'text-[#f0b429]' : data.india_vix < 20 ? 'text-[#ff9800]' : 'text-[#ff1744]'}`}>
                {data.india_vix}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {data.india_vix < 12 ? "Low Fear" : data.india_vix < 16 ? "Normal Volatility" : data.india_vix < 20 ? "Elevated Fear" : "High Fear"}
              </div>
            </div>

            {/* NEW: Market Breadth */}
            <div className="col-span-2 bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
              <div className="text-gray-400 text-xs mb-1 flex justify-between">
                <span>Market Breadth</span>
                <span className={`font-bold ${data.market_breadth?.ratio > 1 ? 'text-[#00c853]' : 'text-[#ff1744]'}`}>Ratio: {data.market_breadth?.ratio}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-mono mt-1">
                <span className="text-[#00c853]">Adv: {data.market_breadth?.advances}</span>
                <span className="text-[#ff1744]">Dec: {data.market_breadth?.declines}</span>
                <span className="text-gray-400">Unch: {data.market_breadth?.unchanged}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-700 mt-2 rounded-full overflow-hidden flex">
                <div style={{ width: `${(data.market_breadth?.advances / (data.market_breadth?.advances + data.market_breadth?.declines)) * 100}%` }} className="bg-[#00c853] h-full" />
                <div style={{ width: `${(data.market_breadth?.declines / (data.market_breadth?.advances + data.market_breadth?.declines)) * 100}%` }} className="bg-[#ff1744] h-full" />
              </div>
            </div>

            {/* NEW: FII/DII FLOW */}
            <div className="col-span-2 md:col-span-4 bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
              <div className="text-gray-400 text-xs mb-2">FII/DII Flow (Last 5 Days)</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400">FII (Foreign Inst.)</div>
                  <div className={`font-mono font-bold text-lg ${data.fii_dii?.fii >= 0 ? 'text-[#00c853]' : 'text-[#ff1744]'}`}>
                    {data.fii_dii?.fii >= 0 ? '+' : ''}₹{data.fii_dii?.fii?.toLocaleString('en-IN')} Cr
                    <span className="text-xs ml-2 font-normal opacity-70">({data.fii_dii?.fii >= 0 ? 'buying' : 'selling'})</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">DII (Domestic Inst.)</div>
                  <div className={`font-mono font-bold text-lg ${data.fii_dii?.dii >= 0 ? 'text-[#00c853]' : 'text-[#ff1744]'}`}>
                    {data.fii_dii?.dii >= 0 ? '+' : ''}₹{data.fii_dii?.dii?.toLocaleString('en-IN')} Cr
                    <span className="text-xs ml-2 font-normal opacity-70">({data.fii_dii?.dii >= 0 ? 'buying' : 'selling'})</span>
                  </div>
                </div>
              </div>
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
                  <th className="pb-2">YTD</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {['1_week', '1_month', '3_month', '6_month', '1_year', 'ytd'].map((period) => (
                    <td key={period} className={`pt-2 ${data.returns[period] >= 0 ? 'text-[#00c853]' : 'text-[#ff1744]'}`}>
                      {data.returns[period] != null ? `${data.returns[period]}%` : '-'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          {/* 6. INDEX VERDICT BOX */}
          <div className={`p-6 rounded-xl border border-${data.verdict_color === 'green' ? '[#00c853]' : data.verdict_color === 'red' ? '[#ff1744]' : '[#f0b429]'} bg-[#161b22]`}>
            <h3 className="text-xl font-bold text-white mb-2">Market Verdict</h3>
            <p className={`text-lg ${data.verdict_color === 'green' ? 'text-[#00c853]' : data.verdict_color === 'red' ? 'text-[#ff1744]' : 'text-[#f0b429]'}`}>
              {data.verdict}
            </p>
            <p className="text-sm text-gray-300 mt-2">
              💡 {data.action}
            </p>
          </div>

          {/* 5. EMA STATUS */}
          <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
            <h3 className="text-lg font-bold text-white mb-3">EMA Status</h3>
            <div className="space-y-2 font-mono">
              <div className="flex justify-between items-center bg-[#0d1117] p-2 rounded">
                <span className="text-gray-400">Price vs EMA 20</span>
                <span>{data.above_ema20 ? 'Above ✅' : 'Below ❌'}</span>
              </div>
              <div className="flex justify-between items-center bg-[#0d1117] p-2 rounded">
                <span className="text-gray-400">Price vs EMA 50</span>
                <span>{data.above_ema50 ? 'Above ✅' : 'Below ❌'}</span>
              </div>
              <div className="flex justify-between items-center bg-[#0d1117] p-2 rounded">
                <span className="text-gray-400">Price vs EMA 200</span>
                <span>{data.above_ema200 ? 'Above ✅' : 'Below ❌'}</span>
              </div>
            </div>
          </div>
          
          {/* 7. WHEN TO INVEST */}
          <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center"><Target className="mr-2" size={18} /> Investment Guidance</h3>
            <p className="text-sm text-gray-400 mb-2">
              Best time to add lump sum to Index ETFs: <br />
              <span className="text-white font-mono">RSI &lt; 50 AND price &gt; EMA 200</span>
            </p>
            <div className="text-sm bg-[#0d1117] p-2 rounded">
              Current status: <br/> 
              <span className="font-mono text-[#f0b429]">
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
