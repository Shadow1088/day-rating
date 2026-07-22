import { useMemo } from 'react';
import { format, subDays, parseISO, startOfWeek } from 'date-fns';
import type { Submission } from '../types';

interface HeatmapProps {
  submissions: Submission[];
  weeks?: number;
}

export default function Heatmap({ submissions, weeks = 16 }: HeatmapProps) {
  const { grid } = useMemo(() => {
    const pointsByDate: Record<string, number> = {};
    submissions.forEach(s => {
      pointsByDate[s.date] = (pointsByDate[s.date] || 0) + s.totalPoints;
    });

    const maxPts = Math.max(...Object.values(pointsByDate), 1);
    const today = new Date();
    const totalDays = weeks * 7;
    const startDate = subDays(today, totalDays - 1);
    const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });

    const days: { date: string; label: string; points: number; level: number }[] = [];
    const current = new Date(weekStart);
    while (current <= today) {
      const dateStr = format(current, 'yyyy-MM-dd');
      const pts = pointsByDate[dateStr] || 0;
      let level = 0;
      if (pts > 0) {
        const ratio = pts / maxPts;
        if (ratio >= 0.75) level = 4;
        else if (ratio >= 0.5) level = 3;
        else if (ratio >= 0.25) level = 2;
        else level = 1;
      }
      days.push({
        date: dateStr,
        label: format(current, 'MMM d'),
        points: pts,
        level,
      });
      current.setDate(current.getDate() + 1);
    }

    const cols = weeks;
    const rows = 7;
    const grid: (typeof days[0] | null)[][] = [];
    for (let r = 0; r < rows; r++) {
      grid.push(new Array(cols).fill(null));
    }

    days.forEach(d => {
      const dayOfWeek = (parseISO(d.date).getDay() + 6) % 7;
      const firstDate = parseISO(days[0].date);
      const thisDate = parseISO(d.date);
      const dayIndex = Math.floor((thisDate.getTime() - firstDate.getTime()) / 86400000);
      const col = Math.floor(dayIndex / 7);
      if (col >= 0 && col < cols) {
        grid[dayOfWeek][col] = d;
      }
    });

    return { grid };
  }, [submissions, weeks]);

  const levels = [
    'bg-gray-800',
    'bg-green-900',
    'bg-green-700',
    'bg-green-500',
    'bg-green-400',
  ];

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-0.5">
        {grid.map((row, r) => (
          <div key={r} className="flex flex-col gap-0.5">
            {row.map((cell, c) => (
              <div
                key={c}
                className={`w-3 h-3 rounded-sm ${cell ? levels[cell.level] : 'bg-gray-800/50'}`}
                title={cell ? `${cell.label}: ${cell.points} pts` : ''}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
        <span>Less</span>
        {levels.map((cls, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
