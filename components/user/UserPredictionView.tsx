'use client';

import { useEffect, useState } from 'react';
import { Game, User, Prediction } from '@/types';
import { PredictionGrid } from '@/components/prediction/PredictionGrid';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { CURRENT_SEASON, CURRENT_SEASON_TYPE } from '@/lib/constants';

interface UserPredictionViewProps {
  userId: number;
  displayName: string;
  authToken: string;
}

export default function UserPredictionView({ userId, displayName, authToken }: UserPredictionViewProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Load current week on mount
  useEffect(() => {
    const loadCurrentWeek = async () => {
      try {
        const res = await fetch('/api/current-week');
        const data = await res.json();
        setCurrentWeek(data.week);
      } catch (error) {
        console.error('Failed to load current week:', error);
        setCurrentWeek(13); // Fallback to week 13
      }
    };

    loadCurrentWeek();
  }, []);

  // Load data when week changes
  useEffect(() => {
    if (currentWeek === null) return;

    loadData();

    // Auto-refresh scores every minute
    const interval = setInterval(() => {
      loadData();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [currentWeek]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load games and predictions
      const gamesRes = await fetch(
        `/api/games?week=${currentWeek}&seasonYear=${CURRENT_SEASON}&seasonType=${CURRENT_SEASON_TYPE}`,
        { cache: 'no-store' }
      );
      const gamesData = await gamesRes.json();
      setGames(gamesData.games);
      setPredictions(gamesData.predictions);

      // Only need the current user for the grid
      setUsers([{ id: userId, name: '', displayName, createdAt: new Date(), updatedAt: new Date() }]);

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
      alert('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePredictions = async (
    predictions: Array<{
      userId: number;
      gameId: number;
      predictedWinnerTeamId: string | null;
    }>
  ) => {
    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ predictions }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to save predictions');
    }
  };

  if (isLoading || currentWeek === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{displayName}'s Predictions</h1>
          <p className="text-gray-600">Week {currentWeek} - {CURRENT_SEASON} Season</p>
          {lastUpdate && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refreshes every minute
            </p>
          )}
        </div>

        {/* Week Selector */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={currentWeek === 1}
          >
            ← Previous Week
          </button>
          <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-semibold">
            Week {currentWeek}
          </div>
          <button
            onClick={() => setCurrentWeek(Math.min(18, currentWeek + 1))}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={currentWeek === 18}
          >
            Next Week →
          </button>
        </div>

        {/* Predictions Grid */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Your Picks</h2>
          <PredictionGrid
            games={games}
            users={users}
            predictions={predictions}
            onSave={handleSavePredictions}
            isAdmin={false}
            onRequestAuth={() => {}}
            authToken={authToken}
            restrictToUser={userId}
          />
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
