import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Menu, Bell, Activity, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import useDebounce from '../../hooks/useDebounce';

const Header = ({ toggleSidebar }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [nifty, setNifty] = useState({ price: 'Loading...', change: 0, flash: '' });
  const [bankNifty, setBankNifty] = useState({ price: 'Loading...', change: 0, flash: '' });
  const [marketStatus, setMarketStatus] = useState('Open');

  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [hasAlerts, setHasAlerts] = useState(false);

  useEffect(() => {
    const checkPending = async () => {
      try {
        const res = await api.get("/alerts/triggered");
        if (res.data && res.data.length > 0) {
          setHasAlerts(true);
          setAlerts(prev => [...res.data, ...prev].slice(0, 20));
          setTimeout(() => setHasAlerts(false), 10000);
        }
      } catch (e) {}
    };
    checkPending();
    const interval = setInterval(checkPending, 60000);
    return () => clearInterval(interval);
  }, []);

  const navigate = useNavigate();
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debouncedSearch.trim()) {
      api.get(`/stocks/search?q=${debouncedSearch}`).then(res => {
        setSearchResults(res.data.results);
        setShowDropdown(true);
      }).catch(e => console.error(e));
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [debouncedSearch]);

  const fetchHeaderPrices = async () => {
    try {
      const res = await api.get('/stocks/market-overview');
      const data = res.data;
      if (data && Array.isArray(data)) {
        const n50 = data.find(d =>
          d.symbol === '^NSEI' ||
          d.name === 'Nifty 50'
        );
        const bn = data.find(d =>
          d.symbol === '^NSEBANK' ||
          d.name === 'Bank Nifty'
        );

        if (n50) {
          setNifty(prev => ({
            price: n50.current_price?.toFixed(2),
            change: n50.change_percent?.toFixed(2),
            flash: prev.price && prev.price !== n50.current_price?.toFixed(2) ? 'bg-emerald-500/10' : ''
          }));
          setTimeout(() => setNifty(p => ({...p, flash: ''})), 500);
        }
        if (bn) {
          setBankNifty(prev => ({
            price: bn.current_price?.toFixed(2),
            change: bn.change_percent?.toFixed(2),
            flash: prev.price && prev.price !== bn.current_price?.toFixed(2) ? 'bg-emerald-500/10' : ''
          }));
          setTimeout(() => setBankNifty(p => ({...p, flash: ''})), 500);
        }
      }
    } catch (error) {
      console.log('Header price fetch error:', error);
    }
  };

  useEffect(() => {
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const time = now.getHours() + now.getMinutes() / 60;
    if (isWeekend || time < 9.25 || time > 15.5) {
      setMarketStatus('Closed');
    } else {
      setMarketStatus('Open');
    }

    fetchHeaderPrices();
    const interval = setInterval(() => {
      fetchHeaderPrices();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      let symbol = searchQuery.toUpperCase();
      if (!symbol.includes('.NS') && !symbol.includes('.BO')) {
        symbol += '.NS';
      }
      navigate(`/stock/${symbol}`);
      setSearchQuery('');
      setShowDropdown(false);
    }
  };

  const handleResultClick = (result) => {
    if (result.type === 'index') {
      navigate(`/index/${result.symbol}`);
    } else if (result.type === 'etf') {
      navigate(`/etf/${result.symbol}`);
    } else {
      navigate(`/stock/${result.symbol}`);
    }
    setSearchQuery('');
    setShowDropdown(false);
  };

  return (
    <header className="h-16 bg-surface-900/80 backdrop-blur-md border-b border-surface-800 flex items-center justify-between px-4 lg:px-8 z-30 relative sticky top-0">
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="lg:hidden mr-4 text-gray-400 hover:text-white p-2 rounded-lg hover:bg-surface-850 transition-colors">
          <Menu size={24} />
        </button>
        <div className="hidden md:flex items-center space-x-3 font-mono text-sm">
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-surface-850 border border-surface-800 transition-colors duration-500 ${nifty.flash}`}>
            <span className="text-gray-500 text-xs font-sans">NIFTY 50</span>
            <span className="text-gray-100 font-medium">{nifty.price}</span>
            <span className={Number(nifty.change) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {Number(nifty.change) >= 0 ? '+' : ''}{nifty.change}%
            </span>
          </div>
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-surface-850 border border-surface-800 transition-colors duration-500 ${bankNifty.flash}`}>
            <span className="text-gray-500 text-xs font-sans">BANKNIFTY</span>
            <span className="text-gray-100 font-medium">{bankNifty.price}</span>
            <span className={Number(bankNifty.change) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {Number(bankNifty.change) >= 0 ? '+' : ''}{bankNifty.change}%
            </span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
            marketStatus === 'Open'
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-surface-850 border-surface-800'
          }`}>
            <Circle 
              size={8} 
              className={
                marketStatus === 'Open' 
                  ? 'fill-emerald-400 text-emerald-400 animate-pulse' 
                  : 'fill-gray-500 text-gray-500'
              } 
            />
            <span className={`text-xs font-medium ${
              marketStatus === 'Open' 
                ? 'text-emerald-400' 
                : 'text-gray-400'
            }`}>
              Market {marketStatus}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div className="relative hidden md:block" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search symbol (e.g. RELIANCE)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!showDropdown) setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="bg-surface-850 border border-surface-800 text-sm rounded-full pl-10 pr-4 py-2 w-48 lg:w-72 text-gray-100 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-all placeholder-gray-500"
            />
          </form>
          <AnimatePresence>
            {showDropdown && searchResults.length > 0 && (
              <motion.div
                className="absolute top-full mt-2 w-full bg-surface-850 border border-surface-800 rounded-xl shadow-card overflow-hidden z-50 max-h-80 overflow-y-auto"
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                {searchResults.map((result, idx) => (
                  <motion.div
                    key={idx}
                    onClick={() => handleResultClick(result)}
                    className="p-3 hover:bg-surface-800 cursor-pointer border-b border-surface-800 last:border-b-0 transition-colors flex justify-between items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <div className="flex items-center">
                      <span className="mr-2 text-lg">
                        {result.type === 'index' ? '📊' : result.type === 'etf' ? '💹' : '📈'}
                      </span>
                      <div>
                        <div className="font-bold text-emerald-400 flex items-center gap-2">
                          {result.symbol.replace('.NS', '')}
                          {result.type === 'etf' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-400 border border-teal-500/30 uppercase tracking-wider">ETF</span>
                          )}
                          {result.type === 'index' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 uppercase tracking-wider">IDX</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">{result.name}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">{result.sector}</div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button onClick={() => setShowAlerts(!showAlerts)} className="text-gray-400 hover:text-gray-100 transition-colors relative p-2 rounded-xl hover:bg-surface-850">
            <Bell size={20} />
            {(alerts.length > 0 || hasAlerts) && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-surface-900"></span>
            )}
          </button>

          <AnimatePresence>
            {showAlerts && (
              <motion.div
                className="absolute right-0 mt-2 w-80 bg-surface-850 border border-surface-800 rounded-xl shadow-card z-50 overflow-hidden"
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                <div className="flex justify-between items-center p-3 border-b border-surface-800 bg-surface-900">
                  <h3 className="font-bold text-gray-100 flex items-center text-sm">
                    <Activity size={16} className="mr-2 text-emerald-400"/> Notifications
                  </h3>
                  {alerts.length > 0 && (
                    <button onClick={() => {setAlerts([]); setShowAlerts(false);}} className="text-xs text-gray-400 hover:text-gray-100">
                      Clear All
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">No recent alerts.</div>
                  ) : (
                    alerts.map((a, i) => (
                      <div key={i} className="p-3 border-b border-surface-800 last:border-b-0 hover:bg-surface-800/60 transition-colors">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-emerald-400 text-sm">{a.symbol}</span>
                          <span className="text-xs text-gray-500">Just now</span>
                        </div>
                        <p className="text-sm text-gray-300 mt-1">{a.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;
