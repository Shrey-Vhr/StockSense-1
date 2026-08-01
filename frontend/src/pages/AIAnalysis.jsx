import { useState } from 'react';
import {
  BrainCircuit, Search, Target, TrendingUp, TrendingDown,
  AlertTriangle, Download,
} from 'lucide-react';
import api from '../utils/api';
import { openPrintWindow, buildAiReportHtml } from '../lib/pdfTemplates';
import {
  Badge, Button, Card, Disclaimer, EmptyState, Input, MetricTile, PageHeader, Spinner,
} from '../components/ui';
import { cn } from '../lib/cn';
import { verdictTone } from '../lib/format';

const ANALYSIS_TYPES = [
  'Full Stock Analysis',
  'Quick Trade Setup',
  'Risk Assessment',
  'Fundamental Deep Dive',
];

const TIMEFRAME_LABELS = {
  intraday: 'Intraday',
  swing: 'Swing (days)',
  midterm: 'Midterm (months)',
  longterm: 'Long term (years)',
};

/** Radial confidence gauge. Was a hand-rolled SVG with a hardcoded stroke. */
const ConfidenceRing = ({ value = 0 }) => {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Model confidence"
      className="relative w-24 h-24 shrink-0"
    >
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90" aria-hidden="true">
        <path
          d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
          fill="none"
          strokeWidth="2.5"
          className="stroke-surface-800"
        />
        <path
          d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${pct}, 100`}
          className="stroke-brand-400"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold text-gray-100 font-mono tnum">{pct}%</span>
      </div>
    </div>
  );
};

const AIAnalysis = () => {
  const [symbol, setSymbol] = useState('');
  const [cleanSymbol, setCleanSymbol] = useState('');
  const [analysisType, setAnalysisType] = useState('Full Stock Analysis');

  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // The ~380-line report template used to live inline here — byte-identical to
  // the copy inside StockDetail. Both now call the same builder.
  const handleExportPDF = () => {
    if (!aiAnalysis) return;
    openPrintWindow(buildAiReportHtml(cleanSymbol, aiAnalysis));
  };

  const handleSearch = async () => {
    if (!symbol.trim()) return;

    let formattedSymbol = symbol.trim().toUpperCase();
    if (!formattedSymbol.endsWith('.NS') && !formattedSymbol.endsWith('.BO')) {
      formattedSymbol += '.NS';
    }

    setCleanSymbol(formattedSymbol);
    setAiLoading(true);
    setErrorMsg(null);
    setAiAnalysis(null);

    try {
      // 1. Fetch Technical Data
      const techRes = await api.get(`/analysis/technical/${formattedSymbol}`);
      const techData = techRes.data;

      // 2. Fetch Fundamental Data
      const fundRes = await api.get(`/analysis/fundamental/${formattedSymbol}`);
      const fundData = fundRes.data;

      const typeMap = {
        'Full Stock Analysis': 'full',
        'Quick Trade Setup': 'trade_setup',
        'Risk Assessment': 'risk',
        'Fundamental Deep Dive': 'fundamental'
      };

      // 3. Request AI Analysis
      const payload = {
        quote: {},
        technical: techData,
        fundamental: fundData,
        news: [],
        market_regime: 'Neutral',
        sector_performance: 'Neutral',
        analysis_type: typeMap[analysisType] || 'full'
      };

      const aiRes = await api.post(`/ai/analyze/${formattedSymbol}`, payload);
      setAiAnalysis(aiRes.data.analysis);

    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to generate AI analysis. Check the symbol and try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const setup = aiAnalysis?.trade_setup;

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5">
      <PageHeader
        title="AI Analysis"
        subtitle="Technical and fundamental data, read together and summarised into a trade view."
        icon={BrainCircuit}
        actions={aiAnalysis && (
          <Button variant="secondary" icon={Download} onClick={handleExportPDF}>
            Export PDF
          </Button>
        )}
      />

      {/* ── Query ───────────────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-col md:flex-row gap-3">
          <Input
            size="lg"
            icon={Search}
            className="flex-1"
            aria-label="Stock symbol"
            placeholder="Enter a symbol, e.g. RELIANCE"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button
            variant="primary"
            size="lg"
            onClick={handleSearch}
            loading={aiLoading}
            disabled={!symbol.trim() || aiLoading}
          >
            Generate analysis
          </Button>
        </div>

        <fieldset className="mt-4">
          <legend className="text-2xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Analysis focus
          </legend>
          <div className="flex flex-wrap gap-2">
            {ANALYSIS_TYPES.map((type) => (
              <Button
                key={type}
                size="sm"
                variant={analysisType === type ? 'secondary' : 'ghost'}
                aria-pressed={analysisType === type}
                onClick={() => setAnalysisType(type)}
                className={cn(
                  analysisType === type && 'border-brand-500/50 text-brand-400',
                )}
              >
                {type}
              </Button>
            ))}
          </div>
        </fieldset>
      </Card>

      {errorMsg && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-down/30 bg-down/10 px-4 py-3">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-down" aria-hidden="true" />
          <p className="text-sm text-down">{errorMsg}</p>
        </div>
      )}

      {/* ── Result ──────────────────────────────────────────────────────── */}
      {aiLoading ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Spinner size="lg" className="text-brand-400" />
            <p className="text-sm font-medium text-gray-200 mt-4">
              Analysing {cleanSymbol}
            </p>
            {/* Was a pulsing brain icon with no indication of what was happening
                or how long a run takes. */}
            <p className="text-xs text-gray-500 mt-1.5 max-w-sm leading-relaxed">
              Reading technical indicators, then fundamentals, then asking the model
              for a {analysisType.toLowerCase()}. This usually takes 10–30 seconds.
            </p>
          </div>
        </Card>
      ) : !aiAnalysis ? (
        <Card>
          <EmptyState
            icon={BrainCircuit}
            title="No analysis yet"
            description="Enter a symbol above and pick a focus to generate a report."
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Verdict */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">
                    Verdict
                  </span>
                  <Badge variant="brand">{cleanSymbol.replace('.NS', '')}</Badge>
                </div>
                <h2 className={cn(
                  'text-2xl font-semibold mt-1.5',
                  verdictTone(aiAnalysis.verdict) === 'up' ? 'text-up'
                    : verdictTone(aiAnalysis.verdict) === 'down' ? 'text-down'
                    : 'text-gray-100',
                )}>
                  {aiAnalysis.verdict}
                </h2>
                <p className="text-sm text-gray-400 mt-2.5 leading-relaxed">{aiAnalysis.summary}</p>
              </div>
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <ConfidenceRing value={aiAnalysis.confidence} />
                <span className="text-2xs uppercase tracking-wider text-gray-500">Confidence</span>
              </div>
            </div>
          </Card>

          {/* Trade setup */}
          {setup && (
            <Card
              title={
                <span className="flex items-center gap-2">
                  <Target size={12} className="text-brand-400" aria-hidden="true" />
                  Proposed swing trade setup
                </span>
              }
            >
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <MetricTile label="Entry" value={setup.entry} size="sm" align="center" className="font-mono" />
                <MetricTile label="Stop loss" value={setup.stop_loss} sublabel={setup.risk_percent ? `${setup.risk_percent} risk` : undefined} tone="down" size="sm" align="center" className="font-mono" />
                <MetricTile label="Target 1" value={setup.target_1} tone="up" size="sm" align="center" className="font-mono" />
                <MetricTile label="Target 2" value={setup.target_2} tone="up" size="sm" align="center" className="font-mono" />
                <MetricTile label="Risk / reward" value={setup.risk_reward} tone="brand" size="sm" align="center" className="font-mono" />
              </div>
            </Card>
          )}

          {/* Timeframes */}
          {aiAnalysis.timeframes && (
            <div className="space-y-3">
              <h2 className="text-2xs font-semibold uppercase tracking-wider text-gray-500">
                Analysis by timeframe
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(aiAnalysis.timeframes).map(([tf, data]) => (
                  <Card key={tf} padding="md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-100">
                          {TIMEFRAME_LABELS[tf] || tf}
                        </h3>
                        {tf === 'swing' && data.setup_type && (
                          <Badge variant="brand">{data.setup_type}</Badge>
                        )}
                      </div>
                      <Badge variant={verdictTone(data.verdict)} size="md">{data.verdict}</Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                      <span>
                        Confidence{' '}
                        <span className="text-gray-300 font-mono tnum">{data.confidence}%</span>
                      </span>
                      {data.holding_period && <span>Hold {data.holding_period}</span>}
                    </div>

                    {data.entry && (
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {[
                          ['Entry', data.entry, 'text-gray-200'],
                          ['Stop', data.stop_loss, 'text-down'],
                          ['Target', data.target_1, 'text-up'],
                        ].map(([label, value, tone]) => (
                          <div key={label} className="rounded-lg bg-surface-950 border border-surface-800 px-2 py-1.5 text-center">
                            <div className="text-2xs uppercase tracking-wider text-gray-500">{label}</div>
                            <div className={cn('text-xs font-mono tnum mt-0.5', tone)}>{value}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {data.reasoning && (
                      <p className="text-xs text-gray-500 mt-3 leading-relaxed">{data.reasoning}</p>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Cases */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card padding="lg">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-up">
                <TrendingUp size={15} aria-hidden="true" /> The bull case
              </h3>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">{aiAnalysis.bull_case}</p>

              {aiAnalysis.technical_reasoning && (
                <>
                  <h4 className="text-2xs font-semibold uppercase tracking-wider text-gray-500 mt-5">Technical reasoning</h4>
                  <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">{aiAnalysis.technical_reasoning}</p>
                </>
              )}
              {aiAnalysis.fundamental_reasoning && (
                <>
                  <h4 className="text-2xs font-semibold uppercase tracking-wider text-gray-500 mt-5">Fundamental reasoning</h4>
                  <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">{aiAnalysis.fundamental_reasoning}</p>
                </>
              )}
            </Card>

            <Card padding="lg">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-down">
                <TrendingDown size={15} aria-hidden="true" /> The bear case
              </h3>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">{aiAnalysis.bear_case}</p>

              {aiAnalysis.red_flags?.length > 0 && (
                <div className="mt-5 rounded-xl border border-down/25 bg-down/[0.07] p-4">
                  <h4 className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-down">
                    <AlertTriangle size={12} aria-hidden="true" /> Red flags to watch
                  </h4>
                  <ul className="mt-2 space-y-1.5">
                    {aiAnalysis.red_flags.map((rf, i) => (
                      <li key={i} className="text-xs text-gray-400 leading-relaxed pl-3 relative">
                        <span className="absolute left-0 top-1.5 w-1 h-1 rounded-full bg-down" aria-hidden="true" />
                        {rf}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiAnalysis.key_levels_to_watch?.length > 0 && (
                <>
                  <h4 className="text-2xs font-semibold uppercase tracking-wider text-gray-500 mt-5">Key levels to watch</h4>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {aiAnalysis.key_levels_to_watch.map((kl, i) => (
                      <Badge key={i} variant="outline" size="md" className="font-mono tnum">{kl}</Badge>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          <Disclaimer />
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;
