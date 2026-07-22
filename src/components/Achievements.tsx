import { useMemo } from 'react';
import type { Submission } from '../types';
import { parseISO } from 'date-fns';

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earned: boolean;
}

interface AchievementsProps {
  submissions: Submission[];
}

export default function Achievements({ submissions }: AchievementsProps) {
  const badges = useMemo((): Badge[] => {
    const dates = [...new Set(submissions.map(s => s.date))].sort();
    const totalPoints = submissions.reduce((sum, s) => sum + s.totalPoints, 0);
    const uniqueDays = dates.length;

    // Streak calculation
    let longestStreak = 0;
    let run = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = parseISO(dates[i - 1]);
      const curr = parseISO(dates[i]);
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diff === 1) {
        run++;
        if (run > longestStreak) longestStreak = run;
      } else {
        run = 1;
      }
    }
    if (dates.length === 1) longestStreak = 1;

    // Check for perfect days (high scoring days)
    const pointsByDate: Record<string, number> = {};
    submissions.forEach(s => {
      pointsByDate[s.date] = (pointsByDate[s.date] || 0) + s.totalPoints;
    });
    const perfectDays = Object.values(pointsByDate).filter(p => p >= 400).length;
    const maxSingleDay = Math.max(...Object.values(pointsByDate), 0);

    // Count unique sets used
    const uniqueSets = new Set(submissions.map(s => s.setId)).size;

    // Count notes written
    const notesWritten = submissions.filter(s => s.note).length;

    return [
      {
        id: 'first-step',
        name: 'First Step',
        icon: '🌱',
        description: 'Complete your first day',
        earned: uniqueDays >= 1,
      },
      {
        id: 'week-warrior',
        name: 'Week Warrior',
        icon: '⚔️',
        description: '7-day streak',
        earned: longestStreak >= 7,
      },
      {
        id: 'month-master',
        name: 'Month Master',
        icon: '👑',
        description: '30-day streak',
        earned: longestStreak >= 30,
      },
      {
        id: 'century',
        name: 'Century',
        icon: '💯',
        description: 'Score 100+ points in a day',
        earned: maxSingleDay >= 100,
      },
      {
        id: 'high-scorer',
        name: 'High Scorer',
        icon: '🔥',
        description: 'Score 300+ points in a day',
        earned: maxSingleDay >= 300,
      },
      {
        id: 'perfect-day',
        name: 'Perfect Day',
        icon: '⭐',
        description: 'Score 400+ points in a day',
        earned: perfectDays >= 1,
      },
      {
        id: 'point-hunter',
        name: 'Point Hunter',
        icon: '🎯',
        description: 'Earn 500 total points',
        earned: totalPoints >= 500,
      },
      {
        id: 'thousand-club',
        name: 'Thousand Club',
        icon: '💎',
        description: 'Earn 1000 total points',
        earned: totalPoints >= 1000,
      },
      {
        id: 'multi-tasker',
        name: 'Multi-Tasker',
        icon: '📋',
        description: 'Use 3+ different sets',
        earned: uniqueSets >= 3,
      },
      {
        id: 'journalist',
        name: 'Journalist',
        icon: '📝',
        description: 'Write 10 notes',
        earned: notesWritten >= 10,
      },
      {
        id: 'dedicated',
        name: 'Dedicated',
        icon: '🏆',
        description: 'Submit on 14 different days',
        earned: uniqueDays >= 14,
      },
      {
        id: 'unstoppable',
        name: 'Unstoppable',
        icon: '🚀',
        description: 'Earn 2500 total points',
        earned: totalPoints >= 2500,
      },
    ];
  }, [submissions]);

  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-400">Achievements</h3>
        <span className="text-xs text-gray-500">{earnedCount}/{badges.length}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {badges.map(badge => (
          <div
            key={badge.id}
            className={`flex flex-col items-center p-2 rounded-lg text-center ${
              badge.earned
                ? 'bg-gray-800 border border-gray-700'
                : 'bg-gray-900/50 border border-gray-800/50 opacity-40'
            }`}
            title={badge.description}
          >
            <span className="text-xl mb-1">{badge.icon}</span>
            <span className="text-xs text-gray-400 leading-tight">{badge.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
