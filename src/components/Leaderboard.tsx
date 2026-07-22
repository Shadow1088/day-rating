import { useState, useEffect, useCallback, useMemo } from 'react';
import type { User, Submission, ActivitySet, Rival } from '../types';
import { generateRivalDay, calculateRivalStreak } from '../utils/rivalEngine';
import RivalCreator from './RivalCreator';
import RivalDiff from './RivalDiff';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, subDays, parseISO, eachDayOfInterval } from 'date-fns';

interface LeaderboardProps {
  users: User[];
  submissions: Submission[];
  sets: ActivitySet[];
  rivals: Rival[];
  rivalSubmissions: Submission[];
  onDeleteUser: (userId: string) => void;
  onAddRival: (name: string, personality: Rival['personality'], anomalyChance: number) => void;
  onDeleteRival: (rivalId: string) => void;
  onUpdateRivals: (submissions: Submission[]) => void;
}

const USER_COLOR_MAP: Record<string, string> = {
  '__me__': '#ef4444',
  'Painter': '#22d3ee',
  'Booker': '#fbbf24',
  'Davy': '#4ade80',
  'Rock': '#fb923c',
  'Matt': '#e879f9',
  'Maniac': '#a78bfa',
  'Slacker': '#f87171',
  'Anon': '#60a5fa',
};
const FALLBACK_COLORS = ['#22d3ee', '#fbbf24', '#4ade80', '#fb923c', '#e879f9', '#a78bfa'];

export default function Leaderboard({
  users,
  submissions,
  sets,
  rivals,
  rivalSubmissions,
  onDeleteUser,
  onAddRival,
  onDeleteRival,
  onUpdateRivals,
}: LeaderboardProps) {
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [showCreator, setShowCreator] = useState(false);
  const [selectedRival, setSelectedRival] = useState<Rival | null>(null);
  const [showChart, setShowChart] = useState(false);

  const generateTodayScores = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const newSubmissions: Submission[] = [];

    for (const rival of rivals) {
      const hasToday = rivalSubmissions.some(s => s.id.startsWith(rival.id) && s.date === today);
      if (!hasToday) {
        const { submissions: daySubs } = generateRivalDay(rival, today, sets);
        newSubmissions.push(...daySubs);
      }
    }

    if (newSubmissions.length > 0) {
      onUpdateRivals(newSubmissions);
    }
  }, [rivals, rivalSubmissions, sets, onUpdateRivals]);

  useEffect(() => {
    generateTodayScores();
  }, [generateTodayScores]);

  const getDateRange = () => {
    const now = new Date();
    if (timeframe === 'day') {
      const today = new Date(now);
      return today.toISOString().split('T')[0];
    }
    if (timeframe === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return weekAgo.toISOString().split('T')[0];
    }
    if (timeframe === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return monthAgo.toISOString().split('T')[0];
    }
    return '0000-00-00';
  };

  const minDate = getDateRange();

  const getUserPoints = (userId?: string) => {
    return submissions
      .filter(s => {
        const isUser = userId ? s.userId === userId : !s.userId;
        return isUser && s.date >= minDate;
      })
      .reduce((sum, s) => sum + s.totalPoints, 0);
  };

  const getUserDays = (userId?: string) => {
    return new Set(
      submissions
        .filter(s => {
          const isUser = userId ? s.userId === userId : !s.userId;
          return isUser && s.date >= minDate;
        })
        .map(s => s.date)
    ).size;
  };

  const getRivalPoints = (rivalId: string) => {
    return rivalSubmissions
      .filter(s => s.id.startsWith(rivalId) && s.date >= minDate)
      .reduce((sum, s) => sum + s.totalPoints, 0);
  };

  const getRivalDays = (rivalId: string) => {
    return new Set(
      rivalSubmissions
        .filter(s => s.id.startsWith(rivalId) && s.date >= minDate)
        .map(s => s.date)
    ).size;
  };

  const getUserStreak = (userId?: string) => {
    const dates = [...new Set(
      submissions
        .filter(s => {
          const isUser = userId ? s.userId === userId : !s.userId;
          return isUser;
        })
        .map(s => s.date)
    )].sort().reverse();
    if (dates.length === 0) return 0;
    const today = new Date().toISOString().split('T')[0];
    const todaySub = dates.includes(today);
    let current = 0;
    const checkDate = new Date();
    if (!todaySub) checkDate.setDate(checkDate.getDate() - 1);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dates.includes(dateStr)) {
        current++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else break;
    }
    return current;
  };

  const rankings = [
    { id: undefined, name: 'You', points: getUserPoints(), days: getUserDays(), streak: getUserStreak(), isRival: false },
    ...(users ?? []).map(u => ({
      id: u.id,
      name: u.name,
      points: getUserPoints(u.id),
      days: getUserDays(u.id),
      streak: 0,
      isRival: false,
    })),
    ...rivals.map(r => ({
      id: r.id,
      name: r.name,
      points: getRivalPoints(r.id),
      days: getRivalDays(r.id),
      streak: calculateRivalStreak(r, rivalSubmissions).current,
      isRival: true,
    })),
  ].sort((a, b) => b.points - a.points);

  const maxPoints = Math.max(...rankings.map(r => r.points), 1);

  const lbData = useMemo(() => {
    const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : null;

    const rivalIds = rivals.map(r => r.id);
    const getOwner = (sub: Submission): string => {
      for (const rid of rivalIds) {
        if (sub.id.startsWith(rid + '-')) return rid;
      }
      return '__me__';
    };

    const allSubs = [
      ...submissions.map(s => ({ ...s, _owner: '__me__' })),
      ...rivalSubmissions.map(s => ({ ...s, _owner: getOwner(s) })),
    ];

    const userPoints: Record<string, Record<string, number>> = {};
    allSubs.forEach((s: any) => {
      if (!userPoints[s._owner]) userPoints[s._owner] = {};
      userPoints[s._owner][s.date] = (userPoints[s._owner][s.date] || 0) + s.totalPoints;
    });

    let dayList: Date[];
    if (days) {
      dayList = eachDayOfInterval({ start: subDays(new Date(), days - 1), end: new Date() });
    } else {
      const allDates = allSubs.map((s: any) => s.date).sort();
      if (allDates.length === 0) return { data: [], users: [] };
      dayList = eachDayOfInterval({ start: parseISO(allDates[0]), end: new Date() });
    }

    const owners = Object.keys(userPoints);
    const users = owners.map(uid => {
      if (uid === '__me__') return { id: uid, name: 'You' };
      const rival = rivals.find(r => r.id === uid);
      return { id: uid, name: rival?.name || uid };
    });

    const cumulatives: Record<string, number> = {};
    owners.forEach(uid => { cumulatives[uid] = 0; });

    const data = dayList.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const row: Record<string, string | number> = { date: format(date, 'MMM d') };
      owners.forEach(uid => {
        cumulatives[uid] += (userPoints[uid]?.[dateStr] || 0);
        row[uid] = cumulatives[uid];
      });
      return row;
    });

    return { data, users };
  }, [submissions, rivalSubmissions, rivals, timeframe]);

  const getRankStyle = (index: number) => {
    if (index === 0) return 'text-amber-400 font-bold';
    if (index === 1) return 'text-gray-300 font-semibold';
    if (index === 2) return 'text-amber-600';
    return 'text-gray-500';
  };

  const getBarColor = (index: number) => {
    if (index === 0) return 'bg-amber-400';
    if (index === 1) return 'bg-gray-400';
    if (index === 2) return 'bg-amber-700';
    return 'bg-purple-600';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-200">Leaderboard</h2>
        <button
          onClick={() => setShowCreator(true)}
          className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
        >
          + New Rival
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(['day', 'week', 'month', 'all'] as const).map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              timeframe === tf
                ? 'bg-purple-600 text-white'
                : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            {tf === 'day' ? 'Today' : tf === 'week' ? '7 Days' : tf === 'month' ? '30 Days' : 'All Time'}
          </button>
        ))}
      </div>

      <div className="space-y-2 mb-6">
        {rankings.map((r, i) => (
          <div
            key={r.id ?? 'self'}
            className={`p-3 rounded-lg bg-gray-900 border border-gray-800 ${r.isRival ? 'cursor-pointer hover:border-purple-500 transition-colors' : ''}`}
            onClick={() => {
              if (r.isRival) {
                const rival = rivals.find(rv => rv.id === r.id);
                if (rival) setSelectedRival(rival);
              }
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className={`text-lg w-6 text-center ${getRankStyle(i)}`}>
                  {i === 0 ? '👑' : `#${i + 1}`}
                </span>
                <span className={`text-gray-200 ${i === 0 ? 'font-bold' : ''}`}>
                  {r.name}
                </span>
                {r.isRival && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-400">
                    TAP TO COMPARE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                {r.streak > 0 && (
                  <span className="text-amber-400 text-sm">{r.streak}🔥</span>
                )}
                <span className="text-gray-500 text-sm">{r.days} days</span>
                <span className={`font-semibold ${getRankStyle(i)}`}>
                  {r.points} pts
                </span>
                {r.isRival && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteRival(r.id!); }}
                    className="text-gray-600 hover:text-red-400 text-sm"
                  >
                    ×
                  </button>
                )}
                {r.id && !r.isRival && (
                  <button
                    onClick={() => onDeleteUser(r.id!)}
                    className="text-gray-600 hover:text-red-400 text-sm"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getBarColor(i)}`}
                style={{ width: `${(r.points / maxPoints) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Leaderboard Chart */}
      {rankings.length > 1 && (
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 mb-6">
          <button
            onClick={() => setShowChart(!showChart)}
            className="text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors cursor-pointer mb-4"
          >
            {showChart ? '▾' : '▸'} Points Over Time
          </button>
          {showChart && (
            <div className="h-56">
              {lbData.data.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No data for this period</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lbData.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      interval={timeframe === 'all' ? Math.floor(lbData.data.length / 10) : timeframe === 'month' ? 6 : 0}
                    />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#9ca3af' }}
                      formatter={(value: any, name: any) => [`${value} pts`, String(name)]}
                      itemSorter={(item: any) => -item.value}
                    />
                    <Legend
                      content={() => {
                        const lastRow = lbData.data[lbData.data.length - 1];
                        const sorted = [...lbData.users].sort((a, b) => ((lastRow?.[b.id] as number) ?? 0) - ((lastRow?.[a.id] as number) ?? 0));
                        return (
                          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
                            {sorted.map(u => {
                              const color = USER_COLOR_MAP[u.id] ?? (() => {
                                const idx = lbData.users.filter(v => !(v.id in USER_COLOR_MAP) && lbData.users.indexOf(v) < lbData.users.indexOf(u)).length;
                                return FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
                              })();
                              return (
                                <div key={u.id} className="flex items-center gap-1.5 text-xs text-gray-400">
                                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                                  {u.name}
                                </div>
                              );
                            })}
                          </div>
                        );
                      }}
                    />
                    {lbData.users.map((u) => {
                      const color = USER_COLOR_MAP[u.id] ?? (() => {
                        const idx = lbData.users.filter(v => !(v.id in USER_COLOR_MAP) && lbData.users.indexOf(v) < lbData.users.indexOf(u)).length;
                        return FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
                      })();
                      return (
                        <Line
                          key={u.id}
                          type="monotone"
                          dataKey={u.id}
                          name={u.name}
                          stroke={color}
                          strokeWidth={2}
                          dot={false}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </div>
      )}

      {showCreator && (
        <RivalCreator
          onCreate={(name, personality, anomalyChance) => {
            onAddRival(name, personality, anomalyChance);
            setShowCreator(false);
          }}
          onCancel={() => setShowCreator(false)}
        />
      )}

      {selectedRival && (
        <RivalDiff
          rival={selectedRival}
          mySubmissions={submissions}
          rivalSubmissions={rivalSubmissions}
          sets={sets}
          onClose={() => setSelectedRival(null)}
        />
      )}
    </div>
  );
}
