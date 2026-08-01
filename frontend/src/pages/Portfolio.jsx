import { useState, useEffect } from 'react';
import {
  PieChart as PieChartIcon, Plus, BrainCircuit, Trash2, AlertTriangle, X,
} from 'lucide-react';
import useStore from '../store/useStore';
import api from '../utils/api';
import {
  Badge, Button, Card, DeltaBadge, EmptyState, Field, Input,
  MetricTile, Modal, PageHeader,
  Table, THead, TBody, Th, Tr, Td,
} from '../components/ui';
import { cn } from '../lib/cn';
import { formatCurrency, formatPercent, direction, displaySymbol } from '../lib/format';

const Portfolio = () => {
  const { portfolioHoldings, setPortfolioHoldings } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');

  const [aiReview, setAiReview] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [performance, setPerformance] = useState(null);

  // Replaces three blocking `alert()` calls. A browser alert stops the page,
  // cannot be styled, and on a failed "Sell" gave no indication which holding
  // it referred to.
  const [error, setError] = useState('');
  const [pendingRemoval, setPendingRemoval] = useState(null);

  // Fetch holdings from backend
  useEffect(() => {
    const fetchHoldings = async () => {
      try {
        const res = await api.get('/portfolio')
        setPortfolioHoldings(res.data)
      } catch (e) {
        console.error('Failed to fetch holdings', e)
      }
    }
    fetchHoldings()
    // Stable zustand action; still a single fetch on mount.
  }, [setPortfolioHoldings])

  // Refresh holdings every 60s
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await api.get('/portfolio')
      setPortfolioHoldings(res.data)
    }, 60000)
    return () => clearInterval(interval)
  }, [setPortfolioHoldings])

  // Fetch performance metrics
  useEffect(() => {
    const fetchPerf = async () => {
      try {
        const res = await api.get('/portfolio/performance')
        setPerformance(res.data)
      } catch(e) {
        // Deliberately silent: performance metrics are supplementary, and the
        // holdings table below is unaffected if this endpoint is unavailable.
      }
    }
    fetchPerf()
  }, [portfolioHoldings])

  const handleRemove = async (id) => {
    setPendingRemoval(null);
    try {
      await api.delete(`/portfolio/remove/${id}`)
      setPortfolioHoldings(portfolioHoldings.filter(h => h.id !== id))
    } catch (e) {
      setError('Could not remove that holding. Please try again.')
    }
  }

  const handleAddHolding = async (e) => {
    e.preventDefault();
    if (!symbol || !quantity || !buyPrice) return;

    let cleanSymbol = symbol.toUpperCase();
    if (!cleanSymbol.includes('.NS')) cleanSymbol += '.NS';

    try {
      await api.post('/portfolio/add', {
        symbol: cleanSymbol,
        quantity: Number(quantity),
        avg_buy_price: Number(buyPrice)
      })
      const res = await api.get('/portfolio')
      setPortfolioHoldings(res.data)
    } catch (e) {
      setError(`Could not add ${cleanSymbol}. Check the symbol and try again.`)
      return
    }

    setSymbol('');
    setQuantity('');
    setBuyPrice('');
    setShowAddForm(false);
    setError('');
  };

  const handleAIReview = async () => {
    setIsAiLoading(true);
    try {
      // Create payload matching what backend expects
      const payload = portfolioHoldings.map(h => ({
        symbol: h.symbol,
        quantity: h.quantity,
        avg_price: h.avg_buy_price,
        current_price: h.current_price || h.avg_buy_price
      }));
      const res = await api.post('/ai/portfolio-review', payload);
      setAiReview(res.data.portfolio_review);
    } catch (e) {
      console.error(e);
      setError('AI review failed. Please try again in a moment.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const totalPnl = performance?.total_pnl ?? 0;
  const totalPnlPct = performance?.total_pnl_percent ?? 0;
  const pnlDirection = direction(totalPnl);

  const allocations = Object.entries(performance?.sector_allocation || {})
    .sort((a, b) => b[1] - a[1]);

  /** One holding, rendered as a row on desktop and a card on mobile. */
  const holdingFigures = (h) => {
    const cmp = h.current_price || h.avg_buy_price;
    const pnl = h.pnl || 0;
    const pnlPct = h.avg_buy_price > 0 ? ((cmp - h.avg_buy_price) / h.avg_buy_price) * 100 : 0;
    return { cmp, pnl, pnlPct };
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5">
      <PageHeader
        title="Portfolio"
        subtitle="Your holdings, live P&L and sector exposure."
        icon={PieChartIcon}
        actions={
          <>
            <Button
              variant="secondary"
              icon={BrainCircuit}
              onClick={handleAIReview}
              loading={isAiLoading}
              disabled={isAiLoading || portfolioHoldings.length === 0}
            >
              AI review
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => setShowAddForm(v => !v)}>
              Add holding
            </Button>
          </>
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
          <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Dismiss error" onClick={() => setError('')} />
        </div>
      )}

      {showAddForm && (
        <Card title="Add a holding">
          <form onSubmit={handleAddHolding} className="flex flex-col sm:flex-row sm:items-end gap-3">
            <Field label="Symbol" required className="flex-1 min-w-[150px]">
              {(p) => (
                <Input
                  value={symbol}
                  onChange={e => setSymbol(e.target.value)}
                  placeholder="e.g. INFY"
                  required
                  {...p}
                />
              )}
            </Field>
            <Field label="Quantity" required className="flex-1 min-w-[110px]">
              {(p) => (
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="0"
                  required
                  {...p}
                />
              )}
            </Field>
            <Field label="Average buy price" required className="flex-1 min-w-[130px]">
              {(p) => (
                <Input
                  type="number"
                  step="0.05"
                  min="0"
                  value={buyPrice}
                  onChange={e => setBuyPrice(e.target.value)}
                  placeholder="0.00"
                  required
                  {...p}
                />
              )}
            </Field>
            <div className="flex gap-2">
              <Button type="submit" variant="primary">Save</Button>
              <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {/* ── Summary ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricTile
          label="Current value"
          value={formatCurrency(performance?.current_value ?? 0, { decimals: 0 })}
          size="lg"
        />
        <MetricTile
          label="Total invested"
          value={formatCurrency(performance?.total_invested ?? 0, { decimals: 0 })}
          size="lg"
          tone="muted"
        />
        <MetricTile
          label="Overall P&L"
          value={formatCurrency(totalPnl, { decimals: 0 })}
          tone={pnlDirection === 'up' ? 'up' : pnlDirection === 'down' ? 'down' : 'default'}
          size="lg"
        >
          <div className="mt-2">
            <DeltaBadge value={totalPnlPct} />
          </div>
        </MetricTile>
      </div>

      {/* ── AI review ───────────────────────────────────────────────────── */}
      {aiReview && (
        <Card
          title={
            <span className="flex items-center gap-2">
              <BrainCircuit size={12} className="text-brand-400" aria-hidden="true" />
              Portfolio assessment
            </span>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="flex flex-col items-center justify-center text-center
                            rounded-xl border border-surface-800 bg-surface-950 p-5">
              <div className="text-4xl font-semibold text-gray-100 tnum">{aiReview.health_score}</div>
              <div className="text-2xs uppercase tracking-wider text-gray-500 mt-1">Health score</div>
              <Badge
                variant={aiReview.concentration_risk === 'High' ? 'down' : 'up'}
                size="md"
                className="mt-3"
              >
                {aiReview.concentration_risk} risk
              </Badge>
            </div>

            <div className="md:col-span-3 space-y-4">
              <p className="text-sm text-gray-300 leading-relaxed">{aiReview.summary}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-2xs font-semibold uppercase tracking-wider text-up mb-2">Strengths</h3>
                  <ul className="space-y-1.5">
                    {aiReview.strengths?.map((s, i) => (
                      <li key={i} className="text-xs text-gray-400 leading-relaxed pl-3 relative">
                        <span className="absolute left-0 top-1.5 w-1 h-1 rounded-full bg-up" aria-hidden="true" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-2xs font-semibold uppercase tracking-wider text-down mb-2">Weaknesses</h3>
                  <ul className="space-y-1.5">
                    {aiReview.weaknesses?.map((w, i) => (
                      <li key={i} className="text-xs text-gray-400 leading-relaxed pl-3 relative">
                        <span className="absolute left-0 top-1.5 w-1 h-1 rounded-full bg-down" aria-hidden="true" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-xl border border-brand-500/25 bg-brand-500/[0.07] p-4">
                <h3 className="text-2xs font-semibold uppercase tracking-wider text-brand-400 mb-2">
                  Rebalancing suggestions
                </h3>
                <ol className="space-y-1.5 list-decimal list-inside">
                  {aiReview.rebalancing_suggestions?.map((r, i) => (
                    <li key={i} className="text-xs text-gray-300 leading-relaxed">{r}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Holdings + allocation ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <Card title="Current holdings" padding="none" className="lg:col-span-2" bodyClassName="px-1 pb-1">
          {portfolioHoldings.length === 0 ? (
            <EmptyState
              icon={PieChartIcon}
              title="No holdings yet"
              description="Add your first position to start tracking live P&L and sector exposure."
              action={<Button size="sm" variant="primary" icon={Plus} onClick={() => setShowAddForm(true)}>Add holding</Button>}
            />
          ) : (
            <>
              {/* Desktop: a real table. Columns here are fixed, unlike the
                  screener's runtime-derived ones, so a card layout can
                  faithfully represent every column on a narrow screen. */}
              <div className="hidden sm:block">
                <Table>
                  <THead sticky={false}>
                    <Tr>
                      <Th>Symbol</Th>
                      <Th align="right">Qty</Th>
                      <Th align="right">Avg price</Th>
                      <Th align="right">CMP</Th>
                      <Th align="right">P&L</Th>
                      <Th align="right">Action</Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {portfolioHoldings.map(h => {
                      const { cmp, pnl, pnlPct } = holdingFigures(h);
                      return (
                        <Tr key={h.id}>
                          <Td>
                            <div className="font-medium text-gray-100">{displaySymbol(h.symbol)}</div>
                            {h.sector && <div className="text-2xs text-gray-500 mt-0.5">{h.sector}</div>}
                          </Td>
                          <Td numeric>{h.quantity}</Td>
                          <Td numeric>{formatCurrency(h.avg_buy_price || 0)}</Td>
                          <Td numeric>{formatCurrency(cmp)}</Td>
                          <Td numeric className={pnl >= 0 ? 'text-up' : 'text-down'}>
                            <div>{formatCurrency(pnl)}</div>
                            <div className="text-2xs opacity-80">{formatPercent(pnlPct)}</div>
                          </Td>
                          <Td align="right">
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                iconOnly
                                icon={Trash2}
                                aria-label={`Remove ${displaySymbol(h.symbol)} from portfolio`}
                                onClick={() => setPendingRemoval(h)}
                                className="hover:text-down"
                              />
                            </div>
                          </Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table>
              </div>

              {/* Mobile: one card per holding. The old table simply overflowed. */}
              <ul className="sm:hidden divide-y divide-surface-800 px-3">
                {portfolioHoldings.map(h => {
                  const { cmp, pnl, pnlPct } = holdingFigures(h);
                  return (
                    <li key={h.id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-gray-100">{displaySymbol(h.symbol)}</div>
                          {h.sector && <div className="text-2xs text-gray-500 mt-0.5">{h.sector}</div>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <DeltaBadge value={pnlPct} />
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            icon={Trash2}
                            aria-label={`Remove ${displaySymbol(h.symbol)} from portfolio`}
                            onClick={() => setPendingRemoval(h)}
                            className="hover:text-down"
                          />
                        </div>
                      </div>
                      <dl className="grid grid-cols-3 gap-2 mt-3">
                        {[
                          ['Qty', h.quantity],
                          ['Avg', formatCurrency(h.avg_buy_price || 0)],
                          ['CMP', formatCurrency(cmp)],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <dt className="text-2xs uppercase tracking-wider text-gray-500">{label}</dt>
                            <dd className="text-xs text-gray-200 font-mono tnum mt-0.5">{value}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className={cn('text-sm font-medium font-mono tnum mt-2', pnl >= 0 ? 'text-up' : 'text-down')}>
                        {formatCurrency(pnl)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>

        <Card title="Sector allocation">
          {allocations.length === 0 ? (
            <EmptyState size="sm" title="No allocation yet" description="Add holdings to see sector exposure." />
          ) : (
            <ul className="space-y-3.5">
              {allocations.map(([sector, val], idx) => {
                const pct = (val / (performance?.current_value || 1)) * 100;
                // Was five unrelated colours (emerald, green, blue, purple, pink)
                // that implied categories which do not exist. One brand tint,
                // stepped down by rank, reads as "share of one portfolio".
                const opacity = Math.max(0.25, 1 - idx * 0.16);
                return (
                  <li key={sector}>
                    <div className="flex justify-between items-baseline gap-2 text-xs mb-1.5">
                      <span className="text-gray-300 truncate">{sector}</span>
                      <span className="text-gray-400 font-mono tnum shrink-0">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-400"
                        style={{ width: `${pct}%`, opacity }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* ── Remove confirmation ─────────────────────────────────────────── */}
      <Modal
        open={Boolean(pendingRemoval)}
        onClose={() => setPendingRemoval(null)}
        title="Remove holding"
        description={
          pendingRemoval
            ? `${displaySymbol(pendingRemoval.symbol)} will be removed from your portfolio. This cannot be undone.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingRemoval(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => handleRemove(pendingRemoval.id)}>Remove</Button>
          </>
        }
      >
        <p className="text-sm text-gray-400">
          Removing a holding only affects tracking in StockSense — it does not place a trade.
        </p>
      </Modal>
    </div>
  );
};

export default Portfolio;
