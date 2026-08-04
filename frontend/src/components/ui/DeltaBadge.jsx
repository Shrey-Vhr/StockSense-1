import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Badge from './Badge';
import { formatPercent, formatChange, direction } from '../../lib/format';

/**
 * The ±x.xx% pill. Roughly 40 instances across Dashboard, TrendingSection,
 * Screener, Watchlist and StockDetail, every one of them independently
 * re-deriving the sign, the colour ternary and the decimal count — which is
 * why some show "+2.5%" and others "2.46%".
 *
 * Direction comes from lib/format's `direction()`, so "what colour is this"
 * has exactly one answer in the codebase.
 */

const ICONS = { up: TrendingUp, down: TrendingDown, flat: Minus };

export default function DeltaBadge({
  value,
  absolute,
  decimals = 2,
  showIcon = false,
  size = 'sm',
  className,
  ...props
}) {
  const dir = direction(value);
  const Icon = ICONS[dir];

  return (
    <Badge
      variant={dir}
      size={size}
      icon={showIcon ? Icon : undefined}
      className={className}
      {...props}
    >
      <span className="tnum">
        {absolute !== undefined && `${formatChange(absolute, { decimals })} `}
        {formatPercent(value, { decimals })}
      </span>
    </Badge>
  );
}
