import { motion } from 'framer-motion';

const shimmer = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'linear',
  },
};

export const SkeletonBox = ({ 
  className = '',
  width,
  height 
}) => (
  <motion.div
    className={`rounded-lg ${className}`}
    style={{
      width,
      height,
      background: `linear-gradient(
        90deg,
        #1a1f2e 25%,
        #222840 50%,
        #1a1f2e 75%
      )`,
      backgroundSize: '200% 100%',
    }}
    animate={shimmer.animate}
    transition={shimmer.transition}
  />
);

export const SkeletonText = ({ 
  lines = 1, 
  className = '' 
}) => (
  <div className={`space-y-2 ${className}`}>
    {[...Array(lines)].map((_, i) => (
      <SkeletonBox
        key={i}
        className="h-4 rounded"
        style={{ 
          width: i === lines - 1 && lines > 1 
            ? '60%' 
            : '100%' 
        }}
      />
    ))}
  </div>
);

export const StockDetailSkeleton = () => (
  <div className="animate-pulse">
    {/* Header */}
    <div className="flex justify-between 
                    items-start px-6 py-4 
                    bg-surface-850 border-b 
                    border-surface-800">
      <div className="space-y-2">
        <SkeletonBox className="h-8 w-32" />
        <SkeletonBox className="h-4 w-24" />
      </div>
      <div className="space-y-2 text-right">
        <SkeletonBox className="h-10 w-36" />
        <SkeletonBox className="h-4 w-20 ml-auto" />
      </div>
    </div>
    
    {/* Chart */}
    <SkeletonBox className="h-80 w-full 
                            rounded-none" />
    
    {/* Tabs */}
    <div className="flex gap-1 px-4 py-2 
                    border-b border-surface-800">
      {[...Array(5)].map((_, i) => (
        <SkeletonBox key={i} 
                     className="h-8 w-24 
                                rounded-lg" />
      ))}
    </div>
    
    {/* Content */}
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <SkeletonBox key={i} 
                       className="h-20 
                                  rounded-xl" />
        ))}
      </div>
      <SkeletonBox className="h-40 rounded-2xl" />
      <SkeletonBox className="h-60 rounded-2xl" />
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="p-6 max-w-7xl mx-auto 
                  space-y-6">
    <SkeletonBox className="h-8 w-48" />
    <div className="grid grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <SkeletonBox key={i} 
                     className="h-40 rounded-2xl" />
      ))}
    </div>
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-4">
        <SkeletonBox className="h-48 rounded-2xl" />
        <SkeletonBox className="h-48 rounded-2xl" />
      </div>
      <SkeletonBox className="h-96 rounded-2xl" />
    </div>
  </div>
);

export const ScreenerSkeleton = () => (
  <div className="p-6 space-y-4">
    <SkeletonBox className="h-8 w-64" />
    <SkeletonBox className="h-32 rounded-2xl" />
    <div className="space-y-2">
      {[...Array(8)].map((_, i) => (
        <SkeletonBox key={i} 
                     className="h-14 rounded-xl" />
      ))}
    </div>
  </div>
);

export const WatchlistSkeleton = () => (
  <div className="p-6 flex gap-4">
    <SkeletonBox className="w-48 h-64 
                            rounded-2xl 
                            flex-shrink-0" />
    <div className="flex-1 space-y-3">
      <SkeletonBox className="h-12 rounded-xl" />
      {[...Array(5)].map((_, i) => (
        <SkeletonBox key={i} 
                     className="h-14 rounded-xl" />
      ))}
    </div>
  </div>
);
