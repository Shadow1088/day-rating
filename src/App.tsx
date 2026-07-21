import { useState, useEffect } from 'react';
import { loadData, saveData } from './dataService';
import type { AppData, ActivitySet, Submission, View } from './types';
import SetSelection from './components/SetSelection';
import ActivityList from './components/ActivityList';
import Statistics from './components/Statistics';
import Settings from './components/Settings';

function App() {
  const [data, setData] = useState<AppData>({ sets: [], submissions: [] });
  const [loaded, setLoaded] = useState(false);
  const [currentView, setCurrentView] = useState<View>('sets');
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);

  useEffect(() => {
    // One-time migration from localStorage
    const stored = localStorage.getItem('day-rating-data');
    if (stored) {
      const parsed = JSON.parse(stored);
      saveData(parsed).then(() => {
        localStorage.removeItem('day-rating-data');
        setData(parsed);
        setLoaded(true);
      });
    } else {
      loadData().then(d => { setData(d); setLoaded(true); });
    }
  }, []);

  useEffect(() => {
    if (loaded) saveData(data);
  }, [data, loaded]);

  const handleSelectSet = (setId: string) => {
    setSelectedSetId(setId);
  };

  const handleBackToSets = () => {
    setSelectedSetId(null);
  };

  const handleSubmit = (setId: string, activitiesChecked: string[], bonusesChecked: string[], totalPoints: number, note: string) => {
    const today = new Date().toISOString().split('T')[0];
    const newSubmission: Submission = {
      id: Date.now().toString(),
      date: today,
      setId,
      activitiesChecked,
      bonusesChecked,
      totalPoints,
      note: note || undefined,
    };
    setData(prev => ({
      ...prev,
      submissions: [...prev.submissions, newSubmission],
    }));
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
        setData(parsed);
      } else {
        alert('Invalid backup file: missing sets or submissions');
      }
    } catch {
      alert('Invalid JSON file');
    }
  };

  const selectedSet = data.sets.find(s => s.id === selectedSetId);

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
        </nav>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        {currentView === 'sets' && (
          selectedSet ? (
            <ActivityList
              set={selectedSet}
              onBack={handleBackToSets}
              onSubmit={handleSubmit}
            />
          ) : (
            <SetSelection
              sets={data.sets}
              onSelectSet={handleSelectSet}
            />
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
      </main>
    </div>
  );
}

export default App;
