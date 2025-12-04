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

  // Check if this is the GB @ DET game (game to skip for missing predictions)
  const skipMissingPenalty = (game.homeTeamId === 'DET' && game.awayTeamId === 'GB') ||
                             (game.homeTeamId === 'GB' && game.awayTeamId === 'DET');

  // Create missing predictions as losses (except for excluded games)
  if (!skipMissingPenalty) {
    const createMissingStmt = db.prepare(`
      INSERT INTO predictions (user_id, game_id, predicted_winner_team_id, is_correct, created_at, updated_at)
      SELECT
        u.id,
        ?,
        NULL,
        0,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM users u
      WHERE NOT EXISTS (
        SELECT 1 FROM predictions p
        WHERE p.user_id = u.id AND p.game_id = ?
      )
    `);
    createMissingStmt.run(gameId, gameId);
    console.log(`Created missing predictions as losses for game ${gameId}`);
  } else {
    console.log(`Skipping missing prediction penalty for GB @ DET game ${gameId}`);
  }

  // Update all existing predictions for this game
  const stmt = db.prepare(`
    UPDATE predictions
    SET is_correct = CASE
      WHEN predicted_winner_team_id = ? THEN 1
      WHEN predicted_winner_team_id IS NULL THEN 0
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
