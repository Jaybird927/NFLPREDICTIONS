import db from '../db';
import { getGameById, getGamesByWeek } from '../repositories/games';
import { recalculateLeaderboard } from '../repositories/leaderboard';
import { getWeeklyWinners, grantPass, passAlreadyAwardedForWeek } from '../repositories/passes';

export async function updatePredictionsForGame(gameId: number): Promise<void> {
  const game = getGameById(gameId);

  if (!game || !game.winnerTeamId) {
    console.log(`Game ${gameId} has no winner yet, skipping prediction updates`);
    return;
  }

  // Create missing predictions as losses
  db.prepare(`
    INSERT INTO predictions (user_id, game_id, predicted_winner_team_id, is_correct, created_at, updated_at)
    SELECT u.id, ?, NULL, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM users u
    WHERE NOT EXISTS (SELECT 1 FROM predictions p WHERE p.user_id = u.id AND p.game_id = ?)
  `).run(gameId, gameId);

  // Score all predictions
  db.prepare(`
    UPDATE predictions
    SET is_correct = CASE
      WHEN predicted_winner_team_id = ? THEN 1
      WHEN predicted_winner_team_id IS NULL THEN 0
      ELSE 0
    END, updated_at = CURRENT_TIMESTAMP
    WHERE game_id = ?
  `).run(game.winnerTeamId, gameId);

  // If the whole week is now final, award passes to weekly winner(s)
  const games = getGamesByWeek(game.seasonYear, game.seasonType, game.week);
  const allFinal = games.length > 0 && games.every(g => g.gameStatus === 'final');

  if (allFinal && !passAlreadyAwardedForWeek(game.seasonYear, game.week)) {
    const winners = getWeeklyWinners(game.seasonYear, game.seasonType, game.week);
    for (const userId of winners) {
      grantPass(userId, game.seasonYear, game.week);
      console.log(`Awarded 30-min pass to user ${userId} for winning week ${game.week}`);
    }
  }

  await recalculateLeaderboard(game.seasonYear, game.seasonType);
}
