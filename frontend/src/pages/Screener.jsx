import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  SlidersHorizontal, Play, Plus, X, Save, FolderOpen, Trash2,
  ChevronRight, TrendingUp, TrendingDown, Info, ArrowUpDown,
  ChevronDown, Loader2, Search, Zap, BarChart3, Activity,
  Gauge, DollarSign, Waves
} from 'lucide-react';
import api from '../utils/api';
import useStore from '../store/useStore';
import { ScreenerSkeleton } from '../components/Skeleton';


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

// ─── Category Icons ──────────────────────────────────────────────────────────
const CATEGORY_ICONS = {
  Price: DollarSign,
  Trend: TrendingUp,
  Momentum: Zap,
  Volume: BarChart3,
  Volatility: Waves,
  Fundamental: Gauge,
};

// ─── Tooltip Component ───────────────────────────────────────────────────────
const Tooltip = ({ text, children }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex items-center">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-gray-200 bg-[#1c2333] border border-[#30363d] rounded-lg shadow-xl whitespace-nowrap max-w-xs">
          <span className="whitespace-normal">{text}</span>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 rotate-45 bg-[#1c2333] border-r border-b border-[#30363d]" />
        </div>
      )}
    </div>
  );
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

  // Load dropdown
  const [showLoadDropdown, setShowLoadDropdown] = useState(false);

  // Preset dropdown
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);

  // Run status
  const [hasRunOnce, setHasRunOnce] = useState(false);
  const [progress, setProgress] = useState(null);

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
  }, []);

  // ─── Fetch saved screeners ───────────────────────────────────────────────
  const fetchSavedScreeners = async () => {
    try {
      const res = await api.get('/screener/saved');
      setSavedScreeners(res.data);
    } catch (err) {
      console.error('Failed to fetch saved screeners:', err);
    }
  };

  // ─── Run screener ────────────────────────────────────────────────────────
  const runScreener = useCallback(() => {
    if (conditions.length === 0) return;
    setLoading('screener', true);
    setHasRunOnce(true);
    setScreenerData({ results: [], summary: null });
    setProgress({ processed: 0, total: 100 });

    const query = encodeURIComponent(JSON.stringify(conditions));
    const es = new EventSource(`${import.meta.env.VITE_API_URL}/screener/stream?conditions=${query}`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          console.error(data.error);
          es.close();
          setLoading('screener', false);
          setProgress(null);
        } else if (data.progress !== undefined) {
          setProgress({ processed: data.progress, total: data.total });
        } else if (data.summary) {
          const current = useStore.getState();
          setScreenerData({ results: current.screenerResults, summary: data });
          es.close();
          setLoading('screener', false);
          setProgress(null);
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
      } catch (e) {
        console.error(e);
      }
    };

    es.onerror = (error) => {
      console.error("SSE error", error);
      es.close();
      setLoading('screener', false);
      setProgress(null);
    };
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
    setShowLoadDropdown(false);
    setShowPresetDropdown(false);
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

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-5 h-full flex flex-col">

      {/* ── PROGRESS BAR ────────────────────────────────────────────────── */}
      {progress && (
        <div className="w-full bg-surface-800 rounded-full h-1.5 mb-2 overflow-hidden">
          <motion.div
            className="h-1.5 bg-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(progress.processed / Math.max(progress.total, 1)) * 100}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
      )}

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight flex items-center">
            <SlidersHorizontal className="mr-2 text-[#58a6ff]" size={24} />
            Custom Stock Screener
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Define your own screening conditions across 35+ technical &amp; fundamental indicators.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowPresetDropdown(!showPresetDropdown); setShowLoadDropdown(false); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-surface-850 border border-surface-800 text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400 transition-all"
            >
              <Zap size={14} className="text-[#10b981]" />
              Presets
              <ChevronDown size={14} />
            </button>
            {showPresetDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl z-50 overflow-hidden">
                {PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => loadScreener(preset)}
                    className="w-full text-left px-4 py-3 hover:bg-[#1c2333] transition-colors border-b border-[#30363d]/50 last:border-0"
                  >
                    <div className="text-sm font-medium text-white">{preset.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{preset.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Load saved */}
          <div className="relative">
            <button
              onClick={() => { setShowLoadDropdown(!showLoadDropdown); setShowPresetDropdown(false); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-surface-850 border border-surface-800 text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400 transition-all"
            >
              <FolderOpen size={14} />
              Load
              {savedScreeners.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-[#58a6ff]/20 text-[#58a6ff] text-xs rounded-full font-medium">
                  {savedScreeners.length}
                </span>
              )}
              <ChevronDown size={14} />
            </button>
            {showLoadDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                {savedScreeners.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-500 text-sm">No saved screeners yet.</div>
                ) : (
                  savedScreeners.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => loadScreener(s)}
                      className="w-full text-left px-4 py-3 hover:bg-[#1c2333] transition-colors border-b border-[#30363d]/50 last:border-0 group flex justify-between items-start cursor-pointer"
                    >
                      <div>
                        <div className="text-sm font-medium text-white">{s.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {s.conditions.length} condition{s.conditions.length !== 1 ? 's' : ''}
                          {s.description && ` · ${s.description}`}
                        </div>
                      </div>
                      <button
                        onClick={(e) => deleteSavedScreener(s.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all cursor-default"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Save */}
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={conditions.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-surface-850 border border-surface-800 text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            Save
          </button>
        </div>
      </div>

      {/* ── CONDITION BUILDER ───────────────────────────────────────────── */}
      <div className="bg-surface-850 border border-surface-800 rounded-2xl p-4 mt-4">
        <div className="px-5 py-4 border-b border-surface-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-emerald-400" />
            <span className="text-sm font-semibold text-gray-200 flex items-center gap-2">Conditions</span>
            <span className="text-xs text-gray-500 bg-surface-900 px-2 py-0.5 rounded-lg border border-surface-800 whitespace-nowrap">
              {conditions.length} {conditions.length === 1 ? 'filter' : 'filters'} · AND logic
            </span>
          </div>
          <button
            onClick={addCondition}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            <Plus size={14} />
            Add Condition
          </button>
        </div>

        <div className="divide-y divide-[#30363d]/50">
          {conditions.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              <Search size={36} className="mx-auto mb-3 text-gray-600" />
              <p className="font-medium text-gray-400">No conditions defined</p>
              <p className="text-gray-600 text-sm mt-1">
                Add conditions to screen stocks, or select a preset to get started.
              </p>
            </div>
          ) : (
            conditions.map((cond, idx) => {
              const indInfo = flatIndicators[cond.indicator];
              return (
                <div
                  key={idx}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-5 py-3 flex flex-col md:flex-row items-start md:items-center gap-3 hover:bg-[#1c2333]/40 transition-colors group overflow-hidden"
                >
                  {/* Index */}
                  <span className="text-xs text-gray-600 font-mono min-w-[24px]">{idx + 1}.</span>

                  {/* Indicator dropdown */}
                  <div className="relative flex-1 min-w-[200px]">
                    <select
                      value={cond.indicator}
                      onChange={(e) => updateCondition(idx, 'indicator', e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 appearance-none cursor-pointer focus:border-[#58a6ff] focus:outline-none focus:ring-1 focus:ring-[#58a6ff]/30 transition-colors"
                    >
                      {groupedOptions.map((group) => (
                        <optgroup key={group.category} label={`── ${group.category} ──`}>
                          {group.indicators.map((ind) => (
                            <option key={ind.key} value={ind.key}>
                              {ind.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>

                  {/* Tooltip */}
                  {indInfo && (
                    <Tooltip text={indInfo.description}>
                      <Info size={14} className="text-gray-600 hover:text-[#58a6ff] cursor-help transition-colors shrink-0" />
                    </Tooltip>
                  )}

                  {/* Operator dropdown */}
                  <div className="relative min-w-[160px]">
                    <select
                      value={cond.operator}
                      onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 appearance-none cursor-pointer focus:border-[#58a6ff] focus:outline-none focus:ring-1 focus:ring-[#58a6ff]/30 transition-colors"
                    >
                      {OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.symbol} {op.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>

                  {/* Value input(s) */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={cond.value ?? ''}
                      onChange={(e) => updateCondition(idx, 'value', e.target.value === '' ? null : parseFloat(e.target.value))}
                      placeholder="Value"
                      className="w-24 bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 font-mono focus:border-[#58a6ff] focus:outline-none focus:ring-1 focus:ring-[#58a6ff]/30 transition-colors placeholder:text-gray-600"
                    />
                    {cond.operator === 'between' && (
                      <>
                        <span className="text-gray-500 text-xs">to</span>
                        <input
                          type="number"
                          value={cond.value2 ?? ''}
                          onChange={(e) => updateCondition(idx, 'value2', e.target.value === '' ? null : parseFloat(e.target.value))}
                          placeholder="Value 2"
                          className="w-24 bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 font-mono focus:border-[#58a6ff] focus:outline-none focus:ring-1 focus:ring-[#58a6ff]/30 transition-colors placeholder:text-gray-600"
                        />
                      </>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => removeCondition(idx)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-all opacity-60 group-hover:opacity-100"
                    title="Remove condition"
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── SCREENER CONTROLS ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        {/* Sort By */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Sort by</label>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-surface-850 border border-surface-800 rounded-xl px-3 py-2 text-sm text-gray-300 focus:border-emerald-500/50 focus:outline-none appearance-none cursor-pointer pr-8 transition-colors"
            >
              <option value="score">Score</option>
              {Object.entries(flatIndicators).map(([key, info]) => (
                <option key={key} value={key}>{info.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Sort Order toggle */}
        <button
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-surface-850 border border-surface-800 text-gray-300 hover:border-emerald-500/40 transition-all"
        >
          <ArrowUpDown size={14} />
          {sortOrder === 'desc' ? 'Descending' : 'Ascending'}
        </button>

        {/* Limit */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Limit</label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Math.max(1, Math.min(100, parseInt(e.target.value) || 20)))}
            className="bg-surface-850 border border-surface-800 rounded-xl px-3 py-2 text-sm text-gray-300 w-20 focus:border-emerald-500/50 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex-1" />

        {/* Run button */}
        <button
          onClick={runScreener}
          disabled={isLoading.screener || conditions.length === 0}
          className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors w-full sm:w-auto mt-2 sm:mt-0 ml-auto shadow-glow disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading.screener ? (
            <span className="flex items-center gap-2">
              <motion.div
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
              Scanning...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Play size={15} />
              Run Screener
            </span>
          )}
        </button>
      </div>

      {/* ── RESULTS SUMMARY ─────────────────────────────────────────────── */}
      {screenerSummary && (
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-gray-500">
            <span className="text-gray-300 font-semibold">{screenerSummary.total_screened}</span> stocks screened
          </span>
          <span className="text-[#30363d]">|</span>
          <span className="text-gray-500">
            <span className="text-[#58a6ff] font-semibold">{screenerSummary.total_passed}</span> passed your conditions
          </span>
          <span className="text-[#30363d]">|</span>
          <span className="text-gray-500">
            Ran in <span className="text-[#10b981] font-semibold">{screenerSummary.elapsed_seconds}s</span>
          </span>
        </div>
      )}

      {/* ── RESULTS TABLE ───────────────────────────────────────────────── */}
      <div className="bg-surface-850 border border-surface-800 rounded-2xl mt-4 overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <div className="min-w-[900px] w-full">
            <div className="hidden sm:flex gap-4 px-4 py-3 border-b border-surface-800 bg-surface-900">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-8 whitespace-nowrap">#</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px] whitespace-nowrap border-r border-surface-800">Stock</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[100px] text-right whitespace-nowrap">Price</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[80px] text-right whitespace-nowrap">Chg%</div>
              {/* Dynamic indicator columns (combined in flex for grid) */}
              <div className="flex-1 flex gap-4 justify-end">
                {usedIndicators.map((ind) => {
                  let label = flatIndicators[ind]?.label || ind;
                  if (label === 'PRICE - EMA 20') label = 'EMA20';
                  else if (label === 'PRICE - EMA 50') label = 'EMA50';
                  else if (label === 'CHG% VOLUME RATIO') label = 'VOL RATIO';
                  else if (label === 'DEBT / EQUITY') label = 'D/E';
                  else if (label === 'REVENUE GROWTH %') label = 'REV GRW%';
                  else if (label === 'ADX (14)') label = 'ADX';
                  else if (label === 'RSI (14)') label = 'RSI';

                  return (
                    <Tooltip key={ind} text={flatIndicators[ind]?.description || ind}>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[90px] text-right whitespace-nowrap">
                        <span className="cursor-help border-b border-dashed border-gray-600">
                          {label}
                        </span>
                      </div>
                    </Tooltip>
                  );
                })}
                {usedIndicators.length === 0 && <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[90px] text-right whitespace-nowrap">Indicators</div>}
              </div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[70px] text-right whitespace-nowrap">Score</div>
            </div>
            <div className="divide-y divide-surface-800/50">
              {screenerResults.length > 0 ? (
                screenerResults.map((stock) => (
                  <div
                    key={stock.symbol}
                    onClick={() => navigate(`/stock/${stock.symbol}`)}
                    className="flex flex-col sm:flex-row sm:gap-4 px-4 py-3.5 border-b border-surface-800 last:border-b-0 hover:bg-surface-800/50 cursor-pointer transition-colors"
                  >
                    {/* Mobile View */}
                    <div className="flex sm:hidden justify-between items-start w-full">
                      <div className="flex items-center gap-2">
                        <div className="text-emerald-400 font-bold text-sm w-5">{stock.rank}.</div>
                        <div>
                          <div className="font-semibold text-gray-100 text-sm">{stock.symbol.replace('.NS', '')}</div>
                          <div className="text-gray-500 text-xs mt-0.5">{stock.sector}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-200 font-mono text-sm block">₹{(stock.live_price || stock.price)?.toFixed(2)}</span>
                        <span className={`inline-flex items-center gap-0.5 mt-0.5 ${stock.change_percent >= 0 ? 'text-emerald-400 font-semibold text-xs font-mono' : 'text-red-400 font-semibold text-xs font-mono'}`}>
                          {stock.change_percent >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {Math.abs(stock.change_percent || 0).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex sm:hidden justify-between items-center w-full mt-3">
                      <div className="flex gap-3 text-xs text-gray-400 font-mono overflow-x-auto scrollbar-hide max-w-[70%]">
                        {usedIndicators.map((ind) => {
                          const val = stock[ind];
                          return (
                            <div key={ind} className="flex flex-col border-r border-surface-800 pr-3 last:border-0 last:pr-0">
                              <span className="text-[10px] text-gray-600 mb-0.5 uppercase">{flatIndicators[ind]?.label || ind}</span>
                              <span className="text-gray-300">
                                {val != null ? (typeof val === 'number' ? (Math.abs(val) >= 10000 ? val.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : val.toFixed(2)) : val) : '—'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2 bg-surface-900 px-2 py-1 rounded-lg border border-surface-800">
                        <span className="text-[10px] text-gray-500 uppercase">Score</span>
                        <span className="text-xs font-bold text-emerald-400">{stock.score}</span>
                      </div>
                    </div>

                    {/* Desktop View Elements */}
                    <div className="hidden sm:flex w-8 text-emerald-400 font-bold text-sm items-center whitespace-nowrap">{stock.rank}</div>
                    <div className="hidden sm:flex min-w-[160px] flex-col justify-center whitespace-nowrap border-r border-surface-800 pr-4">
                      <div className="font-semibold text-gray-100 text-sm">{stock.symbol.replace('.NS', '')}</div>
                      <div className="text-gray-500 text-xs mt-0.5 truncate max-w-[140px]" title={stock.sector}>{stock.sector}</div>
                    </div>
                    <div className="hidden sm:flex min-w-[100px] text-right flex-col items-end justify-center whitespace-nowrap">
                      <span className="text-gray-200 font-mono text-sm">₹{(stock.live_price || stock.price)?.toFixed(2)}</span>
                      <span className="text-xs ml-1 text-gray-500">
                        <span className={stock.price_source === 'angel_one' ? 'text-green-400' : 'text-emerald-500'}>●</span>{' '}
                        {stock.price_source === 'angel_one' ? 'Live' : '15min'}
                      </span>
                    </div>
                    <div className="hidden sm:flex min-w-[80px] justify-end items-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-0.5 ${stock.change_percent >= 0 ? 'text-emerald-400 font-semibold text-sm font-mono' : 'text-red-400 font-semibold text-sm font-mono'}`}>
                        {stock.change_percent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {Math.abs(stock.change_percent || 0).toFixed(2)}%
                      </span>
                    </div>
                    {/* Dynamic indicator values */}
                    <div className="hidden sm:flex flex-1 gap-4 justify-end items-center">
                      {usedIndicators.map((ind) => {
                        const val = stock[ind];
                        return (
                          <div key={ind} className="min-w-[90px] text-right text-gray-300 font-mono text-sm whitespace-nowrap">
                            {val != null ? (
                              typeof val === 'number' ? (
                                Math.abs(val) >= 10000
                                  ? val.toLocaleString('en-IN', { maximumFractionDigits: 0 })
                                  : val.toFixed(2)
                              ) : val
                            ) : (
                              <span className="text-gray-700">—</span>
                            )}
                          </div>
                        );
                      })}
                      {usedIndicators.length === 0 && <div className="min-w-[90px] text-right whitespace-nowrap"><span className="text-gray-700">—</span></div>}
                    </div>
                    <div className="hidden sm:flex min-w-[70px] items-center justify-end gap-2 whitespace-nowrap">
                      <div className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {stock.score}
                      </div>
                      <ChevronRight size={16} className="text-gray-700 group-hover:text-[#58a6ff] transition-colors" />
                    </div>
                  </div>
                ))
              ) : (
                !isLoading.screener && (
                  <div className="py-16 text-center">
                    <Search className="w-10 h-10 mx-auto mb-3 text-gray-700" />
                    <p className="text-gray-400 font-medium text-sm">No results yet</p>
                    <p className="text-gray-600 text-xs mt-1">
                      {conditions.length === 0
                        ? 'Add conditions and run the screener to find stocks.'
                        : 'Click "Run Screener" to screen stocks with your conditions.'}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Loading overlay */}
          {isLoading.screener && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={36} className="animate-spin text-[#58a6ff] mb-4" />
              <p className="text-gray-400 font-medium">Screening stocks…</p>
              <p className="text-gray-600 text-sm mt-1">This may take a minute for fundamental indicators.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── SAVE MODAL ──────────────────────────────────────────────────── */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Save size={18} className="text-[#58a6ff]" />
              Save Screener
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1.5">Name *</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="e.g. My Momentum Setup"
                  autoFocus
                  className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-[#58a6ff] focus:outline-none focus:ring-1 focus:ring-[#58a6ff]/30 transition-colors placeholder:text-gray-600"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1.5">Description</label>
                <input
                  type="text"
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                  placeholder="Optional description"
                  className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-[#58a6ff] focus:outline-none focus:ring-1 focus:ring-[#58a6ff]/30 transition-colors placeholder:text-gray-600"
                />
              </div>
              <div className="text-xs text-gray-500">
                {conditions.length} condition{conditions.length !== 1 ? 's' : ''} will be saved · Sort: {flatIndicators[sortBy]?.label || sortBy} {sortOrder}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowSaveModal(false); setSaveName(''); setSaveDesc(''); }}
                className="flex-1 px-4 py-2.5 bg-[#0d1117] border border-[#30363d] text-gray-300 rounded-lg text-sm font-medium hover:bg-[#1c2333] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveScreener}
                disabled={!saveName.trim()}
                className="flex-1 px-4 py-2.5 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save Screener
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close dropdowns on outside click */}
      {(showPresetDropdown || showLoadDropdown) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowPresetDropdown(false); setShowLoadDropdown(false); }}
        />
      )}
    </div>
  );
};

export default Screener;
