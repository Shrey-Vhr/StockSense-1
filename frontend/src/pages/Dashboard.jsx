import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, RefreshCw, ChevronRight, Activity, Newspaper, BarChart2 } from 'lucide-react';
import api from '../utils/api';
import useStore from '../store/useStore';
import SectorHeatmap from '../components/Dashboard/SectorHeatmap';

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
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-surface-850 rounded w-48 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="bg-surface-850 border border-surface-800 rounded-2xl p-5 h-32"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface-850 border border-surface-800 rounded-2xl p-5 h-40"></div>
            <div className="bg-surface-850 border border-surface-800 rounded-2xl p-5 h-40"></div>
            <div className="bg-surface-850 border border-surface-800 rounded-2xl p-5 h-64"></div>
          </div>
          <div className="bg-surface-850 border border-surface-800 rounded-2xl p-5 h-[600px]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Market Overview</h1>
      </div>

      {/* Top Indices Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {safeArray(marketOverview).slice(0, 3).map((idx, i) => (
          <div key={i} className="bg-surface-850 border border-surface-800 rounded-2xl p-5 hover:border-emerald-500/30 hover:shadow-glow transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-gray-200 font-semibold text-base group-hover:text-emerald-400 transition-colors">{idx.symbol === '^NSEI' ? 'Nifty 50' : idx.symbol === '^NSEBANK' ? 'BankNifty' : idx.symbol}</h3>
                <div className="mt-2 text-2xl font-bold text-white font-mono">{idx.current_price?.toFixed(2)}</div>
              </div>
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${idx.change_percent >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {idx.change_percent >= 0 ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                <span className="font-mono font-medium">{Math.abs(idx.change_percent).toFixed(2)}%</span>
              </div>
            </div>
            {/* Sparkline placeholder */}
            <div className="mt-4 h-12 w-full flex items-end space-x-1 opacity-50">
               {[...Array(20)].map((_, j) => (
                 <div key={j} className={`w-full ${idx.change_percent >= 0 ? 'bg-emerald-400' : 'bg-red-400'} rounded-t-sm`} style={{ height: `${Math.random() * 100}%` }}></div>
               ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Movers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Gainers */}
          <div className="bg-surface-850 border border-surface-800 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2 mb-4">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                ↗
              </span>
              Top Gainers
            </h2>
            <div className="relative">
              <div className="flex overflow-x-auto pb-4 space-x-4 custom-scrollbar">
                {safeArray(topGainers).map((stock) => (
                  <div 
                    key={stock.symbol} 
                    onClick={() => navigate(`/stock/${stock.symbol}`)}
                    className="flex-shrink-0 bg-surface-850 border border-surface-800 rounded-xl p-4 min-w-[140px] hover:border-emerald-500/30 hover:bg-surface-800 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                  >
                    <div className="font-bold text-gray-100 text-sm">{stock.symbol.replace('.NS', '')}</div>
                    <div className="text-gray-500 text-xs mt-1">₹{(stock.current_price ?? stock.price ?? stock.ltp ?? stock.last_price)?.toFixed(2) ?? 'N/A'}</div>
                    <div className="text-emerald-400 font-semibold text-sm mt-2">+{stock.change_percent?.toFixed(2)}%</div>
                  </div>
                ))}
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-surface-850 to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Top Losers */}
          <div className="bg-surface-850 border border-surface-800 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2 mb-4">
              <span className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                ↘
              </span>
              Top Losers
            </h2>
            <div className="relative">
              <div className="flex overflow-x-auto pb-4 space-x-4 custom-scrollbar">
                {safeArray(topLosers).map((stock) => (
                  <div 
                    key={stock.symbol} 
                    onClick={() => navigate(`/stock/${stock.symbol}`)}
                    className="flex-shrink-0 bg-surface-850 border border-surface-800 rounded-xl p-4 min-w-[140px] hover:border-emerald-500/30 hover:bg-surface-800 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                  >
                    <div className="font-bold text-gray-100 text-sm">{stock.symbol.replace('.NS', '')}</div>
                    <div className="text-gray-500 text-xs mt-1">₹{(stock.current_price ?? stock.price ?? stock.ltp ?? stock.last_price)?.toFixed(2) ?? 'N/A'}</div>
                    <div className="text-red-400 font-semibold text-sm mt-2">{stock.change_percent?.toFixed(2)}%</div>
                  </div>
                ))}
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-surface-850 to-transparent pointer-events-none" />
            </div>
          </div>
          
          {/* Indices & ETFs Quick Access */}
          <div className="bg-surface-850 border border-surface-800 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center">
              <BarChart2 className="text-emerald-400 mr-2" size={20} /> Indices & ETFs
            </h2>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                {symbol: '^NSEI', name: 'Nifty 50', type: 'index'},
                {symbol: '^NSEBANK', name: 'Bank Nifty', type: 'index'},
                {symbol: '^CNXIT', name: 'Nifty IT', type: 'index'},
                {symbol: 'NIFTYBEES.NS', name: 'Nifty BeES', type: 'etf'},
                {symbol: 'GOLDBEES.NS', name: 'Gold BeES', type: 'etf'},
                {symbol: 'MON100.NS', name: 'NASDAQ 100', type: 'etf'},
              ].map(item => (
                <div 
                  key={item.symbol}
                  onClick={() => navigate(
                    item.type === 'index' 
                      ? `/index/${item.symbol.replace('^', 'IDX-')}`
                      : `/etf/${item.symbol}`
                  )}
                  className="bg-surface-900 border border-surface-800 rounded-xl p-3 cursor-pointer hover:border-emerald-500/40 transition-colors">
                  <p className="text-xs text-gray-400">
                    {item.type.toUpperCase()}
                  </p>
                  <p className="text-white font-bold text-sm">
                    {item.name}
                  </p>
                  <p className="text-emerald-400 text-xs mt-1">
                    View Analysis →
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Sector Performance */}
          <div className="bg-surface-850 border border-surface-800 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center">
              <BarChart2 className="text-emerald-400 mr-2" size={20} /> Sector Performance
            </h2>
            <SectorHeatmap sectors={sectorPerformance} isLoading={isLoading.dashboard} />
          </div>
          
          {/* Custom Screener CTA */}
          <div className="bg-surface-850 border border-surface-800 rounded-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white flex items-center">
                <Activity className="text-emerald-400 mr-2" size={20} /> Stock Screener
              </h2>
              <Link to="/screener" className="text-sm text-emerald-400 hover:underline flex items-center">
                Open Screener <ChevronRight size={16} />
              </Link>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-xl p-6 text-center">
              <Activity size={36} className="mx-auto mb-3 text-emerald-400 opacity-60" />
              <p className="text-gray-300 font-medium mb-1">Build Your Own Screen</p>
              <p className="text-gray-500 text-sm mb-4">Define custom conditions using 35+ technical & fundamental indicators.</p>
              <Link to="/screener" className="inline-flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-surface-950 font-bold rounded-lg transition-colors text-sm">
                <Activity size={16} className="mr-2" /> Launch Screener
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column - News */}
        <div className="space-y-6">
          <div className="bg-surface-850 border border-surface-800 rounded-2xl p-5 h-full">
            <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2 mb-4">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                📰
              </span>
              Market News
            </h2>
            <div>
              {safeArray(marketNews).map((news, i) => (
                <a 
                  href={news.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  key={i} 
                  className="block group py-3 border-b border-surface-800 last:border-b-0 hover:bg-surface-800/50 -mx-2 px-2 rounded-lg transition-colors cursor-pointer"
                >
                  <div className="text-emerald-400 text-xs font-semibold uppercase tracking-wide">{news.source}</div>
                  <h3 className="text-gray-200 text-sm mt-1 leading-snug group-hover:text-gray-50">
                    {news.sentiment === 'Positive' ? '↑ ' : news.sentiment === 'Negative' ? '↓ ' : news.sentiment === 'Neutral' ? '— ' : ''}{news.title}
                  </h3>
                  <div className="text-gray-500 text-xs mt-2">
                    {news.published_display || formatDate(news.published_date)}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
