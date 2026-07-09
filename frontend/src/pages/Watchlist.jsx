import { useState, useEffect } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { WatchlistSkeleton } from '../components/Skeleton';

const Sparkline = ({ data, isPositive }) => {
  if (!data || data.length < 2) return <div className="w-16 h-8 opacity-50 flex items-center justify-center text-xs text-gray-600">-</div>;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="w-16 h-8" viewBox="0 -5 100 110" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={isPositive ? '#10b981' : '#ef4444'}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

const Watchlist = () => {
  const navigate = useNavigate();
  const [watchlists, setWatchlists] = useState([]);
  const [activeWatchlist, setActiveWatchlist] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [addSymbol, setAddSymbol] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState("");

  // Fetch all watchlists on load
  useEffect(() => {
    fetchWatchlists();
  }, []);

  // Fetch stocks when active watchlist changes
  useEffect(() => {
    if (activeWatchlist) {
      fetchWatchlistStocks(activeWatchlist.id);
    }
  }, [activeWatchlist]);

  const fetchWatchlists = async () => {
    try {
      setLoading(true);
      const res = await api.get("/watchlists/");
      setWatchlists(res.data);
      if (res.data.length > 0 && !activeWatchlist) {
        setActiveWatchlist(res.data[0]);
      }
    } catch (e) {
      setError("Failed to load watchlists");
    } finally {
      setLoading(false);
    }
  };

  const fetchWatchlistStocks = async (id) => {
    try {
      setStocksLoading(true);
      const res = await api.get(`/watchlists/${id}/stocks`);
      setStocks(res.data.stocks || []);
    } catch (e) {
      setStocks([]);
    } finally {
      setStocksLoading(false);
    }
  };

  const createWatchlist = async () => {
    if (!newWatchlistName.trim()) return;
    try {
      await api.post("/watchlists/", { 
        name: newWatchlistName 
      });
      setNewWatchlistName("");
      setShowCreateForm(false);
      fetchWatchlists();
    } catch (e) {
      setError("Failed to create watchlist");
    }
  };

  const deleteWatchlist = async (id) => {
    if (!confirm("Delete this watchlist?")) return;
    try {
      await api.delete(`/watchlists/${id}`);
      setActiveWatchlist(null);
      setStocks([]);
      fetchWatchlists();
    } catch (e) {
      setError("Failed to delete watchlist");
    }
  };

  const addStock = async () => {
    if (!addSymbol.trim() || !activeWatchlist) return;
    try {
      await api.post(
        `/watchlists/${activeWatchlist.id}/stocks`,
        { 
          symbol: addSymbol.toUpperCase(),
          notes: addNotes
        }
      );
      setAddSymbol("");
      setAddNotes("");
      setShowAddForm(false);
      fetchWatchlistStocks(activeWatchlist.id);
    } catch (e) {
      setError(
        e.response?.data?.detail || 
        "Failed to add stock"
      );
    }
  };

  const removeStock = async (stockId) => {
    if (!activeWatchlist) return;
    try {
      await api.delete(
        `/watchlists/${activeWatchlist.id}/stocks/${stockId}`
      );
      fetchWatchlistStocks(activeWatchlist.id);
    } catch (e) {
      setError("Failed to remove stock");
    }
  };

  if (loading) return <WatchlistSkeleton />;

  return (
    <div className="min-h-screen bg-surface-950 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between 
                        items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-100 tracking-tight">
              Watchlists
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Track stocks you're watching
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
          >
            + New Watchlist
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border 
                          border-red-700 rounded-xl 
                          p-3 mb-4 flex justify-between">
            <p className="text-red-400 text-sm">
              {error}
            </p>
            <button
              onClick={() => setError("")}
              className="text-red-400 hover:text-red-300"
            >
              x
            </button>
          </div>
        )}

        {/* Create Watchlist Form */}
        {showCreateForm && (
          <div className="bg-surface-850 border border-surface-800 rounded-xl p-4 mb-4">
            <p className="text-gray-200 text-sm font-medium mb-2">
              New Watchlist Name
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newWatchlistName}
                onChange={e => setNewWatchlistName(
                  e.target.value
                )}
                onKeyDown={e => e.key === 'Enter' && 
                  createWatchlist()}
                placeholder="e.g. Swing Trades, 
                             Long Term..."
                className="flex-1 bg-surface-900 text-gray-200 px-3 py-2 rounded-lg text-sm border border-surface-800 focus:border-emerald-500/50 focus:outline-none"
              />
              <button
                onClick={createWatchlist}
                className="bg-emerald-500 text-white 
                           px-4 py-2 rounded-lg text-sm"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 px-3 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          
          {/* Watchlist Sidebar */}
          <div className="w-full sm:w-48 sm:flex-shrink-0">
            <div className="bg-surface-850 border border-surface-800 rounded-2xl p-2 flex sm:flex-col flex-row overflow-x-auto gap-1">
              {watchlists.length === 0 ? (
                <p className="text-gray-400 text-sm p-2">
                  No watchlists yet
                </p>
              ) : (
                watchlists.map(wl => (
                  <div
                    key={wl.id}
                    onClick={() => setActiveWatchlist(wl)}
                    className={
                      activeWatchlist?.id === wl.id
                        ? 'flex-shrink-0 sm:flex-shrink flex justify-between items-center p-2.5 rounded-xl cursor-pointer bg-emerald-500/10 border border-emerald-500/20 min-w-[100px] sm:min-w-0'
                        : 'flex-shrink-0 sm:flex-shrink flex justify-between items-center p-2.5 rounded-xl cursor-pointer hover:bg-surface-800 transition-colors min-w-[100px] sm:min-w-0'
                    }
                  >
                    <div>
                      <p className={
                        activeWatchlist?.id === wl.id
                          ? 'text-sm font-semibold text-emerald-400'
                          : 'text-sm font-medium text-gray-300'
                      }>
                        {wl.name}
                      </p>
                      <p className="text-gray-600 text-xs">
                        {wl.stock_count} stocks
                      </p>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteWatchlist(wl.id);
                      }}
                      className="text-gray-700 hover:text-red-400 text-xs ml-1 transition-colors"
                    >
                      x
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stocks Panel */}
          <div className="flex-1">
            {!activeWatchlist ? (
              <div className="bg-surface-850 border border-surface-800 rounded-2xl p-8 text-center">
                <p className="text-gray-400">
                  Select or create a watchlist
                </p>
              </div>
            ) : (
              <div className="bg-surface-850 border border-surface-800 rounded-2xl p-4">
                
                {/* Watchlist Header */}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-bold text-gray-100">
                    {activeWatchlist.name}
                  </h2>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                  >
                    + Add Stock
                  </button>
                </div>

                {/* Add Stock Form */}
                {showAddForm && (
                  <div className="bg-surface-900 border border-surface-800 rounded-xl p-3 mb-4">
                    <p className="text-gray-300 text-sm font-medium mb-2">
                      Add Stock to Watchlist
                    </p>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={addSymbol}
                        onChange={e => setAddSymbol(
                          e.target.value.toUpperCase()
                        )}
                        placeholder="Symbol (e.g. RELIANCE)"
                        className="flex-1 bg-surface-950 text-gray-200 px-3 py-2 rounded-lg text-sm border border-surface-800 focus:border-emerald-500/50 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={addNotes}
                        onChange={e => setAddNotes(
                          e.target.value
                        )}
                        placeholder="Notes (optional)"
                        className="flex-1 bg-surface-950 text-gray-200 px-3 py-2 rounded-lg text-sm border border-surface-800 focus:border-emerald-500/50 focus:outline-none"
                      />
                      <button
                        onClick={addStock}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setAddSymbol("");
                          setAddNotes("");
                        }}
                        className="text-gray-500 hover:text-gray-300 px-3 py-2 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Stocks Table */}
                {stocksLoading ? (
                  <p className="text-gray-400 text-sm 
                                text-center py-8 
                                animate-pulse">
                    Loading stocks...
                  </p>
                ) : stocks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">
                      No stocks in this watchlist
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Click "+ Add Stock" to get started
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Table Header */}
                    <div className="hidden sm:grid grid-cols-6 gap-2 px-3 py-2 text-gray-600 text-xs font-semibold uppercase tracking-wide border-b border-surface-800 mb-1">
                      <span>STOCK</span>
                      <span className="text-center">7D TREND</span>
                      <span className="text-right">
                        PRICE
                      </span>
                      <span className="text-right">
                        CHG%
                      </span>
                      <span>NOTES</span>
                      <span></span>
                    </div>

                    {/* Stock Rows */}
                    <AnimatePresence>
                    {stocks.map((stock, i) => (
                      <motion.div
                        key={stock.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ 
                          duration: 0.2, 
                          delay: i * 0.05 
                        }}
                        className="flex flex-col sm:grid sm:grid-cols-6 gap-1 sm:gap-2 px-3 py-3 rounded-xl hover:bg-surface-800/50 cursor-pointer border-b border-surface-800/50 last:border-b-0 items-center transition-colors"
                        onClick={() => {
                          const s = stock.symbol.toUpperCase();
                          const isETF = s.includes('BEES') || s.includes('ETF') || s.includes('MON100');
                          navigate(isETF ? `/etf/${stock.symbol}` : `/stock/${stock.symbol}`);
                        }}
                      >
                        <div className="flex justify-between items-center w-full sm:contents">
                          <div>
                            <p className="text-gray-100 font-semibold text-sm">
                              {stock.name}
                            </p>
                            <p className="text-gray-500 text-xs mt-0.5 font-mono">
                              {stock.symbol}
                            </p>
                          </div>

                          <div className="hidden sm:flex items-center justify-center">
                            <Sparkline data={stock.sparkline} isPositive={stock.change_pct >= 0} />
                          </div>

                          <p className="hidden sm:block text-gray-200 text-sm text-right font-mono font-medium">
                            {stock.price 
                              ? `₹${stock.price.toLocaleString('en-IN')}`
                              : 'N/A'
                            }
                          </p>

                          <p className={`hidden sm:block ${
                            stock.change_pct > 0
                              ? 'text-emerald-400 text-sm text-right font-semibold font-mono'
                              : stock.change_pct < 0
                              ? 'text-red-400 text-sm text-right font-semibold font-mono'
                              : 'text-gray-500 text-sm text-right font-semibold font-mono'
                          }`}>
                            {stock.change_pct > 0 ? '+' : ''}
                            {stock.change_pct}%
                          </p>

                          <div className="sm:hidden text-right">
                            <p className="text-gray-200 text-sm font-mono font-medium">
                              {stock.price ? `₹${stock.price.toLocaleString('en-IN')}` : 'N/A'}
                            </p>
                            <p className={`text-sm font-semibold font-mono ${stock.change_pct > 0 ? 'text-emerald-400' : stock.change_pct < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                              {stock.change_pct > 0 ? '+' : ''}{stock.change_pct}%
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center w-full sm:contents mt-1 sm:mt-0">
                          <p className="text-gray-500 text-xs truncate max-w-[200px] sm:max-w-none">
                            {stock.notes || '-'}
                          </p>

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              removeStock(stock.id);
                            }}
                            className="text-gray-700 hover:text-red-400 text-sm text-right transition-colors"
                          >
                            x
                          </button>
                        </div>
                      </motion.div>
                    ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Watchlist;
