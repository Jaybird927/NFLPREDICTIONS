import db from '../db';
import { getGameById } from '../repositories/games';
import { recalculateLeaderboard } from '../repositories/leaderboard';

export async function updatePredictionsForGame(gameId: number): Promise<void> {
  const game = getGameById(gameId);

  if (!game || !game.winnerTeamId) {
    console.log(`Game ${gameId} has no winner yet, skipping prediction updates`);
    return;
  }

  console.log(`Updating predictions for game ${gameId}, winner: ${game.winnerTeamId}`);

  // Update all predictions for this game
  const stmt = db.prepare(`
    UPDATE predictions
    SET is_correct = CASE
      WHEN predicted_winner_team_id = ? THEN 1
      ELSE 0
    END,
    updated_at = CURRENT_TIMESTAMP
    WHERE game_id = ?
  `);

  stmt.run(game.winnerTeamId, gameId);

  console.log(`Predictions updated for game ${gameId}`);

  // Recalculate leaderboard
  await recalculateLeaderboard(game.seasonYear, game.seasonType);
}
