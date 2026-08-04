import { useId } from 'react';

/**
 * Dependency-free trend sparkline.
 *
 * There were two of these: this one, and a second implementation inside
 * Watchlist.jsx with a different viewBox, a different stroke width and a
 * different rule for deciding the colour — Watchlist coloured by the parent's
 * `change_pct`, this one by comparing first and last points, so the same stock
 * could render a green line here and a red one there.
 *
 * `isPositive` now takes the deciding value when the caller has one (the
 * day's change), falling back to first-vs-last only when it does not. That is
 * the Watchlist behaviour, which is the correct one — a 7-day line should be
 * coloured by the move it depicts, not by two endpoints.
 */
export default function Sparkline({
  data = [],
  width = 60,
  height = 24,
  isPositive,
  strokeWidth = 1.75,
  className,
}) {
  const gradientId = useId();

  if (!data || data.length < 2) {
    return (
      <div
        style={{ width, height }}
        className="rounded bg-surface-800/60"
        aria-hidden="true"
      />
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const inner = height - pad * 2;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = pad + inner - ((val - min) / range) * inner;
    return [x, y];
  });

  const up = isPositive !== undefined ? isPositive : data[data.length - 1] >= data[0];
  const stroke = up ? 'rgb(var(--up))' : 'rgb(var(--down))';
  const line = points.map(([x, y]) => `${x},${y}`).join(' ');
  const area = `${line} ${width},${height} 0,${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={up ? 'Trending up' : 'Trending down'}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
