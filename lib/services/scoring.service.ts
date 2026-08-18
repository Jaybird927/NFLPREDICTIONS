import db from '../db';
import { getGameById, getGamesByWeek } from '../repositories/games';
import { recalculateLeaderboard } from '../repositories/leaderboard';
import { getWeeklyWinners, grantPass, passAlreadyAwardedForWeek, getUnusedPasses, usePass } from '../repositories/passes';

export async function updatePredictionsForGame(gameId: number): Promise<void> {
  const game = getGameById(gameId);
  if (!game || !game.winnerTeamId) return;

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

  // Check if the whole week is now final
  const games = getGamesByWeek(game.seasonYear, game.seasonType, game.week);
  const allFinal = games.length > 0 && games.every(g => g.gameStatus === 'final');

  if (allFinal && !passAlreadyAwardedForWeek(game.seasonYear, game.week)) {
    // Award 15-minute passes to weekly winner(s)
    const winners = getWeeklyWinners(game.seasonYear, game.seasonType, game.week);
    for (const userId of winners) {
      grantPass(userId, game.seasonYear, 'fifteen_minute', game.week);
      console.log(`Awarded 15-min pass to user ${userId} for winning week ${game.week}`);
    }

    // Auto-apply correction passes: fix first wrong pick for users who have one
    const allUsers = db.prepare('SELECT id FROM users').all() as { id: number }[];
    for (const { id: userId } of allUsers) {
      const corrections = getUnusedPasses(userId, game.seasonYear, 'correction');
      if (corrections.length === 0) continue;

      const firstWrong = db.prepare(`
        SELECT p.id, p.game_id FROM predictions p
        JOIN games g ON p.game_id = g.id
        WHERE p.user_id = ? AND g.season_year = ? AND g.season_type = ? AND g.week = ?
          AND p.is_correct = 0
        ORDER BY g.game_date ASC
        LIMIT 1
      `).get(userId, game.seasonYear, game.seasonType, game.week) as { id: number; game_id: number } | undefined;

      if (!firstWrong) continue;

      // Flip to correct
      db.prepare(`UPDATE predictions SET is_correct = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(firstWrong.id);
      usePass(corrections[0]!.id, firstWrong.game_id);
      console.log(`Applied correction pass for user ${userId} on game ${firstWrong.game_id}`);
    }
  }

  await recalculateLeaderboard(game.seasonYear, game.seasonType);
}
