import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import { Eye, Plus, Trash2, X, AlertTriangle } from "lucide-react";
import api from "../utils/api";
import { WatchlistSkeleton } from '../components/Skeleton';
import Sparkline from '../components/Sparkline';
import {
  Button, Card, DeltaBadge, EmptyState, Field, Input,
  Modal, PageHeader,
  Table, THead, TBody, Th, Tr, Td,
} from '../components/ui';
import { cn } from '../lib/cn';
import { formatCurrency } from '../lib/format';

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
  // Replaces window.confirm(), which cannot be styled, cannot be dismissed with
  // anything but its own buttons, and named neither the list nor its contents.
  const [pendingDelete, setPendingDelete] = useState(null);

  const fetchWatchlists = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/watchlists/");
      setWatchlists(res.data);
      // Was `if (... && !activeWatchlist) setActiveWatchlist(res.data[0])`.
      // Reading activeWatchlist here meant memoising on it, which would have
      // refetched every watchlist each time you switched list. The updater form
      // asks React for the current value instead, so this depends on nothing
      // and the "only select a default if none is chosen" rule is unchanged.
      if (res.data.length > 0) {
        setActiveWatchlist((prev) => prev ?? res.data[0]);
      }
    } catch (e) {
      setError("Failed to load watchlists");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWatchlistStocks = useCallback(async (id) => {
    try {
      setStocksLoading(true);
      const res = await api.get(`/watchlists/${id}/stocks`);
      setStocks(res.data.stocks || []);
    } catch (e) {
      setStocks([]);
    } finally {
      setStocksLoading(false);
    }
  }, []);

  // Fetch all watchlists on load
  useEffect(() => {
    fetchWatchlists();
  }, [fetchWatchlists]);

  // Fetch stocks when active watchlist changes
  useEffect(() => {
    if (activeWatchlist) {
      fetchWatchlistStocks(activeWatchlist.id);
    }
  }, [activeWatchlist, fetchWatchlistStocks]);

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
    setPendingDelete(null);
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

  const openStock = (stock) => {
    const s = stock.symbol.toUpperCase();
    const isETF = s.includes('BEES') || s.includes('ETF') || s.includes('MON100');
    navigate(isETF ? `/etf/${stock.symbol}` : `/stock/${stock.symbol}`);
  };

  if (loading) return <WatchlistSkeleton />;

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5">
      <PageHeader
        title="Watchlists"
        subtitle="Track the stocks you're watching."
        icon={Eye}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setShowCreateForm(true)}>
            New watchlist
          </Button>
        }
      />

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-down/30 bg-down/10 px-4 py-3"
        >
          <span className="flex items-start gap-2 text-sm text-down">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </span>
          <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Dismiss error" onClick={() => setError("")} />
        </div>
      )}

      {showCreateForm && (
        <Card title="New watchlist">
          <form
            onSubmit={(e) => { e.preventDefault(); createWatchlist(); }}
            className="flex flex-col sm:flex-row sm:items-end gap-3"
          >
            <Field label="Name" required className="flex-1">
              {(p) => (
                <Input
                  autoFocus
                  value={newWatchlistName}
                  onChange={e => setNewWatchlistName(e.target.value)}
                  placeholder="e.g. Swing trades"
                  {...p}
                />
              )}
            </Field>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={!newWatchlistName.trim()}>Create</Button>
              <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">
        {/* ── Watchlist rail ────────────────────────────────────────────── */}
        <Card padding="none" bodyClassName="p-2" className="lg:col-span-1">
          {watchlists.length === 0 ? (
            <EmptyState
              size="sm"
              title="No watchlists"
              description="Create one to start tracking."
            />
          ) : (
            <ul className="flex lg:flex-col gap-1 overflow-x-auto">
              {watchlists.map(wl => {
                const isActive = activeWatchlist?.id === wl.id;
                return (
                  <li key={wl.id} className="shrink-0 lg:shrink">
                    <div
                      className={cn(
                        'group flex items-center justify-between gap-2 rounded-lg pl-3 pr-1.5 py-2',
                        'transition-colors duration-fast min-w-[140px] lg:min-w-0',
                        isActive ? 'bg-brand-500/12' : 'hover:bg-surface-800',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveWatchlist(wl)}
                        aria-current={isActive ? 'true' : undefined}
                        className="flex-1 min-w-0 text-left"
                      >
                        <span className={cn(
                          'block text-sm font-medium truncate',
                          isActive ? 'text-brand-400' : 'text-gray-300',
                        )}>
                          {wl.name}
                        </span>
                        <span className="block text-2xs text-gray-500 mt-0.5">
                          {wl.stock_count} {wl.stock_count === 1 ? 'stock' : 'stocks'}
                        </span>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon={Trash2}
                        aria-label={`Delete watchlist ${wl.name}`}
                        onClick={() => setPendingDelete(wl)}
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-down shrink-0"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* ── Stocks panel ──────────────────────────────────────────────── */}
        <div className="lg:col-span-3">
          {!activeWatchlist ? (
            <Card>
              <EmptyState
                icon={Eye}
                title="No watchlist selected"
                description="Pick a watchlist on the left, or create a new one."
              />
            </Card>
          ) : (
            <Card
              title={activeWatchlist.name}
              actions={
                <Button variant="outline" size="sm" icon={Plus} onClick={() => setShowAddForm(true)}>
                  Add stock
                </Button>
              }
              padding="none"
              bodyClassName="px-1 pb-1"
            >
              {showAddForm && (
                <div className="px-3 pb-3">
                  <form
                    onSubmit={(e) => { e.preventDefault(); addStock(); }}
                    className="flex flex-col sm:flex-row sm:items-end gap-3 rounded-xl border border-surface-800 bg-surface-950 p-3"
                  >
                    <Field label="Symbol" required className="flex-1">
                      {(p) => (
                        <Input
                          autoFocus
                          value={addSymbol}
                          onChange={e => setAddSymbol(e.target.value.toUpperCase())}
                          placeholder="e.g. RELIANCE"
                          {...p}
                        />
                      )}
                    </Field>
                    <Field label="Notes" className="flex-1">
                      {(p) => (
                        <Input
                          value={addNotes}
                          onChange={e => setAddNotes(e.target.value)}
                          placeholder="Why you're watching it"
                          {...p}
                        />
                      )}
                    </Field>
                    <div className="flex gap-2">
                      <Button type="submit" variant="primary" disabled={!addSymbol.trim()}>Add</Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => { setShowAddForm(false); setAddSymbol(""); setAddNotes(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {stocksLoading ? (
                <div className="px-3 pb-3 space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="skeleton h-12 rounded-lg" aria-hidden="true" />
                  ))}
                </div>
              ) : stocks.length === 0 ? (
                <EmptyState
                  icon={Eye}
                  title="Nothing here yet"
                  description="Add a stock to start tracking it in this watchlist."
                  action={<Button size="sm" variant="primary" icon={Plus} onClick={() => setShowAddForm(true)}>Add stock</Button>}
                />
              ) : (
                <Table>
                  <THead sticky={false}>
                    <Tr>
                      <Th>Stock</Th>
                      <Th align="center">7-day trend</Th>
                      <Th align="right">Price</Th>
                      <Th align="right">Chg%</Th>
                      <Th>Notes</Th>
                      <Th align="right">Action</Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {stocks.map(stock => (
                      <Tr key={stock.id} interactive onClick={() => openStock(stock)}>
                        <Td>
                          <div className="font-medium text-gray-100">{stock.name}</div>
                          <div className="text-2xs text-gray-500 font-mono mt-0.5">{stock.symbol}</div>
                        </Td>
                        <Td align="center">
                          <div className="flex justify-center">
                            <Sparkline
                              data={stock.sparkline}
                              isPositive={stock.change_pct >= 0}
                              width={64}
                              height={22}
                            />
                          </div>
                        </Td>
                        <Td numeric>{stock.price ? formatCurrency(stock.price) : 'N/A'}</Td>
                        <Td align="right">
                          <div className="flex justify-end">
                            <DeltaBadge value={stock.change_pct} />
                          </div>
                        </Td>
                        <Td muted className="max-w-[200px] truncate whitespace-normal">
                          {stock.notes || <span className="text-gray-500">—</span>}
                        </Td>
                        <Td align="right">
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              iconOnly
                              icon={Trash2}
                              aria-label={`Remove ${stock.name} from ${activeWatchlist.name}`}
                              onClick={(e) => { e.stopPropagation(); removeStock(stock.id); }}
                              className="hover:text-down"
                            />
                          </div>
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* ── Delete confirmation ─────────────────────────────────────────── */}
      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete watchlist"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" and its ${pendingDelete.stock_count} tracked ${pendingDelete.stock_count === 1 ? 'stock' : 'stocks'} will be removed.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteWatchlist(pendingDelete.id)}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-gray-400">
          This only removes the watchlist. It does not affect your portfolio or any alerts.
        </p>
      </Modal>
    </div>
  );
};

export default Watchlist;
