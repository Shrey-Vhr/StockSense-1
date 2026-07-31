import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import api from "../utils/api";
import { Badge, Card, MetricTile } from "./ui";
import { SkeletonBox } from "./Skeleton";
import { stagger, listItem } from "../lib/motion";

/**
 * Pattern type and trade bias are both market signals, so they take the up/down
 * tokens. "Neutral" takes `warn`.
 *
 * That last part is a fix, not a preference: a neutral bias rendered
 * `text-emerald-400` and a bullish one `text-green-400` — two greens a pixel
 * apart in hue. The one state that means "no directional edge" was drawn as the
 * one that means "buy".
 *
 * Pattern types arrive lowercase ("bullish") and bias capitalised ("Bullish"),
 * so the lookup normalises rather than keeping two maps in sync.
 */
const TONES = {
  bullish: { text: 'text-up',   panel: 'bg-up/10 border-up/25',     badge: 'up',   arrow: '↑' },
  bearish: { text: 'text-down', panel: 'bg-down/10 border-down/25', badge: 'down', arrow: '↓' },
  neutral: { text: 'text-warn', panel: 'bg-warn/10 border-warn/25', badge: 'warn', arrow: '→' },
};

const toneOf = (value) => TONES[String(value ?? '').toLowerCase()] ?? TONES.neutral;

/**
 * Same problem as the bias: 70+ was green and 50–69 was *also* green, so the
 * threshold the colour existed to communicate was invisible.
 */
const confidenceTone = (value) =>
  value >= 70 ? 'text-up' : value >= 50 ? 'text-warn' : 'text-down';

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
    <Card title="Chart Patterns" className="mt-4">
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <SkeletonBox key={i} className="h-14 rounded-lg" />)}
      </div>
    </Card>
  );

  if (error || !data) return null;

  const { patterns, trade_setup } = data;

  if (!patterns || patterns.length === 0) return (
    <Card title="Chart Patterns" className="mt-4">
      <p className="text-sm text-gray-500">
        No significant patterns detected recently
      </p>
    </Card>
  );

  const bias = toneOf(trade_setup?.bias);

  return (
    <div className="space-y-4 mt-4">

      {/* ── Detected patterns ─────────────────────────────────────────────── */}
      <Card title="Chart Patterns Detected">
        <motion.div
          className="space-y-2"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {patterns.map((pattern, i) => {
            const tone = toneOf(pattern.type);
            return (
              <motion.div
                key={i}
                variants={listItem}
                className={`p-3 rounded-lg border ${tone.panel}`}
              >
                <div className="flex justify-between items-center gap-3">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-100">
                      {pattern.emoji} {pattern.name}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {pattern.date}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={tone.badge}>
                      {pattern.type.toUpperCase()}
                    </Badge>
                    <span className="text-xs font-medium text-gray-500 tnum">
                      {pattern.confidence}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {pattern.signal}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </Card>

      {/* ── Rule-based setup ──────────────────────────────────────────────── */}
      {trade_setup && trade_setup.bias && (
        <Card title="Rule-Based Trade Setup">
          <div className="flex justify-between items-start gap-4 mb-4">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-gray-500">
                Pattern Bias
              </p>
              <p className={`text-lg font-semibold mt-1 ${bias.text}`}>
                {bias.arrow} {trade_setup.bias}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xs font-semibold uppercase tracking-wider text-gray-500">
                Confidence
              </p>
              <p className={`text-lg font-semibold tnum mt-1 ${confidenceTone(trade_setup.confidence)}`}>
                {trade_setup.confidence}%
              </p>
            </div>
          </div>

          <div className={`w-full py-2.5 rounded-lg border text-sm font-semibold text-center mb-4
                           ${bias.panel} ${bias.text}`}>
            {trade_setup.action}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricTile
              label="Entry"
              value={`₹${trade_setup.entry?.toLocaleString('en-IN')}`}
              size="sm"
              className="font-mono"
            />
            <MetricTile
              label="Stop Loss"
              value={`₹${trade_setup.stop_loss?.toLocaleString('en-IN')}`}
              tone="down"
              size="sm"
              className="font-mono"
            />
            <MetricTile
              label="Target 1"
              value={`₹${trade_setup.target1?.toLocaleString('en-IN')}`}
              tone="up"
              size="sm"
              className="font-mono"
            />
            <MetricTile
              label="Target 2"
              value={`₹${trade_setup.target2?.toLocaleString('en-IN')}`}
              tone="up"
              size="sm"
              className="font-mono"
            />
          </div>

          <div className="flex justify-between items-center mt-3 pt-3 border-t border-surface-800">
            <p className="text-2xs font-semibold uppercase tracking-wider text-gray-500">
              Risk : Reward
            </p>
            <p className="text-sm font-semibold font-mono tnum text-gray-200">
              1 : {trade_setup.risk_reward}
            </p>
          </div>

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-surface-800 text-xs">
            <span className="font-medium text-up tnum">
              ↑ {trade_setup.bullish_count} Bullish
            </span>
            <span className="font-medium text-down tnum">
              ↓ {trade_setup.bearish_count} Bearish
            </span>
            <span className="font-medium text-gray-400 tnum">
              — {trade_setup.neutral_count} Neutral
            </span>
          </div>

          {/* A pointer to another tab is chrome, not a market signal. It was
              emerald, which put a green panel directly under a bias that may
              well be bearish. */}
          <div className="mt-3 p-3 rounded-lg bg-brand-500/10 border border-brand-500/25">
            <p className="text-xs font-medium text-center text-brand-400">
              Claude AI Deep Analysis
            </p>
            <p className="text-xs text-center text-gray-400 mt-1">
              Multi-factor analysis with entry reasoning,
              risk assessment &amp; market context
            </p>
            <p className="text-xs text-center text-gray-500 mt-1">
              Available in Claude AI Analysis tab
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PatternAnalysis;
