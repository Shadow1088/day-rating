import { useState } from 'react';
import type { User } from '../types';

interface LoginScreenProps {
  users: User[];
  onSelectUser: (userId: string | undefined) => void;
}

const AVATARS = ['😎', '🦊', '🐱', '🦉', '🐺', '🐻', '🦁', '🐸', '🐵', '🐰', '🐻‍❄️', '🐯'];

function getAvatar(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATARS[Math.abs(hash) % AVATARS.length];
}

export default function LoginScreen({ users, onSelectUser }: LoginScreenProps) {
  const [pinModalUser, setPinModalUser] = useState<User | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const handlePinSubmit = () => {
    if (pinModalUser && pinInput === pinModalUser.pin) {
      onSelectUser(pinModalUser.id);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  const handleUserClick = (user: User) => {
    if (user.pin) {
      setPinModalUser(user);
      setPinInput('');
      setPinError(false);
    } else {
      onSelectUser(user.id);
    }
  };

  if (pinModalUser) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center z-50">
        <div className="w-full max-w-sm p-6">
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">{getAvatar(pinModalUser.name)}</div>
            <h2 className="text-xl font-bold text-gray-100">{pinModalUser.name}</h2>
            <p className="text-gray-500 text-sm mt-1">Enter PIN to continue</p>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && pinInput.length >= 4) handlePinSubmit(); }}
              autoFocus
              placeholder="Enter PIN"
              className={`w-full px-4 py-3 rounded-lg bg-gray-800 border text-gray-200 text-center text-2xl tracking-[0.5em] font-mono placeholder-gray-600 focus:outline-none focus:border-purple-500 ${
                pinError ? 'border-red-500' : 'border-gray-700'
              }`}
            />
            {pinError && (
              <p className="text-red-400 text-sm text-center">Wrong PIN</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setPinModalUser(null); setPinInput(''); }}
                className="flex-1 px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handlePinSubmit}
                disabled={pinInput.length < 4}
                className="flex-1 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-full max-w-md p-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-purple-400 mb-2">Day Rating</h1>
          <p className="text-gray-500">Who are you?</p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => onSelectUser(undefined)}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-purple-500 hover:bg-gray-800 transition-all cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-purple-900/50 flex items-center justify-center text-2xl">
              😎
            </div>
            <div className="text-left">
              <div className="text-gray-100 font-medium">You</div>
              <div className="text-gray-500 text-sm">Default user</div>
            </div>
          </button>
          {users.map(user => (
            <button
              key={user.id}
              onClick={() => handleUserClick(user)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-purple-500 hover:bg-gray-800 transition-all cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-2xl">
                {getAvatar(user.name)}
              </div>
              <div className="text-left flex-1">
                <div className="text-gray-100 font-medium">{user.name}</div>
                <div className="text-gray-500 text-sm">{user.pin ? '🔒 PIN protected' : 'Tap to login'}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
