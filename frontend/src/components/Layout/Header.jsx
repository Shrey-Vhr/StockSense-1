import { useState, useEffect, useRef } from 'react';
import { Search, Menu, Bell, X, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import useDebounce from '../../hooks/useDebounce';

const safeArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') return Object.values(data);
  return [];
};

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
          // Update the local list so dropdown shows them too
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
            flash: prev.price && prev.price !== n50.current_price?.toFixed(2) ? 'bg-[#f0b429]/20' : ''
          }));
          setTimeout(() => setNifty(p => ({...p, flash: ''})), 500);
        }
        if (bn) {
          setBankNifty(prev => ({
            price: bn.current_price?.toFixed(2),
            change: bn.change_percent?.toFixed(2),
            flash: prev.price && prev.price !== bn.current_price?.toFixed(2) ? 'bg-[#f0b429]/20' : ''
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
      navigate(`/index/${result.symbol.replace('^', 'IDX-')}`);
    } else if (result.type === 'etf') {
      navigate(`/etf/${result.symbol}`);
    } else {
      navigate(`/stock/${result.symbol}`);
    }
    setSearchQuery('');
    setShowDropdown(false);
  };

  return (
    <header className="h-16 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between px-4 lg:px-8 z-30 relative">
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="md:hidden mr-4 text-gray-400 hover:text-white"><Menu size={24} /></button>
        <div className="hidden sm:flex items-center space-x-6 font-mono text-sm">
          <div className={`flex items-center space-x-2 px-2 py-1 rounded transition-colors duration-500 ${nifty.flash}`}>
            <span className="text-gray-400">NIFTY 50</span>
            <span className="text-white font-medium">{nifty.price}</span>
            <span className={Number(nifty.change) >= 0 ? 'text-[#00c853]' : 'text-[#ff1744]'}>
              {Number(nifty.change) >= 0 ? '+' : ''}{nifty.change}%
            </span>
          </div>
          <div className={`flex items-center space-x-2 px-2 py-1 rounded transition-colors duration-500 ${bankNifty.flash}`}>
            <span className="text-gray-400">BANKNIFTY</span>
            <span className="text-white font-medium">{bankNifty.price}</span>
            <span className={Number(bankNifty.change) >= 0 ? 'text-[#00c853]' : 'text-[#ff1744]'}>
              {Number(bankNifty.change) >= 0 ? '+' : ''}{bankNifty.change}%
            </span>
          </div>
          <div className="flex items-center space-x-2 px-2 py-1 rounded bg-[#161b22] border border-[#30363d]">
            <div className={`w-2 h-2 rounded-full ${marketStatus === 'Open' ? 'bg-[#00c853] animate-pulse' : 'bg-[#ff1744]'}`} />
            <span className="text-xs text-gray-300 font-sans">Market {marketStatus}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
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
              className="bg-[#161b22] border border-[#30363d] text-sm rounded-full pl-10 pr-4 py-2 w-48 lg:w-72 text-white focus:outline-none focus:border-[#f0b429] focus:ring-1 focus:ring-[#f0b429] transition-all placeholder-gray-500"
            />
          </form>
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
              {searchResults.map((result, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleResultClick(result)}
                  className="p-3 hover:bg-[#30363d]/50 cursor-pointer border-b border-[#30363d]/50 transition-colors flex justify-between items-center"
                >
                  <div className="flex items-center">
                    <span className="mr-2 text-lg">
                      {result.type === 'index' ? '📊' : result.type === 'etf' ? '💹' : '📈'}
                    </span>
                    <div>
                      <div className="font-bold text-[#f0b429]">
                        {result.symbol.replace('.NS', '')} {result.type && <span className="text-xs text-gray-500 capitalize ml-1">({result.type})</span>}
                      </div>
                      <div className="text-xs text-gray-400">{result.name}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">{result.sector}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="relative">
          <button onClick={() => setShowAlerts(!showAlerts)} className="text-gray-400 hover:text-white transition-colors relative p-2">
            <Bell size={20} />
            {(alerts.length > 0 || hasAlerts) && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#ff1744] rounded-full animate-pulse border border-[#0d1117]"></span>}
          </button>
          
          {showAlerts && (
            <div className="absolute right-0 mt-2 w-80 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
              <div className="flex justify-between items-center p-3 border-b border-[#30363d] bg-[#0d1117]">
                <h3 className="font-bold text-white flex items-center"><Activity size={16} className="mr-2 text-[#f0b429]"/> Notifications</h3>
                {alerts.length > 0 && <button onClick={() => {setAlerts([]); setShowAlerts(false);}} className="text-xs text-gray-400 hover:text-white">Clear All</button>}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">No recent alerts.</div>
                ) : (
                  alerts.map((a, i) => (
                    <div key={i} className="p-3 border-b border-[#30363d] hover:bg-[#30363d]/30 transition-colors">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-[#f0b429] text-sm">{a.symbol}</span>
                        <span className="text-xs text-gray-500">Just now</span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">{a.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
