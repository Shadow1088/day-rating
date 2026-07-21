import { useState } from 'react';
import type { RivalPersonality } from '../types';
import { PRESET_PERSONALITIES } from '../utils/rivalEngine';

interface RivalCreatorProps {
  onCreate: (name: string, personality: RivalPersonality, anomalyChance: number) => void;
  onCancel: () => void;
}

export default function RivalCreator({ onCreate, onCancel }: RivalCreatorProps) {
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState<RivalPersonality>({
    morning: 5,
    nutrition: 5,
    project: 5,
    fitness: 5,
    culture: 5,
    discipline: 5,
  });
  const [anomalyChance, setAnomalyChance] = useState(0.15);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handlePresetSelect = (presetName: string) => {
    const preset = PRESET_PERSONALITIES[presetName];
    if (preset) {
      setPersonality({ ...preset.personality });
      setSelectedPreset(presetName);
    }
  };

  const handleSliderChange = (category: keyof RivalPersonality, value: number) => {
    setPersonality(prev => ({ ...prev, [category]: value }));
    setSelectedPreset(null);
  };

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim(), personality, anomalyChance);
    }
  };

  const categoryLabels: Record<keyof RivalPersonality, { label: string; description: string }> = {
    morning: { label: 'Morning Routine', description: 'Wake up, breakfast, on time' },
    nutrition: { label: 'Nutrition', description: 'Meals, calories, protein' },
    project: { label: 'Project & Study', description: 'Project work, studying' },
    fitness: { label: 'Fitness', description: 'Gym, combat sessions' },
    culture: { label: 'Culture', description: 'Music, albums, band history' },
    discipline: { label: 'Discipline', description: 'Screen time, reading, logging' },
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-800">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-200">Create Rival</h2>
            <button onClick={onCancel} className="text-gray-500 hover:text-white">✕</button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter rival name..."
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Quick Preset</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PRESET_PERSONALITIES).map(([presetName, preset]) => (
                <button
                  key={presetName}
                  onClick={() => handlePresetSelect(presetName)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    selectedPreset === presetName
                      ? 'bg-purple-900/30 border-purple-500/50'
                      : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-200">{presetName}</div>
                  <div className="text-xs text-gray-500">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Personality Traits</label>
            <div className="space-y-3">
              {(Object.keys(categoryLabels) as Array<keyof RivalPersonality>).map(category => (
                <div key={category}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-300">{categoryLabels[category].label}</span>
                    <span className="text-sm text-purple-400 font-mono">{personality[category]}/10</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">{categoryLabels[category].description}</div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={personality[category]}
                    onChange={e => handleSliderChange(category, parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm text-gray-400">Anomaly Chance</label>
              <span className="text-sm text-purple-400 font-mono">{Math.round(anomalyChance * 100)}%</span>
            </div>
            <div className="text-xs text-gray-500 mb-1">How often random events happen (lazy days, great days, etc.)</div>
            <input
              type="range"
              min="0"
              max="50"
              value={Math.round(anomalyChance * 100)}
              onChange={e => setAnomalyChance(parseInt(e.target.value) / 100)}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-4 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex-1 py-2 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Rival
          </button>
        </div>
      </div>
    </div>
  );
}
