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
        <div className="h-8 bg-[#161b22] rounded w-48 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 h-32"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 h-40"></div>
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 h-40"></div>
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 h-64"></div>
          </div>
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 h-[600px]"></div>
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
          <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-[#4b5563] transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-gray-400 font-medium">{idx.symbol === '^NSEI' ? 'Nifty 50' : idx.symbol === '^NSEBANK' ? 'BankNifty' : idx.symbol}</h3>
                <div className="mt-2 text-2xl font-bold text-white font-mono">{idx.current_price?.toFixed(2)}</div>
              </div>
              <div className={`flex items-center px-2 py-1 rounded ${idx.change_percent >= 0 ? 'bg-green-500/10 text-[#00c853]' : 'bg-red-500/10 text-[#ff1744]'}`}>
                {idx.change_percent >= 0 ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                <span className="font-mono font-medium">{Math.abs(idx.change_percent).toFixed(2)}%</span>
              </div>
            </div>
            {/* Sparkline placeholder */}
            <div className="mt-4 h-12 w-full flex items-end space-x-1 opacity-50">
               {[...Array(20)].map((_, j) => (
                 <div key={j} className={`w-full ${idx.change_percent >= 0 ? 'bg-[#00c853]' : 'bg-[#ff1744]'} rounded-t-sm`} style={{ height: `${Math.random() * 100}%` }}></div>
               ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Movers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Gainers */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center">
              <TrendingUp className="text-[#00c853] mr-2" size={20} /> Top Gainers
            </h2>
            <div className="flex overflow-x-auto pb-4 space-x-4 custom-scrollbar">
              {safeArray(topGainers).map((stock) => (
                <div 
                  key={stock.symbol} 
                  onClick={() => navigate(`/stock/${stock.symbol}`)}
                  className="min-w-[160px] cursor-pointer bg-[#0d1117] border border-[#30363d] p-3 rounded-lg hover:border-[#f0b429] transition-all"
                >
                  <div className="font-bold text-gray-200">{stock.symbol.replace('.NS', '')}</div>
                  <div className="text-sm font-mono mt-1">₹{stock.current_price?.toFixed(2)}</div>
                  <div className="text-xs font-mono text-[#00c853] mt-1">+{stock.change_percent?.toFixed(2)}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Losers */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center">
              <TrendingDown className="text-[#ff1744] mr-2" size={20} /> Top Losers
            </h2>
            <div className="flex overflow-x-auto pb-4 space-x-4 custom-scrollbar">
              {safeArray(topLosers).map((stock) => (
                <div 
                  key={stock.symbol} 
                  onClick={() => navigate(`/stock/${stock.symbol}`)}
                  className="min-w-[160px] cursor-pointer bg-[#0d1117] border border-[#30363d] p-3 rounded-lg hover:border-[#f0b429] transition-all"
                >
                  <div className="font-bold text-gray-200">{stock.symbol.replace('.NS', '')}</div>
                  <div className="text-sm font-mono mt-1">₹{stock.current_price?.toFixed(2)}</div>
                  <div className="text-xs font-mono text-[#ff1744] mt-1">{stock.change_percent?.toFixed(2)}%</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Indices & ETFs Quick Access */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center">
              <BarChart2 className="text-[#f0b429] mr-2" size={20} /> Indices & ETFs
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
                  className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 cursor-pointer hover:border-[#f0b429] transition-colors">
                  <p className="text-xs text-gray-400">
                    {item.type.toUpperCase()}
                  </p>
                  <p className="text-white font-bold text-sm">
                    {item.name}
                  </p>
                  <p className="text-[#f0b429] text-xs mt-1">
                    View Analysis →
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Sector Performance */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center">
              <BarChart2 className="text-[#8bc34a] mr-2" size={20} /> Sector Performance
            </h2>
            <SectorHeatmap sectors={sectorPerformance} isLoading={isLoading.dashboard} />
          </div>
          
          {/* Custom Screener CTA */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white flex items-center">
                <Activity className="text-[#f0b429] mr-2" size={20} /> Stock Screener
              </h2>
              <Link to="/screener" className="text-sm text-[#f0b429] hover:underline flex items-center">
                Open Screener <ChevronRight size={16} />
              </Link>
            </div>
            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-6 text-center">
              <Activity size={36} className="mx-auto mb-3 text-[#f0b429] opacity-60" />
              <p className="text-gray-300 font-medium mb-1">Build Your Own Screen</p>
              <p className="text-gray-500 text-sm mb-4">Define custom conditions using 35+ technical & fundamental indicators.</p>
              <Link to="/screener" className="inline-flex items-center px-4 py-2 bg-[#f0b429] hover:bg-amber-500 text-[#0d1117] font-bold rounded-lg transition-colors text-sm">
                <Activity size={16} className="mr-2" /> Launch Screener
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column - News */}
        <div className="space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 h-full">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center">
              <Newspaper className="text-[#f0b429] mr-2" size={20} /> Market News
            </h2>
            <div className="space-y-4">
              {safeArray(marketNews).map((news, i) => (
                <a 
                  href={news.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  key={i} 
                  className="block p-3 rounded-lg hover:bg-[#0d1117] border border-transparent hover:border-[#30363d] transition-colors"
                >
                  <div className="text-xs text-[#f0b429] font-medium mb-1">{news.source}</div>
                  <h3 className="text-sm text-gray-200 font-medium line-clamp-2 leading-snug hover:text-white">
                    {news.sentiment === 'Positive' ? '🟢 ' : news.sentiment === 'Negative' ? '🔴 ' : news.sentiment === 'Neutral' ? '⚪ ' : ''}{news.title}
                  </h3>
                  <div className="text-xs text-gray-500 mt-2">
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
