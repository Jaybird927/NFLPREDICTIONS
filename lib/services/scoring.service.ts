import db from '../db';
import { getGameById, getGamesByWeek } from '../repositories/games';
import { recalculateLeaderboard } from '../repositories/leaderboard';
import {
  getWeeklyWinners,
  grantPass,
  getUnusedLatePass,
  useLatePass,
  latePassAlreadyAwardedThisWeek,
} from '../repositories/passes';
import { CURRENT_SEASON } from '../constants';

export async function updatePredictionsForGame(gameId: number): Promise<void> {
  const game = getGameById(gameId);

  if (!game || !game.winnerTeamId) {
    console.log(`Game ${gameId} has no winner yet, skipping prediction updates`);
    return;
  }

  console.log(`Updating predictions for game ${gameId}, winner: ${game.winnerTeamId}`);

  // Create missing predictions as losses
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

  // Update all existing predictions for this game
  db.prepare(`
    UPDATE predictions
    SET is_correct = CASE
      WHEN predicted_winner_team_id = ? THEN 1
      WHEN predicted_winner_team_id IS NULL THEN 0
      ELSE 0
    END,
    updated_at = CURRENT_TIMESTAMP
    WHERE game_id = ?
  `).run(game.winnerTeamId, gameId);

  console.log(`Predictions updated for game ${gameId}`);

  // Check if the entire week is now final — if so, apply late pass logic
  await checkAndApplyWeekEndLogic(game.seasonYear, game.seasonType, game.week);

  await recalculateLeaderboard(game.seasonYear, game.seasonType);
}

async function checkAndApplyWeekEndLogic(
  seasonYear: number,
  seasonType: number,
  week: number
): Promise<void> {
  const games = getGamesByWeek(seasonYear, seasonType, week);
  if (games.length === 0) return;

  const allFinal = games.every(g => g.gameStatus === 'final');
  if (!allFinal) return;

  // Don't double-award if already done this week
  if (latePassAlreadyAwardedThisWeek(seasonYear, seasonType, week)) return;

  // Award late passes to weekly winner(s)
  const winners = getWeeklyWinners(seasonYear, seasonType, week);
  for (const userId of winners) {
    grantPass(userId, 'late', seasonYear, seasonType);
    console.log(`Awarded late pass to user ${userId} for week ${week}`);
  }

  // Apply any held late passes for users who missed games this week
  const allUsers = db.prepare('SELECT id FROM users').all() as { id: number }[];
  for (const { id: userId } of allUsers) {
    const latePass = getUnusedLatePass(userId, seasonYear);
    if (!latePass) continue;

    // Find a missed pick for this week (null predicted_winner)
    const missed = db.prepare(`
      SELECT p.id, p.game_id, g.home_team_id, g.away_team_id
      FROM predictions p
      JOIN games g ON p.game_id = g.id
      WHERE p.user_id = ? AND g.season_year = ? AND g.season_type = ? AND g.week = ?
        AND p.predicted_winner_team_id IS NULL
        AND p.is_late_pass = 0
      LIMIT 1
    `).get(userId, seasonYear, seasonType, week) as {
      id: number; game_id: number; home_team_id: string; away_team_id: string;
    } | undefined;

    if (!missed) continue;

    // Randomly pick a team
    const randomTeamId = Math.random() < 0.5 ? missed.home_team_id : missed.away_team_id;

    // Update the prediction with the random pick
    db.prepare(`
      UPDATE predictions
      SET predicted_winner_team_id = ?, is_late_pass = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(randomTeamId, missed.id);

    // Score it
    const gameForPick = getGameById(missed.game_id);
    if (gameForPick?.winnerTeamId) {
      db.prepare(`
        UPDATE predictions
        SET is_correct = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(randomTeamId === gameForPick.winnerTeamId ? 1 : 0, missed.id);
    }

    useLatePass(latePass.id, week);
    console.log(`Applied late pass for user ${userId} on game ${missed.game_id}, picked ${randomTeamId}`);
  }
}
