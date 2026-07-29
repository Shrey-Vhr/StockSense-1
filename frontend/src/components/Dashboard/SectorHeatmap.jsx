import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { formatPercent, direction } from '../../lib/format';
import { SkeletonBox } from '../Skeleton';

/**
 * Sector performance grid.
 *
 * The previous version painted each tile with a translucent green or red and
 * put white/80 and white/50 text on top. At low deltas the tint was almost
 * invisible; at high deltas the white-on-saturated-colour text dropped well
 * under 4.5:1. Tiles were also plain divs with onClick — not reachable by
 * keyboard at all, despite being the entry point into a filtered screener.
 *
 * Now the background stays dark and only its tint varies with magnitude, so
 * text contrast is constant and high regardless of the move, and the number
 * itself carries the direction colour.
 */

/** Four intensity steps per direction, keyed off absolute move. */
function tileTone(change) {
  const dir = direction(change);
  if (dir === 'flat') return { bg: 'bg-surface-800', border: 'border-surface-700', value: 'text-flat' };

  const magnitude = Math.min(Math.abs(change) / 2.5, 1); // 2.5% saturates
  const step = magnitude > 0.75 ? 3 : magnitude > 0.45 ? 2 : magnitude > 0.15 ? 1 : 0;

  const up = [
    'bg-up/[0.06] border-up/15',
    'bg-up/[0.10] border-up/25',
    'bg-up/[0.16] border-up/35',
    'bg-up/[0.22] border-up/45',
  ];
  const down = [
    'bg-down/[0.06] border-down/15',
    'bg-down/[0.10] border-down/25',
    'bg-down/[0.16] border-down/35',
    'bg-down/[0.22] border-down/45',
  ];

  const [bg, border] = (dir === 'up' ? up : down)[step].split(' ');
  return { bg, border, value: dir === 'up' ? 'text-up' : 'text-down' };
}

const SectorHeatmap = ({ sectors, isLoading }) => {
  const navigate = useNavigate();

  if (isLoading || !sectors) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {[...Array(12)].map((_, i) => (
          <SkeletonBox key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {sectors.map((sector) => {
        const tone = tileTone(sector.change_percent);
        return (
          <button
            key={sector.sector}
            type="button"
            onClick={() => navigate(`/screener?sector=${encodeURIComponent(sector.sector)}`)}
            aria-label={`${sector.sector}, ${formatPercent(sector.change_percent)}. Open in screener.`}
            className={cn(
              'flex flex-col items-start justify-center gap-0.5 text-left',
              'h-20 px-3 rounded-lg border transition-colors duration-fast',
              'hover:border-surface-600',
              tone.bg,
              tone.border,
            )}
          >
            <span className={cn('text-base font-semibold tnum', tone.value)}>
              {formatPercent(sector.change_percent)}
            </span>
            <span className="text-2xs font-medium uppercase tracking-wider text-gray-400 truncate w-full">
              {sector.sector}
            </span>
            {sector.top_stock && (
              <span className="text-2xs text-gray-600 truncate w-full">{sector.top_stock}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default SectorHeatmap;
