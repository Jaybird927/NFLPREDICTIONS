'use client';

import { useState } from 'react';

interface PasswordPromptProps {
  onCorrectPassword: () => void;
  onCancel: () => void;
}

const ADMIN_PASSWORD = 'f00tball#1';

export function PasswordPrompt({ onCorrectPassword, onCancel }: PasswordPromptProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password === ADMIN_PASSWORD) {
      // Store auth in localStorage
      localStorage.setItem('adminAuth', 'true');
      onCorrectPassword();
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Admin Password Required</h2>
        <p className="text-gray-600 mb-6">
          Enter the admin password to make changes to predictions or manage participants.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            placeholder="Enter password..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />

          {error && (
            <div className="text-red-600 text-sm mb-4">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
