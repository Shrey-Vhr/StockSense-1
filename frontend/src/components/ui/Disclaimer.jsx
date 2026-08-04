import { Info } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * Shown wherever the app puts a trade recommendation on screen — a verdict, an
 * entry, a stop loss, a target.
 *
 * A component rather than three copies of a sentence, because the point is that
 * the wording stays identical everywhere it appears. If it needs to change, it
 * changes once.
 *
 * Deliberately quiet rather than alarming: it should read as a standing note,
 * not an error state, so `neutral` tones rather than `warn` or `down`.
 */
export default function Disclaimer({ className }) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 text-2xs leading-relaxed text-gray-500',
        'rounded-lg border border-surface-800 bg-surface-950 px-3 py-2.5',
        className,
      )}
    >
      <Info size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>
        For educational purposes only. This is not investment advice, and the
        author is not a registered investment adviser or research analyst.
        AI-generated analysis can be inaccurate or incomplete — verify
        independently before acting on it.
      </span>
    </p>
  );
}
