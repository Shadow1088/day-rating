import { useMemo } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import type { Submission } from '../types';

interface WeeklyOverviewProps {
  submissions: Submission[];
}

export default function WeeklyOverview({ submissions }: WeeklyOverviewProps) {
  const { days, maxDay } = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });

    const pointsByDate: Record<string, number> = {};
    submissions.forEach(s => {
      pointsByDate[s.date] = (pointsByDate[s.date] || 0) + s.totalPoints;
    });

    const days = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const isToday = dateStr === format(now, 'yyyy-MM-dd');
      const isFuture = date > now;
      const pts = isFuture ? -1 : (pointsByDate[dateStr] || 0);
      return {
        day: format(date, 'EEE'),
        date: format(date, 'MMM d'),
        dateStr,
        points: pts,
        isToday,
        isFuture,
      };
    });

    const maxDay = Math.max(...days.filter(d => d.points >= 0).map(d => d.points), 1);
    return { days, maxDay };
  }, [submissions]);

  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
      <h3 className="text-sm font-medium text-gray-400 mb-3">This Week</h3>
      <div className="flex gap-1.5">
        {days.map(d => {
          const height = d.points >= 0 ? Math.max((d.points / maxDay) * 64, d.points > 0 ? 8 : 2) : 0;
          return (
            <div key={d.dateStr} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full h-16 flex items-end justify-center">
                {d.isFuture ? (
                  <div className="w-full h-2 rounded-full bg-gray-800/50" />
                ) : (
                  <div
                    className={`w-full rounded-t transition-all duration-500 ${
                      d.isToday
                        ? d.points > 0 ? 'bg-purple-500' : 'bg-gray-700 border border-dashed border-gray-500'
                        : d.points > 0 ? 'bg-gray-600' : 'bg-gray-800'
                    }`}
                    style={{ height: `${height}px` }}
                    title={`${d.date}: ${d.points} pts`}
                  />
                )}
              </div>
              <div className="text-center">
                <div className={`text-xs font-medium ${d.isToday ? 'text-purple-400' : 'text-gray-500'}`}>
                  {d.day}
                </div>
                <div className={`text-xs ${d.isToday ? 'text-gray-300' : 'text-gray-600'}`}>
                  {d.points >= 0 ? d.points : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
