import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, RefreshCw, ChevronRight, Activity, Newspaper, BarChart2 } from 'lucide-react';
import api from '../utils/api';
import useStore from '../store/useStore';
import SectorHeatmap from '../components/Dashboard/SectorHeatmap';
import TrendingSection from '../components/Dashboard/TrendingSection';
import useCountUp from '../hooks/useCountUp';
import { DashboardSkeleton } from '../components/Skeleton';

const AnimatedPrice = ({ value }) => {
  const animated = useCountUp(
    value, 800, 2
  );
  return <>{animated.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>;
};

const safeArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') return Object.values(data);
  return [];
};

const Dashboard = () => {
  const { 
    marketOverview, setMarketOverview,
    topGainers, setTopGainers,
    topLosers, setTopLosers,
    marketNews, setMarketNews,
    sectorPerformance, setSectorPerformance,
    isLoading, setLoading
  } = useStore();
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading('dashboard', true);
      try {
        const [overview, gainers, losers, news, sectors] = await Promise.all([
          api.get('/stocks/market-overview'),
          api.get('/stocks/top-gainers?n=10'),
          api.get('/stocks/top-losers?n=10'),
          api.get('/news/market?limit=5'),
          api.get('/stocks/sector-performance')
        ]);
        
        if (overview.data) setMarketOverview(overview.data);
        if (gainers.data) setTopGainers(gainers.data);
        if (losers.data) setTopLosers(losers.data);
        if (news.data?.articles) setMarketNews(news.data.articles);
        if (sectors.data) setSectorPerformance(sectors.data);
        
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading('dashboard', false);
      }
    };

    // Fetch if we don't have data, or if it's explicitly requested
    if (!marketOverview) {
      fetchDashboardData();
    }
  }, []);

  useEffect(() => {
    const fetchSectorData = async () => {
      try {
        const res = await api.get('/stocks/sector-performance');
        if (res.data) setSectorPerformance(res.data);
      } catch (error) {
        console.error("Sector fetch error:", error);
      }
    };

    const fetchOverview = async () => {
      try {
        const overview = await api.get('/stocks/market-overview');
        if (overview.data) setMarketOverview(overview.data);
      } catch (error) {
        console.error("Overview fetch error:", error);
      }
    };

    const fetchMovers = async () => {
      try {
        const [gainers, losers] = await Promise.all([
          api.get('/stocks/top-gainers?n=10'),
          api.get('/stocks/top-losers?n=10')
        ]);
        if (gainers.data) setTopGainers(gainers.data);
        if (losers.data) setTopLosers(losers.data);
      } catch (error) {
        console.error("Movers fetch error:", error);
      }
    };

    // Auto-refresh sector data every 5 minutes
    const sectorInterval = setInterval(() => {
      fetchSectorData();
    }, 5 * 60 * 1000); // 300000

    // Auto-refresh market overview every 15 seconds
    const overviewInterval = setInterval(() => {
      fetchOverview();
    }, 15000);

    // Auto-refresh gainers/losers every 60 seconds
    const moversInterval = setInterval(() => {
      fetchMovers();
    }, 60000);

    return () => {
      clearInterval(sectorInterval);
      clearInterval(overviewInterval);
      clearInterval(moversInterval);
    };
  }, []);

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

  if (isLoading.dashboard && !marketOverview) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6 relative z-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Market Overview</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3s */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Top Indices Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {safeArray(marketOverview).slice(0, 3).map((idx, i) => (
              <motion.div 
                key={i} 
                className="bg-surface-900 border border-surface-800 rounded-2xl p-6 flex flex-col gap-4 hover:border-surface-700 transition-colors duration-200 group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1, ease: 'easeOut' }}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-slate-400">{idx.symbol === '^NSEI' ? 'NIFTY 50' : idx.symbol === '^NSEBANK' ? 'BANKNIFTY' : idx.symbol}</span>
                    <span className="text-2xl font-bold text-slate-50 tracking-tight"><AnimatedPrice value={idx.current_price ?? idx.price ?? 0} /></span>
                    <span className={`text-sm font-semibold flex gap-2 ${idx.change_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      <span>{idx.change_percent >= 0 ? '+' : ''}{idx.change?.toFixed(2) ?? ((idx.current_price ?? idx.price ?? 0) - ((idx.current_price ?? idx.price ?? 0) / (1 + (idx.change_percent ?? 0)/100))).toFixed(2)}</span>
                      <span>({idx.change_percent >= 0 ? '+' : ''}{idx.change_percent?.toFixed(2)}%)</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <TrendingSection />

          {/* Movers Grid (Gainers & Losers) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Gainers */}
            <motion.div 
              className="bg-surface-900 border border-surface-800 rounded-2xl p-6 flex flex-col gap-4 h-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                TOP GAINERS
              </h2>
              <div className="flex flex-col gap-2 flex-grow">
                {safeArray(topGainers).map((stock) => (
                  <div 
                    key={stock.symbol} 
                    onClick={() => navigate(`/stock/${stock.symbol}`)}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-surface-800/60 transition-colors cursor-pointer"
                  >
                    <span className="text-base font-semibold text-slate-100 flex-1">{stock.symbol.replace('.NS', '')}</span>
                    <span className="text-sm font-medium text-slate-400 flex-1 text-center">
                      ₹{(stock.current_price ?? stock.price ?? stock.ltp ?? stock.last_price)?.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) ?? 'N/A'}
                    </span>
                    <div className="flex-1 flex justify-end">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${stock.change_percent >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent?.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Top Losers */}
            <motion.div 
              className="bg-surface-900 border border-surface-800 rounded-2xl p-6 flex flex-col gap-4 h-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                TOP LOSERS
              </h2>
              <div className="flex flex-col gap-2 flex-grow">
                {safeArray(topLosers).map((stock) => (
                  <div 
                    key={stock.symbol} 
                    onClick={() => navigate(`/stock/${stock.symbol}`)}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-surface-800/60 transition-colors cursor-pointer"
                  >
                    <span className="text-base font-semibold text-slate-100 flex-1">{stock.symbol.replace('.NS', '')}</span>
                    <span className="text-sm font-medium text-slate-400 flex-1 text-center">
                      ₹{(stock.current_price ?? stock.price ?? stock.ltp ?? stock.last_price)?.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) ?? 'N/A'}
                    </span>
                    <div className="flex-1 flex justify-end">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${stock.change_percent >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent?.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
          
          {/* Indices & ETFs Quick Access */}
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              INDICES & ETFS
            </h2>
            <div className="flex flex-col gap-1">
              {[
                {symbol: '^NSEI', name: 'Nifty 50', type: 'index'},
                {symbol: '^NSEBANK', name: 'Bank Nifty', type: 'index'},
                {symbol: '^CNXIT', name: 'Nifty IT', type: 'index'},
                {symbol: 'NIFTYBEES.NS', name: 'Nifty BeES', type: 'etf'},
                {symbol: 'GOLDBEES.NS', name: 'Gold BeES', type: 'etf'},
                {symbol: 'MON100.NS', name: 'NASDAQ 100', type: 'etf'},
              ].map(item => {
                const data = safeArray(marketOverview).find(m => m.symbol === item.symbol);
                const price = data?.current_price ?? data?.price;
                const change = data?.change_percent;
                return (
                <div 
                  key={item.symbol}
                  onClick={() => navigate(
                    item.type === 'index' 
                      ? `/index/${item.symbol.replace('^', 'IDX-')}`
                      : `/etf/${item.symbol}`
                  )}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-800/50 transition-colors cursor-pointer">
                  <span className="text-sm font-medium text-slate-300 w-1/3">
                    {item.name}
                  </span>
                  <span className="text-sm font-semibold text-slate-100 w-1/3 text-center">
                    {price ? `₹${price.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '-'}
                  </span>
                  <div className="w-1/3 flex justify-end">
                    {change !== undefined ? (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${change >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-surface-700/50 text-slate-400">-</span>
                    )}
                  </div>
                </div>
              )})}
            </div>
          </div>
          
          {/* Sector Performance */}
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              SECTOR PERFORMANCE
            </h2>
            <SectorHeatmap sectors={sectorPerformance} isLoading={isLoading.dashboard} />
          </div>
          
          {/* Custom Screener CTA */}
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                STOCK SCREENER
              </h2>
            </div>
            <div className="flex flex-col items-center text-center mt-2">
              <Activity size={36} className="mx-auto mb-3 text-emerald-400 opacity-60" />
              <p className="text-gray-300 font-medium mb-1">Build Your Own Screen</p>
              <p className="text-gray-500 text-sm mb-5">Define custom conditions using 35+ technical & fundamental indicators.</p>
              <Link to="/screener" className="flex items-center justify-center bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-shadow w-full text-center">
                <Activity size={18} className="mr-2" /> Launch Screener
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column - News */}
        <div className="lg:col-span-1">
          <motion.div 
            className="bg-surface-900 border border-surface-800 rounded-2xl p-6 flex flex-col gap-4 h-full"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              MARKET NEWS
            </h2>
            <div className="flex flex-col flex-grow">
              {safeArray(marketNews).map((news, i) => (
                <a 
                  href={news.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  key={i} 
                  className="block group border-b border-surface-800 pb-3 mb-3 last:border-0 last:mb-0"
                >
                  <div className="flex items-start gap-2">
                    {news.sentiment === 'Positive' && <span className="shrink-0 mt-0.5 text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">POS</span>}
                    {news.sentiment === 'Negative' && <span className="shrink-0 mt-0.5 text-[10px] font-bold uppercase bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">NEG</span>}
                    {news.sentiment === 'Neutral' && <span className="shrink-0 mt-0.5 text-[10px] font-bold uppercase bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded">NEU</span>}
                    <h3 className="text-sm text-slate-300 leading-snug hover:text-emerald-400 transition-colors">
                      {news.title}
                    </h3>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {news.source} • {news.published_display || formatDate(news.published_date)}
                  </div>
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
