import { cn } from '../../lib/cn';

/**
 * There were 167 card instances in the app written 87 different ways — four
 * radii, four padding values and ten background colours all applied to the same
 * role. This is that one role.
 *
 * `title` / `actions` are props rather than sub-components: a header is a
 * header, and CardHeader/CardTitle/CardBody would have been three extra
 * components to import for something a prop expresses fine.
 */

const PADDING = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export default function Card({
  title,
  subtitle,
  actions,
  padding = 'md',
  interactive = false,
  as: Tag = 'div',
  className,
  bodyClassName,
  children,
  ...props
}) {
  const hasHeader = Boolean(title || actions);

  return (
    <Tag
      className={cn(
        'bg-surface-900 border border-surface-800 rounded-xl',
        interactive &&
          'transition-colors duration-fast hover:border-surface-700 cursor-pointer',
        className,
      )}
      {...props}
    >
      {hasHeader && (
        <div
          className={cn(
            'flex items-start justify-between gap-3',
            PADDING[padding === 'none' ? 'md' : padding],
            'pb-0',
          )}
        >
          <div className="min-w-0">
            {title && (
              <h2 className="text-2xs font-semibold uppercase tracking-wider text-gray-500">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={cn(PADDING[padding], hasHeader && 'pt-3', bodyClassName)}>
        {children}
      </div>
    </Tag>
  );
}
