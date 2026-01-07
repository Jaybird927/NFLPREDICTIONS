'use client';

import { useEffect, useState } from 'react';
import { Game, User, Prediction } from '@/types';
import { PredictionGrid } from '@/components/prediction/PredictionGrid';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { TipsModal } from '@/components/user/TipsModal';
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
  const [currentSeasonType, setCurrentSeasonType] = useState<number>(CURRENT_SEASON_TYPE);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showTips, setShowTips] = useState(false);

  // Load current week on mount
  useEffect(() => {
    const loadCurrentWeek = async () => {
      try {
        const res = await fetch('/api/current-week');
        const data = await res.json();
        setCurrentWeek(data.week);
        setCurrentSeasonType(data.seasonType);
      } catch (error) {
        console.error('Failed to load current week:', error);
        setCurrentWeek(13); // Fallback to week 13
        setCurrentSeasonType(2); // Fallback to regular season
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
        `/api/games?week=${currentWeek}&seasonYear=${CURRENT_SEASON}&seasonType=${currentSeasonType}`,
        { cache: 'no-store' }
      );
      const gamesData = await gamesRes.json();
      setGames(gamesData.games);
      setPredictions(gamesData.predictions);

      // Only need the current user for the grid
      setUsers([{ id: userId, name: '', displayName, createdAt: new Date(), updatedAt: new Date() }]);

      // Load leaderboard
      const leaderboardRes = await fetch(
        `/api/leaderboard?seasonYear=${CURRENT_SEASON}&seasonType=${currentSeasonType}`,
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

  const handleSyncScores = async () => {
    try {
      const res = await fetch('/api/cron/sync-scores', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to sync scores');
      }

      const data = await res.json();
      alert(`Synced ${data.result.gamesUpdated} games successfully!`);
      await loadData();
    } catch (error) {
      console.error('Failed to sync scores:', error);
      alert('Failed to sync scores');
    }
  };

  // Helper to get season type label
  const getSeasonTypeLabel = (type: number) => {
    switch (type) {
      case 1: return 'Preseason';
      case 2: return 'Regular Season';
      case 3: return 'Playoffs';
      default: return 'Season';
    }
  };

  // Helper to get max week for current season type
  const getMaxWeek = () => {
    switch (currentSeasonType) {
      case 1: return 4; // Preseason
      case 2: return 18; // Regular season
      case 3: return 5; // Playoffs
      default: return 18;
    }
  };

  // Helper to get week label for playoffs
  const getWeekLabel = (week: number) => {
    if (currentSeasonType !== 3) return `Week ${week}`;
    switch (week) {
      case 1: return 'Wild Card';
      case 2: return 'Divisional';
      case 3: return 'Conference';
      case 4: return 'Pro Bowl';
      case 5: return 'Super Bowl';
      default: return `Playoff Week ${week}`;
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
          <p className="text-gray-600">{getWeekLabel(currentWeek)} - {CURRENT_SEASON} {getSeasonTypeLabel(currentSeasonType)}</p>
          {lastUpdate && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refreshes every minute
            </p>
          )}
        </div>

        {/* Season Type Selector */}
        <div className="flex justify-center gap-2">
          <button
            onClick={() => { setCurrentSeasonType(2); setCurrentWeek(1); }}
            className={`px-4 py-2 rounded-lg border ${currentSeasonType === 2 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
          >
            Regular Season
          </button>
          <button
            onClick={() => { setCurrentSeasonType(3); setCurrentWeek(1); }}
            className={`px-4 py-2 rounded-lg border ${currentSeasonType === 3 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
          >
            Playoffs
          </button>
        </div>

        {/* Week Selector */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={currentWeek === 1}
          >
            ← Previous
          </button>
          <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-semibold min-w-[180px] text-center">
            {getWeekLabel(currentWeek)}
          </div>
          <button
            onClick={() => setCurrentWeek(Math.min(getMaxWeek(), currentWeek + 1))}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={currentWeek === getMaxWeek()}
          >
            Next →
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setShowTips(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Tips
          </button>
          <button
            onClick={handleSyncScores}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Sync Scores Now
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
          <LeaderboardTable entries={leaderboard} highlightUserId={userId} />
        </div>
      </div>

      {/* Tips Modal */}
      {showTips && <TipsModal onClose={() => setShowTips(false)} />}
    </main>
  );
}
