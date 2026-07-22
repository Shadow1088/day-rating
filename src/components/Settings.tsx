import { useState, useRef } from 'react';
import type { ActivitySet } from '../types';

interface SettingsProps {
  sets: ActivitySet[];
  users: Array<{ id: string; name: string }>;
  onAddSet: (name: string) => void;
  onDeleteSet: (setId: string) => void;
  onRenameSet: (setId: string, newName: string) => void;
  onToggleSetActive: (setId: string) => void;
  onToggleSetGlobal: (setId: string) => void;
  onAddActivity: (setId: string, name: string, points: number) => void;
  onDeleteActivity: (setId: string, activityId: string) => void;
  onEditActivity: (setId: string, activityId: string, name: string, points: number) => void;
  onReorderActivities: (setId: string, activityIds: string[]) => void;
  onAddBonus: (setId: string, activityId: string, name: string, points: number) => void;
  onDeleteBonus: (setId: string, activityId: string) => void;
  onAddUser: (name: string) => void;
  onDeleteUser: (userId: string) => void;
  onExport: () => void;
  onImport: (json: string) => void;
}

export default function Settings({
  sets,
  users,
  onAddSet,
  onDeleteSet,
  onRenameSet,
  onToggleSetActive,
  onToggleSetGlobal,
  onAddActivity,
  onDeleteActivity,
  onEditActivity,
  onReorderActivities,
  onAddBonus,
  onDeleteBonus,
  onAddUser,
  onDeleteUser,
  onExport,
  onImport,
}: SettingsProps) {
  const [newSetName, setNewSetName] = useState('');
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);
  const [renamingSetId, setRenamingSetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityPoints, setNewActivityPoints] = useState('');
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editActivityName, setEditActivityName] = useState('');
  const [editActivityPoints, setEditActivityPoints] = useState('');
  const [bonusFormActivityId, setBonusFormActivityId] = useState<string | null>(null);
  const [newBonusName, setNewBonusName] = useState('');
  const [newBonusPoints, setNewBonusPoints] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddSet = () => {
    if (newSetName.trim()) {
      onAddSet(newSetName.trim());
      setNewSetName('');
    }
  };

  const handleStartRename = (set: ActivitySet) => {
    setRenamingSetId(set.id);
    setRenameValue(set.name);
  };

  const handleConfirmRename = () => {
    if (renamingSetId && renameValue.trim()) {
      onRenameSet(renamingSetId, renameValue.trim());
      setRenamingSetId(null);
      setRenameValue('');
    }
  };

  const handleStartEditActivity = (activity: { id: string; name: string; points: number }) => {
    setEditingActivityId(activity.id);
    setEditActivityName(activity.name);
    setEditActivityPoints(activity.points.toString());
  };

  const handleConfirmEditActivity = (setId: string) => {
    if (editingActivityId && editActivityName.trim()) {
      const points = parseInt(editActivityPoints);
      if (!isNaN(points) && points > 0) {
        onEditActivity(setId, editingActivityId, editActivityName.trim(), points);
        setEditingActivityId(null);
        setEditActivityName('');
        setEditActivityPoints('');
      }
    }
  };

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = (setId: string, activities: { id: string }[]) => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const reordered = [...activities.map(a => a.id)];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);

    onReorderActivities(setId, reordered);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleAddActivity = (setId: string) => {
    const points = parseInt(newActivityPoints);
    if (newActivityName.trim() && !isNaN(points) && points > 0) {
      onAddActivity(setId, newActivityName.trim(), points);
      setNewActivityName('');
      setNewActivityPoints('');
    }
  };

  const handleAddBonus = (setId: string, activityId: string) => {
    const points = parseInt(newBonusPoints);
    if (newBonusName.trim() && !isNaN(points) && points > 0) {
      onAddBonus(setId, activityId, newBonusName.trim(), points);
      setNewBonusName('');
      setNewBonusPoints('');
      setBonusFormActivityId(null);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      onImport(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-200">Settings</h2>

      {/* Users */}
      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Users</h3>
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between p-2 rounded bg-gray-800">
            <span className="text-gray-200 text-sm">You (default)</span>
          </div>
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between p-2 rounded bg-gray-800">
              <span className="text-gray-200 text-sm">{u.name}</span>
              <button
                onClick={() => onDeleteUser(u.id)}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newUserName}
            onChange={e => setNewUserName(e.target.value)}
            placeholder="New user name"
            className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
            onKeyDown={e => {
              if (e.key === 'Enter' && newUserName.trim()) {
                onAddUser(newUserName.trim());
                setNewUserName('');
              }
            }}
          />
          <button
            onClick={() => {
              if (newUserName.trim()) {
                onAddUser(newUserName.trim());
                setNewUserName('');
              }
            }}
            className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Backup / Restore */}
      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Backup / Restore</h3>
        <div className="flex gap-2">
          <button
            onClick={onExport}
            className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm hover:border-gray-600 transition-colors"
          >
            Export JSON
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm hover:border-gray-600 transition-colors"
          >
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </div>

      {/* Add Set */}
      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Create New Set</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSetName}
            onChange={e => setNewSetName(e.target.value)}
            placeholder="Set name"
            className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500"
            onKeyDown={e => e.key === 'Enter' && handleAddSet()}
          />
          <button
            onClick={handleAddSet}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Set List */}
      {sets.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No sets created yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sets.map(set => (
            <div key={set.id} className="rounded-lg bg-gray-900 border border-gray-800">
              <div className="flex items-center justify-between p-4">
                <button
                  onClick={() => setExpandedSetId(expandedSetId === set.id ? null : set.id)}
                  className="flex-1 text-left"
                >
                  {renamingSetId === set.id ? (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        className="flex-1 px-2 py-1 rounded bg-gray-800 border border-purple-500 text-gray-200 text-sm focus:outline-none"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleConfirmRename()}
                        onBlur={handleConfirmRename}
                      />
                    </div>
                  ) : (
                    <>
                      <span className={`font-medium ${set.deactivated ? 'text-gray-500' : 'text-gray-200'}`}>
                        {set.name}
                      </span>
                      {set.deactivated && (
                        <span className="text-xs text-gray-600 ml-2">(locked)</span>
                      )}
                      <span className="text-gray-500 text-sm ml-2">
                        ({set.activities.length} {set.activities.length === 1 ? 'activity' : 'activities'})
                      </span>
                    </>
                  )}
                </button>
                <div className="flex items-center gap-1">
                  {renamingSetId !== set.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStartRename(set); }}
                      className="text-gray-400 hover:text-gray-200 text-sm px-2"
                    >
                      Rename
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleSetGlobal(set.id); }}
                    className={`text-sm px-2 ${set.global ? 'text-cyan-400 hover:text-cyan-300' : 'text-gray-400 hover:text-gray-200'}`}
                    title={set.global ? 'Set is global (visible to all users)' : 'Set is private'}
                  >
                    {set.global ? 'Global' : 'Private'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleSetActive(set.id); }}
                    className={`text-sm px-2 ${set.deactivated ? 'text-green-400 hover:text-green-300' : 'text-gray-400 hover:text-gray-200'}`}
                  >
                    {set.deactivated ? 'Unlock' : 'Lock'}
                  </button>
                  <button
                    onClick={() => onDeleteSet(set.id)}
                    className="text-red-400 hover:text-red-300 text-sm px-2"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {expandedSetId === set.id && (
                <div className="border-t border-gray-800 p-4">
                  {/* Activities */}
                  {set.activities.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {set.activities.map((activity, index) => (
                        <div key={activity.id}>
                          <div
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragEnd={() => handleDragEnd(set.id, set.activities)}
                            onDragOver={e => e.preventDefault()}
                            className="flex items-center justify-between p-2 rounded bg-gray-800 cursor-grab active:cursor-grabbing"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600 text-xs select-none">⠿</span>
                              {editingActivityId === activity.id ? (
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="text"
                                    value={editActivityName}
                                    onChange={e => setEditActivityName(e.target.value)}
                                    className="px-2 py-1 rounded bg-gray-700 border border-purple-500 text-gray-200 text-sm focus:outline-none"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleConfirmEditActivity(set.id)}
                                  />
                                  <input
                                    type="number"
                                    value={editActivityPoints}
                                    onChange={e => setEditActivityPoints(e.target.value)}
                                    min="1"
                                    className="w-16 px-2 py-1 rounded bg-gray-700 border border-purple-500 text-gray-200 text-sm focus:outline-none"
                                  />
                                  <button
                                    onClick={() => handleConfirmEditActivity(set.id)}
                                    className="text-green-400 hover:text-green-300 text-xs"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={() => setEditingActivityId(null)}
                                    className="text-gray-400 hover:text-gray-200 text-xs"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span className="text-gray-300">{activity.name}</span>
                                  <span className="text-purple-400 text-sm">{activity.points} pts</span>
                                </>
                              )}
                            </div>
                            {editingActivityId !== activity.id && (
                              <div className="flex items-center gap-2">
                                {!activity.bonus && (
                                  <button
                                    onClick={() => setBonusFormActivityId(activity.id)}
                                    className="text-green-400 hover:text-green-300 text-xs"
                                  >
                                    + Bonus
                                  </button>
                                )}
                                <button
                                  onClick={() => handleStartEditActivity(activity)}
                                  className="text-gray-400 hover:text-gray-200 text-xs"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => onDeleteActivity(set.id, activity.id)}
                                  className="text-red-400 hover:text-red-300 text-xs"
                                >
                                  ×
                                </button>
                              </div>
                            )}
                          </div>

                          {activity.bonus && (
                            <div className="flex items-center justify-between p-2 ml-6 rounded bg-gray-800/50">
                              <span className="text-gray-400 text-sm">+ {activity.bonus.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-green-400 text-xs">+{activity.bonus.points} pts</span>
                                <button
                                  onClick={() => onDeleteBonus(set.id, activity.id)}
                                  className="text-red-400 hover:text-red-300 text-xs"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          )}

                          {bonusFormActivityId === activity.id && (
                            <div className="mt-2 p-3 rounded bg-gray-800/50 space-y-2">
                              <input
                                type="text"
                                value={newBonusName}
                                onChange={e => setNewBonusName(e.target.value)}
                                placeholder="Bonus name"
                                className="w-full px-3 py-1.5 rounded bg-gray-700 border border-gray-600 text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
                              />
                              <input
                                type="number"
                                value={newBonusPoints}
                                onChange={e => setNewBonusPoints(e.target.value)}
                                placeholder="Points"
                                min="1"
                                className="w-full px-3 py-1.5 rounded bg-gray-700 border border-gray-600 text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAddBonus(set.id, activity.id)}
                                  className="px-3 py-1 rounded bg-green-600 hover:bg-green-500 text-white text-sm"
                                >
                                  Add Bonus
                                </button>
                                <button
                                  onClick={() => { setBonusFormActivityId(null); setNewBonusName(''); setNewBonusPoints(''); }}
                                  className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Activity */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newActivityName}
                      onChange={e => setNewActivityName(e.target.value)}
                      placeholder="Activity name"
                      className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                    <input
                      type="number"
                      value={newActivityPoints}
                      onChange={e => setNewActivityPoints(e.target.value)}
                      placeholder="Pts"
                      min="1"
                      className="w-20 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={() => handleAddActivity(set.id)}
                      className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
