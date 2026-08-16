'use client';

import { useEffect, useState } from 'react';

interface Pass {
  id: number;
  passType: 'thirty_minute' | 'late';
  usedGameId: number | null;
  appliedWeek: number | null;
}

interface RewardsBannerProps {
  authToken: string;
}

export function RewardsBanner({ authToken }: RewardsBannerProps) {
  const [passes, setPasses] = useState<Pass[]>([]);

  useEffect(() => {
    fetch('/api/passes', { headers: { Authorization: `Bearer ${authToken}` } })
      .then((r) => r.json())
      .then((data) => setPasses(data.passes ?? []));
  }, [authToken]);

  const thirtyMin = passes.filter((p) => p.passType === 'thirty_minute');
  const latePasses = passes.filter((p) => p.passType === 'late');

  const unusedThirtyMin = thirtyMin.filter((p) => p.usedGameId === null);
  const usedThirtyMin = thirtyMin.filter((p) => p.usedGameId !== null);
  const unusedLate = latePasses.filter((p) => p.appliedWeek === null);
  const usedLate = latePasses.filter((p) => p.appliedWeek !== null);

  if (passes.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-3">🏆 Your Rewards</h3>
      <div className="flex flex-wrap gap-3">

        {unusedThirtyMin.map((p) => (
          <div key={p.id} className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-2">
            <span className="text-xl">⏱</span>
            <div>
              <p className="font-semibold text-yellow-800 text-sm">30-Minute Pass</p>
              <p className="text-xs text-yellow-700">Pick a game up to 30 min after kickoff — row turns yellow when active</p>
            </div>
          </div>
        ))}

        {usedThirtyMin.map((p) => (
          <div key={p.id} className="flex items-center gap-2 bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 opacity-60">
            <span className="text-xl">⏱</span>
            <div>
              <p className="font-semibold text-gray-600 text-sm">30-Minute Pass</p>
              <p className="text-xs text-gray-500">Used</p>
            </div>
          </div>
        ))}

        {unusedLate.map((p) => (
          <div key={p.id} className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-lg px-4 py-2">
            <span className="text-xl">🎲</span>
            <div>
              <p className="font-semibold text-red-800 text-sm">Late Pass</p>
              <p className="text-xs text-red-700">If you miss a pick this season, one game gets a random pick instead of a loss</p>
            </div>
          </div>
        ))}

        {usedLate.map((p) => (
          <div key={p.id} className="flex items-center gap-2 bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 opacity-60">
            <span className="text-xl">🎲</span>
            <div>
              <p className="font-semibold text-gray-600 text-sm">Late Pass</p>
              <p className="text-xs text-gray-500">Used — Week {p.appliedWeek}</p>
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
