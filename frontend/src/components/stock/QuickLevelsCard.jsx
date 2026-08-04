import { Target } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * Floating overlay on the chart showing the AI trade setup, with a toggle that
 * draws the levels onto the candles.
 *
 * Colour reassignment: entry was emerald and the targets were teal, which put
 * three different greens on one small panel and made "entry" and "target" look
 * like the same kind of thing. Entry is now neutral (it is a level, not a
 * direction), targets are the up tone and the stop is the down tone — so the
 * panel reads as "risk below, reward above" at a glance.
 */
const QuickLevelsCard = ({ aiTradeSetup, showAiLevels, setShowAiLevels }) => {
  if (!aiTradeSetup) return null;

  const rows = [
    { label: 'Entry', value: aiTradeSetup.entry, tone: 'text-gray-100' },
    { label: 'Stop loss', value: aiTradeSetup.sl || aiTradeSetup.stop_loss, tone: 'text-down' },
    { label: 'Target 1', value: aiTradeSetup.t1 || aiTradeSetup.target_1, tone: 'text-up' },
    { label: 'Target 2', value: aiTradeSetup.t2 || aiTradeSetup.target_2, tone: 'text-up' },
    { label: 'Target 3', value: aiTradeSetup.t3 || aiTradeSetup.target_3, tone: 'text-up', optional: true },
  ];

  return (
    <div className="absolute bottom-4 right-4 z-10 w-52 rounded-xl p-3
                    bg-surface-900/85 backdrop-blur-sm border border-surface-700 shadow-lg">
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-surface-800">
        <span className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-gray-400">
          <Target size={12} className="text-brand-400" aria-hidden="true" />
          AI setup
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowAiLevels(!showAiLevels); }}
          aria-pressed={showAiLevels}
          className={cn(
            'px-2 py-0.5 rounded-md text-2xs font-semibold transition-colors duration-fast',
            showAiLevels
              ? 'bg-brand-500/15 text-brand-400'
              : 'bg-surface-800 text-gray-400 hover:bg-surface-700 hover:text-gray-200',
          )}
        >
          {showAiLevels ? 'Hide' : 'Show'}
        </button>
      </div>

      <dl className="space-y-1.5 pointer-events-none">
        {rows.map(({ label, value, tone, optional }) => {
          if (optional && !value) return null;
          return (
            <div key={label} className="flex justify-between items-center gap-2">
              <dt className="text-2xs text-gray-500">{label}</dt>
              <dd className={cn('text-xs font-medium font-mono tnum', tone)}>
                {value || 'N/A'}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
};

export default QuickLevelsCard;
