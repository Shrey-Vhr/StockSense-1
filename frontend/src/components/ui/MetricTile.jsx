import { cn } from '../../lib/cn';

/**
 * One component for what were two near-identical patterns: the 20-instance
 * "metric card" in Index/ETF detail and the 13-instance "stat tile" in
 * StockDetail and Portfolio. They differed only in padding and radius.
 *
 * Values are `tnum` by default. These sit in grids where numbers are compared
 * column-to-column, and proportional digits made them fail to line up.
 */

const TONES = {
  default: 'text-gray-100',
  up: 'text-up',
  down: 'text-down',
  brand: 'text-brand-400',
  muted: 'text-gray-400',
};

const SIZES = {
  sm: { pad: 'p-3', value: 'text-base' },
  md: { pad: 'p-4', value: 'text-lg' },
  lg: { pad: 'p-4', value: 'text-2xl' },
};

export default function MetricTile({
  label,
  value,
  sublabel,
  tone = 'default',
  size = 'md',
  align = 'left',
  hint,
  icon: Icon,
  className,
  children,
  ...props
}) {
  const s = SIZES[size];

  return (
    <div
      className={cn(
        'bg-surface-900 border border-surface-800 rounded-lg',
        'transition-colors duration-fast hover:border-surface-700',
        s.pad,
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          'flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider text-gray-500',
          align === 'center' && 'justify-center',
          align === 'right' && 'justify-end',
        )}
      >
        {Icon && <Icon size={11} aria-hidden="true" />}
        <span title={hint} className={cn(hint && 'border-b border-dashed border-gray-600 cursor-help')}>
          {label}
        </span>
      </div>

      {value !== undefined && (
        <div className={cn('mt-1.5 font-semibold tnum leading-tight', s.value, TONES[tone])}>
          {value}
        </div>
      )}

      {sublabel && <div className="mt-1 text-xs text-gray-500 tnum">{sublabel}</div>}
      {children}
    </div>
  );
}
