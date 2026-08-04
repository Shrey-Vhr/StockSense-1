import { forwardRef } from 'react';
import { cn } from '../../lib/cn';
import Spinner from './Spinner';

/**
 * The app had 65 button instances written 45 different ways — some `<button>`,
 * some `<a>`, some divs, with padding ranging across seven values and no shared
 * disabled, hover or focus treatment.
 *
 * Variants are non-overlapping class sets, so nothing here can collide with a
 * caller's `className` (see lib/cn.js for that contract).
 *
 * Colour note: `primary` is brand indigo, never green. Green and red are
 * reserved for market direction, so a green button can no longer be mistaken
 * for a market signal. `danger` is the one deliberate exception — it borrows
 * the down tone because destructive intent is exactly what red should mean.
 */

const VARIANTS = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-xs',
  secondary:
    'bg-surface-800 text-gray-100 border border-surface-700 hover:bg-surface-700 hover:border-surface-600',
  ghost:
    'text-gray-400 hover:text-gray-100 hover:bg-surface-800',
  outline:
    'border border-surface-700 text-gray-300 hover:border-brand-500/60 hover:text-brand-400',
  danger:
    'bg-down/10 text-down border border-down/30 hover:bg-down/20',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-lg',
};

const ICON_SIZES = {
  sm: 'h-8 w-8 rounded-md',
  md: 'h-9 w-9 rounded-lg',
  lg: 'h-11 w-11 rounded-lg',
};

const Button = forwardRef(function Button(
  {
    as: Tag = 'button',
    variant = 'secondary',
    size = 'md',
    icon: Icon,
    iconRight: IconRight,
    iconOnly = false,
    loading = false,
    disabled = false,
    className,
    children,
    type,
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const iconPx = size === 'lg' ? 17 : size === 'sm' ? 14 : 15;

  if (iconOnly && !props['aria-label']) {
    // Icon-only controls were the single biggest accessibility gap in the audit
    // — the bell, hamburger and every close button were unlabelled.
    console.warn('Button: iconOnly requires an aria-label.');
  }

  return (
    <Tag
      ref={ref}
      type={Tag === 'button' ? type || 'button' : type}
      disabled={Tag === 'button' ? isDisabled : undefined}
      aria-disabled={Tag === 'button' ? undefined : isDisabled || undefined}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap',
        'transition-colors duration-fast ease-in-out-soft',
        'disabled:opacity-45 disabled:pointer-events-none',
        iconOnly ? ICON_SIZES[size] : SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Spinner size={size === 'lg' ? 'md' : 'sm'} />
      ) : (
        Icon && <Icon size={iconPx} aria-hidden="true" />
      )}
      {!iconOnly && children}
      {!loading && IconRight && <IconRight size={iconPx} aria-hidden="true" />}
    </Tag>
  );
});

export default Button;
