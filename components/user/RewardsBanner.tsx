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
}

export function RewardsBanner({ authToken }: RewardsBannerProps) {
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
      <div className="flex flex-wrap gap-3">
        {summary.unused > 0 && (
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-2">
            <span className="text-xl">⏱</span>
            <div>
              <p className="font-semibold text-yellow-800 text-sm">
                30-Minute Pass {summary.unused > 1 ? `x${summary.unused}` : ''}
              </p>
              <p className="text-xs text-yellow-700">
                {summary.designated
                  ? 'Designated — row turns yellow at kickoff'
                  : 'Tap "Use 30-min Pass" on any game before it starts'}
              </p>
            </div>
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
