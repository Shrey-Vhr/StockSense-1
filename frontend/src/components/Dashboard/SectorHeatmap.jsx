import React from 'react';
import { useNavigate } from 'react-router-dom';

const SectorHeatmap = ({ sectors, isLoading }) => {
  const navigate = useNavigate();

  const getColor = (change) => {
    if (change > 2) return '#00c853';
    if (change > 1) return '#4caf50';
    if (change > 0) return '#8bc34a';
    if (change > -1) return '#ef9a9a';
    if (change > -2) return '#f44336';
    return '#b71c1c';
  };

  const handleSectorClick = (sectorName) => {
    // Navigate to screener and we can pass the sector in state or as a query param. 
    // Usually screener takes query params or state. Let's use query param.
    navigate(`/screener?sector=${encodeURIComponent(sectorName)}`);
  };

  if (isLoading || !sectors) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 h-28 animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {sectors.map(sector => (
        <div 
          key={sector.sector}
          onClick={() => handleSectorClick(sector.sector)}
          className="rounded-xl p-4 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg flex flex-col justify-between h-28 group relative overflow-hidden"
          style={{ 
            backgroundColor: getColor(sector.change_percent),
            opacity: Math.min(1, 0.85 + Math.abs(sector.change_percent) * 0.05)
          }}
        >
          <div>
            <p className="text-white font-bold text-sm md:text-base leading-tight">
              {sector.sector}
            </p>
            <p className="text-white text-xl md:text-2xl font-bold mt-1">
              {sector.change_percent > 0 ? '+' : ''}
              {sector.change_percent.toFixed(2)}%
            </p>
          </div>
          
          <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="text-white text-xs font-semibold bg-black/30 px-2 py-1 rounded">
              Top: {sector.top_stock} ({sector.top_stock_change > 0 ? '+' : ''}{sector.top_stock_change.toFixed(2)}%)
            </p>
          </div>
          
          {/* Default view before hover (just top stock name if wanted, but user spec says "Hover effect -> shows top stock") */}
          <div className="group-hover:opacity-0 transition-opacity duration-300">
             <p className="text-white text-xs opacity-75 truncate">
               {sector.top_stock}
             </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SectorHeatmap;
