import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, AlertTriangle } from "lucide-react";
import api from "../utils/api";
import { Badge, Button, Card } from "./ui";
import { cn } from "../lib/cn";
import { formatCurrency, displaySymbol } from "../lib/format";

/**
 * Bulk pattern scan across Nifty 50 or the full universe.
 *
 * Not routed anywhere yet, but the backend it talks to is live
 * (POST /analysis/patterns/scan + the polling GET), so this is a finished
 * feature waiting on a route rather than dead scaffolding. It is styled here
 * so that whenever it does get wired up it already matches the rest of the app.
 *
 * Scan behaviour is untouched: same endpoints, same payload, same 1s poll.
 */

const ALL_PATTERNS = [
  { name: "Bearish Engulfing", type: "bearish" },
  { name: "Bullish Engulfing", type: "bullish" },
  { name: "Doji", type: "neutral" },
  { name: "Hammer", type: "bullish" },
  { name: "Shooting Star", type: "bearish" },
  { name: "Morning Star", type: "bullish" },
  { name: "Evening Star", type: "bearish" },
  { name: "Bullish Harami", type: "bullish" },
  { name: "Bearish Harami", type: "bearish" },
  { name: "Double Top", type: "bearish" },
  { name: "Double Bottom", type: "bullish" },
  { name: "Head & Shoulders", type: "bearish" },
  { name: "Inverse Head & Shoulders", type: "bullish" },
  { name: "Bull Flag", type: "bullish" },
  { name: "Bear Flag", type: "bearish" },
  { name: "Cup & Handle", type: "bullish" },
];

/**
 * Neutral used `text-emerald-400` for its heading and `text-emerald-400` on a
 * yellow chip in the results — green in both places, so "no directional edge"
 * looked exactly like "bullish". Neutral is warn.
 */
const TONES = {
  bullish: { label: "Bullish", text: "text-up",   selected: "border-up/40 bg-up/10",     accent: "accent-up",   badge: "up" },
  bearish: { label: "Bearish", text: "text-down", selected: "border-down/40 bg-down/10", accent: "accent-down", badge: "down" },
  neutral: { label: "Neutral", text: "text-warn", selected: "border-warn/40 bg-warn/10", accent: "accent-warn", badge: "warn" },
};

const SCOPES = [
  { value: "nifty50", label: "Nifty 50", hint: "~2 min" },
  { value: "all", label: "All stocks", hint: "~8 min" },
];

const biasTone = (bias) =>
  bias === "Bullish" ? "up" : bias === "Bearish" ? "down" : "warn";

const PatternScanner = () => {
  const [selectedPatterns, setSelectedPatterns] = useState([]);
  const [scope, setScope] = useState("nifty50");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentStock, setCurrentStock] = useState("");
  const [results, setResults] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef(null);
  const navigate = useNavigate();

  const togglePattern = (patternName) => {
    setSelectedPatterns(prev =>
      prev.includes(patternName)
        ? prev.filter(p => p !== patternName)
        : [...prev, patternName]
    );
  };

  const selectAll = () => {
    setSelectedPatterns(ALL_PATTERNS.map(p => p.name));
  };

  const clearAll = () => {
    setSelectedPatterns([]);
  };

  const startScan = async () => {
    // Was a blocking alert(), which stops the page and cannot be styled.
    if (selectedPatterns.length === 0) {
      setError("Select at least one pattern to scan for.");
      return;
    }

    setScanning(true);
    setResults([]);
    setProgress(0);
    setCompleted(false);
    setError("");

    try {
      const response = await api.post(
        "/analysis/patterns/scan",
        {
          patterns: selectedPatterns,
          scope: scope
        }
      );

      // `scanId` was held in state but never read — only this local is used.
      const id = response.data.scan_id;

      // Poll for results
      pollRef.current = setInterval(async () => {
        try {
          const status = await api.get(
            `/analysis/patterns/scan/${id}`
          );
          const data = status.data;

          setProgress(data.progress || 0);
          setTotal(data.total || 0);
          setCurrentStock(data.current_stock || "");
          setResults(data.results || []);

          if (data.status === "completed") {
            clearInterval(pollRef.current);
            setScanning(false);
            setCompleted(true);
          }
        } catch (e) {
          console.error("Poll error:", e);
        }
      }, 1000);

    } catch (e) {
      console.error("Scan start error:", e);
      setScanning(false);
      // The failure used to be silent: the button simply stopped spinning.
      // Show the server's reason when it is a plain message (e.g. "you already
      // have a scan running"); validation errors arrive as a list, so skip those.
      const detail = e.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Could not start the scan. Please try again.");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  const progressPct = total > 0
    ? Math.round((progress / total) * 100)
    : 0;

  const renderGroup = (type) => {
    const tone = TONES[type];
    return (
      <fieldset key={type} className="mt-4 first:mt-0">
        <legend className={cn("text-2xs font-semibold uppercase tracking-wider mb-2", tone.text)}>
          {tone.label} patterns
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALL_PATTERNS.filter(p => p.type === type).map(pattern => {
            const checked = selectedPatterns.includes(pattern.name);
            return (
              <label
                key={pattern.name}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border cursor-pointer",
                  "transition-colors duration-fast",
                  checked ? tone.selected : "border-surface-800 bg-surface-950 hover:border-surface-700",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePattern(pattern.name)}
                  className={cn("w-4 h-4 rounded shrink-0", tone.accent)}
                />
                <span className="text-xs text-gray-200">{pattern.name}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  };

  return (
    <Card
      title="Pattern Scanner"
      subtitle="Scan the market for candlestick and chart patterns."
      actions={
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={selectAll}>Select all</Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>Clear</Button>
        </div>
      }
    >
      {["bullish", "bearish", "neutral"].map(renderGroup)}

      {/* ── Scope ─────────────────────────────────────────────────────────── */}
      <fieldset className="mt-5">
        <legend className="text-2xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
          Scan scope
        </legend>
        <div className="flex flex-wrap gap-2">
          {SCOPES.map(s => (
            <label
              key={s.value}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer",
                "transition-colors duration-fast",
                scope === s.value
                  ? "border-brand-500/40 bg-brand-500/10"
                  : "border-surface-800 bg-surface-950 hover:border-surface-700",
              )}
            >
              <input
                type="radio"
                name="scan-scope"
                value={s.value}
                checked={scope === s.value}
                onChange={() => setScope(s.value)}
                className="w-4 h-4 accent-brand-500 shrink-0"
              />
              <span className="text-sm text-gray-200">{s.label}</span>
              <span className="text-2xs text-gray-500">{s.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <div role="alert" className="flex items-start gap-2 mt-4 rounded-lg border border-down/30 bg-down/10 px-3 py-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-down" aria-hidden="true" />
          <p className="text-sm text-down">{error}</p>
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        icon={Search}
        onClick={startScan}
        loading={scanning}
        className="w-full mt-4"
      >
        {scanning
          ? `Scanning ${progress}/${total}`
          : "Scan for patterns"}
      </Button>

      {/* ── Progress ──────────────────────────────────────────────────────── */}
      {scanning && (
        <div className="mt-3">
          <div className="flex justify-between text-2xs text-gray-500 mb-1.5">
            <span>Scanning {displaySymbol(currentStock)}</span>
            <span className="tnum">{progressPct}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Scan progress"
            className="w-full h-1.5 rounded-full bg-surface-800 overflow-hidden"
          >
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-slow"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-2xs text-gray-500 mt-1.5 tnum">
            {results.length} matches so far
          </p>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {(results.length > 0 || completed) && (
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-2xs font-semibold uppercase tracking-wider text-gray-500">
              Results
            </h3>
            <Badge variant="neutral">{results.length} matched</Badge>
          </div>

          {results.length === 0 && completed ? (
            <p className="text-sm text-gray-500 text-center py-6">
              No stocks matched the selected patterns.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((stock, i) => {
                // Was `window.location.href`, which tears down the SPA and
                // reloads the whole app just to change route — losing the scan
                // results the user is clicking through. Router navigation keeps
                // them. The row was also a plain div with onClick, so it could
                // not be reached by keyboard at all; same treatment as Tr.
                const open = () => navigate(`/stock/${stock.symbol}`);
                return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  aria-label={`${stock.name}, open analysis`}
                  className="rounded-lg p-3 bg-surface-950 border border-surface-800
                             cursor-pointer transition-colors duration-fast hover:border-surface-700"
                  onClick={open}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      open();
                    }
                  }}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-100 truncate">
                        {stock.name}
                      </p>
                      <p className="text-2xs text-gray-500 tnum">
                        {formatCurrency(stock.price)} · RSI {stock.rsi}
                      </p>
                    </div>
                    <Badge variant={biasTone(stock.trade_setup?.bias)}>
                      {stock.trade_setup?.bias || "Neutral"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {stock.patterns.map((p, j) => (
                      <Badge key={j} variant={TONES[p.type]?.badge ?? "warn"}>
                        {p.emoji} {p.name}
                      </Badge>
                    ))}
                  </div>

                  {stock.trade_setup?.entry && (
                    <div className="flex gap-3 mt-2 text-2xs tnum">
                      <span className="text-gray-400">
                        Entry {formatCurrency(stock.trade_setup.entry)}
                      </span>
                      <span className="text-down">
                        SL {formatCurrency(stock.trade_setup.stop_loss)}
                      </span>
                      <span className="text-up">
                        T1 {formatCurrency(stock.trade_setup.target1)}
                      </span>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default PatternScanner;
