import { useState, useEffect, useMemo, useCallback } from 'react';
import { loadData, saveData } from './dataService';
import type { AppData, ActivitySet, Submission, View, Rival, RivalPersonality } from './types';
import { format, subDays, parseISO } from 'date-fns';
import SetSelection from './components/SetSelection';
import ActivityList from './components/ActivityList';
import Statistics from './components/Statistics';
import Settings from './components/Settings';
import Leaderboard from './components/Leaderboard';
import { generateRivalHistory } from './utils/rivalEngine';

function App() {
  const [data, setData] = useState<AppData>({ sets: [], submissions: [], users: [], rivals: [], rivalSubmissions: [] });
  const [loaded, setLoaded] = useState(false);
  const [currentView, setCurrentView] = useState<View>('sets');
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);

  useEffect(() => {
    const loadDataAndRivals = async () => {
      let appData: AppData;
      const stored = localStorage.getItem('day-rating-data');
      if (stored) {
        const parsed = JSON.parse(stored);
        await saveData(parsed);
        localStorage.removeItem('day-rating-data');
        appData = { ...parsed, rivals: parsed.rivals ?? [], rivalSubmissions: parsed.rivalSubmissions ?? [] };
      } else {
        appData = await loadData();
        appData = { ...appData, rivals: appData.rivals ?? [], rivalSubmissions: appData.rivalSubmissions ?? [] };
      }
      setData(appData);

      // Migrate rival submissions from localStorage if present
      const storedRivals = localStorage.getItem('rival-submissions');
      if (storedRivals) {
        const migrated = JSON.parse(storedRivals);
        setData(prev => ({ ...prev, rivalSubmissions: [...prev.rivalSubmissions, ...migrated] }));
        localStorage.removeItem('rival-submissions');
        localStorage.removeItem('leaderboard-last-gen');
      }

      setLoaded(true);
    };
    loadDataAndRivals();
  }, []);

  useEffect(() => {
    if (loaded) saveData(data);
  }, [data, loaded]);

  const today = new Date().toISOString().split('T')[0];

  const handleSelectSet = (setId: string) => {
    setSelectedSetId(setId);
  };

  const handleBackToSets = () => {
    setSelectedSetId(null);
  };

  const handleSubmit = (setId: string, activitiesChecked: string[], bonusesChecked: string[], totalPoints: number, note: string) => {
    const newSubmission: Submission = {
      id: Date.now().toString(),
      date: today,
      setId,
      activitiesChecked,
      bonusesChecked,
      totalPoints,
      note: note || undefined,
    };
    setData(prev => {
      const existingIndex = prev.submissions.findIndex(s => s.date === today && s.setId === setId);
      if (existingIndex !== -1) {
        const updated = [...prev.submissions];
        updated[existingIndex] = { ...updated[existingIndex], activitiesChecked, bonusesChecked, totalPoints, note: note || undefined };
        return { ...prev, submissions: updated };
      }
      return { ...prev, submissions: [...prev.submissions, newSubmission] };
    });
    setSelectedSetId(null);
  };

  const handleRenameSet = (setId: string, newName: string) => {
    setData(prev => ({
      ...prev,
      sets: prev.sets.map(set =>
        set.id === setId ? { ...set, name: newName } : set
      ),
    }));
  };

  const handleToggleSetActive = (setId: string) => {
    setData(prev => ({
      ...prev,
      sets: prev.sets.map(set =>
        set.id === setId ? { ...set, deactivated: !set.deactivated } : set
      ),
    }));
  };

  const handleEditActivity = (setId: string, activityId: string, name: string, points: number) => {
    setData(prev => ({
      ...prev,
      sets: prev.sets.map(set =>
        set.id === setId
          ? {
              ...set,
              activities: set.activities.map(activity =>
                activity.id === activityId ? { ...activity, name, points } : activity
              ),
            }
          : set
      ),
    }));
  };

  const handleReorderActivities = (setId: string, activityIds: string[]) => {
    setData(prev => ({
      ...prev,
      sets: prev.sets.map(set =>
        set.id === setId
          ? {
              ...set,
              activities: activityIds
                .map(id => set.activities.find(a => a.id === id))
                .filter((a): a is NonNullable<typeof a> => a !== undefined),
            }
          : set
      ),
    }));
  };

  const handleAddSet = (name: string) => {
    const newSet: ActivitySet = {
      id: Date.now().toString(),
      name,
      activities: [],
    };
    setData(prev => ({
      ...prev,
      sets: [...prev.sets, newSet],
    }));
  };

  const handleDeleteSet = (setId: string) => {
    setData(prev => ({
      ...prev,
      sets: prev.sets.filter(s => s.id !== setId),
    }));
  };

  const handleAddActivity = (setId: string, name: string, points: number) => {
    setData(prev => ({
      ...prev,
      sets: prev.sets.map(set =>
        set.id === setId
          ? {
              ...set,
              activities: [
                ...set.activities,
                { id: Date.now().toString(), name, points },
              ],
            }
          : set
      ),
    }));
  };

  const handleDeleteActivity = (setId: string, activityId: string) => {
    setData(prev => ({
      ...prev,
      sets: prev.sets.map(set =>
        set.id === setId
          ? { ...set, activities: set.activities.filter(a => a.id !== activityId) }
          : set
      ),
    }));
  };

  const handleAddBonus = (setId: string, activityId: string, name: string, points: number) => {
    setData(prev => ({
      ...prev,
      sets: prev.sets.map(set =>
        set.id === setId
          ? {
              ...set,
              activities: set.activities.map(activity =>
                activity.id === activityId
                  ? { ...activity, bonus: { id: Date.now().toString(), name, points } }
                  : activity
              ),
            }
          : set
      ),
    }));
  };

  const handleDeleteBonus = (setId: string, activityId: string) => {
    setData(prev => ({
      ...prev,
      sets: prev.sets.map(set =>
        set.id === setId
          ? {
              ...set,
              activities: set.activities.map(activity =>
                activity.id === activityId
                  ? { ...activity, bonus: undefined }
                  : activity
              ),
            }
          : set
      ),
    }));
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `day-rating-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (json: string) => {
    try {
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.sets) && Array.isArray(parsed.submissions)) {
        setData({ ...parsed, users: parsed.users ?? [], rivals: parsed.rivals ?? [] });
      } else {
        alert('Invalid backup file: missing sets or submissions');
      }
    } catch {
      alert('Invalid JSON file');
    }
  };

  const handleAddUser = (name: string) => {
    const newUser = {
      id: Date.now().toString(),
      name,
    };
    setData(prev => ({
      ...prev,
      users: [...prev.users, newUser],
    }));
  };

  const handleDeleteUser = (userId: string) => {
    setData(prev => ({
      ...prev,
      users: prev.users.filter(u => u.id !== userId),
    }));
  };

  const handleAddRival = (name: string, personality: RivalPersonality, anomalyChance: number) => {
    const newRival: Rival = {
      id: `rival-${Date.now()}`,
      name,
      personality,
      anomalyChance,
      createdAt: new Date().toISOString().split('T')[0],
      lastGenerated: new Date().toISOString().split('T')[0],
    };
    setData(prev => ({
      ...prev,
      rivals: [...prev.rivals, newRival],
    }));
  };

  const handleDeleteRival = (rivalId: string) => {
    setData(prev => ({
      ...prev,
      rivals: prev.rivals.filter(r => r.id !== rivalId),
      rivalSubmissions: prev.rivalSubmissions.filter(s => !s.id.startsWith(rivalId)),
    }));
  };

  const handleUpdateRivals = (newSubmissions: Submission[]) => {
    setData(prev => ({
      ...prev,
      rivalSubmissions: [...prev.rivalSubmissions, ...newSubmissions],
    }));
  };

  const selectedSet = data.sets.find(s => s.id === selectedSetId);

  const { currentStreak, longestStreak, todaySubmitted } = useMemo(() => {
    const dates = [...new Set(data.submissions.map(s => s.date))].sort().reverse();
    if (dates.length === 0) return { currentStreak: 0, longestStreak: 0, todaySubmitted: false };

    const today = format(new Date(), 'yyyy-MM-dd');
    const todaySub = dates.includes(today);

    // Current streak: count backwards from today (or yesterday if not submitted today)
    let current = 0;
    let checkDate = todaySub ? new Date() : subDays(new Date(), 1);
    while (true) {
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      if (dates.includes(dateStr)) {
        current++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }

    // Longest streak: scan all sorted unique dates
    let longest = 1;
    let run = 1;
    const sorted = [...dates].sort();
    for (let i = 1; i < sorted.length; i++) {
      const prev = parseISO(sorted[i - 1]);
      const curr = parseISO(sorted[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diffDays === 1) {
        run++;
        if (run > longest) longest = run;
      } else {
        run = 1;
      }
    }
    if (dates.length === 1) longest = 1;

    return { currentStreak: current, longestStreak: longest, todaySubmitted: todaySub };
  }, [data.submissions]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4">
        <h1 className="text-xl font-bold text-center text-purple-400">Day Rating</h1>
        <nav className="flex justify-center gap-6 mt-3">
          <button
            onClick={() => { setCurrentView('sets'); setSelectedSetId(null); }}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              currentView === 'sets'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sets
          </button>
          <button
            onClick={() => { setCurrentView('statistics'); setSelectedSetId(null); }}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              currentView === 'statistics'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Statistics
          </button>
          <button
            onClick={() => { setCurrentView('settings'); setSelectedSetId(null); }}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              currentView === 'settings'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => { setCurrentView('leaderboard'); setSelectedSetId(null); }}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              currentView === 'leaderboard'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Leaderboard
          </button>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        {currentView === 'sets' && (
          selectedSet ? (
            <ActivityList
              set={selectedSet}
              existingSubmission={data.submissions.find(s => s.date === today && s.setId === selectedSet.id)}
              onBack={handleBackToSets}
              onSubmit={handleSubmit}
            />
          ) : (
            <>
              {data.submissions.length > 0 && (
                <div className="flex gap-3 mb-4">
                  <div className="flex-1 p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
                    <div className="text-gray-500 text-xs mb-1">STREAK</div>
                    <div className={`text-2xl font-bold ${currentStreak > 0 ? 'text-amber-400' : 'text-gray-600'}`}>
                      {currentStreak}
                    </div>
                    <div className="text-gray-600 text-xs">{currentStreak === 1 ? 'day' : 'days'}</div>
                  </div>
                  <div className="flex-1 p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
                    <div className="text-gray-500 text-xs mb-1">BEST</div>
                    <div className="text-2xl font-bold text-gray-400">{longestStreak}</div>
                    <div className="text-gray-600 text-xs">{longestStreak === 1 ? 'day' : 'days'}</div>
                  </div>
                  <div className="flex-1 p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
                    <div className="text-gray-500 text-xs mb-1">TODAY</div>
                    <div className={`text-2xl font-bold ${todaySubmitted ? 'text-green-400' : 'text-gray-600'}`}>
                      {todaySubmitted ? 'Done' : '---'}
                    </div>
                  </div>
                </div>
              )}
              <SetSelection
                sets={data.sets}
                onSelectSet={handleSelectSet}
              />
            </>
          )
        )}

        {currentView === 'statistics' && (
          <Statistics
            sets={data.sets}
            submissions={data.submissions}
          />
        )}

        {currentView === 'settings' && (
          <Settings
            sets={data.sets}
            onAddSet={handleAddSet}
            onDeleteSet={handleDeleteSet}
            onRenameSet={handleRenameSet}
            onToggleSetActive={handleToggleSetActive}
            onAddActivity={handleAddActivity}
            onDeleteActivity={handleDeleteActivity}
            onEditActivity={handleEditActivity}
            onReorderActivities={handleReorderActivities}
            onAddBonus={handleAddBonus}
            onDeleteBonus={handleDeleteBonus}
            onExport={handleExport}
            onImport={handleImport}
          />
        )}

        {currentView === 'leaderboard' && (
          <Leaderboard
            users={data.users}
            submissions={data.submissions}
            sets={data.sets}
            rivals={data.rivals}
            rivalSubmissions={data.rivalSubmissions}
            onAddUser={handleAddUser}
            onDeleteUser={handleDeleteUser}
            onAddRival={handleAddRival}
            onDeleteRival={handleDeleteRival}
            onUpdateRivals={handleUpdateRivals}
          />
        )}
      </main>
    </div>
  );
}

export default App;
