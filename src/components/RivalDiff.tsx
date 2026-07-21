import { useState, useMemo } from 'react';
import type { Submission, ActivitySet, Rival } from '../types';
import { calculateRivalStreak } from '../utils/rivalEngine';

interface RivalDiffProps {
  rival: Rival;
  mySubmissions: Submission[];
  rivalSubmissions: Submission[];
  sets: ActivitySet[];
  onClose: () => void;
}

export default function RivalDiff({ rival, mySubmissions, rivalSubmissions, sets, onClose }: RivalDiffProps) {
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('week');

  const getDateRange = () => {
    const now = new Date();
    if (timeframe === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    }
    if (timeframe === 'month') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d.toISOString().split('T')[0];
    }
    return '0000-00-00';
  };

  const minDate = getDateRange();

  const stats = useMemo(() => {
    const myFiltered = mySubmissions.filter(s => s.date >= minDate);
    const rivalFiltered = rivalSubmissions.filter(s => s.id.startsWith(rival.id) && s.date >= minDate);

    const myTotal = myFiltered.reduce((sum, s) => sum + s.totalPoints, 0);
    const rivalTotal = rivalFiltered.reduce((sum, s) => sum + s.totalPoints, 0);

    const myDays = new Set(myFiltered.map(s => s.date)).size;
    const rivalDays = new Set(rivalFiltered.map(s => s.date)).size;

    const myAvg = myDays > 0 ? Math.round(myTotal / myDays) : 0;
    const rivalAvg = rivalDays > 0 ? Math.round(rivalTotal / rivalDays) : 0;

    // Per-set breakdown
    const setBreakdown = sets.map(set => {
      const mySetPoints = myFiltered
        .filter(s => s.setId === set.id)
        .reduce((sum, s) => sum + s.totalPoints, 0);
      const rivalSetPoints = rivalFiltered
        .filter(s => s.id.startsWith(rival.id) && s.setId === set.id)
        .reduce((sum, s) => sum + s.totalPoints, 0);
      return { set, myPoints: mySetPoints, rivalPoints: rivalSetPoints };
    }).filter(s => s.myPoints > 0 || s.rivalPoints > 0);

    // Per-activity breakdown across all sets
    const activityBreakdown: { name: string; myCount: number; rivalCount: number; myPoints: number; rivalPoints: number }[] = [];
    for (const set of sets) {
      for (const activity of set.activities) {
        let myCount = 0;
        let rivalCount = 0;
        let myPts = 0;
        let rivalPts = 0;

        for (const sub of myFiltered) {
          if (sub.setId === set.id && sub.activitiesChecked.includes(activity.id)) {
            myCount++;
            myPts += activity.points;
          }
        }
        for (const sub of rivalFiltered) {
          if (sub.setId === set.id && sub.activitiesChecked.includes(activity.id)) {
            rivalCount++;
            rivalPts += activity.points;
          }
        }

        if (myCount > 0 || rivalCount > 0) {
          activityBreakdown.push({
            name: activity.name,
            myCount,
            rivalCount,
            myPoints: myPts,
            rivalPoints: rivalPts,
          });
        }
      }
    }

    // Days where I won vs rival won
    const allDates = [...new Set([
      ...myFiltered.map(s => s.date),
      ...rivalFiltered.map(s => s.date),
    ])].filter(d => d >= minDate).sort();

    let myWins = 0;
    let rivalWins = 0;
    let ties = 0;
    for (const date of allDates) {
      const myDay = myFiltered.filter(s => s.date === date).reduce((sum, s) => sum + s.totalPoints, 0);
      const rivalDay = rivalFiltered.filter(s => s.date === date).reduce((sum, s) => sum + s.totalPoints, 0);
      if (myDay > rivalDay) myWins++;
      else if (rivalDay > myDay) rivalWins++;
      else ties++;
    }

    return {
      myTotal,
      rivalTotal,
      myDays,
      rivalDays,
      myAvg,
      rivalAvg,
      setBreakdown,
      activityBreakdown: activityBreakdown.sort((a, b) => (b.rivalPoints - b.myPoints) - (a.rivalPoints - a.myPoints)),
      myWins,
      rivalWins,
      ties,
      totalDays: allDates.length,
    };
  }, [mySubmissions, rivalSubmissions, sets, rival.id, minDate]);

  const myStreak = useMemo(() => {
    const dates = [...new Set(mySubmissions.map(s => s.date))].sort().reverse();
    if (dates.length === 0) return 0;
    const today = new Date().toISOString().split('T')[0];
    const todaySub = dates.includes(today);
    let current = 0;
    let checkDate = todaySub ? new Date() : new Date();
    checkDate.setDate(checkDate.getDate() - 1);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dates.includes(dateStr)) {
        current++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else break;
    }
    return current;
  }, [mySubmissions]);

  const rivalStreak = calculateRivalStreak(rival, rivalSubmissions).current;

  const getDiffColor = (my: number, rival: number) => {
    if (my > rival) return 'text-green-400';
    if (rival > my) return 'text-red-400';
    return 'text-gray-500';
  };

  const getDiffIcon = (my: number, rival: number) => {
    if (my > rival) return '✓';
    if (rival > my) return '✗';
    return '—';
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-200">vs {rival.name}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
          </div>
          <div className="flex gap-2 mt-3">
            {(['week', 'month', 'all'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                {tf === 'week' ? '7 Days' : tf === 'month' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-gray-800 border border-gray-700 text-center">
              <div className="text-xs text-gray-500 mb-1">YOU</div>
              <div className="text-2xl font-bold text-purple-400">{stats.myTotal}</div>
              <div className="text-xs text-gray-600">{stats.myDays} days · {stats.myAvg}/day</div>
              <div className="text-xs text-amber-400 mt-1">{myStreak}🔥 streak</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-800 border border-gray-700 text-center">
              <div className="text-xs text-gray-500 mb-1">DIFF</div>
              <div className={`text-2xl font-bold ${getDiffColor(stats.myTotal, stats.rivalTotal)}`}>
                {stats.myTotal - stats.rivalTotal > 0 ? '+' : ''}{stats.myTotal - stats.rivalTotal}
              </div>
              <div className="text-xs text-gray-600">{stats.myWins}W · {stats.rivalWins}L · {stats.ties}T</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-800 border border-gray-700 text-center">
              <div className="text-xs text-gray-500 mb-1">{rival.name.toUpperCase()}</div>
              <div className="text-2xl font-bold text-red-400">{stats.rivalTotal}</div>
              <div className="text-xs text-gray-600">{stats.rivalDays} days · {stats.rivalAvg}/day</div>
              <div className="text-xs text-amber-400 mt-1">{rivalStreak}🔥 streak</div>
            </div>
          </div>

          {/* Set breakdown */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">By Category</h3>
            <div className="space-y-2">
              {stats.setBreakdown.map(({ set, myPoints, rivalPoints }) => (
                <div key={set.id} className="p-3 rounded-lg bg-gray-800 border border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-300">{set.name}</span>
                    <span className={`text-sm font-mono ${getDiffColor(myPoints, rivalPoints)}`}>
                      {myPoints} vs {rivalPoints}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 flex overflow-hidden">
                    <div
                      className="bg-purple-500 h-2 transition-all"
                      style={{ width: `${(myPoints / Math.max(myPoints + rivalPoints, 1)) * 100}%` }}
                    />
                    <div
                      className="bg-red-500 h-2 transition-all"
                      style={{ width: `${(rivalPoints / Math.max(myPoints + rivalPoints, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity breakdown - biggest gaps first */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Biggest Gaps</h3>
            <div className="space-y-1">
              {stats.activityBreakdown.slice(0, 10).map(a => (
                <div key={a.name} className="flex items-center justify-between py-2 px-3 rounded bg-gray-800/50">
                  <span className="text-sm text-gray-300 flex-1">{a.name}</span>
                  <span className="text-xs text-gray-500 mx-2">
                    {a.myCount}x vs {a.rivalCount}x
                  </span>
                  <span className={`text-sm font-mono w-20 text-right ${getDiffColor(a.myPoints, a.rivalPoints)}`}>
                    {getDiffIcon(a.myPoints, a.rivalPoints)} {Math.abs(a.myPoints - a.rivalPoints)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Personality */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Their Personality</h3>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(rival.personality).map(([key, val]) => (
                <div key={key} className="p-2 rounded bg-gray-800 text-center">
                  <div className="text-xs text-gray-500 capitalize">{key}</div>
                  <div className="text-lg font-bold text-gray-300">{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
