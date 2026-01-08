'use client';

import { useEffect, useState } from 'react';
import { Game, User, Prediction } from '@/types';
import { PredictionGrid } from '@/components/prediction/PredictionGrid';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { PasswordPrompt } from '@/components/admin/PasswordPrompt';
import { CURRENT_SEASON, CURRENT_SEASON_TYPE } from '@/lib/constants';
import { isAdminAuthenticated, logoutAdmin } from '@/lib/utils/adminAuth';

interface MainPageProps {
  adminToken: string;
}

export default function MainPage({ adminToken }: MainPageProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [currentSeasonType, setCurrentSeasonType] = useState<number>(CURRENT_SEASON_TYPE);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Load current week on mount
  useEffect(() => {
    const loadCurrentWeek = async () => {
      try {
        const res = await fetch('/api/current-week', { cache: 'no-store' });
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
    setIsAdmin(isAdminAuthenticated());
  }, []);

  // Check for week/season updates every 5 minutes
  useEffect(() => {
    const weekCheckInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/current-week', { cache: 'no-store' });
        const data = await res.json();
        // Only auto-update if the API says we should be on a different week/season
        if (data.week !== currentWeek || data.seasonType !== currentSeasonType) {
          setCurrentWeek(data.week);
          setCurrentSeasonType(data.seasonType);
        }
      } catch (error) {
        console.error('Failed to check current week:', error);
      }
    }, 300000); // 5 minutes

    return () => clearInterval(weekCheckInterval);
  }, [currentWeek, currentSeasonType]);

  // Load data when week or season type changes
  useEffect(() => {
    if (currentWeek === null) return;

    loadData();

    // Auto-refresh scores every minute
    const interval = setInterval(() => {
      loadData();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [currentWeek, currentSeasonType]);

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

      // Load users
      const usersRes = await fetch('/api/users', { cache: 'no-store' });
      const usersData = await usersRes.json();
      setUsers(usersData);

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
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ predictions }),
    });

    if (!res.ok) {
      throw new Error('Failed to save predictions');
    }

    // Don't reload immediately - rely on optimistic update
    // Auto-refresh will sync data every 60 seconds
  };

  const requireAdmin = (callback: () => void) => {
    if (isAdmin) {
      callback();
    } else {
      setShowPasswordPrompt(true);
    }
  };

  const handlePasswordSuccess = () => {
    setIsAdmin(true);
    setShowPasswordPrompt(false);
  };

  const handleLogout = () => {
    logoutAdmin();
    setIsAdmin(false);
    setShowUserManagement(false);
  };

  const handleAddUser = async () => {
    if (!newUserName.trim()) {
      alert('Please enter a name');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: newUserName.trim() }),
      });

      if (!res.ok) {
        throw new Error('Failed to add user');
      }

      setNewUserName('');
      await loadData();
    } catch (error) {
      console.error('Failed to add user:', error);
      alert('Failed to add user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this person? All their predictions will be lost.')) {
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        throw new Error('Failed to delete user');
      }

      await loadData();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  const handleSyncScores = async () => {
    try {
      const res = await fetch(`/api/cron/sync-scores?week=${currentWeek}&seasonYear=${CURRENT_SEASON}&seasonType=${currentSeasonType}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to sync scores');
      }

      const data = await res.json();
      alert(`Synced ${data.result.gamesUpdated} games for Week ${currentWeek} successfully!`);
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">NFL Predictions - Admin</h1>
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

        {/* Admin Controls */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => requireAdmin(() => setShowUserManagement(!showUserManagement))}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            {showUserManagement ? 'Hide' : 'Manage'} Participants
          </button>
          <button
            onClick={() => window.location.href = `/admin/${adminToken}/links`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            User Links
          </button>
          <button
            onClick={handleSyncScores}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Sync Scores Now
          </button>
          {isAdmin && (
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Logout Admin
            </button>
          )}
        </div>

        {/* User Management */}
        {showUserManagement && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Manage Participants</h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Enter name..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleAddUser();
                  }}
                />
                <button
                  onClick={handleAddUser}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Person
                </button>
              </div>

              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">{user.displayName}</span>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Predictions Grid */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Predictions</h2>
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Add participants above to start making predictions
            </div>
          ) : (
            <PredictionGrid
              games={games}
              users={users}
              predictions={predictions}
              onSave={handleSavePredictions}
              isAdmin={isAdmin}
              onRequestAuth={() => setShowPasswordPrompt(true)}
              authToken={adminToken}
            />
          )}
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Leaderboard</h2>
          <LeaderboardTable entries={leaderboard} />
        </div>
      </div>

      {/* Password Prompt Modal */}
      {showPasswordPrompt && (
        <PasswordPrompt
          onCorrectPassword={handlePasswordSuccess}
          onCancel={() => setShowPasswordPrompt(false)}
        />
      )}
    </main>
  );
}
