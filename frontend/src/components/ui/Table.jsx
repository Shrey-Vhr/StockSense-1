import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * Table primitives, not a config-driven DataTable.
 *
 * Five surfaces need tables (Screener results, Portfolio holdings, Watchlist,
 * ETF rolling returns, Dashboard movers) and they genuinely differ — the
 * Screener's columns are derived at runtime from the active indicators. Forcing
 * all five through one column schema would have been more machinery than the
 * problem needs. These primitives carry the rules that must be consistent —
 * sticky header, alignment, tabular numerals, hover — and leave layout alone.
 *
 * Real <table> semantics throughout: Screener and Watchlist currently fake
 * tables with flex and grid, so screen readers get no row/column relationship
 * and the header does not stick.
 */

export function Table({ className, children, ...props }) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn('w-full border-collapse text-sm', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function THead({ sticky = true, className, children, ...props }) {
  return (
    <thead
      className={cn(
        'bg-surface-850',
        sticky && 'sticky top-0 z-10',
        className,
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TBody({ divided = true, className, children, ...props }) {
  // A prop rather than a `divide-y-0` override from the caller: two `divide-*`
  // utilities on one element resolve by stylesheet order, not by which one the
  // caller wrote last, so overriding from outside is unreliable.
  return (
    <tbody className={cn(divided && 'divide-y divide-surface-800', className)} {...props}>
      {children}
    </tbody>
  );
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' };

export function Th({
  align = 'left',
  sortable = false,
  sorted = null, // 'asc' | 'desc' | null
  onSort,
  hint,
  className,
  children,
  ...props
}) {
  const Icon = sorted === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : undefined}
      className={cn(
        'px-3 py-2.5 text-2xs font-semibold uppercase tracking-wider text-gray-500',
        'border-b border-surface-800 whitespace-nowrap',
        ALIGN[align],
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          title={hint}
          className={cn(
            'inline-flex items-center gap-1 uppercase tracking-wider',
            'transition-colors duration-fast hover:text-gray-300',
            sorted && 'text-gray-300',
            align === 'right' && 'flex-row-reverse',
          )}
        >
          {children}
          <Icon size={11} className={cn(!sorted && 'opacity-0 group-hover:opacity-40')} aria-hidden="true" />
        </button>
      ) : hint ? (
        <span title={hint} className="border-b border-dashed border-gray-600 cursor-help">
          {children}
        </span>
      ) : (
        children
      )}
    </th>
  );
}

export function Tr({ interactive = false, onClick, className, children, ...props }) {
  // Clickable rows were plain divs with onClick and no way to reach them from
  // the keyboard. Making the row focusable and operable with Enter/Space is the
  // minimum; Phase 13 revisits whether the first cell should carry a real link.
  const interactiveProps = interactive && onClick
    ? {
        tabIndex: 0,
        onClick,
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(e);
          }
        },
      }
    : { onClick };

  return (
    <tr
      className={cn(
        'transition-colors duration-fast',
        interactive && 'hover:bg-surface-800/50 cursor-pointer',
        className,
      )}
      {...interactiveProps}
      {...props}
    >
      {children}
    </tr>
  );
}

export function Td({
  align = 'left',
  numeric = false,
  muted = false,
  className,
  children,
  ...props
}) {
  return (
    <td
      className={cn(
        'px-3 py-3 whitespace-nowrap',
        // Numeric columns are right-aligned and tabular so digits line up
        // vertically — the single biggest readability win in a price table.
        numeric ? 'text-right tnum font-mono' : ALIGN[align],
        muted ? 'text-gray-500' : 'text-gray-200',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}
