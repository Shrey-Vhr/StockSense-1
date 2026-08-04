import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

const SIZES = {
  sm: 'h-8 text-xs px-2.5 rounded-md',
  md: 'h-9 text-sm px-3 rounded-lg',
  lg: 'h-11 text-sm px-3.5 rounded-lg',
};

/**
 * Text/number input.
 *
 * Deliberately does NOT set `focus:outline-none`. Eighteen call sites in the
 * app do, which killed the focus ring and left keyboard users with nothing to
 * follow — the global :focus-visible outline from Phase 1 handles it here.
 *
 * Numeric inputs get tabular figures via the base rule in index.css, so digits
 * stop shifting as you type.
 */
const Input = forwardRef(function Input(
  { size = 'md', invalid = false, icon: Icon, className, type = 'text', ...props },
  ref,
) {
  const input = (
    <input
      ref={ref}
      type={type}
      className={cn(
        'w-full bg-surface-950 text-gray-100 placeholder:text-gray-500',
        'border transition-colors duration-fast',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        invalid
          ? 'border-down/50 focus:border-down'
          : 'border-surface-700 hover:border-surface-600 focus:border-brand-500',
        SIZES[size],
        Icon && 'pl-9',
        className,
      )}
      {...props}
    />
  );

  if (!Icon) return input;

  return (
    <div className="relative">
      <Icon
        size={15}
        aria-hidden="true"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
      />
      {input}
    </div>
  );
});

export default Input;
