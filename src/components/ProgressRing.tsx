interface ProgressRingProps {
  current: number;
  max: number;
  size?: number;
  strokeWidth?: number;
}

export default function ProgressRing({ current, max, size = 120, strokeWidth = 8 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = max > 0 ? Math.min(current / max, 1) : 0;
  const offset = circumference - percent * circumference;

  const getColor = (pct: number) => {
    if (pct >= 1) return '#22c55e';
    if (pct >= 0.75) return '#a78bfa';
    if (pct >= 0.5) return '#fbbf24';
    if (pct >= 0.25) return '#fb923c';
    return '#6b7280';
  };

  const color = getColor(percent);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1f2937"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>
          {Math.round(percent * 100)}%
        </span>
        <span className="text-xs text-gray-500">
          {current}/{max}
        </span>
      </div>
    </div>
  );
}
