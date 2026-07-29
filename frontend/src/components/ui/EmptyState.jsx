import { cn } from '../../lib/cn';

/**
 * Six surfaces need an empty state and all six wrote their own, ranging from a
 * centred icon and two lines to a single grey sentence in a table cell. Two of
 * the six (News, Portfolio) had effectively none.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = 'md',
  className,
}) {
  const pad = size === 'sm' ? 'py-8' : 'py-14';
  const iconSize = size === 'sm' ? 24 : 32;

  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6', pad, className)}>
      {Icon && (
        <div className="mb-3 flex items-center justify-center w-11 h-11 rounded-xl bg-surface-800 text-gray-500">
          <Icon size={iconSize === 24 ? 18 : 20} aria-hidden="true" />
        </div>
      )}
      {title && <p className="text-sm font-medium text-gray-300">{title}</p>}
      {description && (
        <p className="text-xs text-gray-500 mt-1 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
