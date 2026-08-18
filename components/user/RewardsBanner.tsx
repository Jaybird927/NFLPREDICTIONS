'use client';

import { useEffect, useState } from 'react';

interface Pass {
  id: number;
  week: number;
  designatedGameId: number | null;
  usedGameId: number | null;
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

  if (passes.length === 0) return null;

  const currentWeekPass = passes[passes.length - 1] as Pass | undefined;
  if (!currentWeekPass) return null;
  const used = currentWeekPass.usedGameId !== null;
  const designated = currentWeekPass.designatedGameId !== null && !used;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-3">Your Rewards</h3>
      <div className="flex flex-wrap gap-3">
        <div className={`flex items-center gap-2 rounded-lg px-4 py-2 border ${used ? 'bg-gray-100 border-gray-300 opacity-60' : 'bg-yellow-50 border-yellow-300'}`}>
          <span className="text-xl">⏱</span>
          <div>
            <p className={`font-semibold text-sm ${used ? 'text-gray-600' : 'text-yellow-800'}`}>
              30-Minute Pass — Week {currentWeekPass.week}
            </p>
            <p className={`text-xs ${used ? 'text-gray-500' : 'text-yellow-700'}`}>
              {used
                ? 'Used this week'
                : designated
                ? 'Designated — row turns yellow at kickoff'
                : 'Tap "Use 30-min Pass" on any game below before it starts'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
