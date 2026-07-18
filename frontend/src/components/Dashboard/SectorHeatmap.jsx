import React from 'react';
import { useNavigate } from 'react-router-dom';

const SectorHeatmap = ({ sectors, isLoading }) => {
  const navigate = useNavigate();

  const getBgClass = (change) => {
    if (change >= 1.5) return 'bg-emerald-500/40 border border-emerald-400/50 hover:bg-emerald-500/50';
    if (change >= 0) return 'bg-emerald-500/15 border border-emerald-500/20 hover:bg-emerald-500/25';
    if (change > -1.5) return 'bg-red-500/15 border border-red-500/20 hover:bg-red-500/25';
    return 'bg-red-500/40 border border-red-400/50 hover:bg-red-500/50';
  };

  const handleSectorClick = (sectorName) => {
    navigate(`/screener?sector=${encodeURIComponent(sectorName)}`);
  };

  if (isLoading || !sectors) {
    return (
      <div className="grid grid-cols-4 md:grid-cols-4 gap-2 h-full">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="bg-surface-800 rounded-lg p-2 h-24 animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 md:grid-cols-4 gap-2 h-full">
      {sectors.map(sector => (
        <div 
          key={sector.sector}
          onClick={() => handleSectorClick(sector.sector)}
          className={`flex flex-col items-center justify-center text-center p-2 rounded-lg transition-all duration-200 hover:scale-105 hover:z-10 cursor-pointer ${getBgClass(sector.change_percent)}`}
        >
          <span className="text-base font-bold text-white">
            {sector.change_percent > 0 ? '+' : ''}{sector.change_percent.toFixed(2)}%
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-white/80 mt-1">
            {sector.sector}
          </span>
          <span className="text-[10px] text-white/50 mt-0.5">
            {sector.top_stock}
          </span>
        </div>
      ))}
    </div>
  );
};

export default SectorHeatmap;
