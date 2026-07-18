import React from 'react';

const Sparkline = ({ data = [], width = 60, height = 24 }) => {
  if (!data || data.length < 2) {
    return (
      <div 
        style={{ width: `${width}px`, height: `${height}px` }} 
        className="bg-surface-800 rounded animate-pulse"
      />
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Map data to SVG coordinates
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    // Add a tiny bit of padding so lines don't get cut off at the exact edge
    const padding = 2;
    const innerHeight = height - padding * 2;
    const y = padding + innerHeight - ((val - min) / range) * innerHeight;
    return `${x},${y}`;
  });

  const isUptrend = data[data.length - 1] >= data[0];
  const color = isUptrend ? '#34d399' : '#f87171'; // emerald-400 : red-400

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(' ')}
      />
    </svg>
  );
};

export default Sparkline;
