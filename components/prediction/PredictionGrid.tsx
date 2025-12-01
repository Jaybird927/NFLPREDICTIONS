'use client';

import { useState, useEffect } from 'react';
import { Game, User, Prediction } from '@/types';
import { PredictionCell } from './PredictionCell';
import { formatGameTime, isGameLocked } from '@/lib/utils/date';

interface PredictionGridProps {
  games: Game[];
  users: User[];
  predictions: Prediction[];
  onSave: (predictions: Array<{ userId: number; gameId: number; predictedWinnerTeamId: string | null }>) => Promise<void>;
  isAdmin: boolean;
  onRequestAuth: () => void;
  authToken?: string; // New: Auth token for API requests
  restrictToUser?: number; // New: Only show this user's column
}

export function PredictionGrid({ games, users, predictions, onSave, isAdmin, onRequestAuth, authToken, restrictToUser }: PredictionGridProps) {
  // Filter users if restrictToUser is set
  const displayUsers = restrictToUser ? users.filter(u => u.id === restrictToUser) : users;
  // Build a map for quick lookup: "userId-gameId" -> prediction
  const predictionMap = new Map<string, Prediction>();
  predictions.forEach((pred) => {
    predictionMap.set(`${pred.userId}-${pred.gameId}`, pred);
  });

  // State for current selections
  const [selections, setSelections] = useState<Map<string, string | null>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  // Sync selections with predictions when they change
  useEffect(() => {
    const map = new Map<string, string | null>();
    predictions.forEach((pred) => {
      map.set(`${pred.userId}-${pred.gameId}`, pred.predictedWinnerTeamId);
    });
    setSelections(map);
  }, [predictions]);

  const handleCellChange = async (userId: number, gameId: number, teamId: string | null, isLocked: boolean) => {
    // For restricted users (non-admin), show locked message for locked games
    if (isLocked && !isAdmin) {
      if (restrictToUser) {
        // Regular user trying to modify locked game - show message
        alert('This game has already started. Picks are locked.');
        return;
      }
      // Admin view - require password
      onRequestAuth();
      return;
    }

    const key = `${userId}-${gameId}`;

    // Optimistically update UI
    setSelections((prev) => {
      const next = new Map(prev);
      next.set(key, teamId);
      return next;
    });

    // Auto-save immediately
    setIsSaving(true);
    try {
      await onSave([{
        userId,
        gameId,
        predictedWinnerTeamId: teamId,
      }]);
    } catch (error) {
      console.error('Failed to save prediction:', error);
      alert('Failed to save prediction. Please try again.');
      // Revert optimistic update on error
      setSelections((prev) => {
        const next = new Map(prev);
        const prediction = predictionMap.get(key);
        if (prediction) {
          next.set(key, prediction.predictedWinnerTeamId);
        } else {
          next.delete(key);
        }
        return next;
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (games.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No games available for this week
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white border border-gray-300 px-4 py-2 text-left font-semibold text-sm">
                Game
              </th>
              {displayUsers.map((user) => (
                <th
                  key={user.id}
                  className="border border-gray-300 px-2 py-2 text-center font-semibold text-sm"
                >
                  {user.displayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {games.map((game) => {
              const locked = isGameLocked(game.gameDate);

              return (
                <tr key={game.id} className={locked ? 'bg-gray-50' : ''}>
                  <td className="sticky left-0 z-10 bg-white border border-gray-300 px-4 py-2 text-sm">
                    <div className="flex flex-col">
                      <div className="font-medium">
                        {game.awayTeam.abbreviation} @ {game.homeTeam.abbreviation}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatGameTime(game.gameDate)}
                      </div>
                      {game.gameStatus !== 'scheduled' && (
                        <div className="text-xs font-semibold mt-1">
                          {game.awayTeam.abbreviation} {game.awayScore} - {game.homeScore}{' '}
                          {game.homeTeam.abbreviation}
                          {game.gameStatus === 'final' && (
                            <span className="ml-1 text-gray-600">(F)</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  {displayUsers.map((user) => {
                    const key = `${user.id}-${game.id}`;
                    const prediction = predictionMap.get(key);
                    const selectedTeamId = selections.get(key) || null;

                    return (
                      <td key={key} className="border border-gray-300 px-2 py-2 text-center">
                        <div className="flex justify-center">
                          <PredictionCell
                            homeTeam={game.homeTeam}
                            awayTeam={game.awayTeam}
                            selectedTeamId={selectedTeamId}
                            isLocked={locked}
                            isCorrect={prediction?.isCorrect}
                            winnerTeamId={game.winnerTeamId}
                            onChange={(teamId) => handleCellChange(user.id, game.id, teamId, locked)}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isSaving && (
        <div className="flex justify-center">
          <p className="text-sm text-blue-600 font-semibold">
            💾 Saving...
          </p>
        </div>
      )}
    </div>
  );
}
