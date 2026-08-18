'use client';

import { useEffect, useState } from 'react';

interface PassSummary {
  unused: number;
  used: number;
  designated: boolean;
  designatedGameId: number | null;
}

interface RewardsBannerProps {
  authToken: string;
  selectingPass: boolean;
  onStartSelect: () => void;
  onCancelSelect: () => void;
  onCancelDesignation: () => void;
}

export function RewardsBanner({ authToken, selectingPass, onStartSelect, onCancelSelect, onCancelDesignation }: RewardsBannerProps) {
  const [summary, setSummary] = useState<PassSummary | null>(null);

  useEffect(() => {
    fetch('/api/passes', { headers: { Authorization: `Bearer ${authToken}` } })
      .then((r) => r.json())
      .then((data) => { if (data.summary) setSummary(data.summary); });
  }, [authToken]);

  if (!summary || (summary.unused === 0 && summary.used === 0)) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-3">Your Rewards</h3>
      <div className="flex flex-wrap items-center gap-3">

        {summary.unused > 0 && !summary.designated && !selectingPass && (
          <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-2">
            <span className="text-xl">⏱</span>
            <div>
              <p className="font-semibold text-yellow-800 text-sm">
                30-Minute Pass{summary.unused > 1 ? ` ×${summary.unused}` : ''}
              </p>
              <p className="text-xs text-yellow-700">Lets you pick a game up to 30 min after kickoff</p>
            </div>
            <button
              onClick={onStartSelect}
              className="ml-2 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold rounded-lg"
            >
              Use a Pass
            </button>
          </div>
        )}

        {selectingPass && (
          <div className="flex items-center gap-3 bg-yellow-100 border border-yellow-400 rounded-lg px-4 py-2">
            <span className="text-xl">⏱</span>
            <p className="font-semibold text-yellow-800 text-sm">Select a game below to apply your pass</p>
            <button onClick={onCancelSelect} className="ml-2 px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg">
              Cancel
            </button>
          </div>
        )}

        {summary.designated && !selectingPass && (
          <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-2">
            <span className="text-xl">⏱</span>
            <div>
              <p className="font-semibold text-yellow-800 text-sm">Pass Designated</p>
              <p className="text-xs text-yellow-700">Row turns yellow at kickoff — you have 30 min to pick</p>
            </div>
            <button onClick={onCancelDesignation} className="ml-2 px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg">
              Cancel
            </button>
          </div>
        )}

        {summary.unused === 0 && summary.used > 0 && (
          <div className="flex items-center gap-2 bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 opacity-60">
            <span className="text-xl">⏱</span>
            <div>
              <p className="font-semibold text-gray-600 text-sm">30-Minute Pass</p>
              <p className="text-xs text-gray-500">All used — win a week to earn another</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
