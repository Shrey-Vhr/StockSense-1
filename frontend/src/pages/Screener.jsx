import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  SlidersHorizontal, Play, Plus, X, Save, FolderOpen, Trash2,
  Info, ArrowUpDown, Search, Zap, Activity,
} from 'lucide-react';
import api from '../utils/api';
import useStore from '../store/useStore';
import { ScreenerSkeleton } from '../components/Skeleton';
import {
  Badge, Button, Card, DeltaBadge, Dropdown, DropdownItem, EmptyState,
  Field, Input, Modal, PageHeader, Select, Spinner, Tooltip,
  Table, THead, TBody, Th, Tr, Td,
} from '../components/ui';
import { formatCurrency, formatNumber, displaySymbol } from '../lib/format';
import { listItem } from '../lib/motion';

// ─── Preset Templates ───────────────────────────────────────────────────────
const PRESETS = [
  {
    name: 'Empty (Start Fresh)',
    description: 'Clear all conditions',
    conditions: [],
    sort_by: 'score',
    sort_order: 'desc',
  },
  {
    name: 'My Swing Trade Setup',
    description: 'EMA alignment + RSI 50–70 + Volume confirmation',
    conditions: [
      { indicator: 'rsi', operator: 'between', value: 50, value2: 70 },
      { indicator: 'price_vs_ema200', operator: 'greater_than', value: 0 },
      { indicator: 'ema20_vs_ema50', operator: 'greater_than', value: 0 },
      { indicator: 'volume_ratio', operator: 'greater_than', value: 1.5 },
      { indicator: 'adx', operator: 'greater_than', value: 20 },
    ],
    sort_by: 'rsi',
    sort_order: 'desc',
  },
  {
    name: 'Oversold Bounce',
    description: 'RSI < 35 + Price above 200 EMA',
    conditions: [
      { indicator: 'rsi', operator: 'less_than', value: 35 },
      { indicator: 'price_vs_ema200', operator: 'greater_than', value: 0 },
    ],
    sort_by: 'rsi',
    sort_order: 'asc',
  },
  {
    name: 'Momentum Breakout',
    description: 'RSI > 60 + High volume + Strong trend',
    conditions: [
      { indicator: 'rsi', operator: 'greater_than', value: 60 },
      { indicator: 'volume_ratio', operator: 'greater_than', value: 2 },
      { indicator: 'adx', operator: 'greater_than', value: 25 },
    ],
    sort_by: 'volume_ratio',
    sort_order: 'desc',
  },
  {
    name: 'Value Pick',
    description: 'Low PE + High ROE + Low Debt',
    conditions: [
      { indicator: 'pe_ratio', operator: 'less_than', value: 20 },
      { indicator: 'roe', operator: 'greater_than', value: 15 },
      { indicator: 'debt_to_equity', operator: 'less_than', value: 0.5 },
    ],
    sort_by: 'roe',
    sort_order: 'desc',
  },
  {
    name: 'Fresh Uptrend',
    description: 'Price crosses above EMA50 + ADX > 20',
    conditions: [
      { indicator: 'price_vs_ema50', operator: 'crosses_above', value: 0 },
      { indicator: 'adx', operator: 'greater_than', value: 20 },
    ],
    sort_by: 'adx',
    sort_order: 'desc',
  },
];

// ─── Operator Labels ─────────────────────────────────────────────────────────
const OPERATORS = [
  { value: 'greater_than', label: 'Greater Than', symbol: '>' },
  { value: 'less_than', label: 'Less Than', symbol: '<' },
  { value: 'equal_to', label: 'Equal To', symbol: '=' },
  { value: 'between', label: 'Between', symbol: '↔' },
  { value: 'crosses_above', label: 'Crosses Above', symbol: '↗' },
  { value: 'crosses_below', label: 'Crosses Below', symbol: '↘' },
];

/** Column headers are narrow, so long indicator labels get a short form. */
const SHORT_LABELS = {
  'PRICE - EMA 20': 'EMA20',
  'PRICE - EMA 50': 'EMA50',
  'CHG% VOLUME RATIO': 'VOL RATIO',
  'DEBT / EQUITY': 'D/E',
  'REVENUE GROWTH %': 'REV GRW%',
  'ADX (14)': 'ADX',
  'RSI (14)': 'RSI',
};

const shortLabel = (label) => SHORT_LABELS[label] || label;

/** Indicator values vary hugely in scale; large ones are grouped, small ones fixed. */
const formatIndicator = (val) => {
  if (val == null) return '—';
  if (typeof val !== 'number') return val;
  return Math.abs(val) >= 10000 ? formatNumber(val, { decimals: 0 }) : formatNumber(val);
};

// ─── Main Component ──────────────────────────────────────────────────────────
const Screener = () => {
  const navigate = useNavigate();
  const {
    screenerResults, screenerSummary, setScreenerData,
    savedScreeners, setSavedScreeners,
    isLoading, setLoading
  } = useStore();

  // Indicator catalogue from API
  const [catalogue, setCatalogue] = useState(null);
  const [flatIndicators, setFlatIndicators] = useState({});

  // Conditions builder state
  const [conditions, setConditions] = useState([]);
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [limit, setLimit] = useState(20);

  // Save modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');

  // Run status
  const [hasRunOnce, setHasRunOnce] = useState(false);
  const [progress, setProgress] = useState(null);

  // Aborts the in-flight scan stream. Held in a ref so unmounting can cancel a
  // run that would otherwise keep reading after the page is gone.
  const streamRef = useRef(null);

  useEffect(() => () => streamRef.current?.abort(), []);

  // ─── Fetch saved screeners ───────────────────────────────────────────────
  // Hoisted above the mount effect that calls it. It was declared below, so the
  // effect closed over a binding that did not exist yet.
  const fetchSavedScreeners = useCallback(async () => {
    try {
      const res = await api.get('/screener/saved');
      setSavedScreeners(res.data);
    } catch (err) {
      console.error('Failed to fetch saved screeners:', err);
    }
  }, [setSavedScreeners]);

  // ─── Fetch indicator catalogue on mount ──────────────────────────────────
  useEffect(() => {
    const fetchCatalogue = async () => {
      try {
        const res = await api.get('/screener/indicators');
        setCatalogue(res.data);
        // Build flat lookup: indicator_key -> { label, description, category }
        const flat = {};
        for (const [, catData] of Object.entries(res.data)) {
          for (const [key, info] of Object.entries(catData.indicators)) {
            flat[key] = { ...info, category: catData.category };
          }
        }
        setFlatIndicators(flat);
      } catch (err) {
        console.error('Failed to fetch indicator catalogue:', err);
      }
    };
    fetchCatalogue();
    fetchSavedScreeners();
  }, [fetchSavedScreeners]);

  // ─── Run screener ────────────────────────────────────────────────────────
  const runScreener = useCallback(() => {
    if (conditions.length === 0) return;
    setLoading('screener', true);
    setHasRunOnce(true);
    setScreenerData({ results: [], summary: null });
    setProgress({ processed: 0, total: 100 });

    const query = encodeURIComponent(JSON.stringify(conditions));

    // Read over fetch rather than EventSource. EventSource cannot set headers,
    // so the only way to authenticate it is a token in the query string —
    // which lands in server logs and browser history. fetch carries the same
    // Bearer header as every other request, and the scan endpoint is now
    // behind auth like the rest of the API.
    const controller = new AbortController();
    streamRef.current = controller;

    const stop = () => {
      controller.abort();
      setLoading('screener', false);
      setProgress(null);
    };

    // Unchanged from the EventSource version — only the transport moved.
    const handle = (data) => {
      if (data.error) {
        console.error(data.error);
        stop();
      } else if (data.progress !== undefined) {
        setProgress({ processed: data.progress, total: data.total });
      } else if (data.summary) {
        const current = useStore.getState();
        setScreenerData({ results: current.screenerResults, summary: data });
        stop();
      } else {
        const current = useStore.getState();
        const newResults = [...current.screenerResults, data];
        newResults.sort((a, b) => {
          const valA = a[sortBy] ?? (sortBy === 'score' ? 0 : 0);
          const valB = b[sortBy] ?? (sortBy === 'score' ? 0 : 0);
          return sortOrder === 'desc' ? valB - valA : valA - valB;
        });
        newResults.forEach((r, i) => r.rank = i + 1);
        setScreenerData({
          results: newResults.slice(0, limit),
          summary: current.screenerSummary
        });
      }
    };

    (async () => {
      try {
        const res = await fetch(
          // api.defaults.baseURL, not import.meta.env.VITE_API_URL directly:
          // the axios client falls back to localhost when no frontend/.env
          // exists, which is the case on a fresh clone.
          `${api.defaults.baseURL}/screener/stream?conditions=${query}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            signal: controller.signal,
          }
        );
        if (!res.ok) throw new Error(`Screener stream failed: ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by a blank line. A chunk can split one in
          // half, so anything after the last separator stays in the buffer.
          let split;
          while ((split = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, split);
            buffer = buffer.slice(split + 2);
            for (const line of frame.split('\n')) {
              if (!line.startsWith('data:')) continue;
              try {
                handle(JSON.parse(line.slice(5).trim()));
              } catch (e) {
                console.error('Bad SSE frame', e);
              }
            }
          }
        }
        setLoading('screener', false);
        setProgress(null);
      } catch (e) {
        // abort() is how a finished or cancelled scan unwinds, not a failure.
        if (e.name !== 'AbortError') {
          console.error('Screener stream error', e);
          setLoading('screener', false);
          setProgress(null);
        }
      }
    })();
  }, [conditions, sortBy, sortOrder, limit, setScreenerData, setLoading]);

  // ─── Save screener ──────────────────────────────────────────────────────
  const saveScreener = async () => {
    if (!saveName.trim()) return;
    try {
      await api.post('/screener/save', {
        name: saveName.trim(),
        description: saveDesc.trim(),
        conditions,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setShowSaveModal(false);
      setSaveName('');
      setSaveDesc('');
      fetchSavedScreeners();
    } catch (err) {
      console.error('Failed to save screener:', err);
    }
  };

  // ─── Load preset / saved screener ────────────────────────────────────────
  const loadScreener = (config) => {
    setConditions(config.conditions || []);
    setSortBy(config.sort_by || 'score');
    setSortOrder(config.sort_order || 'desc');
  };

  // ─── Delete saved screener ───────────────────────────────────────────────
  const deleteSavedScreener = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/screener/saved/${id}`);
      fetchSavedScreeners();
    } catch (err) {
      console.error('Failed to delete screener:', err);
    }
  };

  // ─── Condition CRUD ──────────────────────────────────────────────────────
  const addCondition = () => {
    setConditions(prev => [
      ...prev,
      { indicator: 'rsi', operator: 'greater_than', value: 50, value2: null },
    ]);
  };

  const updateCondition = (index, field, val) => {
    setConditions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      // Reset value2 if operator changes away from "between"
      if (field === 'operator' && val !== 'between') {
        updated[index].value2 = null;
      }
      return updated;
    });
  };

  const removeCondition = (index) => {
    setConditions(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Derive used indicator keys from conditions ──────────────────────────
  const usedIndicators = [...new Set(conditions.map(c => c.indicator))];

  // ─── Grouped indicator options for dropdowns ─────────────────────────────
  const groupedOptions = catalogue
    ? Object.entries(catalogue).map(([, catData]) => ({
        category: catData.category,
        indicators: Object.entries(catData.indicators).map(([key, info]) => ({
          key,
          ...info,
        })),
      }))
    : [];

  // ─── Render ──────────────────────────────────────────────────────────────
  if (isLoading.screener && !hasRunOnce && !progress) {
    return <ScreenerSkeleton />;
  }

  const pct = progress ? (progress.processed / Math.max(progress.total, 1)) * 100 : 0;

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5">
      <PageHeader
        title="Stock Screener"
        subtitle="Define your own conditions across 40 technical and fundamental indicators."
        icon={SlidersHorizontal}
        actions={
          <>
            <Dropdown
              width="w-80"
              trigger={(p) => (
                <Button variant="secondary" size="md" icon={Zap} {...p}>Presets</Button>
              )}
            >
              {({ close }) => PRESETS.map((preset, i) => (
                <DropdownItem
                  key={i}
                  title={preset.name}
                  description={preset.description}
                  onClick={() => { loadScreener(preset); close(); }}
                />
              ))}
            </Dropdown>

            <Dropdown
              width="w-80"
              trigger={(p) => (
                <Button variant="secondary" size="md" icon={FolderOpen} {...p}>
                  Load
                  {savedScreeners.length > 0 && (
                    <Badge variant="brand" className="ml-0.5">{savedScreeners.length}</Badge>
                  )}
                </Button>
              )}
            >
              {({ close }) => (
                savedScreeners.length === 0 ? (
                  <EmptyState
                    size="sm"
                    title="No saved screeners"
                    description="Build a set of conditions and save it to reuse later."
                  />
                ) : savedScreeners.map((s) => (
                  <DropdownItem
                    key={s.id}
                    title={s.name}
                    description={`${s.conditions.length} condition${s.conditions.length !== 1 ? 's' : ''}${s.description ? ` · ${s.description}` : ''}`}
                    onClick={() => { loadScreener(s); close(); }}
                    actions={
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon={Trash2}
                        aria-label={`Delete ${s.name}`}
                        onClick={(e) => deleteSavedScreener(s.id, e)}
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-down"
                      />
                    }
                  />
                ))
              )}
            </Dropdown>

            <Button
              variant="secondary"
              size="md"
              icon={Save}
              onClick={() => setShowSaveModal(true)}
              disabled={conditions.length === 0}
            >
              Save
            </Button>
          </>
        }
      />

      {/* ── Conditions ──────────────────────────────────────────────────── */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <Activity size={12} className="text-brand-400" aria-hidden="true" />
            Conditions
            <Badge variant="neutral">
              {conditions.length} {conditions.length === 1 ? 'filter' : 'filters'} · AND
            </Badge>
          </span>
        }
        actions={<Button variant="outline" size="sm" icon={Plus} onClick={addCondition}>Add condition</Button>}
        padding="none"
        bodyClassName="pt-2"
      >
        {conditions.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No conditions defined"
            description="Add a condition to screen stocks, or start from a preset."
            action={<Button size="sm" variant="primary" icon={Plus} onClick={addCondition}>Add condition</Button>}
          />
        ) : (
          <ul className="divide-y divide-surface-800">
            <AnimatePresence initial={false}>
              {conditions.map((cond, idx) => {
                const indInfo = flatIndicators[cond.indicator];
                return (
                  // Was a plain <div> carrying initial/animate/exit props, which
                  // React forwarded to the DOM as unknown attributes — the
                  // animation never ran and every row logged a warning.
                  <motion.li
                    key={idx}
                    variants={listItem}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, height: 0, transition: { duration: 0.12 } }}
                    className="flex flex-col md:flex-row md:items-center gap-3 px-4 py-3 overflow-hidden"
                  >
                    <span className="text-2xs text-gray-500 font-mono w-5 shrink-0 pt-2 md:pt-0">
                      {idx + 1}
                    </span>

                    <div className="flex-1 min-w-[180px]">
                      <Select
                        size="sm"
                        aria-label={`Condition ${idx + 1} indicator`}
                        value={cond.indicator}
                        onChange={(e) => updateCondition(idx, 'indicator', e.target.value)}
                      >
                        {groupedOptions.map((group) => (
                          <optgroup key={group.category} label={group.category}>
                            {group.indicators.map((ind) => (
                              <option key={ind.key} value={ind.key}>{ind.label}</option>
                            ))}
                          </optgroup>
                        ))}
                      </Select>
                    </div>

                    {indInfo && (
                      <Tooltip text={indInfo.description}>
                        <Info size={14} className="text-gray-500 hover:text-brand-400 transition-colors duration-fast" />
                      </Tooltip>
                    )}

                    <div className="min-w-[150px]">
                      <Select
                        size="sm"
                        aria-label={`Condition ${idx + 1} operator`}
                        value={cond.operator}
                        onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                      >
                        {OPERATORS.map((op) => (
                          <option key={op.value} value={op.value}>{op.symbol} {op.label}</option>
                        ))}
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        size="sm"
                        type="number"
                        aria-label={`Condition ${idx + 1} value`}
                        value={cond.value ?? ''}
                        onChange={(e) => updateCondition(idx, 'value', e.target.value === '' ? null : parseFloat(e.target.value))}
                        placeholder="Value"
                        className="w-24 font-mono"
                      />
                      {cond.operator === 'between' && (
                        <>
                          <span className="text-xs text-gray-500">to</span>
                          <Input
                            size="sm"
                            type="number"
                            aria-label={`Condition ${idx + 1} upper value`}
                            value={cond.value2 ?? ''}
                            onChange={(e) => updateCondition(idx, 'value2', e.target.value === '' ? null : parseFloat(e.target.value))}
                            placeholder="Value 2"
                            className="w-24 font-mono"
                          />
                        </>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      icon={X}
                      aria-label={`Remove condition ${idx + 1}`}
                      onClick={() => removeCondition(idx)}
                      className="hover:text-down md:ml-auto"
                    />
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </Card>

      {/* ── Controls ────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-surface-950/85 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="screener-sort" className="text-xs text-gray-500 whitespace-nowrap">Sort by</label>
            <Select
              id="screener-sort"
              size="sm"
              className="w-44"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="score">Score</option>
              {Object.entries(flatIndicators).map(([key, info]) => (
                <option key={key} value={key}>{info.label}</option>
              ))}
            </Select>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={ArrowUpDown}
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          >
            {sortOrder === 'desc' ? 'Descending' : 'Ascending'}
          </Button>

          <div className="flex items-center gap-2">
            <label htmlFor="screener-limit" className="text-xs text-gray-500 whitespace-nowrap">Limit</label>
            <Input
              id="screener-limit"
              size="sm"
              type="number"
              className="w-20"
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(100, parseInt(e.target.value) || 20)))}
            />
          </div>

          <div className="flex-1" />

          <Button
            variant="primary"
            size="md"
            icon={Play}
            onClick={runScreener}
            loading={isLoading.screener}
            disabled={isLoading.screener || conditions.length === 0}
            className="w-full sm:w-auto"
          >
            {isLoading.screener ? 'Scanning…' : 'Run screener'}
          </Button>
        </div>

        {/* Determinate progress. Previously a bare bar with no numbers — you
            could not tell 5% from 95% at a glance. */}
        {progress && (
          <div className="mt-2.5">
            <div
              role="progressbar"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Screening progress"
              className="h-1 w-full rounded-full bg-surface-800 overflow-hidden"
            >
              <motion.div
                className="h-full rounded-full bg-brand-500"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 text-2xs text-gray-500 tnum">
              <span>Scanning {formatNumber(progress.processed, { decimals: 0 })} of {formatNumber(progress.total, { decimals: 0 })}</span>
              <span>{Math.round(pct)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Summary ─────────────────────────────────────────────────────── */}
      {screenerSummary && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500">
          <span><span className="text-gray-200 font-medium tnum">{screenerSummary.total_screened}</span> screened</span>
          <span><span className="text-brand-400 font-medium tnum">{screenerSummary.total_passed}</span> passed</span>
          <span>in <span className="text-gray-200 font-medium tnum">{screenerSummary.elapsed_seconds}s</span></span>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────────────── */}
      <Card padding="none">
        {screenerResults.length > 0 ? (
          // One table definition rather than a duplicated mobile card tree and
          // desktop flex tree. Narrow viewports scroll horizontally, which is
          // how every trading terminal handles a table with dynamic columns.
          <Table>
            <THead>
              <Tr>
                <Th className="w-10">#</Th>
                <Th>Stock</Th>
                <Th align="right">Price</Th>
                <Th align="right">Chg%</Th>
                {usedIndicators.map((ind) => (
                  <Th key={ind} align="right" hint={flatIndicators[ind]?.description || ind}>
                    {shortLabel(flatIndicators[ind]?.label || ind)}
                  </Th>
                ))}
                <Th align="right">Score</Th>
              </Tr>
            </THead>
            <TBody>
              {screenerResults.map((stock) => (
                <Tr
                  key={stock.symbol}
                  interactive
                  onClick={() => navigate(`/stock/${stock.symbol}`)}
                >
                  <Td muted className="tnum">{stock.rank}</Td>
                  <Td>
                    <div className="font-medium text-gray-100">{displaySymbol(stock.symbol)}</div>
                    <div className="text-2xs text-gray-500 truncate max-w-[160px]">{stock.sector}</div>
                  </Td>
                  <Td numeric>
                    <div>{formatCurrency(stock.live_price || stock.price)}</div>
                    <div className="text-2xs text-gray-500 font-sans">
                      {stock.price_source === 'angel_one' ? 'Live' : '15 min'}
                    </div>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end">
                      <DeltaBadge value={stock.change_percent} />
                    </div>
                  </Td>
                  {usedIndicators.map((ind) => (
                    <Td key={ind} numeric>{formatIndicator(stock[ind])}</Td>
                  ))}
                  <Td align="right">
                    <div className="flex justify-end">
                      <Badge variant="brand">{stock.score}</Badge>
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        ) : isLoading.screener ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Spinner size="lg" className="text-brand-400" />
            <p className="text-sm font-medium text-gray-300 mt-4">Screening stocks…</p>
            <p className="text-xs text-gray-500 mt-1">
              Fundamental indicators can take a minute.
            </p>
          </div>
        ) : (
          <EmptyState
            icon={Search}
            title="No results yet"
            description={
              conditions.length === 0
                ? 'Add conditions and run the screener to find stocks.'
                : 'Run the screener to scan against your conditions.'
            }
            action={
              conditions.length > 0 && (
                <Button size="sm" variant="primary" icon={Play} onClick={runScreener}>Run screener</Button>
              )
            }
          />
        )}
      </Card>

      {/* ── Save modal ──────────────────────────────────────────────────── */}
      <Modal
        open={showSaveModal}
        onClose={() => { setShowSaveModal(false); setSaveName(''); setSaveDesc(''); }}
        title="Save screener"
        description={`${conditions.length} condition${conditions.length !== 1 ? 's' : ''} · sorted by ${flatIndicators[sortBy]?.label || sortBy} ${sortOrder}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowSaveModal(false); setSaveName(''); setSaveDesc(''); }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveScreener} disabled={!saveName.trim()}>
              Save screener
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" required>
            {(p) => (
              <Input
                autoFocus
                placeholder="e.g. My Momentum Setup"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                {...p}
              />
            )}
          </Field>
          <Field label="Description" hint="Optional — helps you recognise it later.">
            {(p) => (
              <Input
                placeholder="What this screen looks for"
                value={saveDesc}
                onChange={(e) => setSaveDesc(e.target.value)}
                {...p}
              />
            )}
          </Field>
        </div>
      </Modal>
    </div>
  );
};

export default Screener;
