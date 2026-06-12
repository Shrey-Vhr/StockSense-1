import { useState, useEffect, useRef } from "react";
import api from "../utils/api";

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

const PatternScanner = () => {
  const [selectedPatterns, setSelectedPatterns] = 
    useState([]);
  const [scope, setScope] = useState("nifty50");
  const [scanning, setScanning] = useState(false);
  const [scanId, setScanId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentStock, setCurrentStock] = useState("");
  const [results, setResults] = useState([]);
  const [completed, setCompleted] = useState(false);
  const pollRef = useRef(null);

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
    if (selectedPatterns.length === 0) {
      alert("Please select at least one pattern");
      return;
    }

    setScanning(true);
    setResults([]);
    setProgress(0);
    setCompleted(false);

    try {
      const response = await api.post(
        "/analysis/patterns/scan",
        {
          patterns: selectedPatterns,
          scope: scope
        }
      );

      const id = response.data.scan_id;
      setScanId(id);

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

  return (
    <div className="bg-gray-800 rounded-xl p-5 mb-6">
      <h2 className="text-white font-bold text-lg mb-4">
        🔍 Pattern Scanner
      </h2>

      {/* Pattern Selection */}
      <div className="mb-4">
        <div className="flex justify-between 
                        items-center mb-2">
          <p className="text-gray-400 text-sm">
            Select patterns to scan for:
          </p>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-xs text-blue-400 
                         hover:text-blue-300"
            >
              Select All
            </button>
            <span className="text-gray-600">|</span>
            <button
              onClick={clearAll}
              className="text-xs text-gray-400 
                         hover:text-gray-300"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Bullish Patterns */}
        <p className="text-green-400 text-xs 
                      font-medium mb-2 mt-3">
          🟢 Bullish Patterns
        </p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {ALL_PATTERNS
            .filter(p => p.type === "bullish")
            .map(pattern => (
              <label
                key={pattern.name}
                className={`flex items-center gap-2 
                           p-2 rounded-lg cursor-pointer
                           border transition-colors ${
                  selectedPatterns.includes(pattern.name)
                    ? "border-green-600 bg-green-900/30"
                    : "border-gray-700 bg-gray-700/30"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPatterns.includes(
                    pattern.name
                  )}
                  onChange={() => togglePattern(
                    pattern.name
                  )}
                  className="accent-green-500"
                />
                <span className="text-white text-xs">
                  {pattern.name}
                </span>
              </label>
            ))}
        </div>

        {/* Bearish Patterns */}
        <p className="text-red-400 text-xs 
                      font-medium mb-2">
          🔴 Bearish Patterns
        </p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {ALL_PATTERNS
            .filter(p => p.type === "bearish")
            .map(pattern => (
              <label
                key={pattern.name}
                className={`flex items-center gap-2 
                           p-2 rounded-lg cursor-pointer
                           border transition-colors ${
                  selectedPatterns.includes(pattern.name)
                    ? "border-red-600 bg-red-900/30"
                    : "border-gray-700 bg-gray-700/30"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPatterns.includes(
                    pattern.name
                  )}
                  onChange={() => togglePattern(
                    pattern.name
                  )}
                  className="accent-red-500"
                />
                <span className="text-white text-xs">
                  {pattern.name}
                </span>
              </label>
            ))}
        </div>

        {/* Neutral Patterns */}
        <p className="text-yellow-400 text-xs 
                      font-medium mb-2">
          🟡 Neutral Patterns
        </p>
        <div className="grid grid-cols-2 gap-2">
          {ALL_PATTERNS
            .filter(p => p.type === "neutral")
            .map(pattern => (
              <label
                key={pattern.name}
                className={`flex items-center gap-2 
                           p-2 rounded-lg cursor-pointer
                           border transition-colors ${
                  selectedPatterns.includes(pattern.name)
                    ? "border-yellow-600 bg-yellow-900/30"
                    : "border-gray-700 bg-gray-700/30"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPatterns.includes(
                    pattern.name
                  )}
                  onChange={() => togglePattern(
                    pattern.name
                  )}
                  className="accent-yellow-500"
                />
                <span className="text-white text-xs">
                  {pattern.name}
                </span>
              </label>
            ))}
        </div>
      </div>

      {/* Scope Selection */}
      <div className="mb-4">
        <p className="text-gray-400 text-sm mb-2">
          Scan scope:
        </p>
        <div className="flex gap-3">
          <label className="flex items-center 
                            gap-2 cursor-pointer">
            <input
              type="radio"
              value="nifty50"
              checked={scope === "nifty50"}
              onChange={() => setScope("nifty50")}
              className="accent-orange-500"
            />
            <span className="text-white text-sm">
              Nifty 50
              <span className="text-gray-400 
                               text-xs ml-1">
                (~2 min)
              </span>
            </span>
          </label>
          <label className="flex items-center 
                            gap-2 cursor-pointer">
            <input
              type="radio"
              value="all"
              checked={scope === "all"}
              onChange={() => setScope("all")}
              className="accent-orange-500"
            />
            <span className="text-white text-sm">
              All Stocks
              <span className="text-gray-400 
                               text-xs ml-1">
                (~8 min)
              </span>
            </span>
          </label>
        </div>
      </div>

      {/* Scan Button */}
      <button
        onClick={startScan}
        disabled={scanning}
        className={`w-full py-3 rounded-xl 
                   font-bold text-sm transition-colors ${
          scanning
            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
            : "bg-orange-500 hover:bg-orange-600 text-white"
        }`}
      >
        {scanning
          ? `⏳ Scanning... ${progress}/${total}`
          : "🔍 Scan for Patterns"}
      </button>

      {/* Progress Bar */}
      {scanning && (
        <div className="mt-3">
          <div className="flex justify-between 
                          text-xs text-gray-400 mb-1">
            <span>
              Scanning: {currentStock.replace('.NS','')}
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full bg-gray-700 
                          rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full 
                         transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-gray-400 text-xs mt-1">
            {results.length} matches found so far...
          </p>
        </div>
      )}

      {/* Results */}
      {(results.length > 0 || completed) && (
        <div className="mt-4">
          <div className="flex justify-between 
                          items-center mb-3">
            <h3 className="text-white font-bold">
              {completed ? "✅" : "⏳"} Results
              <span className="text-gray-400 
                               font-normal text-sm ml-2">
                ({results.length} stocks matched)
              </span>
            </h3>
          </div>

          {results.length === 0 && completed ? (
            <p className="text-gray-400 text-sm 
                          text-center py-4">
              No stocks found with selected patterns
            </p>
          ) : (
            <div className="space-y-2 max-h-96 
                            overflow-y-auto">
              {results.map((stock, i) => (
                <div
                  key={i}
                  className="bg-gray-700/50 rounded-xl 
                             p-3 cursor-pointer 
                             hover:bg-gray-700 
                             transition-colors"
                  onClick={() => window.location.href = 
                    `/stock/${stock.symbol}`}
                >
                  <div className="flex justify-between 
                                  items-start">
                    <div>
                      <p className="text-white 
                                    font-bold text-sm">
                        {stock.name}
                      </p>
                      <p className="text-gray-400 
                                    text-xs">
                        ₹{stock.price?.toLocaleString(
                          'en-IN'
                        )} · RSI {stock.rsi}
                      </p>
                    </div>
                    <span className={`text-xs px-2 
                                    py-0.5 rounded 
                                    font-medium ${
                      stock.trade_setup?.bias === 'Bullish'
                        ? 'bg-green-900/50 text-green-400'
                        : stock.trade_setup?.bias === 'Bearish'
                        ? 'bg-red-900/50 text-red-400'
                        : 'bg-yellow-900/50 text-yellow-400'
                    }`}>
                      {stock.trade_setup?.bias || 'Neutral'}
                    </span>
                  </div>

                  {/* Matched patterns */}
                  <div className="flex flex-wrap 
                                  gap-1 mt-2">
                    {stock.patterns.map((p, j) => (
                      <span
                        key={j}
                        className={`text-xs px-2 py-0.5 
                                   rounded-full ${
                          p.type === 'bullish'
                            ? 'bg-green-900/40 text-green-400'
                            : p.type === 'bearish'
                            ? 'bg-red-900/40 text-red-400'
                            : 'bg-yellow-900/40 text-yellow-400'
                        }`}
                      >
                        {p.emoji} {p.name}
                      </span>
                    ))}
                  </div>

                  {/* Trade setup mini */}
                  {stock.trade_setup?.entry && (
                    <div className="flex gap-3 
                                    mt-2 text-xs">
                      <span className="text-gray-400">
                        Entry: ₹{stock.trade_setup.entry}
                      </span>
                      <span className="text-red-400">
                        SL: ₹{stock.trade_setup.stop_loss}
                      </span>
                      <span className="text-green-400">
                        T1: ₹{stock.trade_setup.target1}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PatternScanner;
