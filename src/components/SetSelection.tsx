import type { ActivitySet } from '../types';

interface SetSelectionProps {
  sets: ActivitySet[];
  onSelectSet: (setId: string) => void;
}

export default function SetSelection({ sets, onSelectSet }: SetSelectionProps) {
  if (sets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No sets available</p>
        <p className="text-gray-600 text-sm mt-2">Create a set in Settings to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold mb-4 text-gray-200">Select a Set</h2>
      {sets.map(set => {
        const totalPoints = set.activities.reduce((sum, a) => sum + a.points, 0);
        const bonusPoints = set.activities.reduce((sum, a) => sum + (a.bonus?.points ?? 0), 0);
        return (
          <button
            key={set.id}
            onClick={() => onSelectSet(set.id)}
            className="w-full text-left p-4 rounded-lg bg-gray-900 border border-gray-800 hover:border-purple-500 hover:bg-gray-800 transition-all cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-100">{set.name}</span>
              <div className="text-right">
                <span className="text-purple-400 font-semibold">{totalPoints} pts</span>
                {bonusPoints > 0 && (
                  <span className="text-gray-500 text-sm ml-2">+{bonusPoints} bonus</span>
                )}
              </div>
            </div>
            <div className="text-gray-500 text-sm mt-1">
              {set.activities.length} {set.activities.length === 1 ? 'activity' : 'activities'}
            </div>
          </button>
        );
      })}
    </div>
  );
}
