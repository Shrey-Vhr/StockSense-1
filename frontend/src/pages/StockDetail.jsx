import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { createChart } from 'lightweight-charts';
import { Activity, BookOpen, BrainCircuit, Newspaper, TrendingUp, TrendingDown, Target, ShieldAlert, AlertTriangle, BellPlus, X, BarChart2, Building2, Brain } from 'lucide-react';
import api from '../utils/api';
import useStore from '../store/useStore';
import PatternAnalysis from '../components/PatternAnalysis';

const formatPeerValue = (val, prefix='', suffix='', decimals=1) => {
  if (val === null || val === undefined) return '-';
  return `${prefix}${parseFloat(val).toFixed(decimals)}${suffix}`;
};

const MetricCard = ({ label, value, format, goodAbove, goodBelow }) => {
  let displayValue = 'N/A';
  let colorClass = 'text-white';
  let isGood = null;

  if (value !== null && value !== undefined) {
    if (format === 'percent') {
      displayValue = `${parseFloat(value).toFixed(2)}%`;
    } else if (format === 'ratio') {
      displayValue = `${parseFloat(value).toFixed(2)}x`;
    } else {
      displayValue = String(value);
    }

    if (goodAbove !== undefined) {
      isGood = value >= goodAbove;
    } else if (goodBelow !== undefined) {
      isGood = value <= goodBelow;
    }

    if (isGood === true) {
      colorClass = 'text-[#00c853] font-bold';
    } else if (isGood === false) {
      colorClass = 'text-[#ff1744] font-bold';
    }
  }

  return (
    <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center">
      <div className="text-gray-500 text-xs mb-1">{label}</div>
      <div className={`font-mono ${colorClass}`}>{displayValue}</div>
    </div>
  );
};

const InstitutionalTab = ({ symbol }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const fetchData = async (refresh = false) => {
    setLoading(true);
    try {
      const result = await api.get(`/analysis/institutional/${symbol}${refresh ? '?refresh=true' : ''}`);
      setData(result.data || result);
    } catch (e) {
      console.error('Institutional fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [symbol]);
  
  if (loading && !data) return <div className="flex justify-center py-20 text-[#10b981]"><Activity className="animate-pulse" /></div>;
  if (!data) return <p className="text-gray-400 text-center py-10">No institutional data available.</p>;
  
  return (
    <div className="space-y-4 relative">
      {loading && <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10"><Activity className="animate-pulse text-[#10b981]" /></div>}
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          Institutional Activity
        </h2>
        <button 
          onClick={() => fetchData(true)}
          className="text-xs bg-surface-900 hover:bg-[#30363d] border border-surface-800 px-3 py-2 rounded-lg text-gray-300 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Smart Money Score */}
      <div className="bg-surface-900 rounded-xl p-4 border border-surface-800">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-400 text-sm mb-1">
              Smart Money Score
            </p>
            <p className={`text-3xl font-bold font-mono ${
              data.smart_money_score >= 65 
                ? 'text-[#00c853]'
              : data.smart_money_score <= 35
                ? 'text-[#ff1744]'
                : 'text-[#10b981]'
            }`}>
              {data.smart_money_score}/100
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
            data.smart_money_score >= 65
              ? 'bg-[#00c853]/10 text-[#00c853] border border-[#00c853]/30'
            : data.smart_money_score <= 35
              ? 'bg-[#ff1744]/10 text-[#ff1744] border border-[#ff1744]/30'
              : 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30'
          }`}>
            {data.institutional_verdict}
          </div>
        </div>
      </div>
      
      {/* Promoter Activity */}
      <div className="bg-surface-900 rounded-xl p-4 border border-surface-800">
        <h3 className="text-white font-bold mb-3">
          Promoter Activity
        </h3>
        
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-lg font-bold ${
            data.promoter_activity?.trend === 'Increasing'
              ? 'text-[#00c853]'
            : data.promoter_activity?.trend === 'Decreasing'
              ? 'text-[#ff1744]'
              : 'text-[#10b981]'
          }`}>
            {data.promoter_activity?.trend === 'Increasing'
              ? 'â†‘ Increasing'
            : data.promoter_activity?.trend === 'Decreasing'
              ? 'â†“ Decreasing'
              : '→ Stable'}
          </span>
          {data.promoter_activity?.change_vs_last_quarter !== undefined && data.promoter_activity?.change_vs_last_quarter !== null && (
            <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">
              {data.promoter_activity.change_vs_last_quarter > 0 ? '+' : ''}
              {data.promoter_activity.change_vs_last_quarter}% vs last quarter
            </span>
          )}
        </div>
        
        {/* Promoter holding trend bars */}
        {data.promoter_activity?.promoter_values && data.promoter_activity.promoter_values.length > 0 && (
          <div className="mt-2">
            <p className="text-gray-500 text-xs mb-3">
              Promoter Holding (Last {data.promoter_activity.promoter_values.length} Quarters)
            </p>
            <div className="flex items-end gap-3 h-20">
              {[...data.promoter_activity.promoter_values].slice(0,4).reverse().map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                  <span className="text-xs text-gray-400 font-mono">
                    {val}%
                  </span>
                  <div
                    className="w-full bg-[#2196f3]/60 rounded-t border-t border-[#2196f3]"
                    style={{ 
                      height: `${Math.max(10, (val/100)*60)}px` 
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Deals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bulk Deals */}
        <div className="bg-surface-900 rounded-xl p-4 border border-surface-800">
          <h3 className="text-white font-bold mb-3">
            Recent Bulk Deals
          </h3>
          {data.bulk_deals && data.bulk_deals.length > 0 ? (
            <div className="space-y-2">
              {data.bulk_deals.slice(0,5).map((deal, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-surface-850 border border-surface-800 rounded-lg">
                  <div className="overflow-hidden pr-2">
                    <p className="text-white text-sm font-medium truncate" title={deal.client}>
                      {deal.client}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {deal.date}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      deal.buy_sell?.toLowerCase().includes('buy')
                        ? 'bg-[#00c853]/10 text-[#00c853] border border-[#00c853]/20'
                        : 'bg-[#ff1744]/10 text-[#ff1744] border border-[#ff1744]/20'
                    }`}>
                      {deal.buy_sell}
                    </span>
                    <p className="text-gray-400 text-xs mt-1 font-mono">
                      ₹{deal.price} <span className="text-gray-600">Ã—</span> {Number(deal.quantity).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">No recent bulk deals</p>
          )}
        </div>
        
        {/* Block Deals */}
        <div className="bg-surface-900 rounded-xl p-4 border border-surface-800">
          <h3 className="text-white font-bold mb-3">
            Recent Block Deals
          </h3>
          {data.block_deals && data.block_deals.length > 0 ? (
            <div className="space-y-2">
              {data.block_deals.slice(0,5).map((deal, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-surface-850 border border-surface-800 rounded-lg">
                  <div className="overflow-hidden pr-2">
                    <p className="text-white text-sm font-medium truncate" title={deal.client}>
                      {deal.client}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {deal.date}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      deal.buy_sell?.toLowerCase().includes('buy')
                        ? 'bg-[#00c853]/10 text-[#00c853] border border-[#00c853]/20'
                        : 'bg-[#ff1744]/10 text-[#ff1744] border border-[#ff1744]/20'
                    }`}>
                      {deal.buy_sell}
                    </span>
                    {deal.value_cr && (
                      <p className="text-gray-400 text-xs mt-1 font-mono">
                        ₹{deal.value_cr} Cr
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">No recent block deals</p>
          )}
        </div>
      </div>
      
    </div>
  );
};

const StockDetail = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const cleanSymbol = symbol ? symbol.toUpperCase() : 'RELIANCE.NS';
  const { setLoading } = useStore();

  const [watchlistAdded, setWatchlistAdded] = useState(false);

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

  const [activeTab, setActiveTab] = useState('technical');
  const [quote, setQuote] = useState(null);
  const [stockPrice, setStockPrice] = useState(null);
  const [priceSource, setPriceSource] = useState(null);
  const [quoteFlash, setQuoteFlash] = useState('');
  const [techData, setTechData] = useState(null);
  const [fundData, setFundData] = useState(null);
  const [news, setNews] = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [legendData, setLegendData] = useState({ ema20: null, ema50: null, ema200: null });

  const [isFundLoading, setIsFundLoading] = useState(false);
  const [isNewsLoading, setIsNewsLoading] = useState(false);

  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertType, setAlertType] = useState('price_above');
  const [alertValue, setAlertValue] = useState('');

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  const isMarketOpen = () => {
    const now = new Date();
    const ist = new Date(now.toLocaleString('en-US', 
      {timeZone: 'Asia/Kolkata'}));
    const hours = ist.getHours();
    const minutes = ist.getMinutes();
    const day = ist.getDay();
    
    if (day === 0 || day === 6) return false;
    const timeInMins = hours * 60 + minutes;
    return timeInMins >= 555 && timeInMins <= 930;
  };

  const fetchStockQuote = async () => {
    try {
      const res = await api.get(`/stocks/quote/${cleanSymbol}`);
      const data = res.data;
      if (data && data.current_price) {
        setStockPrice((prevPrice) => {
          if (prevPrice && data.current_price !== prevPrice) {
            const flashClass = data.current_price > prevPrice ? 'animate-flash-green' : 'animate-flash-red';
            setQuoteFlash(flashClass);
            setTimeout(() => setQuoteFlash(''), 500);
          }
          return data.current_price;
        });
        setQuote(data);
        setPriceSource(data.source || 'rest');
      }
    } catch (error) {
      console.log('Quote fetch error:', error);
    }
  };

  useEffect(() => {
    // Reset state on symbol change
    setQuote(null); setStockPrice(null); setTechData(null); setFundData(null); setNews([]); setSentiment(null); setAiAnalysis(null); setErrorMsg(null);
    setHistoricalData(null); setChartLoading(true);
    setActiveTab('technical');
    fetchInitialData();
    
    fetchStockQuote();
    const priceInterval = setInterval(() => {
      if (isMarketOpen()) {
        fetchStockQuote();
      }
    }, 10000);
    
    return () => clearInterval(priceInterval);
  }, [cleanSymbol]);

  const fetchNews = async (forceRefresh = false) => {
    setIsNewsLoading(true);
    try {
      const url = `/news/stock/${cleanSymbol}?company_name=${cleanSymbol.replace('.NS', '')}${forceRefresh ? '&refresh=true' : ''}`;
      const res = await api.get(url);
      setNews(res.data.articles || []);
      if (res.data.overall_sentiment) setSentiment(res.data.overall_sentiment);
    } catch (e) {
      console.error('Failed to fetch news', e);
    } finally {
      setIsNewsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'news' && cleanSymbol) {
      fetchNews();
    }
  }, [activeTab, cleanSymbol]);

  const fetchInitialData = async () => {
    try {
      const [tRes, hRes] = await Promise.all([
        api.get(`/analysis/technical/${cleanSymbol}`),
        api.get(`/stocks/history/${cleanSymbol}?period=1y&interval=1d`)
      ]);
      setTechData(tRes.data);
      
      const history = hRes.data?.history || [];
      setHistoricalData(history);
      setChartLoading(false);
    } catch (e) {
      setErrorMsg("Data temporarily unavailable, retrying...");
      setChartLoading(false);
    }

    // News is now fetched on demand via useEffect when activeTab === 'news'
  };

  const handleTabChange = async (tab) => {
    setActiveTab(tab);

    if (tab === 'fundamental' && !fundData) {
      setIsFundLoading(true);
      try {
        const res = await api.get(`/analysis/fundamental/${cleanSymbol}`);
        setFundData(res.data);
      } catch (e) {
        console.error(e);
      } finally { setIsFundLoading(false); }
    }

    // News fetching is handled by useEffect when activeTab === 'news'
  };

  const handleRefreshFundamental = async () => {
    setIsFundLoading(true);
    try {
      const res = await api.get(`/analysis/fundamental/${cleanSymbol}?refresh=true`);
      setFundData(res.data);
    } catch (e) {
      console.error(e);
    } finally { setIsFundLoading(false); }
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Recent';
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short', 
        year: 'numeric'
      });
    } catch {
      return 'Recent';
    }
  };

  const formatMetric = (key, value) => {
    if (value === null || value === undefined) return 'N/A';
    
    switch(key) {
      case 'market_cap':
        // Show in Cr with commas
        return '₹' + Math.round(value).toLocaleString('en-IN');
      
      case 'pe_ratio':
      case 'pb_ratio':
        // Show with max 2 decimals + x
        return parseFloat(value).toFixed(1) + 'x';
      
      case 'roe':
      case 'roce':
      case 'dividend_yield':
        // Show as percentage with 2 decimals
        // If value > 50 it's probably already in basis points
        if (value > 50) value = value / 100;
        return parseFloat(value).toFixed(2) + '%';
      
      case 'book_value':
      case 'eps':
        return '₹' + parseFloat(value).toFixed(2);
      
      default:
        return String(value);
    }
  };

  // â”€â”€â”€ EMA calculation helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      
      // Only add EMA value after enough data points
      if (index >= period - 1) {
        emaArray.push({
          time: candle.time,
          value: parseFloat(ema.toFixed(2))
        });
      }
    });
    
    return emaArray;
  };

  // â”€â”€â”€ Chart drawing effect â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!chartContainerRef.current || !historicalData || historicalData.length === 0) return;

    // Cleanup old chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#0d1117' },
        textColor: '#e6edf3',
      },
      grid: {
        vertLines: { color: '#21262d' },
        horzLines: { color: '#21262d' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#21262d' },
      timeScale: { borderColor: '#21262d' },
    });

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00c853',
      downColor: '#ff1744',
      borderUpColor: '#00c853',
      borderDownColor: '#ff1744',
      wickUpColor: '#00c853',
      wickDownColor: '#ff1744',
    });

    const cleanDate = (dateStr) => {
      if (!dateStr) return null;
      // Take only the date part before any space or T
      return String(dateStr).split(' ')[0].split('T')[0];
    };

    const candleData = historicalData
      .map(d => ({
        time: cleanDate(d.date),
        open: parseFloat(d.open),
        high: parseFloat(d.high),
        low: parseFloat(d.low),
        close: parseFloat(d.close),
      }))
      .filter(d => d.time !== null);
    candleSeries.setData(candleData);

    // Volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const volumeData = historicalData
      .map(d => ({
        time: cleanDate(d.date),
        value: d.volume,
        color: d.close >= d.open ? 'rgba(0, 200, 83, 0.3)' : 'rgba(255, 23, 68, 0.3)',
      }))
      .filter(d => d.time !== null);
    volumeSeries.setData(volumeData);

    // EMA overlays
    const ema20Data = calculateEMA(candleData, 20);
    const ema50Data = calculateEMA(candleData, 50);
    const ema200Data = calculateEMA(candleData, 200);

    const ema20Series = chart.addLineSeries({
      color: '#10b981',
      lineWidth: 1,
      lineStyle: 0,
      title: 'EMA 20',
      lastValueVisible: true,
      priceLineVisible: false,
    });
    ema20Series.setData(ema20Data);

    const ema50Series = chart.addLineSeries({
      color: '#2196f3',
      lineWidth: 1,
      lineStyle: 0,
      title: 'EMA 50',
      lastValueVisible: true,
      priceLineVisible: false,
    });
    ema50Series.setData(ema50Data);

    const ema200Series = chart.addLineSeries({
      color: '#ff5252',
      lineWidth: 1,
      lineStyle: 0,
      title: 'EMA 200',
      lastValueVisible: true,
      priceLineVisible: false,
    });
    ema200Series.setData(ema200Data);
    
    // Update legend data state
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
          const baseSymbol = cleanSymbol.replace('.NS', '');
          const tvSymbol = `NSE:${baseSymbol}`;
          const finalUrl = `https://in.tradingview.com/chart/?symbol=${tvSymbol}`;
          
          console.log('Original symbol:', cleanSymbol);
          console.log('Generated TradingView symbol:', tvSymbol);
          console.log('Final URL:', finalUrl);

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

  const handleGenerateAI = async () => {
    if (!techData || !fundData) return;
    setAiLoading(true);
    setActiveTab('ai');

    try {
      const payload = {
        quote: quote || {},
        technical: techData,
        fundamental: fundData,
        news: news.slice(0, 5),
        market_regime: 'Neutral', // Placeholder
        sector_performance: 'Neutral'
      };

      const res = await api.post(`/ai/analyze/${cleanSymbol}`, payload);
      setAiAnalysis(res.data.analysis);
    } catch (e) {
      console.error(e);
      alert("AI Analysis failed. Check console or API Key.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    try {
      await api.post('/alerts', {
        symbol: cleanSymbol,
        alert_type: alertType,
        value: parseFloat(alertValue)
      });
      setShowAlertModal(false);
      setAlertValue('');
      alert("Alert created successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to create alert.");
    }
  };

  const isUp = quote && quote.change_percent >= 0;
  const companyName = quote?.company_name || quote?.name || fundData?.company_name;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {errorMsg && (
        <div className="bg-[#ff1744]/10 border border-[#ff1744]/30 text-[#ff1744] px-4 py-3 rounded-lg flex items-center">
          <AlertTriangle size={18} className="mr-2" /> {errorMsg}
        </div>
      )}

      {/* Price Header */}
      {quote && (
        <motion.div
          className="flex justify-between items-start px-6 py-4 bg-surface-850 border-b border-surface-800"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-50 tracking-tight">{cleanSymbol.replace('.NS', '')}</h1>
              <button
                onClick={addToWatchlist}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-800 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all ml-3"
              >
                {watchlistAdded ? '✓ Watchlisted' : '+ Watchlist'}
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-0.5 font-mono">{companyName || symbol}</p>
          </div>
          <div className="mt-4 md:mt-0 text-right flex flex-col items-end">
            <div className={`text-4xl font-bold text-gray-50 font-mono tracking-tight text-right transition-colors duration-500 rounded px-2 ${quoteFlash}`}>
              ₹{stockPrice ? stockPrice.toFixed(2) : quote.current_price?.toFixed(2)}
            </div>
            <div className={`flex justify-end items-center text-sm font-semibold mt-1 text-right transition-all duration-500 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {isUp ? <TrendingUp className="mr-1" size={20} /> : <TrendingDown className="mr-1" size={20} />}
              {isUp ? '+' : ''}{quote.change_amount?.toFixed(2)} ({Math.abs(quote.change_percent).toFixed(2)}%)
            </div>
            <button
              onClick={() => setShowAlertModal(true)}
              className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-all flex items-center gap-1.5"
            >
              <BellPlus size={14} className="mr-1" /> Create Alert
            </button>
          </div>
        </motion.div>
      )}

      {/* Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-850 border border-surface-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <BellPlus className="mr-2 text-[#10b981]" size={20} /> Add Alert for {cleanSymbol.replace('.NS', '')}
              </h3>
              <button onClick={() => setShowAlertModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Alert Condition</label>
                <select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value)}
                  className="w-full bg-surface-900 border border-surface-800 text-white rounded p-2 focus:border-[#10b981] focus:outline-none"
                >
                  <option value="price_above">Price goes Above</option>
                  <option value="price_below">Price goes Below</option>
                  <option value="rsi_above">RSI goes Above (Overbought)</option>
                  <option value="rsi_below">RSI goes Below (Oversold)</option>
                  <option value="volume_spike">Volume Spikes Above (Multiplier)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Target Value</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={alertValue}
                  onChange={(e) => setAlertValue(e.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full bg-surface-900 border border-surface-800 text-white rounded p-2 focus:border-[#10b981] focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Current Price: ₹{stockPrice ? stockPrice.toFixed(2) : quote?.current_price?.toFixed(2)}</p>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-[#10b981] text-black font-bold py-2 rounded hover:bg-amber-500 transition-colors">
                  Set Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-surface-950 border-b border-surface-800 rounded-none">
        {chartLoading ? (
          <div className="w-full h-[400px] flex items-center justify-center text-[#10b981]">
            <Activity className="animate-pulse w-8 h-8" />
          </div>
        ) : (
          <div className="relative w-full">
            <div className="absolute top-2 left-2 z-10 text-xs font-mono bg-surface-850/80 p-3 rounded-lg border border-surface-800 shadow-lg backdrop-blur-sm pointer-events-none">
              <div className="text-white mb-2 font-bold uppercase tracking-wider text-[10px]">EMAs</div>
              <div className="space-y-1">
                {legendData.ema20 && <div className="flex items-center text-[#10b981]"><span className="w-2 h-2 rounded-full bg-[#10b981] mr-2"></span>EMA 20: {legendData.ema20}</div>}
                {legendData.ema50 && <div className="flex items-center text-[#2196f3]"><span className="w-2 h-2 rounded-full bg-[#2196f3] mr-2"></span>EMA 50: {legendData.ema50}</div>}
                {legendData.ema200 && <div className="flex items-center text-[#ff5252]"><span className="w-2 h-2 rounded-full bg-[#ff5252] mr-2"></span>EMA 200: {legendData.ema200}</div>}
              </div>
            </div>
            <div ref={chartContainerRef} className="w-full h-[400px]" />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-800 bg-surface-900 px-4 overflow-x-auto">
        <button onClick={() => handleTabChange('technical')} className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${activeTab === 'technical' ? 'text-emerald-400 border-emerald-400' : 'text-gray-400 hover:text-gray-200 border-transparent hover:border-surface-600'}`}>
          <span className="flex items-center gap-1.5">
            <TrendingUp size={15} />
            Technicals
          </span>
        </button>
        <button onClick={() => handleTabChange('fundamental')} className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${activeTab === 'fundamental' ? 'text-emerald-400 border-emerald-400' : 'text-gray-400 hover:text-gray-200 border-transparent hover:border-surface-600'}`}>
          <span className="flex items-center gap-1.5">
            <BarChart2 size={15} />
            Fundamentals
          </span>
        </button>
        <button onClick={() => handleTabChange('institutional')} className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${activeTab === 'institutional' ? 'text-emerald-400 border-emerald-400' : 'text-gray-400 hover:text-gray-200 border-transparent hover:border-surface-600'}`}>
          <span className="flex items-center gap-1.5">
            <Building2 size={15} />
            Institutional
          </span>
        </button>
        <button onClick={() => handleTabChange('news')} className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${activeTab === 'news' ? 'text-emerald-400 border-emerald-400' : 'text-gray-400 hover:text-gray-200 border-transparent hover:border-surface-600'}`}>
          <span className="flex items-center gap-1.5">
            <Newspaper size={15} />
            News
          </span>
        </button>
        <button onClick={handleGenerateAI} className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${activeTab === 'ai' ? 'text-emerald-400 border-emerald-400' : 'text-gray-400 hover:text-gray-200 border-transparent hover:border-surface-600'}`}>
          <span className="flex items-center gap-1.5">
            <Brain size={15} />
            Claude AI Analysis
          </span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-surface-850 border border-surface-800 rounded-xl p-6 min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
        {/* TECHNICAL TAB */}
        {activeTab === 'technical' && techData && (
          <div className="space-y-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-200">Technical Snapshot</h2>
              <div className="px-3 py-1.5 rounded-xl text-sm font-bold bg-surface-900 border border-surface-700 text-gray-300">
                <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">Tech Score:</span> <span className="text-[#10b981] font-bold text-lg">{techData.overall_technical_score}/100</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Trend', value: techData.trend?.status, isGood: techData.trend?.status?.includes('Up'), customFormat: null },
                { label: 'RSI (14)', value: `${techData.momentum?.rsi?.value?.toFixed(1) || 'N/A'} `, suffix: techData.momentum?.rsi?.signal ? `(${techData.momentum?.rsi?.signal})` : '' },
                { label: 'MACD', value: techData.momentum?.macd?.crossover },
                { label: 'Volume', value: `${techData.volume?.relative_volume?.toFixed(1) || 'N/A'}x `, suffix: 'Avg' },
                { label: 'News Sentiment', value: sentiment ? `${sentiment.overall_sentiment} (${sentiment.score}/10)` : 'N/A', isGood: sentiment?.overall_sentiment === 'Positive' ? true : sentiment?.overall_sentiment === 'Negative' ? false : null }
              ].map((metric, i) => (
                <motion.div
                  key={i}
                  className="bg-surface-900 border border-surface-800 rounded-xl p-4 hover:border-emerald-500/20 transition-colors"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: 0.1 + i * 0.07 
                  }}
                  whileHover={{ 
                    borderColor: 'rgba(16,185,129,0.2)',
                    y: -1
                  }}
                >
                  <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">{metric.label}</div>
                  <div className={`text-sm font-semibold mt-1.5 ${metric.isGood === true ? 'text-emerald-400' : metric.isGood === false ? 'text-red-400' : 'text-gray-100'}`}>
                    {metric.value} {metric.suffix && <span className="text-xs font-sans text-gray-500">{metric.suffix}</span>}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-3">Support & Resistance</h3>
                <div className="bg-surface-850 border border-surface-800 rounded-2xl p-5 mt-4">
                  <div className="flex justify-between items-center py-3 border-b border-surface-800 last:border-b-0">
                    <span className="text-gray-500 text-sm mt-0.5 font-mono">Resistance</span><span className="text-red-400 font-mono font-semibold text-sm">₹{techData.structure?.support_resistance?.resistance?.toFixed(2) || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-surface-800 last:border-b-0">
                    <span className="text-gray-500 text-sm mt-0.5 font-mono">Support</span><span className="text-emerald-400 font-mono font-semibold text-sm">₹{techData.structure?.support_resistance?.support?.toFixed(2) || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <PatternAnalysis symbol={cleanSymbol} />
          </div>
        )}

        {/* INSTITUTIONAL TAB */}
        {activeTab === 'institutional' && (
          <InstitutionalTab symbol={cleanSymbol} />
        )}

        {/* FUNDAMENTAL TAB */}
        {activeTab === 'fundamental' && (
          isFundLoading ? (
            <div className="flex justify-center py-20 text-[#10b981]"><Activity className="animate-pulse" /></div>
          ) : fundData ? (
            <div className="space-y-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center">
                    Fundamental Analysis
                    <span className="ml-3 text-xs bg-surface-900 border border-surface-800 px-2 py-1 rounded-full text-gray-400">
                      Data: Screener.in
                    </span>
                  </h2>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={handleRefreshFundamental}
                    className="text-xs bg-surface-900 hover:bg-[#30363d] border border-surface-800 px-3 py-2 rounded-lg text-gray-300 transition-colors"
                  >
                    Refresh Data
                  </button>
                </div>
              </div>

              {/* 1. KEY RATIOS */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center">
                  <div className="text-gray-500 text-xs mb-1">Market Cap</div>
                  <div className="text-white font-mono font-bold">{formatMetric('market_cap', fundData.market_cap)}</div>
                </div>
                <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center" title="Price to Earnings: How much you pay for ₹1 of company earnings">
                  <div className="text-gray-500 text-xs mb-1 cursor-help border-b border-dashed border-gray-500 inline-block">PE Ratio</div>
                  <div className="text-white font-mono font-bold">{formatMetric('pe_ratio', fundData.pe_ratio)}</div>
                </div>
                <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center" title="Price to Book: How much you pay for ₹1 of company assets">
                  <div className="text-gray-500 text-xs mb-1 cursor-help border-b border-dashed border-gray-500 inline-block">PB Ratio</div>
                  <div className="text-white font-mono font-bold">{formatMetric('pb_ratio', fundData.pb_ratio)}</div>
                </div>
                <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center" title="Return on Equity: Profit generated per ₹100 of shareholder money">
                  <div className="text-gray-500 text-xs mb-1 cursor-help border-b border-dashed border-gray-500 inline-block">ROE</div>
                  <div className="text-white font-mono font-bold">{formatMetric('roe', fundData.roe)}</div>
                </div>
                <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center" title="Return on Capital Employed: Efficiency of capital utilization">
                  <div className="text-gray-500 text-xs mb-1 cursor-help border-b border-dashed border-gray-500 inline-block">ROCE</div>
                  <div className="text-white font-mono font-bold">{formatMetric('roce', fundData.roce)}</div>
                </div>
                <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center">
                  <div className="text-gray-500 text-xs mb-1">Book Value</div>
                  <div className="text-white font-mono font-bold">{formatMetric('book_value', fundData.book_value)}</div>
                </div>
                <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center">
                  <div className="text-gray-500 text-xs mb-1">EPS</div>
                  <div className="text-white font-mono font-bold">{formatMetric('eps', fundData.eps)}</div>
                </div>
                <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center">
                  <div className="text-gray-500 text-xs mb-1">Dividend Yield</div>
                  <div className="text-white font-mono font-bold">{formatMetric('dividend_yield', fundData.dividend_yield)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <MetricCard 
                  label="Debt/Equity" 
                  value={fundData.debt_to_equity} 
                  format="ratio"
                  goodBelow={1}
                />
                <MetricCard 
                  label="Net Margin" 
                  value={fundData.net_margin} 
                  format="percent"
                  goodAbove={10}
                />
                <MetricCard 
                  label="Op Margin" 
                  value={fundData.latest_opm} 
                  format="percent"
                  goodAbove={15}
                />
                <MetricCard 
                  label="ROA" 
                  value={fundData.roa} 
                  format="percent"
                  goodAbove={5}
                />
              </div>

              {/* 2. GROWTH & 3. SHAREHOLDING PATTERN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-surface-800 rounded-lg p-4 bg-surface-900">
                  <h3 className="text-md font-bold text-gray-300 mb-3 border-b border-surface-800 pb-2">Growth YoY</h3>
                  <div className="space-y-3 font-mono text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-sans">Revenue Growth YoY</span>
                      <span className={`font-bold ${fundData.revenue_growth_yoy > 10 ? 'text-[#00c853]' : fundData.revenue_growth_yoy < 0 ? 'text-[#ff1744]' : 'text-white'}`}>
                        {fundData.revenue_growth_yoy ? `${fundData.revenue_growth_yoy}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-sans">Profit Growth YoY</span>
                      <span className={`font-bold ${fundData.profit_growth_yoy > 10 ? 'text-[#00c853]' : fundData.profit_growth_yoy < 0 ? 'text-[#ff1744]' : 'text-white'}`}>
                        {fundData.profit_growth_yoy ? `${fundData.profit_growth_yoy}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-sans">Profit Growth QoQ</span>
                      <span className={`font-bold ${fundData.profit_growth_qoq > 0 ? 'text-[#00c853]' : fundData.profit_growth_qoq < 0 ? 'text-[#ff1744]' : 'text-white'}`}>
                        {fundData.profit_growth_qoq ? `${fundData.profit_growth_qoq}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border border-surface-800 rounded-lg p-4 bg-surface-900">
                  <h3 className="text-md font-bold text-gray-300 mb-3 border-b border-surface-800 pb-2">Shareholding Pattern</h3>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between"><span className="text-gray-500 font-sans">Promoter</span><span className={fundData.promoter_holding > 50 ? "text-[#00c853] font-bold" : "text-white"}>{fundData.promoter_holding ? `${fundData.promoter_holding}%` : 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 font-sans">FII</span><span className="text-white">{fundData.fii_holding ? `${fundData.fii_holding}%` : 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 font-sans">DII</span><span className="text-white">{fundData.dii_holding ? `${fundData.dii_holding}%` : 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 font-sans">Public</span><span className="text-white">{fundData.shareholding?.public_holding ? `${fundData.shareholding.public_holding}%` : 'N/A'}</span></div>
                    <div className="flex justify-between border-t border-surface-800 pt-2 mt-2">
                      <span className="text-gray-500 font-sans">Promoter Pledge</span>
                      <span className={`${fundData.promoter_pledge > 25 ? "text-[#ff1744] font-bold" : fundData.promoter_pledge > 10 ? "text-[#10b981]" : "text-white"}`}>
                        {fundData.promoter_pledge !== null && fundData.promoter_pledge !== undefined ? `${fundData.promoter_pledge}%` : '0%'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. QUARTERLY RESULTS TABLE */}
              {fundData.quarterly_results && fundData.quarterly_results.quarters && (
                <div className="border border-surface-800 rounded-lg p-4 bg-surface-900 overflow-x-auto">
                  <h3 className="text-md font-bold text-gray-300 mb-3 pb-2">Quarterly Results (Last 4 Quarters)</h3>
                  <table className="w-full text-left text-sm font-mono">
                    <thead>
                      <tr className="border-b border-surface-800 text-gray-500">
                        <th className="pb-2 font-sans font-normal">Quarter</th>
                        {fundData.quarterly_results.quarters.slice(0, 4).map((q, i) => <th key={i} className="pb-2 text-right">{q}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { 
                          label: 'Revenue (Cr)', 
                          key: 'revenue',
                          format: (v) => v ? v.toLocaleString('en-IN') : '-'
                        },
                        { 
                          label: 'Net Profit (Cr)', 
                          key: 'net_profit',
                          format: (v) => v ? v.toLocaleString('en-IN') : '-',
                          colorCode: true
                        },
                        { 
                          label: 'OPM %', 
                          key: 'opm_percent',
                          format: (v) => v ? `${v}%` : '-',
                          colorCode: true
                        },
                        {
                          label: 'EPS (₹)',
                          key: 'eps', 
                          format: (v) => v ? `₹${v}` : '-'
                        }
                      ].map(row => {
                        const quarterly = fundData.quarterly_results;
                        const hasData = quarterly[row.key] && quarterly[row.key].some(v => v !== null);
                        if (!hasData) return null;
                        
                        return (
                          <tr key={row.label} className="border-b border-surface-800/50">
                            <td className="py-2 text-gray-400 font-sans">{row.label}</td>
                            {quarterly.quarters.slice(0, 4).map((q, i) => (
                              <td key={q} className={`py-2 text-right ${
                                row.colorCode && quarterly[row.key][i] > 0
                                  ? 'text-[#00c853]' : row.colorCode && quarterly[row.key][i] < 0 ? 'text-[#ff1744]' : 'text-white'
                              }`}>
                                {row.format(quarterly[row.key][i])}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 5. ANNUAL TREND */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {fundData.annual_results?.revenue && (
                  <div className="bg-surface-850 border border-surface-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-2 font-bold uppercase tracking-wider">
                      Revenue Trend (₹ Cr)
                    </p>
                    <div className="flex items-end gap-1 h-20">
                      {fundData.annual_results.revenue.slice(-10).map((val, i) => {
                        if (val === null) return <div key={i} className="flex-1" />;
                        const validVals = fundData.annual_results.revenue.slice(-10).filter(v => v !== null);
                        const maxVal = Math.max(...validVals, 1);
                        const height = val > 0 ? (val / maxVal) * 100 : 0;
                        return (
                          <div
                            key={i}
                            className="flex-1 bg-[#2196f3]/60 rounded-t hover:bg-[#2196f3] transition-colors"
                            style={{ height: `${Math.max(5, height)}%` }}
                            title={`₹${val} Cr`}
                          />
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-right">
                      Last 10 years → Latest
                    </p>
                  </div>
                )}
                
                {fundData.annual_results?.net_profit && (
                  <div className="bg-surface-850 border border-surface-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-2 font-bold uppercase tracking-wider">
                      Net Profit Trend (₹ Cr)
                    </p>
                    <div className="flex items-end gap-1 h-20">
                      {fundData.annual_results.net_profit.slice(-10).map((val, i) => {
                        if (val === null) return <div key={i} className="flex-1" />;
                        const validVals = fundData.annual_results.net_profit.slice(-10).filter(v => v !== null);
                        const maxVal = Math.max(...validVals, 1);
                        const height = val > 0 ? (val / maxVal) * 100 : 0;
                        return (
                          <div
                            key={i}
                            className={`flex-1 rounded-t transition-colors ${val >= 0 ? 'bg-emerald-400/60 hover:bg-emerald-400' : 'bg-red-500/60 hover:bg-red-500'}`}
                            style={{ height: `${Math.max(5, height)}%` }}
                            title={`₹${val} Cr`}
                          />
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-right">
                      Last 10 years → Latest
                    </p>
                  </div>
                )}
              </div>

              {/* 5. SCORE CARD */}
              <div className="bg-surface-850 border border-[#10b981]/50 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4 border-b border-surface-800 pb-3">
                  <h3 className="font-bold text-[#10b981] text-lg">Fundamental Score Card</h3>
                  <div className="text-2xl font-bold font-mono text-[#10b981]">{fundData.fundamental_score}/100</div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-gray-400 font-bold mb-3 text-sm uppercase tracking-wider">Strengths</h4>
                    <ul className="space-y-2">
                      {fundData.strengths && fundData.strengths.length > 0 ? (
                        fundData.strengths.map((s, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-[#00c853] mr-2"></span>
                            <span className="text-gray-300 text-sm">{s}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500 text-sm italic">No major strengths identified</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-gray-400 font-bold mb-3 text-sm uppercase tracking-wider">Weaknesses</h4>
                    <ul className="space-y-2">
                      {fundData.weaknesses && fundData.weaknesses.length > 0 ? (
                        fundData.weaknesses.map((w, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-[#ff1744] mr-2">â Œ</span>
                            <span className="text-gray-300 text-sm">{w}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500 text-sm italic">No major weaknesses identified</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 6. PEER COMPARISON */}
              {fundData.peers && fundData.peers.length > 0 && (() => {
                const validPeers = fundData.peers.filter(p => p.name && p.name.trim() !== '');
                
                return (
                  <div className="bg-surface-850 border border-surface-800 rounded-xl p-5 mt-4">
                    <h3 className="text-white font-bold mb-4 border-b border-surface-800 pb-2">
                      Peer Comparison
                    </h3>
                    
                    {validPeers.length === 0 ? (
                      <div className="p-4 text-center text-gray-400">
                        <p className="text-sm">
                          Peer data loading from Screener.in...
                        </p>
                        <p className="text-xs mt-1 text-gray-500">
                          Visit screener.in/company/{cleanSymbol.replace('.NS', '')} for 
                          detailed peer comparison
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto pb-2">
                        <table className="w-full min-w-[700px] text-sm font-mono">
                          <thead>
                            <tr className="text-gray-400 border-b border-surface-800">
                              <th className="text-left py-2 font-sans font-normal whitespace-nowrap">Company</th>
                              <th className="text-right py-2 px-3 font-sans font-normal whitespace-nowrap">Price</th>
                              <th className="text-right py-2 px-3 font-sans font-normal whitespace-nowrap">PE</th>
                              <th className="text-right py-2 px-3 font-sans font-normal whitespace-nowrap">Mkt Cap</th>
                              <th className="text-right py-2 px-3 font-sans font-normal whitespace-nowrap">ROCE%</th>
                              <th className="text-right py-2 pl-3 font-sans font-normal whitespace-nowrap">NP Qtr</th>
                            </tr>
                          </thead>
                          <tbody>
                            {validPeers.map((peer, i) => (
                              <tr key={i}
                                  onClick={() => peer.symbol && 
                                    navigate(`/stock/${peer.symbol}.NS`)}
                                  className="border-b border-gray-800 
                                             hover:bg-gray-800/50 
                                             cursor-pointer transition-all">
                                
                                <td className="py-3 text-left whitespace-nowrap pr-2">
                                  <span className="text-emerald-400 font-medium">
                                    {peer.name || '-'}
                                  </span>
                                  {peer.symbol && (
                                    <span className="text-gray-500 text-xs ml-2">
                                      {peer.symbol}
                                    </span>
                                  )}
                                </td>
                                
                                <td className="text-right text-white px-3 whitespace-nowrap">
                                  {formatPeerValue(peer.price, '₹')}
                                </td>
                                
                                <td className="text-right text-white px-3 whitespace-nowrap">
                                  {formatPeerValue(peer.pe_ratio, '', 'x')}
                                </td>
                                
                                <td className="text-right text-white text-xs px-3 whitespace-nowrap">
                                  {peer.market_cap 
                                    ? `₹${Math.round(peer.market_cap).toLocaleString('en-IN')} Cr`
                                    : '-'}
                                </td>
                                
                                <td className={`text-right font-medium px-3 whitespace-nowrap ${
                                  peer.roce > 15 ? 'text-green-400' 
                                  : peer.roce < 8 ? 'text-red-400' 
                                  : 'text-white'
                                }`}>
                                  {formatPeerValue(peer.roce, '', '%')}
                                </td>
                                
                                <td className="text-right text-white text-xs pl-3 whitespace-nowrap">
                                  {peer.net_profit_qtr 
                                    ? `₹${Math.round(peer.net_profit_qtr).toLocaleString('en-IN')}`
                                    : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                      <p className="text-gray-400 text-xs">
                        Click any peer company to view 
                        their full analysis and compare
                      </p>
                    </div>

                    <a 
                      href={`https://www.screener.in/company/${cleanSymbol.replace('.NS','')}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:text-emerald-300 mt-2 block"
                    >
                      View full peer comparison on Screener.in →
                    </a>
                  </div>
                );
              })()}

            </div>
          ) : null
        )}

        {/* NEWS TAB */}
        {activeTab === 'news' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                News & Sentiment
              </h2>
              <button
                onClick={() => fetchNews(true)}
                className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded border border-gray-600 transition-colors"
              >
                ðŸ”„ Refresh
              </button>
            </div>
            {isNewsLoading ? (
              <div className="flex justify-center py-20 text-[#10b981]"><Activity className="animate-pulse" /></div>
            ) : (
              <div className="space-y-4">
                {sentiment && (
                <div className={`p-4 rounded-xl mb-4 ${
                  sentiment.overall_sentiment === 'Positive' 
                    ? 'bg-green-900/30 border border-green-500/30'
                  : sentiment.overall_sentiment === 'Negative'
                    ? 'bg-red-900/30 border border-red-500/30'
                    : 'bg-surface-900 border border-surface-800'
                }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-400">
                        Overall News Sentiment
                      </p>
                      <p className={`text-2xl font-bold ${
                        sentiment.overall_sentiment === 'Positive'
                          ? 'text-green-400'
                        : sentiment.overall_sentiment === 'Negative'
                          ? 'text-red-400'
                          : 'text-gray-300'
                      }`}>
                        {sentiment.overall_sentiment}
                      </p>
                      <p className="text-sm text-gray-400">
                        {sentiment.summary}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-4xl font-bold text-white">
                        {sentiment.score}
                      </p>
                      <p className="text-xs text-gray-400">/ 10</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 mt-3">
                    <span className="text-green-400 text-sm">
                      {sentiment.positive_count} Positive
                    </span>
                    <span className="text-red-400 text-sm">
                      â Œ {sentiment.negative_count} Negative
                    </span>
                    <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                      {sentiment.neutral_count} Neutral
                    </span>
                  </div>
                </div>
              )}

              {(() => {
                const positiveNews = news.filter(n => n.sentiment === 'Positive');
                const negativeNews = news.filter(n => n.sentiment === 'Negative');
                const neutralNews = news.filter(n => !n.sentiment || n.sentiment === 'Neutral');

                const renderArticles = (articles) => articles.map((article, i) => (
                  <div key={i} className="p-4 rounded-xl bg-surface-900 
                                  border border-surface-800 mb-3
                                  hover:border-[#10b981]/50 
                                  transition-all cursor-pointer"
                       onClick={() => window.open(article.url)}>
                    
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-[#10b981] font-medium">
                        {article.source}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full
                          font-medium ${
                          article.sentiment === 'Positive'
                            ? 'bg-green-900/50 text-green-400'
                          : article.sentiment === 'Negative'
                            ? 'bg-red-900/50 text-red-400'
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {article.sentiment === 'Positive' ? '' 
                           : article.sentiment === 'Negative' ? '' 
                           : ''} {article.sentiment}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          article.impact === 'High'
                            ? 'bg-emerald-900/50 text-emerald-400'
                          : article.impact === 'Medium'
                            ? 'bg-yellow-900/50 text-emerald-400'
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {article.impact} Impact
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-white font-medium text-sm mb-1">
                      {article.title}
                    </p>
                    
                    {article.reason && (
                      <p className="text-gray-400 text-xs italic">
                        {article.reason}
                      </p>
                    )}
                    
                    <p className="text-gray-500 text-xs mt-2">
                      {article.published_display || formatDate(article.published_date)}
                    </p>
                  </div>
                ));

                return (
                  <div className="space-y-6">
                    {positiveNews.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-[#00c853] mb-3 flex items-center">
                          Positive News
                        </h3>
                        {renderArticles(positiveNews)}
                      </div>
                    )}
                    {negativeNews.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-[#ff1744] mb-3 flex items-center">
                          Negative News
                        </h3>
                        {renderArticles(negativeNews)}
                      </div>
                    )}
                    {neutralNews.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-gray-400 mb-3 flex items-center">
                          Neutral News
                        </h3>
                        {renderArticles(neutralNews)}
                      </div>
                    )}
                  </div>
                );
              })()}
              {news.length === 0 && !isNewsLoading && <div className="text-gray-500">No recent news found for {cleanSymbol}.</div>}
              </div>
            )}
          </div>
        )}

        {/* AI ANALYSIS TAB */}
        {activeTab === 'ai' && (
          <div className="h-full">
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#10b981]">
                <BrainCircuit className="animate-pulse w-16 h-16 mb-4" />
                <p className="text-lg font-medium">Claude Opus is analyzing market data...</p>
                <p className="text-sm text-gray-500 mt-2">Correlating technicals, fundamentals, and sentiment.</p>
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-8 animate-fade-in">
                {/* Top Hero Section */}
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="bg-gradient-to-br from-[#161b22] to-[#0d1117] border border-[#10b981]/40 p-6 rounded-xl flex-1 w-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#10b981] opacity-5 rounded-bl-full pointer-events-none" />
                    <h2 className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">AI Verdict</h2>
                    <div className="text-3xl font-bold text-white mb-4">{aiAnalysis.verdict}</div>
                    <p className="text-gray-300 leading-relaxed">{aiAnalysis.summary}</p>
                  </div>

                  <div className="bg-surface-900 border border-surface-800 p-6 rounded-xl w-full md:w-64 flex flex-col items-center justify-center">
                    <div className="relative w-24 h-24 mb-2">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-[#30363d]" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-[#10b981]" strokeDasharray={`${aiAnalysis.confidence}, 100`} strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold text-white font-mono">{aiAnalysis.confidence}%</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">Confidence Score</div>
                  </div>
                </div>

                {/* Trade Setup */}
                <motion.div
                  className="bg-surface-850 border border-surface-800 p-6 rounded-xl mt-6"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center"><Target className="mr-2 text-[#10b981]" size={20} /> Proposed Swing Trade Setup</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-surface-900 border border-surface-800 p-4 rounded-lg text-center">
                      <div className="text-gray-500 text-xs mb-1">Entry Range</div>
                      <div className="text-white font-mono font-bold">{aiAnalysis.trade_setup.entry}</div>
                    </div>
                    <div className="bg-surface-900 border border-[#ff1744]/30 p-4 rounded-lg text-center">
                      <div className="text-gray-500 text-xs mb-1">Stop Loss</div>
                      <div className="text-[#ff1744] font-mono font-bold">{aiAnalysis.trade_setup.stop_loss}</div>
                      <div className="text-xs text-[#ff1744]/70 mt-1">({aiAnalysis.trade_setup.risk_percent} risk)</div>
                    </div>
                    <div className="bg-surface-900 border border-[#00c853]/30 p-4 rounded-lg text-center">
                      <div className="text-gray-500 text-xs mb-1">Target 1</div>
                      <div className="text-[#00c853] font-mono font-bold">{aiAnalysis.trade_setup.target_1}</div>
                    </div>
                    <div className="bg-surface-900 border border-[#00c853]/30 p-4 rounded-lg text-center">
                      <div className="text-gray-500 text-xs mb-1">Target 2</div>
                      <div className="text-[#00c853] font-mono font-bold">{aiAnalysis.trade_setup.target_2}</div>
                    </div>
                    <div className="bg-surface-900 border border-surface-800 p-4 rounded-lg text-center">
                      <div className="text-gray-500 text-xs mb-1">Risk / Reward</div>
                      <div className="text-[#10b981] font-mono font-bold">{aiAnalysis.trade_setup.risk_reward}</div>
                    </div>
                  </div>
                </motion.div>

                {/* Deep Dive Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[#00c853] font-bold mb-2 flex items-center"><TrendingUp className="mr-2" size={16} /> The Bull Case</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">{aiAnalysis.bull_case}</p>
                    </div>
                    <div>
                      <h4 className="text-gray-300 font-bold mb-2">Technical Reasoning</h4>
                      <p className="text-gray-400 text-sm leading-relaxed">{aiAnalysis.technical_reasoning}</p>
                    </div>
                    <div>
                      <h4 className="text-gray-300 font-bold mb-2">Fundamental Reasoning</h4>
                      <p className="text-gray-400 text-sm leading-relaxed">{aiAnalysis.fundamental_reasoning}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[#ff1744] font-bold mb-2 flex items-center"><TrendingDown className="mr-2" size={16} /> The Bear Case</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">{aiAnalysis.bear_case}</p>
                    </div>
                    {aiAnalysis.red_flags && aiAnalysis.red_flags.length > 0 && (
                      <div className="bg-[#ff1744]/10 border border-[#ff1744]/30 rounded-lg p-4">
                        <h4 className="text-[#ff1744] font-bold mb-2 flex items-center"><AlertTriangle className="mr-2" size={16} /> Red Flags to Watch</h4>
                        <ul className="list-disc list-inside text-sm text-[#ff1744]/90 space-y-1">
                          {aiAnalysis.red_flags.map((rf, i) => <li key={i}>{rf}</li>)}
                        </ul>
                      </div>
                    )}
                    <div>
                      <h4 className="text-gray-300 font-bold mb-2">Key Levels to Watch</h4>
                      <div className="flex flex-wrap gap-2">
                        {aiAnalysis.key_levels_to_watch.map((kl, i) => (
                          <span key={i} className="bg-surface-900 border border-surface-800 text-gray-300 text-xs px-2 py-1 rounded font-mono">{kl}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <BrainCircuit size={48} className="mb-4 opacity-20" />
                <p>Click "Claude AI Analysis" above to generate a deep-dive report.</p>
              </div>
            )}
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StockDetail;
