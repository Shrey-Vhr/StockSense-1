import { cn } from '../../lib/cn';

const SIZES = {
  sm: 'w-3.5 h-3.5 border-[1.5px]',
  md: 'w-4 h-4 border-2',
  lg: 'w-6 h-6 border-2',
};

/**
 * Indeterminate spinner. CSS-driven rather than framer, so it costs nothing on
 * a page that already has a dozen of them and honours prefers-reduced-motion
 * through the global rule in index.css.
 */
export default function Spinner({ size = 'md', className, label = 'Loading' }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block rounded-full border-current border-t-transparent animate-spin align-[-0.125em]',
        SIZES[size],
        className,
      )}
    />
  );
}
