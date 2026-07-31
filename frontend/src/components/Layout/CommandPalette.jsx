import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CornerDownLeft, ArrowUpDown } from 'lucide-react';
import api from '../../utils/api';
import { cn } from '../../lib/cn';
import { surfaceIn, overlay } from '../../lib/motion';
import { Badge, Spinner } from '../ui';

const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchStocks = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        // Was a bare `fetch` against import.meta.env.VITE_API_URL — the only
        // request in the app that skipped the axios client, so it sent no
        // Authorization header and bypassed the shared 401 handling.
        const res = await api.get(`/stocks/search?q=${query}`);
        setResults(res.data.results || []);
        setSelectedIndex(0);
      } catch (error) {
        console.error("Error fetching stocks:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchStocks, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Keyboard selection could run off the bottom of the scroll container.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${selectedIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleSelect = (item) => {
    navigate(`/stock/${item.symbol}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[16vh] px-4">
          <motion.div
            variants={overlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search stocks"
            variants={surfaceIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-xl overflow-hidden
                       bg-surface-900 border border-surface-700 rounded-2xl shadow-overlay"
          >
            <div className="flex items-center gap-3 px-4 h-14 border-b border-surface-800">
              <Search size={17} className="text-gray-500 shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded={results.length > 0}
                aria-controls="command-palette-results"
                aria-autocomplete="list"
                aria-label="Search stocks by symbol or name"
                className="flex-1 bg-transparent text-base text-gray-100 placeholder:text-gray-500 outline-none"
                placeholder="Search stocks by symbol or name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {isLoading && <Spinner size="sm" className="text-brand-400 shrink-0" />}
            </div>

            {results.length > 0 && (
              <ul
                id="command-palette-results"
                role="listbox"
                ref={listRef}
                className="max-h-80 overflow-y-auto p-2"
              >
                {results.map((item, index) => (
                  <li
                    key={item.symbol}
                    data-index={index}
                    role="option"
                    aria-selected={index === selectedIndex}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      'px-3 py-2.5 rounded-lg flex items-center justify-between gap-3 cursor-pointer',
                      'transition-colors duration-fast',
                      index === selectedIndex ? 'bg-brand-500/12' : 'hover:bg-surface-800',
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-sm font-medium font-mono',
                            index === selectedIndex ? 'text-brand-400' : 'text-gray-100',
                          )}
                        >
                          {item.symbol.replace('.NS', '')}
                        </span>
                        {item.type === 'etf' && <Badge variant="brand">ETF</Badge>}
                        {item.type === 'index' && <Badge variant="brand">IDX</Badge>}
                      </div>
                      <div className="text-xs text-gray-500 truncate mt-0.5">{item.name}</div>
                    </div>
                    {item.sector && (
                      <span className="text-2xs text-gray-500 shrink-0">{item.sector}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {query.trim() && results.length === 0 && !isLoading && (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-gray-400">No stocks found</p>
                <p className="text-xs text-gray-500 mt-1">
                  Nothing matches “{query}”. Try a different symbol or company name.
                </p>
              </div>
            )}

            {!query.trim() && (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-gray-400">Search 2,100+ NSE stocks</p>
                <p className="text-xs text-gray-500 mt-1">
                  Start typing a symbol or company name.
                </p>
              </div>
            )}

            <div className="flex items-center gap-4 px-4 h-10 border-t border-surface-800 bg-surface-950/50">
              <span className="flex items-center gap-1.5 text-2xs text-gray-500">
                <ArrowUpDown size={11} aria-hidden="true" /> Navigate
              </span>
              <span className="flex items-center gap-1.5 text-2xs text-gray-500">
                <CornerDownLeft size={11} aria-hidden="true" /> Select
              </span>
              <span className="flex items-center gap-1.5 text-2xs text-gray-500">
                <kbd className="px-1 rounded border border-surface-700 bg-surface-800">Esc</kbd> Close
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
