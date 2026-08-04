import { cn } from '../lib/cn';

/**
 * Loading skeletons.
 *
 * Two changes here, both fixes rather than restyling:
 *
 * 1. The shimmer was a framer-motion animation with `repeat: Infinity`, one
 *    instance per box. A dashboard skeleton mounted a dozen JS-driven loops
 *    before any data arrived. It is now a CSS keyframe, which the browser runs
 *    off the main thread and which the global prefers-reduced-motion rule in
 *    index.css already covers.
 *
 * 2. `SkeletonText` passed a `style` prop to `SkeletonBox`, which ignored it —
 *    so the "last line is 60% width" effect silently never worked and every
 *    line rendered full width. SkeletonBox now accepts style.
 */

export const SkeletonBox = ({ className = '', width, height, style }) => (
  <div
    aria-hidden="true"
    className={cn('skeleton rounded-lg', className)}
    style={{ width, height, ...style }}
  />
);

export const SkeletonText = ({ lines = 1, className = '' }) => (
  <div className={cn('space-y-2', className)}>
    {[...Array(lines)].map((_, i) => (
      <SkeletonBox
        key={i}
        className="h-4 rounded"
        style={{ width: i === lines - 1 && lines > 1 ? '60%' : '100%' }}
      />
    ))}
  </div>
);

/** Wrapper that announces loading state to assistive tech. */
const Loading = ({ label, children, className }) => (
  <div role="status" aria-live="polite" aria-label={label} className={className}>
    {children}
  </div>
);

export const StockDetailSkeleton = () => (
  <Loading label="Loading stock details">
    <div className="px-6 py-5 border-b border-surface-800 flex justify-between items-start">
      <div className="space-y-2">
        <SkeletonBox className="h-8 w-32" />
        <SkeletonBox className="h-4 w-24" />
      </div>
      <div className="space-y-2 flex flex-col items-end">
        <SkeletonBox className="h-10 w-36" />
        <SkeletonBox className="h-4 w-20" />
      </div>
    </div>

    <SkeletonBox className="h-80 w-full rounded-none" />

    <div className="flex gap-2 px-4 py-3 border-b border-surface-800">
      {[...Array(5)].map((_, i) => (
        <SkeletonBox key={i} className="h-8 w-24 rounded-lg" />
      ))}
    </div>

    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <SkeletonBox key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <SkeletonBox className="h-40 rounded-xl" />
      <SkeletonBox className="h-60 rounded-xl" />
    </div>
  </Loading>
);

export const DashboardSkeleton = () => (
  <Loading label="Loading market overview">
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-5">
      <SkeletonBox className="h-7 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <SkeletonBox key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <SkeletonBox className="h-64 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonBox className="h-72 rounded-xl" />
            <SkeletonBox className="h-72 rounded-xl" />
          </div>
        </div>
        <SkeletonBox className="h-[32rem] rounded-xl" />
      </div>
    </div>
  </Loading>
);

export const ScreenerSkeleton = () => (
  <Loading label="Loading screener">
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-5">
      <SkeletonBox className="h-7 w-64" />
      <SkeletonBox className="h-40 rounded-xl" />
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <SkeletonBox key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    </div>
  </Loading>
);

export const WatchlistSkeleton = () => (
  <Loading label="Loading watchlists">
    <div className="p-3 sm:p-6 max-w-6xl mx-auto flex flex-col sm:flex-row gap-4">
      <SkeletonBox className="w-full sm:w-48 h-64 rounded-xl shrink-0" />
      <div className="flex-1 space-y-3">
        <SkeletonBox className="h-12 rounded-lg" />
        {[...Array(5)].map((_, i) => (
          <SkeletonBox key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    </div>
  </Loading>
);
