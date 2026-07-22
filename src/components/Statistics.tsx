import { useState, useMemo } from 'react';
import type { ActivitySet, Submission } from '../types';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, subDays, parseISO, eachDayOfInterval, startOfDay } from 'date-fns';
import Heatmap from './Heatmap';

interface StatisticsProps {
  sets: ActivitySet[];
  submissions: Submission[];
}

function calcMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default function Statistics({ sets, submissions }: StatisticsProps) {
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [showDevelopment, setShowDevelopment] = useState(false);
  const [devTimeframe, setDevTimeframe] = useState<'week' | 'month' | 'all'>('month');

  const devData = useMemo(() => {
    const days = devTimeframe === 'week' ? 7 : devTimeframe === 'month' ? 30 : null;

    const dateMap: Record<string, number> = {};
    submissions.forEach(s => {
      dateMap[s.date] = (dateMap[s.date] || 0) + s.totalPoints;
    });

    let dayList: Date[];
    if (days) {
      dayList = eachDayOfInterval({ start: subDays(new Date(), days - 1), end: new Date() });
    } else {
      const allDates = Object.keys(dateMap).sort();
      if (allDates.length === 0) return [];
      dayList = eachDayOfInterval({ start: parseISO(allDates[0]), end: new Date() });
    }

    let cumulative = 0;
    return dayList.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const pts = dateMap[dateStr] || 0;
      cumulative += pts;
      return {
        date: format(date, 'MMM d'),
        points: pts,
        cumulative,
      };
    });
  }, [submissions, devTimeframe]);

  const mainStatsData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const hasSubmission = submissions.some(s => s.date === dateStr);
      return {
        date: format(date, 'MMM d'),
        visited: hasSubmission ? 1 : 0,
      };
    });
    return last30Days;
  }, [submissions]);

  const setCards = useMemo(() => {
    const usageCount: Record<string, number> = {};
    submissions.forEach(s => {
      usageCount[s.setId] = (usageCount[s.setId] || 0) + 1;
    });

    return sets
      .map(set => ({
        id: set.id,
        name: set.name,
        count: usageCount[set.id] || 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [sets, submissions]);

  const selectedSet = sets.find(s => s.id === selectedSetId);

  const detailData = useMemo(() => {
    if (!selectedSetId) return null;

    const subs = submissions
      .filter(s => s.setId === selectedSetId)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (subs.length === 0) return null;

    const points = subs.map(s => s.totalPoints);
    const avg = points.reduce((a, b) => a + b, 0) / points.length;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const median = calcMedian(points);

    // Daily usage: which days in the last 30 days had a submission
    const recentSubs = subs.filter(s => {
      const d = parseISO(s.date);
      const thirtyDaysAgo = subDays(startOfDay(new Date()), 30);
      return d >= thirtyDaysAgo;
    });

    const usageMap: Record<string, number> = {};
    recentSubs.forEach(s => {
      usageMap[s.date] = (usageMap[s.date] || 0) + 1;
    });

    const last30Days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date(),
    });

    const dailyUsage = last30Days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return {
        date: format(date, 'MMM d'),
        used: usageMap[dateStr] || 0,
      };
    });

    // Points per submission (chronological)
    const pointsPerDay = subs.map(s => ({
      date: format(parseISO(s.date), 'MMM d'),
      points: s.totalPoints,
    }));

    // Development chart: rolling avg/min/max/med after each submission
    const development = subs.map((_, i) => {
      const slice = points.slice(0, i + 1);
      const sum = slice.reduce((a, b) => a + b, 0);
      return {
        n: i + 1,
        label: `#${i + 1}`,
        avg: parseFloat((sum / slice.length).toFixed(1)),
        min: Math.min(...slice),
        max: Math.max(...slice),
        med: calcMedian(slice),
      };
    });

    return { avg, min, max, median, dailyUsage, pointsPerDay, development, totalSubs: subs.length, recentSubs: subs.slice().reverse() };
  }, [selectedSetId, submissions]);

  // Set detail view
  if (selectedSet && detailData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedSetId(null)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <h2 className="text-lg font-semibold text-gray-200">{selectedSet.name}</h2>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <div className="text-gray-500 text-xs mb-1">AVG</div>
            <div className="text-lg font-bold text-purple-400">{detailData.avg.toFixed(1)}</div>
          </div>
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <div className="text-gray-500 text-xs mb-1">MIN</div>
            <div className="text-lg font-bold text-cyan-400">{detailData.min}</div>
          </div>
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <div className="text-gray-500 text-xs mb-1">MAX</div>
            <div className="text-lg font-bold text-amber-400">{detailData.max}</div>
          </div>
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <div className="text-gray-500 text-xs mb-1">MED</div>
            <div className="text-lg font-bold text-green-400">{detailData.median}</div>
          </div>
        </div>

        {/* Development chart */}
        {detailData.development.length >= 1 && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Development</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={detailData.development}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Legend wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="avg" name="AVG" stroke="#a78bfa" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="min" name="MIN" stroke="#22d3ee" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="max" name="MAX" stroke="#fbbf24" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="med" name="MED" stroke="#4ade80" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Daily usage graph */}
        {detailData.totalSubs > 2 && (
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Daily Usage (Last 30 Days)</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={detailData.dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} interval={6} />
                <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Bar dataKey="used" name="Times used" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}

        {/* Points per submission graph */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Points Per Submission</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={detailData.pointsPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(value: any) => [`${value} pts`, 'Points']}
                />
                <Bar dataKey="points" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Submission History */}
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-4">History</h3>
          <div className="space-y-2">
            {detailData.recentSubs.map(sub => (
              <div key={sub.id} className="p-3 rounded-lg bg-gray-800 border border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">{format(parseISO(sub.date), 'MMM d, yyyy')}</span>
                  <span className="text-purple-400 font-medium">{sub.totalPoints} pts</span>
                </div>
                {sub.note && (
                  <p className="text-gray-500 text-sm mt-1 italic">"{sub.note}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main view
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-200">Statistics</h2>

      {/* Main Stats: Visited Days */}
      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
        <h3 className="text-sm font-medium text-gray-400 mb-4">
          Activity Days (Last 30 Days)
        </h3>
        {submissions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No submissions yet</p>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mainStatsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  interval={6}
                />
                <YAxis hide domain={[0, 1]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(value: any) => [Number(value) ? 'Visited' : 'No visit', '']}
                />
                <Bar dataKey="visited" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Heatmap Calendar */}
      {submissions.length > 0 && (
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Activity Heatmap</h3>
          <Heatmap submissions={submissions} weeks={16} />
        </div>
      )}

      {/* Development Chart */}
      {submissions.length > 0 && (
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowDevelopment(!showDevelopment)}
              className="text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
            >
              {showDevelopment ? '▾' : '▸'} Development
            </button>
            {showDevelopment && (
              <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
                {(['week', 'month', 'all'] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setDevTimeframe(tf)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                      devTimeframe === tf
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {tf === 'week' ? '7 Days' : tf === 'month' ? '30 Days' : 'All Time'}
                  </button>
                ))}
              </div>
            )}
          </div>
          {showDevelopment && (
            <div className="h-56">
              {devData.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No data for this period</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={devData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      interval={devTimeframe === 'all' ? Math.floor(devData.length / 10) : devTimeframe === 'month' ? 6 : 0}
                    />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Legend wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="points" name="Daily" stroke="#a78bfa" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="cumulative" name="Cumulative" stroke="#22d3ee" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </div>
      )}

      {/* Set Cards */}
      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Sets</h3>
        {setCards.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No sets available</p>
        ) : (
          <div className="space-y-2">
            {setCards.map(set => (
              <button
                key={set.id}
                onClick={() => setSelectedSetId(set.id)}
                className="w-full text-left p-3 rounded-lg bg-gray-800 border border-gray-700 hover:border-gray-600 transition-all cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-200">{set.name}</span>
                  <div className="text-right">
                    <span className="text-purple-400 font-semibold">{set.count}</span>
                    <span className="text-gray-500 text-sm ml-1">
                      {set.count === 1 ? 'submission' : 'submissions'}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
