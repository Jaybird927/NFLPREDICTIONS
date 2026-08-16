'use client';

import { useEffect, useState } from 'react';
import { Game, User, Prediction } from '@/types';
import { PredictionGrid } from '@/components/prediction/PredictionGrid';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { TipsModal } from '@/components/user/TipsModal';
import { NotificationOnboarding } from '@/components/user/NotificationOnboarding';
import { CURRENT_SEASON, CURRENT_SEASON_TYPE } from '@/lib/constants';

async function subscribeToPush(authToken: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const registration = await navigator.serviceWorker.ready;
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return false;

  const sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidKey,
  });

  const subJson = sub.toJSON();
  const res = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(subJson),
  });

  return res.ok;
}

async function unsubscribeFromPush(authToken: string): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return true;

  await fetch('/api/notifications/subscribe', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });

  await sub.unsubscribe();
  return true;
}

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
  const [thirtyMinPass, setThirtyMinPass] = useState<{ hasPass: boolean; usedGameId: number | null }>({ hasPass: false, usedGameId: null });
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<any[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState<'week' | 'season'>('week');
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [currentSeasonType, setCurrentSeasonType] = useState<number>(CURRENT_SEASON_TYPE);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [notifStatus, setNotifStatus] = useState<'unknown' | 'subscribed' | 'denied' | 'unsupported'>('unknown');

  // Check notification subscription status on mount
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setNotifStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setNotifStatus('denied');
      return;
    }
    // Check server for authoritative subscription status
    fetch('/api/notifications/status', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.subscribed) {
          setNotifStatus('subscribed');
          localStorage.setItem('notifSubscribedUserId', String(userId));
        } else {
          setNotifStatus('unknown');
        }
      })
      .catch(() => setNotifStatus('unknown'));
  }, [userId, authToken]);

  const handleToggleNotifications = async () => {
    if (notifStatus === 'subscribed') {
      await unsubscribeFromPush(authToken);
      setNotifStatus('unknown');
    } else {
      const ok = await subscribeToPush(authToken);
      if (ok) {
        setNotifStatus('subscribed');
      } else if (Notification.permission === 'denied') {
        setNotifStatus('denied');
        alert('Notifications are blocked. Please enable them in your browser settings.');
      }
    }
  };

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
        { cache: 'no-store', headers: { Authorization: `Bearer ${authToken}` } }
      );
      const gamesData = await gamesRes.json();
      setGames(gamesData.games);
      setPredictions(gamesData.predictions);
      setThirtyMinPass(gamesData.thirtyMinPass ?? { hasPass: false, usedGameId: null });

      // Only need the current user for the grid
      setUsers([{ id: userId, name: '', displayName, createdAt: new Date(), updatedAt: new Date() }]);

      // Load season leaderboard
      const leaderboardRes = await fetch(
        `/api/leaderboard?seasonYear=${CURRENT_SEASON}&seasonType=${currentSeasonType}`,
        { cache: 'no-store' }
      );
      const leaderboardData = await leaderboardRes.json();
      setLeaderboard(leaderboardData);

      // Load weekly leaderboard
      const weeklyRes = await fetch(
        `/api/leaderboard?seasonYear=${CURRENT_SEASON}&seasonType=${currentSeasonType}&week=${currentWeek}`,
        { cache: 'no-store' }
      );
      const weeklyData = await weeklyRes.json();
      setWeeklyLeaderboard(weeklyData);

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
      case 2: return 'Regular Season';
      case 3: return 'Playoffs';
      default: return 'Season';
    }
  };

  const getMaxWeek = () => {
    switch (currentSeasonType) {
      case 2: return 18;
      case 3: return 5;
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
        <div className="flex justify-center gap-4 flex-wrap">
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
          <button
            onClick={notifStatus === 'unsupported' ? () => setShowTips(true) : handleToggleNotifications}
            disabled={notifStatus === 'denied'}
            title={notifStatus === 'denied' ? 'Notifications blocked in browser settings' : undefined}
            className={`px-4 py-2 rounded-lg ${
              notifStatus === 'subscribed'
                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                : notifStatus === 'denied'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : notifStatus === 'unsupported'
                ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {notifStatus === 'subscribed' ? 'Notifications On' : notifStatus === 'denied' ? 'Notifications Blocked' : notifStatus === 'unsupported' ? 'Notifications (see Tips)' : 'Enable Notifications'}
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
            thirtyMinPass={thirtyMinPass}
          />
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Leaderboard</h2>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
              <button
                onClick={() => setLeaderboardTab('week')}
                className={`px-4 py-1.5 ${leaderboardTab === 'week' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {getWeekLabel(currentWeek)}
              </button>
              <button
                onClick={() => setLeaderboardTab('season')}
                className={`px-4 py-1.5 border-l border-gray-300 ${leaderboardTab === 'season' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                All Season
              </button>
            </div>
          </div>
          <LeaderboardTable
            entries={leaderboardTab === 'week' ? weeklyLeaderboard : leaderboard}
            highlightUserId={userId}
          />
        </div>
      </div>

      {/* Tips Modal */}
      {showTips && <TipsModal onClose={() => setShowTips(false)} />}

      {/* First-visit notification onboarding */}
      <NotificationOnboarding
        authToken={authToken}
        userId={userId}
        onSubscribed={() => setNotifStatus('subscribed')}
      />
    </main>
  );
}
