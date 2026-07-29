import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Menu, Bell, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import useDebounce from '../../hooks/useDebounce';
import { cn } from '../../lib/cn';
import { surfaceIn } from '../../lib/motion';
import { formatNumber, formatPercent, direction } from '../../lib/format';
import { Badge, Button } from '../ui';

/** Live index chip. Tabular numerals stop the price shifting width on each poll. */
const Ticker = ({ label, price, change, flash }) => {
  const dir = direction(change);
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2.5 h-8 rounded-lg border transition-colors duration-slow',
        'bg-surface-850 border-surface-800',
        flash,
      )}
    >
      <span className="text-2xs font-medium uppercase tracking-wider text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-100 font-mono tnum">{price}</span>
      <span
        className={cn(
          'text-xs font-medium font-mono tnum',
          dir === 'up' ? 'text-up' : dir === 'down' ? 'text-down' : 'text-flat',
        )}
      >
        {formatPercent(change)}
      </span>
    </div>
  );
};

const Header = ({ toggleSidebar, onOpenCommandPalette }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const [nifty, setNifty] = useState({ price: '—', change: null, flash: '' });
  const [bankNifty, setBankNifty] = useState({ price: '—', change: null, flash: '' });
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
  const alertsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(event.target)) {
        setShowAlerts(false);
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
        setActiveIndex(-1);
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
            price: formatNumber(n50.current_price),
            change: n50.change_percent,
            flash: prev.price && prev.price !== formatNumber(n50.current_price) ? 'bg-brand-500/10' : ''
          }));
          setTimeout(() => setNifty(p => ({...p, flash: ''})), 500);
        }
        if (bn) {
          setBankNifty(prev => ({
            price: formatNumber(bn.current_price),
            change: bn.change_percent,
            flash: prev.price && prev.price !== formatNumber(bn.current_price) ? 'bg-brand-500/10' : ''
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

  // The search dropdown was mouse-only — no arrow keys, no Enter to pick a
  // result, no way to dismiss it from the keyboard.
  const handleSearchKeyDown = (e) => {
    if (!showDropdown || searchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (i < searchResults.length - 1 ? i + 1 : i));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i > 0 ? i - 1 : -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleResultClick(searchResults[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const isOpen = marketStatus === 'Open';
  const unread = alerts.length;

  return (
    <header className="h-16 shrink-0 bg-surface-900/80 backdrop-blur-md border-b border-surface-800
                       flex items-center justify-between gap-3 px-3 lg:px-6 z-30 relative sticky top-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Was lg:hidden while the sidebar appears at md: — between 768 and
            1024px this button rendered but did nothing at all. */}
        <Button
          variant="ghost"
          size="md"
          iconOnly
          icon={Menu}
          aria-label="Open navigation"
          onClick={toggleSidebar}
          className="md:hidden"
        />

        <div className="hidden md:flex items-center gap-2 min-w-0">
          <Ticker label="Nifty 50" price={nifty.price} change={nifty.change} flash={nifty.flash} />
          <Ticker label="BankNifty" price={bankNifty.price} change={bankNifty.change} flash={bankNifty.flash} />

          <Badge
            variant={isOpen ? 'up' : 'neutral'}
            size="md"
            dot
            className="h-8 px-2.5"
            title={`NSE trading session runs 09:15–15:30 IST. Market is ${marketStatus.toLowerCase()}.`}
          >
            <span className="uppercase tracking-wider font-semibold">
              Market {marketStatus}
            </span>
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative hidden md:block" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} role="search" className="relative">
            <Search
              size={15}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
            <input
              type="text"
              role="combobox"
              aria-expanded={showDropdown && searchResults.length > 0}
              aria-controls="header-search-results"
              aria-autocomplete="list"
              aria-label="Search symbol"
              placeholder="Search symbol…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!showDropdown) setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleSearchKeyDown}
              className="h-9 w-48 lg:w-72 rounded-lg bg-surface-850 border border-surface-800
                         pl-9 pr-16 text-sm text-gray-100 placeholder:text-gray-600
                         transition-colors duration-fast hover:border-surface-700
                         focus:border-brand-500"
            />
            <kbd
              onClick={onOpenCommandPalette}
              className="absolute right-2 top-1/2 -translate-y-1/2 hidden lg:flex items-center
                         h-5 px-1.5 rounded border border-surface-700 bg-surface-800
                         text-2xs font-medium text-gray-500 cursor-pointer
                         transition-colors duration-fast hover:text-gray-300"
              title="Open command palette"
            >
              ⌘K
            </kbd>
          </form>

          <AnimatePresence>
            {showDropdown && searchResults.length > 0 && (
              <motion.ul
                id="header-search-results"
                role="listbox"
                aria-label="Search results"
                variants={surfaceIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute top-full mt-2 w-full max-h-80 overflow-y-auto z-50
                           bg-surface-850 border border-surface-700 rounded-xl shadow-lg"
              >
                {searchResults.map((result, idx) => (
                  <li
                    key={`${result.symbol}-${idx}`}
                    role="option"
                    aria-selected={idx === activeIndex}
                    onClick={() => handleResultClick(result)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      'px-3 py-2.5 cursor-pointer flex items-center justify-between gap-3',
                      'border-b border-surface-800 last:border-b-0 transition-colors duration-fast',
                      idx === activeIndex ? 'bg-surface-800' : 'hover:bg-surface-800/60',
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-100 font-mono">
                          {result.symbol.replace('.NS', '')}
                        </span>
                        {result.type === 'etf' && <Badge variant="brand">ETF</Badge>}
                        {result.type === 'index' && <Badge variant="brand">IDX</Badge>}
                      </div>
                      <div className="text-xs text-gray-500 truncate mt-0.5">{result.name}</div>
                    </div>
                    <span className="text-2xs text-gray-600 shrink-0">{result.sector}</span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        <div className="relative" ref={alertsRef}>
          <Button
            variant="ghost"
            size="md"
            iconOnly
            icon={Bell}
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
            aria-expanded={showAlerts}
            onClick={() => setShowAlerts(!showAlerts)}
            className="relative"
          />
          {(unread > 0 || hasAlerts) && (
            <span
              aria-hidden="true"
              className="absolute top-1 right-1 min-w-[1rem] h-4 px-1 flex items-center justify-center
                         rounded-full bg-down text-2xs font-semibold text-white
                         ring-2 ring-surface-900 pointer-events-none"
            >
              {unread > 9 ? '9+' : unread || ''}
            </span>
          )}

          <AnimatePresence>
            {showAlerts && (
              <motion.div
                variants={surfaceIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute right-0 mt-2 w-80 z-50 overflow-hidden
                           bg-surface-850 border border-surface-700 rounded-xl shadow-lg"
              >
                <div className="flex justify-between items-center px-4 py-3 border-b border-surface-800">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-100">
                    <Activity size={14} className="text-brand-400" aria-hidden="true" />
                    Notifications
                  </h2>
                  {unread > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => { setAlerts([]); setShowAlerts(false); }}>
                      Clear all
                    </Button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {unread === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-gray-400">No alerts yet</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Price alerts you set on a stock will appear here.
                      </p>
                    </div>
                  ) : (
                    alerts.map((a, i) => (
                      <div
                        key={i}
                        className="px-4 py-3 border-b border-surface-800 last:border-b-0
                                   transition-colors duration-fast hover:bg-surface-800/60"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-sm font-medium text-brand-400 font-mono">{a.symbol}</span>
                          <span className="text-2xs text-gray-600 shrink-0">Just now</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{a.message}</p>
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
