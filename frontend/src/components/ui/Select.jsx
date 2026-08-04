import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

const SIZES = {
  sm: 'h-8 text-xs pl-2.5 pr-8 rounded-md',
  md: 'h-9 text-sm pl-3 pr-9 rounded-lg',
  lg: 'h-11 text-sm pl-3.5 pr-10 rounded-lg',
};

/**
 * Native `<select>` with the chevron the app was already drawing by hand at
 * every call site (an absolutely-positioned lucide icon plus `appearance-none`,
 * repeated six times with slightly different offsets).
 *
 * Native is the right call here: it gives keyboard and screen-reader behaviour,
 * mobile pickers and `<optgroup>` support for free — the Screener's grouped
 * indicator list depends on optgroup, and a custom listbox would have to
 * reimplement all of it.
 */
const Select = forwardRef(function Select(
  { size = 'md', invalid = false, className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'w-full appearance-none cursor-pointer bg-surface-950 text-gray-100',
          'border transition-colors duration-fast',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          invalid
            ? 'border-down/50 focus:border-down'
            : 'border-surface-700 hover:border-surface-600 focus:border-brand-500',
          SIZES[size],
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        aria-hidden="true"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
      />
    </div>
  );
});

export default Select;
