import { cn } from '../../lib/cn';

/**
 * Sentiment pills, price-source tags, ETF/IDX markers, counts and status dots —
 * roughly 45 hand-rolled instances, each with its own padding and radius.
 *
 * `up` / `down` are here because badges are one of the few places market
 * direction legitimately appears as chrome (a +2.4% pill). Everything
 * non-directional uses `neutral` or `brand`.
 */

const VARIANTS = {
  neutral: 'bg-surface-800 text-gray-400 border-surface-700',
  brand:   'bg-brand-500/12 text-brand-400 border-brand-500/25',
  up:      'bg-up/10 text-up border-up/20',
  down:    'bg-down/10 text-down border-down/20',
  // `flat` exists because direction() returns 'up' | 'down' | 'flat' — without
  // it, an unchanged price rendered a completely unstyled badge.
  flat:    'bg-surface-800 text-flat border-surface-700',
  warn:    'bg-amber-400/10 text-amber-300 border-amber-400/20',
  outline: 'bg-transparent text-gray-400 border-surface-700',
};

const SIZES = {
  sm: 'text-2xs px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-0.5 gap-1.5',
};

export default function Badge({
  variant = 'neutral',
  size = 'sm',
  dot = false,
  icon: Icon,
  className,
  children,
  ...props
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center border rounded-md font-medium whitespace-nowrap',
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />}
      {Icon && <Icon size={size === 'sm' ? 10 : 12} aria-hidden="true" />}
      {children}
    </span>
  );
}
