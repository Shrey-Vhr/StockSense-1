import { useState, useEffect } from "react";
import api from "../utils/api";

const PatternAnalysis = ({ symbol }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatterns = async () => {
      try {
        setLoading(true);
        const result = await api.get(
          `/analysis/patterns/${symbol}`
        );
        setData(result.data);
      } catch (e) {
        setError("Pattern analysis unavailable");
      } finally {
        setLoading(false);
      }
    };
    if (symbol) fetchPatterns();
  }, [symbol]);

  if (loading) return (
    <div className="bg-gray-800 rounded-xl p-4 mt-4">
      <p className="text-gray-400 text-sm animate-pulse">
        Detecting chart patterns...
      </p>
    </div>
  );

  if (error || !data) return null;

  const { patterns, trade_setup } = data;

  if (!patterns || patterns.length === 0) return (
    <div className="bg-gray-800 rounded-xl p-4 mt-4">
      <h3 className="text-white font-bold mb-2">
        Chart Patterns
      </h3>
      <p className="text-gray-400 text-sm">
        No significant patterns detected recently
      </p>
    </div>
  );

  return (
    <div className="space-y-4 mt-4">
      
      {/* Patterns List */}
      <div className="bg-surface-850 border border-surface-800 rounded-2xl p-5 mt-4">
        <h3 className="text-white font-bold mb-3">
          Chart Patterns Detected
        </h3>
        
        <div className="space-y-2">
          {patterns.map((pattern, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border ${
                pattern.type === 'bullish'
                  ? 'bg-green-900/20 border-green-700/40'
                  : pattern.type === 'bearish'
                  ? 'bg-red-900/20 border-red-700/40'
                  : 'bg-yellow-900/20 border-yellow-700/40'
              }`}
            >
              <div className="flex justify-between 
                              items-center">
                <div>
                  <span className="text-white 
                                   font-medium text-sm">
                    {pattern.emoji} {pattern.name}
                  </span>
                  <span className="text-gray-400 
                                   text-xs ml-2">
                    {pattern.date}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 
                                   rounded font-medium ${
                    pattern.type === 'bullish'
                      ? 'bg-green-800 text-green-300'
                      : pattern.type === 'bearish'
                      ? 'bg-red-800 text-red-300'
                      : 'bg-yellow-800 text-yellow-300'
                  }`}>
                    {pattern.type.toUpperCase()}
                  </span>
                  <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                    {pattern.confidence}%
                  </span>
                </div>
              </div>
              <p className="text-gray-400 text-xs mt-1">
                {pattern.signal}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Trade Setup */}
      {trade_setup && trade_setup.bias && (
        <div className="bg-surface-850 border border-surface-800 rounded-2xl p-5 mt-4">
          <h3 className="text-base font-semibold text-gray-200 mb-4">
            Rule-Based Trade Setup
          </h3>
          
          {/* Bias */}
          <div className="flex justify-between 
                          items-center mb-3">
            <div>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                Pattern Bias
              </p>
              <p className={`text-lg font-bold ${
                trade_setup.bias === 'Bullish'
                  ? 'text-green-400'
                  : trade_setup.bias === 'Bearish'
                  ? 'text-red-400'
                  : 'text-emerald-400'
              }`}>
                {trade_setup.bias === 'Bullish'
                  ? '↑ ' : trade_setup.bias === 'Bearish'
                  ? '↓ ' : '→ '}{trade_setup.bias}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                Confidence
              </p>
              <p className={`text-lg font-bold ${
                trade_setup.confidence >= 70
                  ? 'text-green-400'
                  : trade_setup.confidence >= 50
                  ? 'text-emerald-400'
                  : 'text-red-400'
              }`}>
                {trade_setup.confidence}%
              </p>
            </div>
          </div>

          {/* Action */}
          <div className={`w-full py-2.5 rounded-xl text-sm font-bold text-center mb-4 ${
            trade_setup.bias === 'Bullish'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : trade_setup.bias === 'Bearish'
              ? 'bg-red-500/10 border border-red-500/30 text-red-400'
              : 'bg-surface-800 border border-surface-700 text-gray-300'
          }`}>
            {trade_setup.action}
          </div>

          {/* Entry/SL/Target Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-900 border border-surface-800 rounded-xl p-3">
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                Entry
              </p>
              <p className="text-gray-100 font-mono font-bold text-base mt-1">
                ₹{trade_setup.entry?.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-xl p-3">
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                Stop Loss
              </p>
              <p className="text-red-400 font-mono font-bold text-base mt-1">
                ₹{trade_setup.stop_loss?.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-xl p-3">
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                Target 1
              </p>
              <p className="text-emerald-400 font-mono font-bold text-base mt-1">
                ₹{trade_setup.target1?.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-xl p-3">
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                Target 2
              </p>
              <p className="text-emerald-400 font-mono font-bold text-base mt-1">
                ₹{trade_setup.target2?.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Risk Reward */}
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-surface-800">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">
              Risk : Reward
            </p>
            <p className="text-gray-200 font-semibold text-sm font-mono">
              1 : {trade_setup.risk_reward}
            </p>
          </div>

          {/* Pattern count */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-surface-800 text-xs">
            <span className="text-emerald-400 font-medium">
              ↑ {trade_setup.bullish_count} Bullish
            </span>
            <span className="text-red-400 font-medium">
              ↓ {trade_setup.bearish_count} Bearish
            </span>
            <span className="text-gray-400 font-medium">
              — {trade_setup.neutral_count} Neutral
            </span>
          </div>

          {/* Claude AI locked */}
          <div className="mt-3 p-3 bg-emerald-900/20 
                          border border-emerald-700/40 
                          rounded-lg">
            <p className="text-emerald-400 text-xs 
                          font-medium text-center">
              Claude AI Deep Analysis
            </p>
            <p className="text-gray-400 text-xs 
                          text-center mt-1">
              Multi-factor analysis with entry reasoning,
              risk assessment & market context
            </p>
            <p className="text-gray-500 text-xs 
                          text-center mt-1">
              Available in Claude AI Analysis tab
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatternAnalysis;
