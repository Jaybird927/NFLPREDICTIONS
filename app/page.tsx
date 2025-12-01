'use client';

import { useEffect, useState } from 'react';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { CURRENT_SEASON, CURRENT_SEASON_TYPE } from '@/lib/constants';

export default function HomePage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load current week
        const weekRes = await fetch('/api/current-week');
        const weekData = await weekRes.json();
        setCurrentWeek(weekData.week);

        // Load leaderboard
        const leaderboardRes = await fetch(
          `/api/leaderboard?seasonYear=${CURRENT_SEASON}&seasonType=${CURRENT_SEASON_TYPE}`,
          { cache: 'no-store' }
        );
        const leaderboardData = await leaderboardRes.json();
        setLeaderboard(leaderboardData);

        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Auto-refresh every minute
    const interval = setInterval(() => {
      loadData();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading || currentWeek === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">NFL Predictions</h1>
          <p className="text-xl text-gray-600">Week {currentWeek} - {CURRENT_SEASON} Season</p>
          <p className="text-sm text-gray-500 mt-2">
            Have a prediction link? Click it to enter your picks!
          </p>
          {lastUpdate && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refreshes every minute
            </p>
          )}
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Leaderboard</h2>
          <LeaderboardTable entries={leaderboard} />
        </div>
      </div>
    </main>
  );
}
