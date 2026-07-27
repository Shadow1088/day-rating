import { useState, useEffect } from 'react';
import type { ActivitySet, Submission } from '../types';

interface ActivityListProps {
  set: ActivitySet;
  selectedDate: string;
  onDateChange: (date: string) => void;
  existingSubmission?: Submission;
  onBack: () => void;
  onSubmit: (
    setId: string,
    activitiesChecked: string[],
    bonusesChecked: string[],
    totalPoints: number,
    note: string
  ) => void;
}

export default function ActivityList({ set, selectedDate, onDateChange, existingSubmission, onBack, onSubmit }: ActivityListProps) {
  const [checkedActivities, setCheckedActivities] = useState<Set<string>>(() => {
    if (existingSubmission) return new Set(existingSubmission.activitiesChecked);
    return new Set();
  });
  const [checkedBonuses, setCheckedBonuses] = useState<Set<string>>(() => {
    if (existingSubmission) return new Set(existingSubmission.bonusesChecked);
    return new Set();
  });
  const [note, setNote] = useState(existingSubmission?.note ?? '');

  useEffect(() => {
    if (existingSubmission) {
      setCheckedActivities(new Set(existingSubmission.activitiesChecked));
      setCheckedBonuses(new Set(existingSubmission.bonusesChecked));
      setNote(existingSubmission.note ?? '');
    }
  }, [existingSubmission]);

  const toggleActivity = (activityId: string) => {
    setCheckedActivities(prev => {
      const next = new Set(prev);
      if (next.has(activityId)) {
        next.delete(activityId);
        const activity = set.activities.find(a => a.id === activityId);
        if (activity?.bonus) {
          setCheckedBonuses(bonuses => {
            const nextBonuses = new Set(bonuses);
            nextBonuses.delete(activity.bonus!.id);
            return nextBonuses;
          });
        }
      } else {
        next.add(activityId);
      }
      return next;
    });
  };

  const toggleBonus = (bonusId: string) => {
    setCheckedBonuses(prev => {
      const next = new Set(prev);
      if (next.has(bonusId)) {
        next.delete(bonusId);
      } else {
        next.add(bonusId);
      }
      return next;
    });
  };

  const totalPoints = set.activities.reduce((sum, activity) => {
    let points = 0;
    if (checkedActivities.has(activity.id)) {
      points += activity.points;
      if (activity.bonus && checkedBonuses.has(activity.bonus.id)) {
        points += activity.bonus.points;
      }
    }
    return sum + points;
  }, 0);

  const handleSubmit = () => {
    if (checkedActivities.size === 0) return;
    onSubmit(
      set.id,
      Array.from(checkedActivities),
      Array.from(checkedBonuses),
      totalPoints,
      note.trim()
    );
  };

  const today = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === today;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-lg font-semibold text-gray-200">{set.name}</h2>
        <div className="ml-auto flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={e => onDateChange(e.target.value)}
            max={today}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded px-2 py-1 cursor-pointer focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div className="space-y-1">
        {set.activities.map(activity => {
          const isActivityChecked = checkedActivities.has(activity.id);
          const isBonusChecked = activity.bonus && checkedBonuses.has(activity.bonus.id);

          return (
            <div key={activity.id}>
              <button
                onClick={() => toggleActivity(activity.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                  isActivityChecked
                    ? 'bg-purple-900/30 border-purple-500/50'
                    : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`${isActivityChecked ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                    {activity.name}
                  </span>
                  <span className={`font-semibold ${isActivityChecked ? 'text-purple-400' : 'text-gray-500'}`}>
                    {activity.points} pts
                  </span>
                </div>
              </button>

              {activity.bonus && isActivityChecked && (
                <button
                  onClick={() => toggleBonus(activity.bonus!.id)}
                  className={`w-full text-left p-3 ml-6 rounded-lg border transition-all cursor-pointer ${
                    isBonusChecked
                      ? 'bg-green-900/30 border-green-500/50'
                      : 'bg-gray-900/50 border-gray-800/50 hover:border-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${isBonusChecked ? 'line-through text-gray-500' : 'text-gray-400'}`}>
                      + {activity.bonus.name}
                    </span>
                    <span className={`font-semibold text-sm ${isBonusChecked ? 'text-green-400' : 'text-gray-600'}`}>
                      +{activity.bonus.points} pts
                    </span>
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {checkedActivities.size > 0 && (
        <div className="mt-6 p-4 rounded-lg bg-gray-900 border border-gray-800">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-400">Total</span>
            <span className="text-2xl font-bold text-purple-400">{totalPoints} pts</span>
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Anything to say? Feel free to write it out here..."
            rows={2}
            className="w-full px-3 py-2 mb-3 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
          />
          <button
            onClick={handleSubmit}
            className="w-full py-2 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
          >
            {existingSubmission ? 'Update' : isToday ? 'Submit Day' : 'Backfill Day'}
          </button>
        </div>
      )}
    </div>
  );
}
