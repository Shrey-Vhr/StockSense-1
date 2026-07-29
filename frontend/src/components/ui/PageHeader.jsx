import { cn } from '../../lib/cn';

/**
 * Every one of the ten pages opens with a title block, and every one spells it
 * differently — text-2xl vs text-3xl, some with an icon, some with a subtitle,
 * some with a bottom border, actions floated three different ways. This is that
 * block, once.
 *
 * Renders an <h1>. Several pages currently have no h1 at all, or start their
 * heading hierarchy at h2, which breaks document outline for screen readers.
 */
export default function PageHeader({
  title,
  subtitle,
  actions,
  icon: Icon,
  className,
  children,
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500/12 text-brand-400 shrink-0">
              <Icon size={17} aria-hidden="true" />
            </span>
          )}
          <h1 className="text-xl font-semibold text-gray-100 tracking-tight truncate">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{subtitle}</p>
        )}
        {children}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
