import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { createChart } from 'lightweight-charts';
import { Activity, BrainCircuit, Newspaper, TrendingUp, TrendingDown, Target, AlertTriangle, BellPlus, BarChart2, Building2, Brain, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import PatternAnalysis from '../components/PatternAnalysis';
import { StockDetailSkeleton } from '../components/Skeleton';
import {
  openPrintWindow,
  buildAiReportHtml,
  buildTechnicalsReportHtml,
  buildFundamentalsReportHtml,
} from '../lib/pdfTemplates';
import { Badge, Button, Field, Input, Modal, Select, Spinner } from '../components/ui';
import { verdictTone, formatChange } from '../lib/format';
import { requestNotificationPermission } from '../hooks/useNotifications';
import MetricCard from '../components/stock/MetricCard';
import QuickLevelsCard from '../components/stock/QuickLevelsCard';
import InstitutionalTab from '../components/stock/InstitutionalTab';
import { chartOptions, candleOptions, volumeOptions, volumeBarColor, emaOptions } from '../lib/chartTheme';
import { cn } from '../lib/cn';

/** Peer-comparison cell formatting. Only used by the peers table below. */
const formatPeerValue = (val, prefix = '', suffix = '', decimals = 1) => {
  if (val === null || val === undefined) return '-';
  return `${prefix}${parseFloat(val).toFixed(decimals)}${suffix}`;
};

const TABS = [
  { id: 'technical', label: 'Technicals', icon: TrendingUp },
  { id: 'fundamental', label: 'Fundamentals', icon: BarChart2 },
  { id: 'institutional', label: 'Institutional', icon: Building2 },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'ai', label: 'AI Analysis', icon: Brain },
];

/** Swatches match the series tokens the chart draws with. */
const EMA_LEGEND = [
  { period: 20, key: 'ema20', swatch: 'bg-series-1' },
  { period: 50, key: 'ema50', swatch: 'bg-series-2' },
  { period: 200, key: 'ema200', swatch: 'bg-series-3' },
];

const StockDetail = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const cleanSymbol = symbol ? symbol.toUpperCase() : 'RELIANCE.NS';

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
      toast.success('Added to Watchlist');
      setTimeout(() => setWatchlistAdded(false), 3000);
    } catch (e) {
      if (e.response?.data?.detail === 'Stock already in watchlist') {
        setWatchlistAdded(true);
        toast.success('Already in Watchlist');
      } else {
        toast.error('Failed to add to Watchlist');
      }
    }
  };

  const [activeTab, setActiveTab] = useState('technical');
  const [quote, setQuote] = useState(null);
  const [stockPrice, setStockPrice] = useState(null);
  // Written on every quote poll but never read — the source badge it fed was
  // removed at some point. Left writing rather than deleted, since removing the
  // setter would touch the polling logic.
  const [, setPriceSource] = useState(null);
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

  const handleExportPDF = () => {
    if (!aiAnalysis) return;
    openPrintWindow(buildAiReportHtml(cleanSymbol, aiAnalysis));
  };

  const handleExportTechnicalsPDF = () => {
    if (!techData) return;
    openPrintWindow(buildTechnicalsReportHtml(cleanSymbol, techData));
  };

  const handleExportFundamentalsPDF = () => {
    if (!fundData) return;
    openPrintWindow(buildFundamentalsReportHtml(cleanSymbol, fundData));
  };

  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertType, setAlertType] = useState('price_above');
  const [alertValue, setAlertValue] = useState('');

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const aiPriceLinesRef = useRef([]);
  const [showAiLevels, setShowAiLevels] = useState(false);

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

  const fetchStockQuote = useCallback(async () => {
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
  }, [cleanSymbol]);

  const fetchInitialData = useCallback(async () => {
    try {
      const [tRes, hRes, qRes] = await Promise.all([
        api.get(`/analysis/technical/${cleanSymbol}`),
        api.get(`/stocks/history/${cleanSymbol}?period=1y&interval=1d`),
        api.get(`/stocks/quote/${cleanSymbol}`).catch(() => null)
      ]);
      setTechData(tRes.data);
      
      let history = hRes.data?.history || [];
      const quoteData = qRes?.data;
      
      if (history.length > 0 && quoteData && quoteData.current_price) {
        const lastCandle = history[history.length - 1];
        const prevClose = quoteData.previous_close || 0;
        const currentPrice = quoteData.current_price;
        
        const diff = Math.abs(parseFloat(lastCandle.close) - prevClose);
        if (diff < 0.5 && quoteData.change_percent !== 0) {
          const nextDateStr = new Date().toISOString().split('T')[0];
          const newDate = nextDateStr > lastCandle.date ? nextDateStr : 
                          new Date(new Date(lastCandle.date).getTime() + 86400000).toISOString().split('T')[0];
          
          history.push({
            date: newDate,
            open: quoteData.open || currentPrice,
            high: quoteData.high || currentPrice,
            low: quoteData.low || currentPrice,
            close: currentPrice,
            volume: quoteData.volume || 0
          });
        }
      }
      
      setHistoricalData(history);
      setChartLoading(false);
    } catch (e) {
      setErrorMsg("Data temporarily unavailable, retrying...");
      setChartLoading(false);
    }

    // News is now fetched on demand via useEffect when activeTab === 'news'
  }, [cleanSymbol]);

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
    // fetchInitialData and fetchStockQuote are both keyed on cleanSymbol, so
    // their identity changes exactly when the symbol does — the effect still
    // resets and re-polls once per symbol change, as before.
  }, [cleanSymbol, fetchInitialData, fetchStockQuote]);

  const fetchNews = useCallback(async (forceRefresh = false) => {
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
  }, [cleanSymbol]);

  useEffect(() => {
    if (activeTab === 'news' && cleanSymbol) {
      fetchNews();
    }
  }, [activeTab, cleanSymbol, fetchNews]);

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

    // Canvas was #0d1117 on a #0a0e13 page, which drew a visible rectangle
    // around every chart. chartOptions() resolves the same tokens the rest of
    // the app uses and renders on a transparent background.
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      ...chartOptions(),
    });

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries(candleOptions());

    const cleanDate = (dateStr) => {
      if (!dateStr) return null;
      // Take only the date part before any space or T
      return String(dateStr).split(' ')[0].split('T')[0];
    };

    const candleData = historicalData
      .filter(d => d.date && d.close != null && !isNaN(parseFloat(d.close)))
      .map(d => ({
        time: cleanDate(d.date),
        open: parseFloat(d.open) || parseFloat(d.close),
        high: parseFloat(d.high) || parseFloat(d.close),
        low: parseFloat(d.low) || parseFloat(d.close),
        close: parseFloat(d.close),
      }))
      .filter(d => d.time !== null);
    candleSeries.setData(candleData);
    candleSeriesRef.current = candleSeries;

    // Volume series
    const volumeSeries = chart.addHistogramSeries(volumeOptions());

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const volumeData = historicalData
      .filter(d => d.date && d.volume != null && !isNaN(parseFloat(d.volume)))
      .map(d => ({
        time: cleanDate(d.date),
        value: parseFloat(d.volume) || 0,
        color: volumeBarColor(parseFloat(d.close) >= parseFloat(d.open)),
      }))
      .filter(d => d.time !== null);
    volumeSeries.setData(volumeData);

    // EMA overlays
    const ema20Data = calculateEMA(candleData, 20);
    const ema50Data = calculateEMA(candleData, 50);
    const ema200Data = calculateEMA(candleData, 200);

    // EMA 200 was #ff5252 — a red line that read as bearish regardless of what
    // the trend was actually doing. emaOptions() assigns the series tokens.
    const ema20Series = chart.addLineSeries({
      ...emaOptions(20),
      lastValueVisible: true,
    });
    ema20Series.setData(ema20Data);

    const ema50Series = chart.addLineSeries({
      ...emaOptions(50),
      lastValueVisible: true,
    });
    ema50Series.setData(ema50Data);

    const ema200Series = chart.addLineSeries({
      ...emaOptions(200),
      lastValueVisible: true,
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
      candleSeriesRef.current = null;
    };
    // cleanSymbol feeds the TradingView watermark. historicalData already
    // changes on every symbol change, so this rebuilds no more often than before.
  }, [historicalData, cleanSymbol]);

  // ─── AI Levels drawing effect ────────────────────────────────────────────────
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;

    // Remove existing lines
    aiPriceLinesRef.current.forEach(line => series.removePriceLine(line));
    aiPriceLinesRef.current = [];

    if (showAiLevels && aiAnalysis?.trade_setup) {
      const ts = aiAnalysis.trade_setup;

      const addLine = (priceStr, color, title, style) => {
        if (!priceStr) return;
        const match = String(priceStr).match(/[\d,.]+/);
        if (match) {
          const price = parseFloat(match[0].replace(/,/g, ''));
          if (!isNaN(price) && price > 0) {
            const line = series.createPriceLine({
              price,
              color,
              lineWidth: 2,
              lineStyle: style || 2, // 0 = Solid, 1 = Dotted, 2 = Dashed
              axisLabelVisible: true,
              title,
            });
            aiPriceLinesRef.current.push(line);
          }
        }
      };

      addLine(ts.entry, '#10b981', 'Entry', 0); // Solid
      addLine(ts.sl || ts.stop_loss, '#ff1744', 'SL', 2); // Dashed
      addLine(ts.t1 || ts.target_1, '#00b0ff', 'T1', 2);
      addLine(ts.t2 || ts.target_2, '#00b0ff', 'T2', 2);
      if (ts.t3 || ts.target_3) addLine(ts.t3 || ts.target_3, '#00b0ff', 'T3', 2);
    }
  }, [showAiLevels, aiAnalysis]);

  const handleGenerateAI = async () => {
    if (!techData) return;
    setAiLoading(true);
    setActiveTab('ai');

    let fundamentalData = fundData;
    if (!fundamentalData) {
      try {
        const res = await api.get(`/analysis/fundamental/${cleanSymbol}`);
        fundamentalData = res.data;
        setFundData(res.data);
      } catch(e) {
        fundamentalData = {};
      }
    }

    try {
      const payload = {
        quote: quote || {},
        technical: techData,
        fundamental: fundamentalData,
        news: news.slice(0, 5),
        market_regime: 'Neutral', // Placeholder
        sector_performance: 'Neutral'
      };

      const res = await api.post(`/ai/analyze/${cleanSymbol}`, payload);
      setAiAnalysis(res.data.analysis);
    } catch (e) {
      console.error(e);
      toast.error("AI Analysis failed. Check console or API Key.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    // Asked for here rather than on sign-in: this is a real user gesture, and
    // it is the point where a browser notification is obviously the payoff.
    requestNotificationPermission();
    try {
      await api.post('/alerts', {
        symbol: cleanSymbol,
        alert_type: alertType,
        value: parseFloat(alertValue)
      });
      setShowAlertModal(false);
      setAlertValue('');
      toast.success("Alert created successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to create alert.");
    }
  };

  const isUp = quote && quote.change_percent >= 0;
  const companyName = quote?.company_name || quote?.name || fundData?.company_name;

  if (chartLoading && !historicalData) {
    return <StockDetailSkeleton />;
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">
      {errorMsg && (
        <div className="bg-down/10 border border-down/30 text-down px-4 py-3 rounded-lg flex items-center">
          <AlertTriangle size={18} className="mr-2" /> {errorMsg}
        </div>
      )}

      {/* Price Header — sticky, so the symbol and live price stay visible while
          reading a tab that is several screens long. */}
      {quote && (
        <div className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3
                        px-4 sm:px-6 py-4 bg-surface-900/90 backdrop-blur-md border-b border-surface-800">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-gray-100 tracking-tight">
                {cleanSymbol.replace('.NS', '')}
              </h1>
              <Button
                variant={watchlistAdded ? 'secondary' : 'outline'}
                size="sm"
                onClick={addToWatchlist}
                aria-pressed={watchlistAdded}
              >
                {watchlistAdded ? 'Watchlisted' : '+ Watchlist'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1 truncate">{companyName || symbol}</p>
          </div>

          <div className="flex items-center gap-4 sm:gap-5 shrink-0">
            {/* Deliberately not an aria-live region. The quote re-polls every
                10s, so announcing it would talk over the user continuously for
                as long as the market is open. Instead the pair is one labelled
                group, so it can be found and read on demand, and the direction
                is stated in words rather than carried only by red/green. */}
            <div className="text-left sm:text-right" role="group" aria-label="Current quote">
              <div className={cn(
                'text-3xl font-semibold text-gray-100 font-mono tnum tracking-tight rounded px-1 transition-colors duration-slow',
                quoteFlash,
              )}>
                ₹{stockPrice ? stockPrice.toFixed(2) : quote.current_price?.toFixed(2)}
              </div>
              <div className={cn(
                'flex sm:justify-end items-center gap-1 text-sm font-medium mt-0.5 tnum',
                isUp ? 'text-up' : 'text-down',
              )}>
                {isUp ? <TrendingUp size={14} aria-hidden="true" /> : <TrendingDown size={14} aria-hidden="true" />}
                <span className="sr-only">{isUp ? 'Up' : 'Down'}</span>
                {/* Was `quote.change_amount`, which the quote endpoint has never
                    returned — both code paths in market_data.py emit `change`.
                    The absolute move rendered blank here, so the header read
                    "+ (1.15%)". Index and ETF detail already use `change`. */}
                {formatChange(quote.change)} ({Math.abs(quote.change_percent).toFixed(2)}%)
              </div>
            </div>

            <Button variant="outline" size="sm" icon={BellPlus} onClick={() => setShowAlertModal(true)}>
              Alert
            </Button>
          </div>
        </div>
      )}

      {/* Alert Modal — was a hand-rolled overlay with no focus trap, no Escape
          and no label association on either field. */}
      <Modal
        open={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title={`Add alert for ${cleanSymbol.replace('.NS', '')}`}
        description={`Current price ₹${stockPrice ? stockPrice.toFixed(2) : quote?.current_price?.toFixed(2) ?? '—'}`}
      >
        <form onSubmit={handleCreateAlert} className="space-y-4">
          <Field label="Alert condition">
            {(p) => (
              <Select value={alertType} onChange={(e) => setAlertType(e.target.value)} {...p}>
                <option value="price_above">Price goes above</option>
                <option value="price_below">Price goes below</option>
                <option value="rsi_above">RSI goes above (overbought)</option>
                <option value="rsi_below">RSI goes below (oversold)</option>
                <option value="volume_spike">Volume spikes above (multiplier)</option>
              </Select>
            )}
          </Field>

          <Field label="Target value" required>
            {(p) => (
              <Input
                type="number"
                step="0.01"
                required
                value={alertValue}
                onChange={(e) => setAlertValue(e.target.value)}
                placeholder="e.g. 2500"
                {...p}
              />
            )}
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowAlertModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Set alert</Button>
          </div>
        </form>
      </Modal>

      {/* Chart */}
      <div className="border-b border-surface-800">
        {chartLoading ? (
          <div className="w-full h-[400px] flex items-center justify-center">
            <Spinner size="lg" className="text-brand-400" />
          </div>
        ) : (
          <div className="relative w-full">
            <div className="absolute top-3 left-3 z-10 rounded-lg px-3 py-2 pointer-events-none
                            bg-surface-900/80 backdrop-blur-sm border border-surface-800 shadow-sm">
              <div className="text-2xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">EMAs</div>
              <dl className="space-y-1 text-xs font-mono tnum">
                {EMA_LEGEND.map(({ period, key, swatch }) => legendData[key] != null && (
                  <div key={key} className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full shrink-0', swatch)} aria-hidden="true" />
                    <dt className="text-gray-500">EMA {period}</dt>
                    <dd className="text-gray-200 ml-auto">{legendData[key]}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div ref={chartContainerRef} className="w-full h-[400px]" />
            <QuickLevelsCard
              aiTradeSetup={aiAnalysis?.trade_setup}
              showAiLevels={showAiLevels}
              setShowAiLevels={setShowAiLevels}
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      {/* The same 180-character class string was copy-pasted five times here.
          A tablist over an array says the same thing once — and no Tabs
          component, because this is the only consumer in the app. */}
      <div
        role="tablist"
        aria-label="Stock analysis sections"
        className="flex gap-1 px-3 border-b border-surface-800 bg-surface-900 overflow-x-auto scrollbar-hide"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabChange(id)}
              className={cn(
                'flex items-center gap-2 px-3 py-3 -mb-px text-sm font-medium whitespace-nowrap',
                'border-b-2 transition-colors duration-fast',
                isActive
                  ? 'text-brand-400 border-brand-400'
                  : 'text-gray-400 border-transparent hover:text-gray-200 hover:border-surface-600',
              )}
            >
              <Icon size={15} aria-hidden="true" />
              {label}
            </button>
          );
        })}
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
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-xl text-sm font-bold bg-surface-900 border border-surface-700 text-gray-300">
                  <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">Tech Score:</span> <span className="text-brand-400 font-bold text-lg">{techData.overall_technical_score}/100</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Download}
                  onClick={handleExportTechnicalsPDF}
                >
                  Export PDF
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'Trend', value: techData.trend?.status, isGood: techData.trend?.status?.includes('Up'), customFormat: null },
                { label: 'RSI (14)', value: `${techData.momentum?.rsi?.value?.toFixed(1) || 'N/A'} `, suffix: techData.momentum?.rsi?.signal ? `(${techData.momentum?.rsi?.signal})` : '' },
                { label: 'MACD', value: techData.momentum?.macd?.crossover },
                { 
                  label: 'Volume', 
                  value: techData.volume?.current_volume 
                    ? (techData.volume.current_volume >= 10000000 ? (techData.volume.current_volume/10000000).toFixed(2) + 'Cr' : techData.volume.current_volume >= 100000 ? (techData.volume.current_volume/100000).toFixed(2) + 'L' : techData.volume.current_volume.toLocaleString('en-IN')) 
                    : (techData.volume?.relative_volume ? `${techData.volume.relative_volume.toFixed(1)}x` : 'N/A'), 
                  suffix: techData.volume?.current_volume && techData.volume?.relative_volume ? `(${techData.volume.relative_volume.toFixed(1)}x Avg)` : (techData.volume?.current_volume ? '' : 'Avg'),
                  subtext: techData.volume?.average_volume 
                    ? `Avg: ${techData.volume.average_volume >= 10000000 ? (techData.volume.average_volume/10000000).toFixed(2) + 'Cr' : techData.volume.average_volume >= 100000 ? (techData.volume.average_volume/100000).toFixed(2) + 'L' : techData.volume.average_volume.toLocaleString('en-IN')}` 
                    : null
                },
                { label: 'News Sentiment', value: sentiment ? `${sentiment.overall_sentiment} (${sentiment.score}/10)` : 'N/A', isGood: sentiment?.overall_sentiment === 'Positive' ? true : sentiment?.overall_sentiment === 'Negative' ? false : null }
              ].map((metric, i) => (
                <motion.div
                  key={i}
                  className="bg-surface-900 border border-surface-800 rounded-xl p-4 hover:border-surface-700 transition-colors"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: 0.1 + i * 0.07 
                  }}
                  whileHover={{ 
                    borderColor: 'rgb(var(--surface-700))',
                    y: -1
                  }}
                >
                  <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">{metric.label}</div>
                  <div className={`text-sm font-semibold mt-1.5 ${metric.isGood === true ? 'text-up' : metric.isGood === false ? 'text-down' : 'text-gray-100'}`}>
                    {metric.value} {metric.suffix && <span className="text-xs font-sans text-gray-500">{metric.suffix}</span>}
                  </div>
                  {metric.subtext && <div className="text-2xs text-gray-500 mt-1">{metric.subtext}</div>}
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-3">Support & Resistance</h3>
                <div className="bg-surface-850 border border-surface-800 rounded-2xl p-5 mt-4">
                  <div className="flex justify-between items-center py-3 border-b border-surface-800 last:border-b-0">
                    <span className="text-gray-500 text-sm mt-0.5 font-mono">Resistance</span><span className="text-down font-mono font-semibold text-sm">₹{techData.structure?.support_resistance?.resistance?.toFixed(2) || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-surface-800 last:border-b-0">
                    <span className="text-gray-500 text-sm mt-0.5 font-mono">Support</span><span className="text-up font-mono font-semibold text-sm">₹{techData.structure?.support_resistance?.support?.toFixed(2) || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <PatternAnalysis symbol={cleanSymbol} />
          </div>
        )}

        {/* INSTITUTIONAL TAB */}
        {activeTab === 'institutional' && (
          <InstitutionalTab symbol={cleanSymbol} fundData={fundData} />
        )}

        {/* FUNDAMENTAL TAB */}
        {activeTab === 'fundamental' && (
          isFundLoading ? (
            <div className="flex justify-center py-20 text-brand-400"><Activity className="animate-pulse" /></div>
          ) : fundData ? (
            <div className="space-y-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-100 flex items-center">
                    Fundamental Analysis
                    <span className="ml-3 text-xs bg-surface-900 border border-surface-800 px-2 py-1 rounded-full text-gray-400">
                      Data: Screener.in
                    </span>
                  </h2>
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Download}
                    onClick={handleExportFundamentalsPDF}
                    disabled={!fundData}
                  >
                    Export PDF
                  </Button>
                  <Button variant="secondary" size="sm" icon={RefreshCw} onClick={handleRefreshFundamental}>
                    Refresh Data
                  </Button>
                </div>
              </div>

              {/* 1. KEY RATIOS */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center">
                  <div className="text-gray-500 text-xs mb-1">Market Cap</div>
                  <div className="text-gray-100 font-mono font-bold">{formatMetric('market_cap', fundData.market_cap)}</div>
                </div>
                <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center" title="Price to Earnings: How much you pay for ₹1 of company earnings">
                  <div className="text-gray-500 text-xs mb-1 cursor-help border-b border-dashed border-gray-500 inline-block">PE Ratio</div>
                  <div className="text-gray-100 font-mono font-bold">{formatMetric('pe_ratio', fundData.pe_ratio)}</div>
                </div>
                <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center" title="Price to Book: How much you pay for ₹1 of company assets">
                  <div className="text-gray-500 text-xs mb-1 cursor-help border-b border-dashed border-gray-500 inline-block">PB Ratio</div>
                  <div className="text-gray-100 font-mono font-bold">{formatMetric('pb_ratio', fundData.pb_ratio)}</div>
                </div>
                <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center" title="Price to Sales: How much you pay for ₹1 of company revenue">
                  <div className="text-gray-500 text-xs mb-1 cursor-help border-b border-dashed border-gray-500 inline-block">
                    P/S Ratio
                  </div>
                  <div className="text-gray-100 font-mono font-bold">
                    {fundData.ps_ratio 
                      ? `${parseFloat(fundData.ps_ratio).toFixed(1)}x` 
                      : 'N/A'}
                  </div>
                </div>
                <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center" title="Enterprise Value to EBITDA: Lower = potentially undervalued">
                  <div className="text-gray-500 text-xs mb-1 cursor-help border-b border-dashed border-gray-500 inline-block">
                    EV/EBITDA
                  </div>
                  <div className="text-gray-100 font-mono font-bold">
                    {fundData.ev_ebitda 
                      ? `${parseFloat(fundData.ev_ebitda).toFixed(1)}x` 
                      : 'N/A'}
                  </div>
                </div>
                <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center">
                  <div className="text-gray-500 text-xs mb-1">
                    52W Avg Price
                  </div>
                  <div className="text-gray-100 font-mono font-bold">
                    {fundData.avg_52w 
                      ? `₹${fundData.avg_52w}` 
                      : 'N/A'}
                  </div>
                </div>
                <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center" title="Free Float: Percentage of shares available for trading">
                  <div className="text-gray-500 text-xs mb-1 cursor-help border-b border-dashed border-gray-500 inline-block">
                    Free Float
                  </div>
                  <div className="text-gray-100 font-mono font-bold">
                    {fundData.free_float 
                      ? `${parseFloat(fundData.free_float).toFixed(1)}%` 
                      : 'N/A'}
                  </div>
                </div>
                <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center" title="Return on Equity: Profit generated per ₹100 of shareholder money">
                  <div className="text-gray-500 text-xs mb-1 cursor-help border-b border-dashed border-gray-500 inline-block">ROE</div>
                  <div className="text-gray-100 font-mono font-bold">{formatMetric('roe', fundData.roe)}</div>
                </div>
                <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center" title="Return on Capital Employed: Efficiency of capital utilization">
                  <div className="text-gray-500 text-xs mb-1 cursor-help border-b border-dashed border-gray-500 inline-block">ROCE</div>
                  <div className="text-gray-100 font-mono font-bold">{formatMetric('roce', fundData.roce)}</div>
                </div>
                <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center">
                  <div className="text-gray-500 text-xs mb-1">Book Value</div>
                  <div className="text-gray-100 font-mono font-bold">{formatMetric('book_value', fundData.book_value)}</div>
                </div>
                <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center">
                  <div className="text-gray-500 text-xs mb-1">EPS</div>
                  <div className="text-gray-100 font-mono font-bold">{formatMetric('eps', fundData.eps)}</div>
                </div>
                <div className="bg-surface-900 p-3 rounded border border-surface-800 text-center">
                  <div className="text-gray-500 text-xs mb-1">Dividend Yield</div>
                  <div className="text-gray-100 font-mono font-bold">{formatMetric('dividend_yield', fundData.dividend_yield)}</div>
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
                      <span className={`font-bold ${fundData.revenue_growth_yoy > 10 ? 'text-up' : fundData.revenue_growth_yoy < 0 ? 'text-down' : 'text-gray-100'}`}>
                        {fundData.revenue_growth_yoy ? `${fundData.revenue_growth_yoy}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-sans">Profit Growth YoY</span>
                      <span className={`font-bold ${fundData.profit_growth_yoy > 10 ? 'text-up' : fundData.profit_growth_yoy < 0 ? 'text-down' : 'text-gray-100'}`}>
                        {fundData.profit_growth_yoy ? `${fundData.profit_growth_yoy}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-sans">Profit Growth QoQ</span>
                      <span className={`font-bold ${fundData.profit_growth_qoq > 0 ? 'text-up' : fundData.profit_growth_qoq < 0 ? 'text-down' : 'text-gray-100'}`}>
                        {fundData.profit_growth_qoq ? `${fundData.profit_growth_qoq}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border border-surface-800 rounded-lg p-4 bg-surface-900">
                  <h3 className="text-md font-bold text-gray-300 mb-3 border-b border-surface-800 pb-2">Shareholding Pattern</h3>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between"><span className="text-gray-500 font-sans">Promoter</span><span className={fundData.promoter_holding > 50 ? "text-up font-bold" : "text-gray-100"}>{fundData.promoter_holding ? `${fundData.promoter_holding}%` : 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 font-sans">FII</span><span className="text-gray-100">{fundData.fii_holding ? `${fundData.fii_holding}%` : 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 font-sans">DII</span><span className="text-gray-100">{fundData.dii_holding ? `${fundData.dii_holding}%` : 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 font-sans">Public</span><span className="text-gray-100">{fundData.shareholding?.public_holding ? `${fundData.shareholding.public_holding}%` : 'N/A'}</span></div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">
                        FPI
                      </span>
                      <span className="text-gray-100">
                        {fundData.fpi_holding 
                          ? `${fundData.fpi_holding}%` 
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">
                        Free Float
                      </span>
                      <span className={`${
                        fundData.free_float > 50 
                          ? 'text-up' 
                          : 'text-warn'
                      }`}>
                        {fundData.free_float 
                          ? `${fundData.free_float}%` 
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-surface-800 pt-2 mt-2">
                      <span className="text-gray-500 font-sans">Promoter Pledge</span>
                      {/* The middle band was `text-up`: a promoter pledge of
                          10–25% rendered green, i.e. the same as "good", when it
                          is the point at which it starts to matter. Thresholds
                          are unchanged — only the tone. */}
                      <span className={`${fundData.promoter_pledge > 25 ? "text-down font-bold" : fundData.promoter_pledge > 10 ? "text-warn" : "text-gray-100"}`}>
                        {fundData.promoter_pledge !== null && fundData.promoter_pledge !== undefined ? `${fundData.promoter_pledge}%` : '0%'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. QUARTERLY RESULTS TABLE */}
              {fundData.quarterly_results && fundData.quarterly_results.quarters && (
                <div className="border border-surface-800 rounded-lg p-4 bg-surface-900">
                  <h3 className="text-md font-bold text-gray-300 mb-3 pb-2">Quarterly Results (Last 4 Quarters)</h3>
                  <div className="overflow-x-auto -mx-2 px-2">
                    <table className="w-full text-left text-sm font-mono min-w-[400px]">
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
                                  ? 'text-up' : row.colorCode && quarterly[row.key][i] < 0 ? 'text-down' : 'text-gray-100'
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
                            className="flex-1 bg-series-2/60 rounded-t hover:bg-series-2 transition-colors"
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
                            className={`flex-1 rounded-t transition-colors ${val >= 0 ? 'bg-up/60 hover:bg-up' : 'bg-down/60 hover:bg-down'}`}
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
              <div className="bg-surface-850 border border-brand-500/50 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4 border-b border-surface-800 pb-3">
                  <h3 className="font-bold text-brand-400 text-lg">Fundamental Score Card</h3>
                  <div className="text-2xl font-bold font-mono text-brand-400">{fundData.fundamental_score}/100</div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-gray-400 font-bold mb-3 text-sm uppercase tracking-wider">Strengths</h4>
                    <ul className="space-y-2">
                      {fundData.strengths && fundData.strengths.length > 0 ? (
                        fundData.strengths.map((s, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-up mr-2"></span>
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
                            <TrendingDown size={12} className="text-down inline mr-1" />
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
                    <h3 className="text-gray-100 font-bold mb-4 border-b border-surface-800 pb-2">
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
                      <div className="overflow-x-auto -mx-2 px-2 pb-2">
                        <table className="w-full min-w-[500px] text-sm font-mono">
                          <thead>
                            <tr className="grid grid-cols-6 gap-2 px-3 py-2 text-gray-500 text-xs font-semibold uppercase tracking-wide border-b border-surface-800 min-w-[500px]">
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
                                  <span className="text-up font-medium">
                                    {peer.name || '-'}
                                  </span>
                                  {peer.symbol && (
                                    <span className="text-gray-500 text-xs ml-2">
                                      {peer.symbol}
                                    </span>
                                  )}
                                </td>
                                
                                <td className="text-right text-gray-100 px-3 whitespace-nowrap">
                                  {formatPeerValue(peer.price, '₹')}
                                </td>
                                
                                <td className="text-right text-gray-100 px-3 whitespace-nowrap">
                                  {formatPeerValue(peer.pe_ratio, '', 'x')}
                                </td>
                                
                                <td className="text-right text-gray-100 text-xs px-3 whitespace-nowrap">
                                  {peer.market_cap 
                                    ? `₹${Math.round(peer.market_cap).toLocaleString('en-IN')} Cr`
                                    : '-'}
                                </td>
                                
                                <td className={`text-right font-medium px-3 whitespace-nowrap ${
                                  peer.roce > 15 ? 'text-up' 
                                  : peer.roce < 8 ? 'text-down' 
                                  : 'text-gray-100'
                                }`}>
                                  {formatPeerValue(peer.roce, '', '%')}
                                </td>
                                
                                <td className="text-right text-gray-100 text-xs pl-3 whitespace-nowrap">
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
                      className="text-xs text-brand-400 hover:text-brand-300 mt-2 block"
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
              <h2 className="text-xl font-bold text-gray-100 flex items-center">
                News & Sentiment
              </h2>
              <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => fetchNews(true)}>
                Refresh
              </Button>
            </div>
            {isNewsLoading ? (
              <div className="flex justify-center py-20 text-brand-400"><Activity className="animate-pulse" /></div>
            ) : (
              <div className="space-y-4">
                {sentiment && (
                <div className={`p-4 rounded-xl mb-4 ${
                  sentiment.overall_sentiment === 'Positive' 
                    ? 'bg-up/10 border border-up/25'
                  : sentiment.overall_sentiment === 'Negative'
                    ? 'bg-down/10 border border-down/25'
                    : 'bg-surface-900 border border-surface-800'
                }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-400">
                        Overall News Sentiment
                      </p>
                      <p className={`text-2xl font-bold ${
                        sentiment.overall_sentiment === 'Positive'
                          ? 'text-up'
                        : sentiment.overall_sentiment === 'Negative'
                          ? 'text-down'
                          : 'text-gray-300'
                      }`}>
                        {sentiment.overall_sentiment}
                      </p>
                      <p className="text-sm text-gray-400">
                        {sentiment.summary}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-4xl font-bold text-gray-100">
                        {sentiment.score}
                      </p>
                      <p className="text-xs text-gray-400">/ 10</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 mt-3">
                    <span className="text-up text-sm">
                      {sentiment.positive_count} Positive
                    </span>
                    <span className="text-down text-sm">
                      {sentiment.negative_count} Negative
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
                                  hover:border-brand-500/50 
                                  transition-all cursor-pointer"
                       onClick={() => window.open(article.url)}>
                    
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-brand-400 font-medium">
                        {article.source}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full
                          font-medium ${
                          article.sentiment === 'Positive'
                            ? 'bg-up/15 text-up'
                          : article.sentiment === 'Negative'
                            ? 'bg-down/15 text-down'
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {article.sentiment === 'Positive' ? '' 
                           : article.sentiment === 'Negative' ? '' 
                           : ''} {article.sentiment}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          article.impact === 'High'
                            ? 'bg-up/15 text-up'
                          : article.impact === 'Medium'
                            ? 'bg-warn/15 text-warn'
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {article.impact} Impact
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-100 font-medium text-sm mb-1">
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
                        <h3 className="text-lg font-bold text-up mb-3 flex items-center">
                          Positive News
                        </h3>
                        {renderArticles(positiveNews)}
                      </div>
                    )}
                    {negativeNews.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-down mb-3 flex items-center">
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
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-200">
                AI Analysis
              </h2>
              <div className="flex items-center gap-3">
                {aiAnalysis && (
                  <Button variant="secondary" icon={Download} onClick={handleExportPDF}>
                    Export PDF
                  </Button>
                )}
                {/* Was a green button, on a page where green means "price up".
                    Generating an analysis is an action, so it takes brand. */}
                <Button
                  variant="primary"
                  icon={BrainCircuit}
                  onClick={handleGenerateAI}
                  loading={aiLoading}
                >
                  {aiLoading
                    ? 'Analyzing…'
                    : aiAnalysis ? 'Refresh Analysis' : 'Generate Analysis'}
                </Button>
              </div>
            </div>
            
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-brand-400">
                <BrainCircuit className="animate-pulse w-16 h-16 mb-4" />
                <p className="text-lg font-medium">AI is analyzing market data...</p>
                <p className="text-sm text-gray-500 mt-2">Correlating technicals, fundamentals, and sentiment.</p>
              </div>
            ) : aiAnalysis ? (
              <div id="ai-analysis-content" className="space-y-8 animate-fade-in">
                {/* Top Hero Section */}
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="bg-gradient-to-br from-surface-850 to-surface-900 border border-brand-500/40 p-6 rounded-xl flex-1 w-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500 opacity-5 rounded-bl-full pointer-events-none" />
                    <h2 className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">AI Verdict</h2>
                    <div className="text-3xl font-bold text-gray-100 mb-4">{aiAnalysis.verdict}</div>
                    <p className="text-gray-300 leading-relaxed">{aiAnalysis.summary}</p>
                  </div>

                  <div className="bg-surface-900 border border-surface-800 p-6 rounded-xl w-full md:w-64 flex flex-col items-center justify-center">
                    <div className="relative w-24 h-24 mb-2">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-surface-700" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-brand-400" strokeDasharray={`${aiAnalysis.confidence}, 100`} strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold text-gray-100 font-mono">{aiAnalysis.confidence}%</span>
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
                  <h3 className="text-lg font-bold text-gray-100 mb-4 flex items-center"><Target className="mr-2 text-brand-400" size={20} /> Proposed Swing Trade Setup</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-surface-900 border border-surface-800 p-4 rounded-lg text-center">
                      <div className="text-gray-500 text-xs mb-1">Entry Range</div>
                      <div className="text-gray-100 font-mono font-bold">{aiAnalysis.trade_setup.entry}</div>
                    </div>
                    <div className="bg-surface-900 border border-down/30 p-4 rounded-lg text-center">
                      <div className="text-gray-500 text-xs mb-1">Stop Loss</div>
                      <div className="text-down font-mono font-bold">{aiAnalysis.trade_setup.stop_loss}</div>
                      <div className="text-xs text-down/70 mt-1">({aiAnalysis.trade_setup.risk_percent} risk)</div>
                    </div>
                    <div className="bg-surface-900 border border-up/30 p-4 rounded-lg text-center">
                      <div className="text-gray-500 text-xs mb-1">Target 1</div>
                      <div className="text-up font-mono font-bold">{aiAnalysis.trade_setup.target_1}</div>
                    </div>
                    <div className="bg-surface-900 border border-up/30 p-4 rounded-lg text-center">
                      <div className="text-gray-500 text-xs mb-1">Target 2</div>
                      <div className="text-up font-mono font-bold">{aiAnalysis.trade_setup.target_2}</div>
                    </div>
                    <div className="bg-surface-900 border border-surface-800 p-4 rounded-lg text-center">
                      <div className="text-gray-500 text-xs mb-1">Risk / Reward</div>
                      <div className="text-brand-400 font-mono font-bold">{aiAnalysis.trade_setup.risk_reward}</div>
                    </div>
                  </div>
                </motion.div>

                {aiAnalysis.timeframes && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-100">
                      Analysis by Timeframe
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(aiAnalysis.timeframes).map(([tf, data]) => (
                        <div key={tf} className="bg-surface-900 border border-surface-800 rounded-xl p-5">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-gray-100 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                              {tf === 'intraday' ? 'Intraday' :
                               tf === 'swing' ? 'Swing (Days)' :
                               tf === 'midterm' ? 'Midterm (Months)' :
                               'Long Term (Years)'}
                              {tf === 'swing' && data.setup_type && (
                                <Badge variant="brand">{data.setup_type}</Badge>
                              )}
                            </h4>
                            <Badge variant={verdictTone(data.verdict)} size="md">
                              {data.verdict}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 mb-2">
                            Confidence: <span className="text-up font-mono font-bold">
                              {data.confidence}%
                            </span>
                            {data.holding_period && (
                              <span className="ml-3">
                                Hold: {data.holding_period}
                              </span>
                            )}
                          </div>
                          {data.entry && (
                            <div className="grid grid-cols-3 gap-2 mt-3 text-xs font-mono">
                              <div className="bg-surface-850 rounded p-2 text-center">
                                <div className="text-gray-500 mb-1">Entry</div>
                                <div className="text-gray-100">{data.entry}</div>
                              </div>
                              <div className="bg-surface-850 rounded p-2 text-center">
                                <div className="text-gray-500 mb-1">SL</div>
                                <div className="text-down">{data.stop_loss}</div>
                              </div>
                              <div className="bg-surface-850 rounded p-2 text-center">
                                <div className="text-gray-500 mb-1">T1</div>
                                <div className="text-up">{data.target_1}</div>
                              </div>
                            </div>
                          )}
                          <p className="text-gray-400 text-xs mt-3 leading-relaxed">
                            {data.reasoning}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deep Dive Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-up font-bold mb-2 flex items-center"><TrendingUp className="mr-2" size={16} /> The Bull Case</h4>
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
                      <h4 className="text-down font-bold mb-2 flex items-center"><TrendingDown className="mr-2" size={16} /> The Bear Case</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">{aiAnalysis.bear_case}</p>
                    </div>
                    {aiAnalysis.red_flags && aiAnalysis.red_flags.length > 0 && (
                      <div className="bg-down/10 border border-down/30 rounded-lg p-4">
                        <h4 className="text-down font-bold mb-2 flex items-center"><AlertTriangle className="mr-2" size={16} /> Red Flags to Watch</h4>
                        <ul className="list-disc list-inside text-sm text-down/90 space-y-1">
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
                <p>Click &quot;Claude AI Analysis&quot; above to generate a deep-dive report.</p>
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
